import {describe, expect, test} from "bun:test"

import {
    AST_PISCINA_WORKER_POOL_ERROR_CODE,
    AstPiscinaWorkerPoolError,
    AstPiscinaWorkerPoolService,
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
 * Asserts typed worker-pool error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstPiscinaWorkerPoolError(
    callback: () => unknown,
    code:
        (typeof AST_PISCINA_WORKER_POOL_ERROR_CODE)[keyof typeof AST_PISCINA_WORKER_POOL_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstPiscinaWorkerPoolError)

        if (error instanceof AstPiscinaWorkerPoolError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstPiscinaWorkerPoolError to be thrown")
}

/**
 * Asserts typed worker-pool error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstPiscinaWorkerPoolErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_PISCINA_WORKER_POOL_ERROR_CODE)[keyof typeof AST_PISCINA_WORKER_POOL_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstPiscinaWorkerPoolError)

        if (error instanceof AstPiscinaWorkerPoolError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstPiscinaWorkerPoolError to be thrown")
}

describe("AstPiscinaWorkerPoolService", () => {
    test("derives cpu minus one workers and two concurrent tasks per worker", () => {
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 6,
        })
        const stats = workerPool.getStats()

        expect(stats.cpuCount).toBe(6)
        expect(stats.workerCount).toBe(5)
        expect(stats.concurrencyPerWorker).toBe(2)
        expect(stats.maxConcurrentTasks).toBe(10)
        expect(stats.maxQueueSize).toBe(1000)
    })

    test("respects global concurrency cap while queueing tasks", async () => {
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 3,
            maxQueueSize: 64,
        })

        let activeTaskCount = 0
        let maxObservedConcurrency = 0

        const tasks = Array.from({length: 10}, (_value, index) =>
            workerPool.runTask({
                payload: index,
                processor: async (payload) => {
                    activeTaskCount += 1
                    maxObservedConcurrency = Math.max(maxObservedConcurrency, activeTaskCount)
                    await new Promise<void>((resolve) => {
                        setTimeout(resolve, 5)
                    })
                    activeTaskCount -= 1
                    return payload * 2
                },
            }),
        )

        const results = await Promise.all(tasks)
        expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
        expect(maxObservedConcurrency).toBeLessThanOrEqual(4)
        expect(workerPool.getStats().completedTaskCount).toBe(10)
    })

    test("rejects task submission when queue capacity is exceeded", async () => {
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 2,
            maxQueueSize: 1,
            concurrencyPerWorker: 1,
        })
        const gate = createDeferred<void>()

        const processor = async (): Promise<string> => {
            await gate.promise
            return "done"
        }

        const firstTask = workerPool.runTask({
            payload: undefined,
            processor,
        })

        const secondTask = workerPool.runTask({
            payload: undefined,
            processor,
        })

        expectAstPiscinaWorkerPoolError(
            () => {
                void workerPool.runTask({
                    payload: undefined,
                    processor,
                })
            },
            AST_PISCINA_WORKER_POOL_ERROR_CODE.QUEUE_CAPACITY_EXCEEDED,
        )

        gate.resolve(undefined)
        await Promise.all([firstTask, secondTask])
    })

    test("retries failed tasks with exponential backoff", async () => {
        const backoffDurations: number[] = []
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 2,
            sleep: (durationMs) => {
                backoffDurations.push(durationMs)
                return Promise.resolve()
            },
        })
        let attempt = 0

        const result = await workerPool.runTask({
            payload: "payload",
            processor: (payload) => {
                attempt += 1

                if (attempt < 3) {
                    return Promise.reject(new Error("transient"))
                }

                return Promise.resolve(payload)
            },
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 10,
                maxBackoffMs: 20,
            },
        })

        expect(result).toBe("payload")
        expect(attempt).toBe(3)
        expect(backoffDurations).toEqual([10, 20])
        expect(workerPool.getStats().retriedAttemptCount).toBe(2)
    })

    test("deduplicates in-flight tasks by idempotency key", async () => {
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 2,
        })
        let executionCount = 0
        const gate = createDeferred<void>()

        const firstTask = workerPool.runTask({
            payload: "ok",
            idempotencyKey: "job-42",
            processor: async (payload) => {
                executionCount += 1
                await gate.promise
                return payload
            },
        })

        const secondTask = workerPool.runTask({
            payload: "ignored",
            idempotencyKey: "job-42",
            processor: () => Promise.resolve("unexpected"),
        })

        expect(firstTask).toBe(secondTask)

        gate.resolve(undefined)

        const result = await firstTask
        expect(result).toBe("ok")
        expect(executionCount).toBe(1)
        expect(workerPool.getStats().acceptedTaskCount).toBe(1)
    })

    test("throws typed error when task keeps failing after retries", async () => {
        const workerPool = new AstPiscinaWorkerPoolService({
            cpuCount: 2,
            sleep: () => Promise.resolve(),
        })

        await expectAstPiscinaWorkerPoolErrorAsync(
            async () =>
                workerPool.runTask({
                    payload: undefined,
                    processor: () => Promise.reject(new Error("boom")),
                    retryPolicy: {
                        maxAttempts: 2,
                        initialBackoffMs: 1,
                        maxBackoffMs: 1,
                    },
                }),
            AST_PISCINA_WORKER_POOL_ERROR_CODE.TASK_EXECUTION_FAILED,
        )

        expect(workerPool.getStats().failedTaskCount).toBe(1)
    })

    test("throws typed errors for invalid configuration", () => {
        expectAstPiscinaWorkerPoolError(
            () => {
                void new AstPiscinaWorkerPoolService({
                    cpuCount: 0,
                })
            },
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_CPU_COUNT,
        )

        expectAstPiscinaWorkerPoolError(
            () => {
                void new AstPiscinaWorkerPoolService({
                    maxQueueSize: 0,
                })
            },
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_MAX_QUEUE_SIZE,
        )

        expectAstPiscinaWorkerPoolError(
            () => {
                void new AstPiscinaWorkerPoolService({
                    concurrencyPerWorker: 0,
                })
            },
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_CONCURRENCY_PER_WORKER,
        )
    })
})
