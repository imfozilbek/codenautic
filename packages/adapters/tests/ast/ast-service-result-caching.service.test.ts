import {describe, expect, test} from "bun:test"

import {
    AST_SERVICE_RESULT_CACHING_ERROR_CODE,
    AstServiceResultCachingError,
    AstServiceResultCachingService,
    type IAstGetCodeGraphInput,
    type IAstGetCodeGraphResult,
    type IAstGetFileMetricsInput,
    type IAstGetFileMetricsResult,
    type IAstRepositoryScanStatusInput,
    type IAstRepositoryScanStatusResult,
    type IAstServiceClientLibrary,
    type IAstServiceHealthCheckResponse,
    type IAstStartRepositoryScanInput,
    type IAstStartRepositoryScanResult,
} from "../../src/ast"

type AstServiceResultCachingErrorCode =
    (typeof AST_SERVICE_RESULT_CACHING_ERROR_CODE)[keyof typeof AST_SERVICE_RESULT_CACHING_ERROR_CODE]

interface IDeferredPromise<TValue> {
    readonly promise: Promise<TValue>
    reject(error: unknown): void
    resolve(value: TValue): void
}

interface IAstServiceClientLibraryDoubleState {
    codeGraphCalls: number
    fileMetricsCalls: number
    scanStatusCalls: number
}

/**
 * Asserts typed AST result caching error for async action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstServiceResultCachingError(
    callback: () => Promise<unknown>,
    code: AstServiceResultCachingErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstServiceResultCachingError)

        if (error instanceof AstServiceResultCachingError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstServiceResultCachingError to be thrown")
}

/**
 * Creates deferred promise helper.
 *
 * @returns Deferred promise object.
 */
function createDeferredPromise<TValue>(): IDeferredPromise<TValue> {
    let resolvePromise: ((value: TValue) => void) | undefined
    let rejectPromise: ((error: unknown) => void) | undefined

    const promise = new Promise<TValue>((resolve, reject) => {
        resolvePromise = resolve
        rejectPromise = reject
    })

    return {
        promise,
        resolve: (value: TValue): void => {
            if (resolvePromise !== undefined) {
                resolvePromise(value)
            }
        },
        reject: (error: unknown): void => {
            if (rejectPromise !== undefined) {
                rejectPromise(error)
            }
        },
    }
}

/**
 * Creates AST client library double with mutable call counters.
 *
 * @param overrides Optional method overrides.
 * @returns Client double and state counters.
 */
function createAstServiceClientLibraryDouble(
    overrides: {
        readonly getCodeGraph?: (input: IAstGetCodeGraphInput) => Promise<IAstGetCodeGraphResult>
        readonly getFileMetrics?: (input: IAstGetFileMetricsInput) => Promise<IAstGetFileMetricsResult>
        readonly getRepositoryScanStatus?: (
            input: IAstRepositoryScanStatusInput,
        ) => Promise<IAstRepositoryScanStatusResult>
    } = {},
): {
    readonly client: IAstServiceClientLibrary
    readonly state: IAstServiceClientLibraryDoubleState
} {
    const state: IAstServiceClientLibraryDoubleState = {
        codeGraphCalls: 0,
        fileMetricsCalls: 0,
        scanStatusCalls: 0,
    }

    const client: IAstServiceClientLibrary = {
        connect: (): Promise<void> => Promise.resolve(),
        disconnect: (): Promise<void> => Promise.resolve(),
        healthCheck: (): Promise<IAstServiceHealthCheckResponse> =>
            Promise.resolve({
                status: "SERVING",
            }),
        startRepositoryScan: (_input: IAstStartRepositoryScanInput): Promise<IAstStartRepositoryScanResult> =>
            Promise.resolve({
                requestId: "scan-1",
                state: "QUEUED",
            }),
        getCodeGraph: async (input: IAstGetCodeGraphInput): Promise<IAstGetCodeGraphResult> => {
            state.codeGraphCalls += 1
            if (overrides.getCodeGraph !== undefined) {
                return overrides.getCodeGraph(input)
            }

            return {
                nodes: [],
                edges: [],
            }
        },
        getFileMetrics: async (input: IAstGetFileMetricsInput): Promise<IAstGetFileMetricsResult> => {
            state.fileMetricsCalls += 1
            if (overrides.getFileMetrics !== undefined) {
                return overrides.getFileMetrics(input)
            }

            return {
                items: [],
            }
        },
        getRepositoryScanStatus: async (
            input: IAstRepositoryScanStatusInput,
        ): Promise<IAstRepositoryScanStatusResult> => {
            state.scanStatusCalls += 1
            if (overrides.getRepositoryScanStatus !== undefined) {
                return overrides.getRepositoryScanStatus(input)
            }

            return {
                requestId: input.requestId,
                state: "RUNNING",
                progressPercent: 50,
            }
        },
    }

    return {
        client,
        state,
    }
}

