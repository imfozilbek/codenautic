import {describe, expect, test} from "bun:test"

import {
    AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE,
    AstGarbageCollectionTriggerError,
    AstGarbageCollectionTriggerService,
} from "../../src/ast"

/**
 * Asserts typed garbage-collection-trigger error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstGarbageCollectionTriggerError(
    callback: () => unknown,
    code:
        (typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE)[keyof typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstGarbageCollectionTriggerError)

        if (error instanceof AstGarbageCollectionTriggerError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstGarbageCollectionTriggerError to be thrown")
}

/**
 * Asserts typed garbage-collection-trigger error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstGarbageCollectionTriggerErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE)[keyof typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstGarbageCollectionTriggerError)

        if (error instanceof AstGarbageCollectionTriggerError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstGarbageCollectionTriggerError to be thrown")
}

describe("AstGarbageCollectionTriggerService", () => {
    test("triggers GC at or above seventy percent utilization", async () => {
        const samples = [
            {
                usedBytes: 600,
                totalBytes: 1_000,
                sampleId: "sample-1",
            },
            {
                usedBytes: 700,
                totalBytes: 1_000,
                sampleId: "sample-2",
            },
            {
                usedBytes: 900,
                totalBytes: 1_000,
                sampleId: "sample-3",
            },
        ]
        let sampleCursor = 0
        let triggerCount = 0
        const service = new AstGarbageCollectionTriggerService({
            snapshotProvider: () => {
                const sample = samples[sampleCursor]
                sampleCursor += 1

                if (sample === undefined) {
                    return Promise.resolve({
                        usedBytes: 500,
                        totalBytes: 1_000,
                        sampleId: `sample-fallback-${String(sampleCursor)}`,
                    })
                }

                return Promise.resolve(sample)
            },
            gcInvoker: () => {
                triggerCount += 1
                return Promise.resolve()
            },
        })

        await service.checkNow()
        await service.checkNow()
        const status = await service.checkNow()

        expect(status.thresholdPercent).toBe(70)
        expect(status.triggerCount).toBe(2)
        expect(status.utilizationPercent).toBe(90)
        expect(triggerCount).toBe(2)
    })

    test("deduplicates checks by sample id for idempotency", async () => {
        const samples = [
            {
                usedBytes: 800,
                totalBytes: 1_000,
                sampleId: "same-id",
            },
            {
                usedBytes: 900,
                totalBytes: 1_000,
                sampleId: "same-id",
            },
        ]
        let sampleCursor = 0
        let triggerCount = 0
        const service = new AstGarbageCollectionTriggerService({
            snapshotProvider: () => {
                const sample = samples[sampleCursor]
                sampleCursor += 1

                if (sample === undefined) {
                    return Promise.resolve({
                        usedBytes: 500,
                        totalBytes: 1_000,
                        sampleId: "fallback",
                    })
                }

                return Promise.resolve(sample)
            },
            gcInvoker: () => {
                triggerCount += 1
                return Promise.resolve()
            },
        })

        await service.checkNow()
        const status = await service.checkNow()

        expect(status.triggerCount).toBe(1)
        expect(triggerCount).toBe(1)
    })

    test("runs periodic checks every ten seconds and can be stopped", async () => {
        let intervalHandler: (() => void) | undefined
        const clearCalls: unknown[] = []
        const timerHandle = {
            id: "gc-timer",
        }

        const service = new AstGarbageCollectionTriggerService({
            checkIntervalMs: 10_000,
            snapshotProvider: () =>
                Promise.resolve({
                    usedBytes: 600,
                    totalBytes: 1_000,
                    sampleId: "interval-sample",
                }),
            gcInvoker: () => Promise.resolve(),
            setIntervalFn: (handler, intervalMs) => {
                intervalHandler = handler
                expect(intervalMs).toBe(10_000)
                return timerHandle
            },
            clearIntervalFn: (handle) => {
                clearCalls.push(handle)
            },
        })

        expect(service.getStatus().isRunning).toBe(false)

        service.start()
        expect(service.getStatus().isRunning).toBe(true)

        if (intervalHandler === undefined) {
            throw new Error("Interval handler was not scheduled")
        }

        intervalHandler()
        await Promise.resolve()

        service.stop()
        expect(service.getStatus().isRunning).toBe(false)
        expect(clearCalls).toEqual([timerHandle])
    })

    test("retries snapshot and GC failures with backoff", async () => {
        const backoffDurations: number[] = []
        let snapshotAttempt = 0
        let gcAttempt = 0
        const service = new AstGarbageCollectionTriggerService({
            snapshotProvider: () => {
                snapshotAttempt += 1

                if (snapshotAttempt < 2) {
                    return Promise.reject(new Error("temporary snapshot failure"))
                }

                return Promise.resolve({
                    usedBytes: 900,
                    totalBytes: 1_000,
                    sampleId: "retry-sample",
                })
            },
            gcInvoker: () => {
                gcAttempt += 1

                if (gcAttempt < 2) {
                    return Promise.reject(new Error("temporary gc failure"))
                }

                return Promise.resolve()
            },
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 5,
                maxBackoffMs: 10,
            },
            sleep: (durationMs) => {
                backoffDurations.push(durationMs)
                return Promise.resolve()
            },
        })

        const status = await service.checkNow()

        expect(status.triggerCount).toBe(1)
        expect(snapshotAttempt).toBe(2)
        expect(gcAttempt).toBe(2)
        expect(backoffDurations).toEqual([5, 5])
    })

    test("throws typed errors for invalid options and terminal failures", async () => {
        expectAstGarbageCollectionTriggerError(
            () => {
                void new AstGarbageCollectionTriggerService({
                    thresholdPercent: 0,
                })
            },
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_THRESHOLD_PERCENT,
        )

        expectAstGarbageCollectionTriggerError(
            () => {
                void new AstGarbageCollectionTriggerService({
                    snapshotProvider: "invalid-provider" as never,
                })
            },
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_SNAPSHOT_PROVIDER,
        )

        const invalidSampleService = new AstGarbageCollectionTriggerService({
            snapshotProvider: () =>
                Promise.resolve({
                    usedBytes: 1_001,
                    totalBytes: 1_000,
                    sampleId: "invalid-sample",
                }),
            gcInvoker: () => Promise.resolve(),
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        await expectAstGarbageCollectionTriggerErrorAsync(
            async () => invalidSampleService.checkNow(),
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.INVALID_USED_BYTES,
        )

        const snapshotFailureService = new AstGarbageCollectionTriggerService({
            snapshotProvider: () => Promise.reject(new Error("down")),
            gcInvoker: () => Promise.resolve(),
            retryPolicy: {
                maxAttempts: 2,
                initialBackoffMs: 1,
                maxBackoffMs: 1,
            },
            sleep: () => Promise.resolve(),
        })

        await expectAstGarbageCollectionTriggerErrorAsync(
            async () => snapshotFailureService.checkNow(),
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.SNAPSHOT_PROVIDER_FAILED,
        )

        const gcFailureService = new AstGarbageCollectionTriggerService({
            snapshotProvider: () =>
                Promise.resolve({
                    usedBytes: 900,
                    totalBytes: 1_000,
                    sampleId: "gc-failure",
                }),
            gcInvoker: () => Promise.reject(new Error("gc-down")),
            retryPolicy: {
                maxAttempts: 2,
                initialBackoffMs: 1,
                maxBackoffMs: 1,
            },
            sleep: () => Promise.resolve(),
        })

        await expectAstGarbageCollectionTriggerErrorAsync(
            async () => gcFailureService.checkNow(),
            AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE.GC_TRIGGER_FAILED,
        )
    })
})
