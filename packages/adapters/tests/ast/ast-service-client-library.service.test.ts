import {describe, expect, test} from "bun:test"

import {
    AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE,
    AstServiceClientLibrary,
    AstServiceClientLibraryError,
    type AstServiceGrpcServerMethodHandler,
    type IAstServiceGrpcServer,
    type IAstServiceGrpcServerInvokeInput,
    type IAstServiceGrpcServerInvokeResult,
} from "../../src/ast"

type AstServiceClientLibraryErrorCode =
    (typeof AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE)[keyof typeof AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE]

type AstServiceGrpcServerInvokeImplementation = (
    input: IAstServiceGrpcServerInvokeInput<unknown>,
) => Promise<IAstServiceGrpcServerInvokeResult<unknown>>

interface IAstServiceGrpcServerDoubleState {
    startCount: number
    stopCount: number
    invokeInputs: IAstServiceGrpcServerInvokeInput<unknown>[]
}

interface IAstServiceGrpcServerDouble {
    readonly server: IAstServiceGrpcServer
    readonly state: IAstServiceGrpcServerDoubleState
}

/**
 * Asserts typed AST service client library error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Typed client library error.
 */
async function expectAstServiceClientLibraryError(
    callback: () => Promise<unknown>,
    code: AstServiceClientLibraryErrorCode,
): Promise<AstServiceClientLibraryError> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstServiceClientLibraryError)

        if (error instanceof AstServiceClientLibraryError) {
            expect(error.code).toBe(code)
            return error
        }
    }

    throw new Error("Expected AstServiceClientLibraryError to be thrown")
}

/**
 * Creates typed gRPC server double for AST client tests.
 *
 * @param invokeImplementation Optional invoke behavior override.
 * @returns Server double and mutable state.
 */
function createAstServiceGrpcServerDouble(
    invokeImplementation: AstServiceGrpcServerInvokeImplementation = () => {
        return Promise.resolve({
            response: {},
            attempts: 1,
            fromIdempotencyCache: false,
            durationMs: 1,
        })
    },
): IAstServiceGrpcServerDouble {
    const state: IAstServiceGrpcServerDoubleState = {
        startCount: 0,
        stopCount: 0,
        invokeInputs: [],
    }

    const server: IAstServiceGrpcServer = {
        start: (): Promise<void> => {
            state.startCount += 1
            return Promise.resolve()
        },
        stop: (): Promise<void> => {
            state.stopCount += 1
            return Promise.resolve()
        },
        registerMethod: <TRequest, TResponse>(
            _methodName: string,
            _handler: AstServiceGrpcServerMethodHandler<TRequest, TResponse>,
        ): void => {},
        invoke: async <TRequest, TResponse>(
            input: IAstServiceGrpcServerInvokeInput<TRequest>,
        ): Promise<IAstServiceGrpcServerInvokeResult<TResponse>> => {
            state.invokeInputs.push(input as IAstServiceGrpcServerInvokeInput<unknown>)

            const result = await invokeImplementation(
                input as IAstServiceGrpcServerInvokeInput<unknown>,
            )

            return result as IAstServiceGrpcServerInvokeResult<TResponse>
        },
    }

    return {
        server,
        state,
    }
}