describe("AstServiceResultCachingService", () => {
    test("returns cached code graph while ttl is valid", async () => {
        let now = 1_000
        const clientDouble = createAstServiceClientLibraryDouble({
            getCodeGraph: () =>
                Promise.resolve({
                    nodes: [
                        {
                            id: "node-1",
                            type: "module",
                            name: "A",
                            filePath: "src/a.ts",
                        },
                    ],
                    edges: [],
                }),
        })
        const service = new AstServiceResultCachingService({
            client: clientDouble.client,
            defaultCacheTtlMs: 500,
            now: () => now,
        })

        const first = await service.getCodeGraph({
            repositoryId: " repo-1 ",
            branch: " main ",
        })
        now += 50
        const second = await service.getCodeGraph({
            repositoryId: "repo-1",
            branch: "main",
        })

        expect(first.fromCache).toBe(false)
        expect(first.attempts).toBe(1)
        expect(second.fromCache).toBe(true)
        expect(second.attempts).toBe(0)
        expect(second.value).toEqual(first.value)
        expect(clientDouble.state.codeGraphCalls).toBe(1)
    })

    test("expires ttl and supports force refresh with invalidation methods", async () => {
        let now = 10_000
        const clientDouble = createAstServiceClientLibraryDouble({
            getCodeGraph: () =>
                Promise.resolve({
                    nodes: [],
                    edges: [],
                }),
        })
        const service = new AstServiceResultCachingService({
            client: clientDouble.client,
            defaultCacheTtlMs: 10,
            now: () => now,
        })

        await service.getCodeGraph({
            repositoryId: "repo-1",
        })
        now += 20
        await service.getCodeGraph({
            repositoryId: "repo-1",
        })
        await service.getCodeGraph({
            repositoryId: "repo-1",
            forceRefresh: true,
        })

        expect(clientDouble.state.codeGraphCalls).toBe(3)
        expect(service.invalidateRepository("repo-1")).toBe(1)

        await service.getRepositoryScanStatus({
            requestId: "req-10",
        })
        expect(service.invalidateRequest("req-10")).toBe(1)
    })

    test("deduplicates in-flight requests by idempotency key", async () => {
        const deferred = createDeferredPromise<IAstGetFileMetricsResult>()
        const clientDouble = createAstServiceClientLibraryDouble({
            getFileMetrics: async () => deferred.promise,
        })
        const service = new AstServiceResultCachingService({
            client: clientDouble.client,
        })

        const firstPromise = service.getFileMetrics({
            repositoryId: "repo-a",
            commitSha: "abcdef1",
            idempotencyKey: "shared-key",
        })
        const secondPromise = service.getFileMetrics({
            repositoryId: "repo-a",
            commitSha: "abcdef1",
            idempotencyKey: "shared-key",
        })

        await Promise.resolve()
        expect(clientDouble.state.fileMetricsCalls).toBe(1)

        deferred.resolve({
            items: [
                {
                    filePath: "src/a.ts",
                    loc: 10,
                    cyclomaticComplexity: 2,
                    churn: 1,
                },
            ],
        })

        const [first, second] = await Promise.all([firstPromise, secondPromise])
        expect(first.fromCache).toBe(false)
        expect(second.fromCache).toBe(false)
        expect(second.value).toEqual(first.value)
    })

    test("retries transient failures and returns result on final attempt", async () => {
        const sleepDurations: number[] = []
        let attempts = 0
        const clientDouble = createAstServiceClientLibraryDouble({
            getRepositoryScanStatus: async () => {
                attempts += 1
                if (attempts < 3) {
                    const error = new Error("temporary failure")
                    Object.assign(error, {
                        retryable: true,
                    })
                    return Promise.reject(error)
                }

                return {
                    requestId: "req-1",
                    state: "RUNNING",
                    progressPercent: 80,
                }
            },
        })
        const service = new AstServiceResultCachingService({
            client: clientDouble.client,
            sleep: (durationMs: number): Promise<void> => {
                sleepDurations.push(durationMs)
                return Promise.resolve()
            },
            defaultRetryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 5,
                maxBackoffMs: 8,
            },
        })

        const result = await service.getRepositoryScanStatus({
            requestId: "req-1",
        })

        expect(result.attempts).toBe(3)
        expect(result.fromCache).toBe(false)
        expect(sleepDurations).toEqual([5, 8])
        expect(clientDouble.state.scanStatusCalls).toBe(3)
    })

    test("throws typed errors for invalid input and retry exhaustion", async () => {
        const clientDouble = createAstServiceClientLibraryDouble({
            getCodeGraph: async () => Promise.reject(new Error("downstream unavailable")),
        })
        const service = new AstServiceResultCachingService({
            client: clientDouble.client,
            sleep: async (): Promise<void> => {},
            defaultRetryPolicy: {
                maxAttempts: 2,
                initialBackoffMs: 1,
                maxBackoffMs: 1,
            },
        })

        await expectAstServiceResultCachingError(
            () =>
                service.getCodeGraph({
                    repositoryId: "  ",
                }),
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_REPOSITORY_ID,
        )

        await expectAstServiceResultCachingError(
            () =>
                service.getFileMetrics({
                    repositoryId: "repo",
                    commitSha: "abcdef1",
                    filePaths: [" "],
                }),
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstServiceResultCachingError(
            () =>
                service.getCodeGraph({
                    repositoryId: "repo-z",
                }),
            AST_SERVICE_RESULT_CACHING_ERROR_CODE.RETRY_EXHAUSTED,
        )
    })
})
