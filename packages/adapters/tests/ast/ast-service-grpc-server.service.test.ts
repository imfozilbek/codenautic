import {describe, expect, test} from "bun:test"

import {
    AST_SERVICE_GRPC_SERVER_ERROR_CODE,
    AstServiceGrpcServer,
    AstServiceGrpcServerError,
    type AstServiceGrpcServerSleep,
} from "../../src/ast"

/**
 * Asserts typed AST gRPC server error for async or sync action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstServiceGrpcServerError(
    callback: () => Promise<unknown>,
    code: (typeof AST_SERVICE_GRPC_SERVER_ERROR_CODE)[keyof typeof AST_SERVICE_GRPC_SERVER_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstServiceGrpcServerError)

        if (error instanceof AstServiceGrpcServerError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstServiceGrpcServerError to be thrown")
}

describe("AstServiceGrpcServer", () => {
    test("supports start and stop lifecycle with typed errors", async () => {
        const server = new AstServiceGrpcServer()

        await expectAstServiceGrpcServerError(
            async () => server.stop(),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_NOT_STARTED,
        )

        await server.start()

        await expectAstServiceGrpcServerError(
            async () => server.start(),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_ALREADY_STARTED,
        )

        await server.stop()
    })

    test("invokes registered method and enforces definitions contracts", async () => {
        const server = new AstServiceGrpcServer()

        await expectAstServiceGrpcServerError(
            async () =>
                server.invoke({
                    methodName: "HealthCheck",
                    request: {},
                }),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.SERVER_NOT_STARTED,
        )

        server.registerMethod("HealthCheck", () => {
            return Promise.resolve({
                status: "ok",
            })
        })
        await server.start()

        const result = await server.invoke<{readonly ping: true}, {readonly status: string}>({
            methodName: "HealthCheck",
            request: {
                ping: true,
            },
        })

        expect(result.response).toEqual({
            status: "ok",
        })
        expect(result.attempts).toBe(1)
        expect(result.fromIdempotencyCache).toBe(false)

        await expectAstServiceGrpcServerError(
            async () =>
                server.invoke({
                    methodName: "GetCodeGraph",
                    request: {},
                }),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.METHOD_NOT_REGISTERED,
        )

        await expectAstServiceGrpcServerError(
            async () =>
                server.invoke({
                    methodName: "UnknownMethod",
                    request: {},
                }),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.METHOD_NOT_FOUND,
        )
    })

    test("deduplicates responses by idempotency key", async () => {
        let callCount = 0
        const server = new AstServiceGrpcServer()
        server.registerMethod("StartRepositoryScan", () => {
            callCount += 1
            return Promise.resolve({
                requestId: "req-1",
            })
        })
        await server.start()

        const first = await server.invoke({
            methodName: "StartRepositoryScan",
            request: {
                repositoryId: "repo-1",
            },
            idempotencyKey: "scan:repo-1",
        })
        const second = await server.invoke({
            methodName: "StartRepositoryScan",
            request: {
                repositoryId: "repo-1",
            },
            idempotencyKey: "scan:repo-1",
        })

        expect(callCount).toBe(1)
        expect(first.fromIdempotencyCache).toBe(false)
        expect(second.fromIdempotencyCache).toBe(true)
        expect(second.response).toEqual(first.response)
    })

    test("retries retryable handler failures with exponential backoff", async () => {
        const sleepDurations: number[] = []
        const sleep: AstServiceGrpcServerSleep = (durationMs) => {
            sleepDurations.push(durationMs)
            return Promise.resolve()
        }
        let attempt = 0
        const server = new AstServiceGrpcServer({sleep})

        server.registerMethod("GetCodeGraph", () => {
            attempt += 1

            if (attempt < 3) {
                return Promise.reject(new Error("transient"))
            }

            return Promise.resolve({
                nodes: [],
                edges: [],
            })
        })
        await server.start()

        const result = await server.invoke({
            methodName: "GetCodeGraph",
            request: {},
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 10,
                maxBackoffMs: 20,
            },
        })

        expect(result.attempts).toBe(3)
        expect(sleepDurations).toEqual([10, 20])
    })

    test("throws typed retry exhaustion and non-retryable handler errors", async () => {
        const server = new AstServiceGrpcServer()

        server.registerMethod("GetFileMetrics", () => {
            const error = new Error("fatal")
            Object.assign(error, {
                retryable: false,
            })
            return Promise.reject(error)
        })
        await server.start()

        await expectAstServiceGrpcServerError(
            async () =>
                server.invoke({
                    methodName: "GetFileMetrics",
                    request: {},
                }),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.HANDLER_FAILED,
        )

        const retryServer = new AstServiceGrpcServer({
            sleep: () => Promise.resolve(),
        })
        retryServer.registerMethod("GetRepositoryScanStatus", () => {
            return Promise.reject(new Error("temporary"))
        })
        await retryServer.start()

        await expectAstServiceGrpcServerError(
            async () =>
                retryServer.invoke({
                    methodName: "GetRepositoryScanStatus",
                    request: {},
                    retryPolicy: {
                        maxAttempts: 2,
                        initialBackoffMs: 1,
                        maxBackoffMs: 2,
                    },
                }),
            AST_SERVICE_GRPC_SERVER_ERROR_CODE.RETRY_EXHAUSTED,
        )
    })
})