describe("AstServiceClientLibrary", () => {
    test("supports idempotent connect and disconnect lifecycle", async () => {
        const serverDouble = createAstServiceGrpcServerDouble()
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })

        await client.connect()
        await client.connect()
        await client.disconnect()
        await client.disconnect()

        expect(serverDouble.state.startCount).toBe(1)
        expect(serverDouble.state.stopCount).toBe(1)
    })

    test("sends health check request through grpc transport", async () => {
        const serverDouble = createAstServiceGrpcServerDouble((input) => {
            expect(input.methodName).toBe("HealthCheck")
            expect(input.request).toEqual({})

            return Promise.resolve({
                response: {
                    status: "SERVING",
                    version: "1.0.0",
                    timestampUnixMs: 1700000000000,
                },
                attempts: 1,
                fromIdempotencyCache: false,
                durationMs: 1,
            })
        })
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })
        await client.connect()

        const result = await client.healthCheck()

        expect(result).toEqual({
            status: "SERVING",
            version: "1.0.0",
            timestampUnixMs: 1700000000000,
        })
        expect(serverDouble.state.invokeInputs.length).toBe(1)
    })

    test("normalizes start scan payload and generates default idempotency key", async () => {
        const serverDouble = createAstServiceGrpcServerDouble((input) => {
            expect(input).toEqual({
                methodName: "StartRepositoryScan",
                request: {
                    repositoryId: "repo-42",
                    commitSha: "ABC1234",
                    filePaths: ["src/a.ts", "src/b.ts"],
                },
                idempotencyKey: "scan:repo-42:ABC1234:src/a.ts,src/b.ts",
                retryPolicy: {
                    maxAttempts: 4,
                    initialBackoffMs: 50,
                    maxBackoffMs: 250,
                },
            })

            return Promise.resolve({
                response: {
                    requestId: "scan-1",
                    state: "QUEUED",
                },
                attempts: 1,
                fromIdempotencyCache: false,
                durationMs: 2,
            })
        })
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })
        await client.connect()

        const result = await client.startRepositoryScan({
            repositoryId: " repo-42 ",
            commitSha: "  ABC1234  ",
            filePaths: ["src/b.ts", "src/a.ts", "src/a.ts"],
            retryPolicy: {
                maxAttempts: 4,
                initialBackoffMs: 50,
                maxBackoffMs: 250,
            },
        })

        expect(result).toEqual({
            requestId: "scan-1",
            state: "QUEUED",
        })
    })

    test("uses default retry policy and trims request values", async () => {
        const serverDouble = createAstServiceGrpcServerDouble((input) => {
            expect(input).toEqual({
                methodName: "GetRepositoryScanStatus",
                request: {
                    requestId: "req-7",
                },
                retryPolicy: {
                    maxAttempts: 5,
                    initialBackoffMs: 200,
                    maxBackoffMs: 1000,
                },
            })

            return Promise.resolve({
                response: {
                    requestId: "req-7",
                    state: "RUNNING",
                    progressPercent: 67,
                },
                attempts: 1,
                fromIdempotencyCache: false,
                durationMs: 1,
            })
        })
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
            defaultRetryPolicy: {
                maxAttempts: 5,
                initialBackoffMs: 200,
                maxBackoffMs: 1000,
            },
        })
        await client.connect()

        const result = await client.getRepositoryScanStatus({
            requestId: " req-7 ",
        })

        expect(result).toEqual({
            requestId: "req-7",
            state: "RUNNING",
            progressPercent: 67,
        })
    })

    test("normalizes optional branch and file path filters", async () => {
        const serverDouble = createAstServiceGrpcServerDouble((input) => {
            if (input.methodName === "GetCodeGraph") {
                expect(input.request).toEqual({
                    repositoryId: "repo-graph",
                })
            }

            if (input.methodName === "GetFileMetrics") {
                expect(input.request).toEqual({
                    repositoryId: "repo-graph",
                    commitSha: "fedcba9",
                    filePaths: ["src/a.ts", "src/z.ts"],
                })
            }

            return Promise.resolve({
                response:
                    input.methodName === "GetCodeGraph"
                        ? {nodes: [], edges: []}
                        : {items: []},
                attempts: 1,
                fromIdempotencyCache: false,
                durationMs: 1,
            })
        })
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })
        await client.connect()

        const graph = await client.getCodeGraph({
            repositoryId: " repo-graph ",
            branch: "   ",
        })
        const metrics = await client.getFileMetrics({
            repositoryId: "repo-graph",
            commitSha: "  fedcba9",
            filePaths: ["src/z.ts", "src/a.ts", "src/z.ts"],
        })

        expect(graph).toEqual({
            nodes: [],
            edges: [],
        })
        expect(metrics).toEqual({
            items: [],
        })
    })

    test("throws typed validation errors and enforces connected lifecycle", async () => {
        const serverDouble = createAstServiceGrpcServerDouble()
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })

        await expectAstServiceClientLibraryError(
            () => client.healthCheck(),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.CLIENT_NOT_CONNECTED,
        )

        await client.connect()

        await expectAstServiceClientLibraryError(
            () =>
                client.startRepositoryScan({
                    repositoryId: "   ",
                    commitSha: "abcdef1",
                }),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_REPOSITORY_ID,
        )

        await expectAstServiceClientLibraryError(
            () =>
                client.startRepositoryScan({
                    repositoryId: "repo",
                    commitSha: "invalid sha",
                }),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_COMMIT_SHA,
        )

        await expectAstServiceClientLibraryError(
            () =>
                client.getRepositoryScanStatus({
                    requestId: "   ",
                }),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_REQUEST_ID,
        )

        await expectAstServiceClientLibraryError(
            () =>
                client.getFileMetrics({
                    repositoryId: "repo",
                    commitSha: "abcdef1",
                    filePaths: ["   "],
                }),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstServiceClientLibraryError(
            () =>
                client.startRepositoryScan({
                    repositoryId: "repo",
                    commitSha: "abcdef1",
                    idempotencyKey: "  ",
                }),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.INVALID_IDEMPOTENCY_KEY,
        )
    })

    test("wraps transport failure into typed request error", async () => {
        const serverDouble = createAstServiceGrpcServerDouble(() =>
            Promise.reject(new Error("transport unavailable")),
        )
        const client = new AstServiceClientLibrary({
            server: serverDouble.server,
        })
        await client.connect()

        const error = await expectAstServiceClientLibraryError(
            () => client.healthCheck(),
            AST_SERVICE_CLIENT_LIBRARY_ERROR_CODE.REQUEST_FAILED,
        )

        expect(error.methodName).toBe("HealthCheck")
        expect(error.causeMessage).toBe("transport unavailable")
    })
})
