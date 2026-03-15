import {describe, expect, test} from "bun:test"

import {
    AST_BATCH_PROCESSING_ERROR_CODE,
    AstBatchProcessingError,
    AstBatchProcessingService,
} from "../../src/ast"

interface IDeferred<TValue> {
    readonly promise: Promise<TValue>
    resolve(value: TValue): void
    reject(reason?: unknown): void
}

/**
 * Creates deferred promise fixture.
 *
 * @returns Deferred fixture.
 */
function createDeferred<TValue>(): IDeferred<TValue> {
    let resolve: ((value: TValue) => void) | undefined
    let reject: ((reason?: unknown) => void) | undefined

    const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
    })

    return {
        promise,
        resolve(value: TValue): void {
            if (resolve !== undefined) {
                resolve(value)
            }
        },
        reject(reason?: unknown): void {
            if (reject !== undefined) {
                reject(reason)
            }
        },
    }
}

/**
 * Asserts typed batch-processing error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstBatchProcessingError(
    callback: () => unknown,
    code:
        (typeof AST_BATCH_PROCESSING_ERROR_CODE)[keyof typeof AST_BATCH_PROCESSING_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBatchProcessingError)

        if (error instanceof AstBatchProcessingError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBatchProcessingError to be thrown")
}

/**
 * Asserts typed batch-processing error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstBatchProcessingErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_BATCH_PROCESSING_ERROR_CODE)[keyof typeof AST_BATCH_PROCESSING_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBatchProcessingError)

        if (error instanceof AstBatchProcessingError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBatchProcessingError to be thrown")
}

describe("AstBatchProcessingService", () => {
    test("uses cpuCount multiplied by two as initial batch size for small inputs", async () => {
        const service = new AstBatchProcessingService({
            cpuCount: 4,
            enableAdaptiveSizing: false,
        })
        const observedBatchSizes: number[] = []

        const result = await service.process({
            items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            processor: (batch) => {
                observedBatchSizes.push(batch.length)
                return Promise.resolve(batch)
            },
        })

        expect(result.results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        expect(result.summary.initialBatchSize).toBe(8)
        expect(observedBatchSizes).toEqual([8, 2])
    })

    test("adapts batch size based on observed duration per item", async () => {
        let nowMs = 0
        const durationsByBatch = [4, 120, 6, 6]
        const observedBatchSizes: number[] = []
        const service = new AstBatchProcessingService({
            cpuCount: 2,
            now: () => nowMs,
            fastDurationPerItemMs: 2,
            slowDurationPerItemMs: 8,
        })
        let batchCounter = 0

        const result = await service.process({
            items: Array.from({length: 20}, (_value, index) => index + 1),
            processor: (batch) => {
                observedBatchSizes.push(batch.length)

                const durationMs =
                    durationsByBatch[Math.min(batchCounter, durationsByBatch.length - 1)] ?? 0
                nowMs += durationMs
                batchCounter += 1

                return Promise.resolve(batch)
            },
        })

        expect(result.summary.increasedBatchCount).toBeGreaterThan(0)
        expect(result.summary.decreasedBatchCount).toBeGreaterThan(0)
        expect(observedBatchSizes[0]).toBe(4)
        expect(observedBatchSizes.includes(6)).toBe(true)
        expect(observedBatchSizes.includes(3)).toBe(true)
    })

    test("retries failed batches with exponential backoff", async () => {
        const backoffDurations: number[] = []
        const service = new AstBatchProcessingService({
            cpuCount: 2,
            enableAdaptiveSizing: false,
            sleep: (durationMs) => {
                backoffDurations.push(durationMs)
                return Promise.resolve()
            },
        })
        let attempt = 0

        const result = await service.process({
            items: [1, 2, 3, 4],
            processor: (batch) => {
                attempt += 1

                if (attempt === 1) {
                    return Promise.reject(new Error("transient"))
                }

                return Promise.resolve(batch)
            },
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 10,
                maxBackoffMs: 20,
            },
        })

        expect(result.results).toEqual([1, 2, 3, 4])
        expect(result.summary.retriedBatchCount).toBe(1)
        expect(backoffDurations).toEqual([10])
    })

    test("deduplicates in-flight runs by idempotency key", async () => {
        const service = new AstBatchProcessingService({
            cpuCount: 2,
        })
        const gate = createDeferred<void>()
        let executionCount = 0

        const firstRun = service.process({
            items: ["a", "b"],
            idempotencyKey: "run-42",
            processor: (batch) => {
                executionCount += 1
                return gate.promise.then(() => batch)
            },
        })

        const secondRun = service.process({
            items: ["different"],
            idempotencyKey: "run-42",
            processor: () => Promise.resolve(["unexpected"]),
        })

        expect(firstRun).toBe(secondRun)
        gate.resolve(undefined)

        const result = await firstRun
        expect(result.results).toEqual(["a", "b"])
        expect(executionCount).toBe(1)
    })

    test("throws typed error when batch keeps failing after retries", async () => {
        const service = new AstBatchProcessingService({
            cpuCount: 2,
            sleep: () => Promise.resolve(),
        })

        await expectAstBatchProcessingErrorAsync(
            async () =>
                service.process({
                    items: [1, 2],
                    processor: () => Promise.reject(new Error("boom")),
                    retryPolicy: {
                        maxAttempts: 2,
                        initialBackoffMs: 1,
                        maxBackoffMs: 1,
                    },
                }),
            AST_BATCH_PROCESSING_ERROR_CODE.BATCH_PROCESSING_FAILED,
        )
    })

    test("throws typed errors for invalid options and input", async () => {
        expectAstBatchProcessingError(
            () => {
                void new AstBatchProcessingService({
                    cpuCount: 0,
                })
            },
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_CPU_COUNT,
        )

        expectAstBatchProcessingError(
            () => {
                void new AstBatchProcessingService({
                    minBatchSize: 4,
                    maxBatchSize: 2,
                })
            },
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_MAX_BATCH_SIZE,
        )

        const service = new AstBatchProcessingService({
            cpuCount: 2,
        })

        await expectAstBatchProcessingErrorAsync(
            async () =>
                service.process({
                    items: [],
                    processor: () => Promise.resolve([]),
                }),
            AST_BATCH_PROCESSING_ERROR_CODE.EMPTY_ITEMS,
        )

        await expectAstBatchProcessingErrorAsync(
            async () =>
                service.process({
                    items: [1],
                    processor: undefined as never,
                }),
            AST_BATCH_PROCESSING_ERROR_CODE.INVALID_PROCESSOR,
        )
    })
})
