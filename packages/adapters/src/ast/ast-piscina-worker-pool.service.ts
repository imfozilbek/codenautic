import {availableParallelism, cpus} from "node:os"

import {
    AST_PISCINA_WORKER_POOL_ERROR_CODE,
    AstPiscinaWorkerPoolError,
} from "./ast-piscina-worker-pool.error"

const DEFAULT_MAX_QUEUE_SIZE = 1000
const DEFAULT_CONCURRENCY_PER_WORKER = 2
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_BACKOFF_MS = 50
const DEFAULT_MAX_BACKOFF_MS = 1_000

/**
 * Retry decision callback for one failed attempt.
 */
export type AstPiscinaWorkerPoolShouldRetry = (error: unknown, attempt: number) => boolean

/**
 * Sleep function used by retry/backoff logic.
 */
export type AstPiscinaWorkerPoolSleep = (durationMs: number) => Promise<void>

/**
 * Retry policy for one submitted task.
 */
export interface IAstPiscinaWorkerPoolRetryPolicy {
    /**
     * Maximum number of attempts including the initial attempt.
     */
    readonly maxAttempts?: number

    /**
     * Initial retry backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum retry backoff in milliseconds.
     */
    readonly maxBackoffMs?: number

    /**
     * Optional callback to classify retryable failures.
     */
    readonly shouldRetry?: AstPiscinaWorkerPoolShouldRetry
}

/**
 * Task submission payload for piscina worker pool.
 */
export interface IAstPiscinaWorkerPoolTaskRequest<TPayload, TResult> {
    /**
     * Task processor function.
     */
    readonly processor: (payload: TPayload) => Promise<TResult>

    /**
     * Task payload.
     */
    readonly payload: TPayload

    /**
     * Optional idempotency key to deduplicate in-flight submissions.
     */
    readonly idempotencyKey?: string

    /**
     * Optional per-task retry policy override.
     */
    readonly retryPolicy?: IAstPiscinaWorkerPoolRetryPolicy
}

/**
 * Runtime options for piscina worker pool service.
 */
export interface IAstPiscinaWorkerPoolServiceOptions {
    /**
     * Optional CPU count override used for pool sizing.
     */
    readonly cpuCount?: number

    /**
     * Optional max queued task limit.
     */
    readonly maxQueueSize?: number

    /**
     * Optional concurrent tasks per worker.
     */
    readonly concurrencyPerWorker?: number

    /**
     * Optional default retry policy.
     */
    readonly defaultRetryPolicy?: IAstPiscinaWorkerPoolRetryPolicy

    /**
     * Optional sleep override for retry/backoff logic.
     */
    readonly sleep?: AstPiscinaWorkerPoolSleep
}

/**
 * Pool runtime metrics snapshot.
 */
export interface IAstPiscinaWorkerPoolStats {
    /**
     * CPU count used by pool sizing.
     */
    readonly cpuCount: number

    /**
     * Number of logical workers in pool.
     */
    readonly workerCount: number

    /**
     * Number of concurrent tasks per worker.
     */
    readonly concurrencyPerWorker: number

    /**
     * Global max active tasks.
     */
    readonly maxConcurrentTasks: number

    /**
     * Max queued task limit.
     */
    readonly maxQueueSize: number

    /**
     * Current active task count.
     */
    readonly activeTaskCount: number

    /**
     * Current queued task count.
     */
    readonly queuedTaskCount: number

    /**
     * Total accepted task count.
     */
    readonly acceptedTaskCount: number

    /**
     * Total completed task count.
     */
    readonly completedTaskCount: number

    /**
     * Total failed task count.
     */
    readonly failedTaskCount: number

    /**
     * Total retry attempts executed.
     */
    readonly retriedAttemptCount: number
}

/**
 * Piscina worker pool contract used by AST worker infrastructure.
 */
export interface IAstPiscinaWorkerPoolService {
    /**
     * Submits one task to the pool.
     *
     * @param request Task request.
     * @returns Task result.
     */
    runTask<TPayload, TResult>(request: IAstPiscinaWorkerPoolTaskRequest<TPayload, TResult>): Promise<TResult>

    /**
     * Waits until queue and active tasks become empty.
     *
     * @returns Promise resolved when pool is idle.
     */
    drain(): Promise<void>

    /**
     * Returns runtime metrics snapshot.
     *
     * @returns Runtime metrics snapshot.
     */
    getStats(): IAstPiscinaWorkerPoolStats
}

interface IAstPiscinaWorkerPoolTaskEnvelope<TResult> {
    readonly run: () => Promise<TResult>
    readonly retryPolicy: IAstPiscinaWorkerPoolNormalizedRetryPolicy
    readonly idempotencyKey?: string
    readonly resolve: (value: TResult) => void
    readonly reject: (error: unknown) => void
}

interface IAstPiscinaWorkerPoolNormalizedRetryPolicy {
    readonly maxAttempts: number
    readonly initialBackoffMs: number
    readonly maxBackoffMs: number
    readonly shouldRetry: AstPiscinaWorkerPoolShouldRetry
}

/**
 * Implements in-memory piscina-style worker pool contract for AST adapters.
 */
export class AstPiscinaWorkerPoolService implements IAstPiscinaWorkerPoolService {
    private readonly cpuCount: number
    private readonly workerCount: number
    private readonly concurrencyPerWorker: number
    private readonly maxConcurrentTasks: number
    private readonly maxQueueSize: number
    private readonly sleep: AstPiscinaWorkerPoolSleep
    private readonly defaultRetryPolicy: IAstPiscinaWorkerPoolNormalizedRetryPolicy
    private readonly queue: IAstPiscinaWorkerPoolTaskEnvelope<unknown>[] = []
    private readonly inFlightByIdempotencyKey = new Map<string, Promise<unknown>>()
    private activeTaskCount = 0
    private acceptedTaskCount = 0
    private completedTaskCount = 0
    private failedTaskCount = 0
    private retriedAttemptCount = 0
    private idleWaiters: Array<() => void> = []

    /**
     * Creates piscina worker pool service.
     *
     * @param options Optional pool configuration.
     */
    public constructor(options: IAstPiscinaWorkerPoolServiceOptions = {}) {
        this.cpuCount = validateCpuCount(options.cpuCount ?? detectCpuCount())
        this.workerCount = Math.max(1, this.cpuCount - 1)
        this.maxQueueSize = validateMaxQueueSize(options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE)
        this.concurrencyPerWorker = validateConcurrencyPerWorker(
            options.concurrencyPerWorker ?? DEFAULT_CONCURRENCY_PER_WORKER,
        )
        this.maxConcurrentTasks = this.workerCount * this.concurrencyPerWorker
        this.sleep = options.sleep ?? sleepFor
        this.defaultRetryPolicy = normalizeRetryPolicy(options.defaultRetryPolicy)
    }

    /**
     * Submits one task to the pool.
     *
     * @param request Task request.
     * @returns Task result.
     */
    public runTask<TPayload, TResult>(
        request: IAstPiscinaWorkerPoolTaskRequest<TPayload, TResult>,
    ): Promise<TResult> {
        if (typeof request.processor !== "function") {
            throw new AstPiscinaWorkerPoolError(
                AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_TASK_PROCESSOR,
            )
        }

        const idempotencyKey = normalizeIdempotencyKey(request.idempotencyKey)
        const existingTask = this.findInFlightTask<TResult>(idempotencyKey)

        if (existingTask !== undefined) {
            return existingTask
        }

        if (this.queue.length >= this.maxQueueSize) {
            throw new AstPiscinaWorkerPoolError(
                AST_PISCINA_WORKER_POOL_ERROR_CODE.QUEUE_CAPACITY_EXCEEDED,
                {
                    queueSize: this.queue.length,
                    maxQueueSize: this.maxQueueSize,
                    idempotencyKey,
                },
            )
        }

        const retryPolicy = mergeRetryPolicy(request.retryPolicy, this.defaultRetryPolicy)
        this.acceptedTaskCount += 1

        const taskPromise = new Promise<TResult>((resolve, reject) => {
            const envelope: IAstPiscinaWorkerPoolTaskEnvelope<TResult> = {
                run: async () => request.processor(request.payload),
                retryPolicy,
                idempotencyKey,
                resolve,
                reject,
            }
            this.queue.push(envelope as IAstPiscinaWorkerPoolTaskEnvelope<unknown>)
            this.dispatchTasks()
        })

        this.trackInFlightTask(idempotencyKey, taskPromise)
        return taskPromise
    }

    /**
     * Waits until queue and active tasks become empty.
     *
     * @returns Promise resolved when pool is idle.
     */
    public async drain(): Promise<void> {
        if (this.isIdle()) {
            return
        }

        await new Promise<void>((resolve) => {
            this.idleWaiters.push(resolve)
        })
    }

    /**
     * Returns runtime metrics snapshot.
     *
     * @returns Runtime metrics snapshot.
     */
    public getStats(): IAstPiscinaWorkerPoolStats {
        return {
            cpuCount: this.cpuCount,
            workerCount: this.workerCount,
            concurrencyPerWorker: this.concurrencyPerWorker,
            maxConcurrentTasks: this.maxConcurrentTasks,
            maxQueueSize: this.maxQueueSize,
            activeTaskCount: this.activeTaskCount,
            queuedTaskCount: this.queue.length,
            acceptedTaskCount: this.acceptedTaskCount,
            completedTaskCount: this.completedTaskCount,
            failedTaskCount: this.failedTaskCount,
            retriedAttemptCount: this.retriedAttemptCount,
        }
    }

    /**
     * Starts queued tasks while capacity is available.
     */
    private dispatchTasks(): void {
        while (this.activeTaskCount < this.maxConcurrentTasks && this.queue.length > 0) {
            const task = this.queue.shift()

            if (task === undefined) {
                return
            }

            this.activeTaskCount += 1
            void this.executeTask(task)
        }
    }

    /**
     * Executes one queued task with retry/backoff semantics.
     *
     * @param task Queued task.
     */
    private async executeTask(task: IAstPiscinaWorkerPoolTaskEnvelope<unknown>): Promise<void> {
        try {
            const result = await this.executeWithRetry(task.run, task.retryPolicy)
            this.completedTaskCount += 1
            task.resolve(result)
        } catch (error) {
            this.failedTaskCount += 1
            task.reject(error)
        } finally {
            this.activeTaskCount -= 1
            this.dispatchTasks()
            this.notifyIdleWaiters()
        }
    }

    /**
     * Executes one task with bounded retry/backoff policy.
     *
     * @param run Task callback.
     * @param retryPolicy Normalized retry policy.
     * @returns Task result.
     */
    private async executeWithRetry<TResult>(
        run: () => Promise<TResult>,
        retryPolicy: IAstPiscinaWorkerPoolNormalizedRetryPolicy,
    ): Promise<TResult> {
        let attempt = 1

        while (attempt <= retryPolicy.maxAttempts) {
            try {
                return await run()
            } catch (error) {
                const shouldRetry =
                    attempt < retryPolicy.maxAttempts &&
                    retryPolicy.shouldRetry(error, attempt)

                if (shouldRetry === false) {
                    throw new AstPiscinaWorkerPoolError(
                        AST_PISCINA_WORKER_POOL_ERROR_CODE.TASK_EXECUTION_FAILED,
                        {
                            attempts: attempt,
                            reason: normalizeErrorReason(error),
                        },
                    )
                }

                this.retriedAttemptCount += 1
                await this.sleep(
                    computeBackoffDuration(
                        attempt,
                        retryPolicy.initialBackoffMs,
                        retryPolicy.maxBackoffMs,
                    ),
                )
                attempt += 1
            }
        }

        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.TASK_EXECUTION_FAILED,
            {
                attempts: retryPolicy.maxAttempts,
                reason: "Retry loop exhausted unexpectedly",
            },
        )
    }

    /**
     * Registers idempotency mapping for submitted task.
     *
     * @param idempotencyKey Optional idempotency key.
     * @param taskPromise Task promise.
     */
    private trackInFlightTask<TResult>(
        idempotencyKey: string | undefined,
        taskPromise: Promise<TResult>,
    ): void {
        if (idempotencyKey === undefined) {
            return
        }

        this.inFlightByIdempotencyKey.set(idempotencyKey, taskPromise)
        void taskPromise.finally(() => {
            const inFlightTask = this.inFlightByIdempotencyKey.get(idempotencyKey)

            if (inFlightTask === taskPromise) {
                this.inFlightByIdempotencyKey.delete(idempotencyKey)
            }
        })
    }

    /**
     * Looks up an in-flight task by idempotency key.
     *
     * @param idempotencyKey Optional idempotency key.
     * @returns Existing in-flight task promise.
     */
    private findInFlightTask<TResult>(idempotencyKey: string | undefined): Promise<TResult> | undefined {
        if (idempotencyKey === undefined) {
            return undefined
        }

        const existingTask = this.inFlightByIdempotencyKey.get(idempotencyKey)

        if (existingTask === undefined) {
            return undefined
        }

        return existingTask as Promise<TResult>
    }

    /**
     * Notifies waiters when pool becomes idle.
     */
    private notifyIdleWaiters(): void {
        if (this.isIdle() === false || this.idleWaiters.length === 0) {
            return
        }

        const idleWaiters = this.idleWaiters
        this.idleWaiters = []

        for (const resolve of idleWaiters) {
            resolve()
        }
    }

    /**
     * Checks whether queue and active tasks are empty.
     *
     * @returns True when pool is idle.
     */
    private isIdle(): boolean {
        return this.activeTaskCount === 0 && this.queue.length === 0
    }
}

/**
 * Normalizes retry policy with defaults.
 *
 * @param retryPolicy Optional retry policy.
 * @returns Normalized retry policy.
 */
function normalizeRetryPolicy(
    retryPolicy: IAstPiscinaWorkerPoolRetryPolicy | undefined,
): IAstPiscinaWorkerPoolNormalizedRetryPolicy {
    const maxAttempts = validateMaxAttempts(retryPolicy?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    const initialBackoffMs = validateInitialBackoffMs(
        retryPolicy?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
    )
    const maxBackoffMs = validateMaxBackoffMs(retryPolicy?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS)

    if (maxBackoffMs < initialBackoffMs) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return {
        maxAttempts,
        initialBackoffMs,
        maxBackoffMs,
        shouldRetry: retryPolicy?.shouldRetry ?? defaultShouldRetry,
    }
}

/**
 * Merges task retry policy with service defaults.
 *
 * @param override Optional task-level policy override.
 * @param fallback Service-level normalized policy.
 * @returns Normalized merged retry policy.
 */
function mergeRetryPolicy(
    override: IAstPiscinaWorkerPoolRetryPolicy | undefined,
    fallback: IAstPiscinaWorkerPoolNormalizedRetryPolicy,
): IAstPiscinaWorkerPoolNormalizedRetryPolicy {
    if (override === undefined) {
        return fallback
    }

    return normalizeRetryPolicy({
        maxAttempts: override.maxAttempts ?? fallback.maxAttempts,
        initialBackoffMs: override.initialBackoffMs ?? fallback.initialBackoffMs,
        maxBackoffMs: override.maxBackoffMs ?? fallback.maxBackoffMs,
        shouldRetry: override.shouldRetry ?? fallback.shouldRetry,
    })
}

/**
 * Resolves CPU count from local runtime.
 *
 * @returns Runtime CPU count.
 */
function detectCpuCount(): number {
    try {
        return availableParallelism()
    } catch {
        return cpus().length
    }
}

/**
 * Validates CPU count input.
 *
 * @param cpuCount Raw CPU count.
 * @returns Validated CPU count.
 */
function validateCpuCount(cpuCount: number): number {
    if (Number.isSafeInteger(cpuCount) === false || cpuCount < 1) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_CPU_COUNT,
            {
                cpuCount,
            },
        )
    }

    return cpuCount
}

/**
 * Validates max queue size input.
 *
 * @param maxQueueSize Raw max queue size.
 * @returns Validated max queue size.
 */
function validateMaxQueueSize(maxQueueSize: number): number {
    if (Number.isSafeInteger(maxQueueSize) === false || maxQueueSize < 1) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_MAX_QUEUE_SIZE,
            {
                maxQueueSize,
            },
        )
    }

    return maxQueueSize
}

/**
 * Validates concurrency-per-worker input.
 *
 * @param concurrencyPerWorker Raw concurrency-per-worker value.
 * @returns Validated concurrency-per-worker value.
 */
function validateConcurrencyPerWorker(concurrencyPerWorker: number): number {
    if (Number.isSafeInteger(concurrencyPerWorker) === false || concurrencyPerWorker < 1) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_CONCURRENCY_PER_WORKER,
            {
                concurrencyPerWorker,
            },
        )
    }

    return concurrencyPerWorker
}

/**
 * Validates max attempts input.
 *
 * @param maxAttempts Raw max attempts value.
 * @returns Validated max attempts value.
 */
function validateMaxAttempts(maxAttempts: number): number {
    if (Number.isSafeInteger(maxAttempts) === false || maxAttempts < 1) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_MAX_ATTEMPTS,
            {
                maxAttempts,
            },
        )
    }

    return maxAttempts
}

/**
 * Validates initial backoff input.
 *
 * @param initialBackoffMs Raw initial backoff value.
 * @returns Validated initial backoff value.
 */
function validateInitialBackoffMs(initialBackoffMs: number): number {
    if (Number.isSafeInteger(initialBackoffMs) === false || initialBackoffMs < 0) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_INITIAL_BACKOFF_MS,
            {
                initialBackoffMs,
            },
        )
    }

    return initialBackoffMs
}

/**
 * Validates max backoff input.
 *
 * @param maxBackoffMs Raw max backoff value.
 * @returns Validated max backoff value.
 */
function validateMaxBackoffMs(maxBackoffMs: number): number {
    if (Number.isSafeInteger(maxBackoffMs) === false || maxBackoffMs < 0) {
        throw new AstPiscinaWorkerPoolError(
            AST_PISCINA_WORKER_POOL_ERROR_CODE.INVALID_MAX_BACKOFF_MS,
            {
                maxBackoffMs,
            },
        )
    }

    return maxBackoffMs
}

/**
 * Computes exponential backoff duration.
 *
 * @param attempt Current attempt number.
 * @param initialBackoffMs Initial retry backoff.
 * @param maxBackoffMs Max retry backoff.
 * @returns Backoff delay in milliseconds.
 */
function computeBackoffDuration(
    attempt: number,
    initialBackoffMs: number,
    maxBackoffMs: number,
): number {
    const exponent = Math.max(0, attempt - 1)
    const scaledBackoff = initialBackoffMs * 2 ** exponent
    return Math.min(maxBackoffMs, scaledBackoff)
}

/**
 * Normalizes idempotency key.
 *
 * @param idempotencyKey Optional idempotency key.
 * @returns Trimmed key or undefined.
 */
function normalizeIdempotencyKey(idempotencyKey: string | undefined): string | undefined {
    if (idempotencyKey === undefined) {
        return undefined
    }

    const normalized = idempotencyKey.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes failure reason string.
 *
 * @param error Unknown thrown value.
 * @returns Stable reason string.
 */
function normalizeErrorReason(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    return "Unknown error"
}

/**
 * Default retry classifier.
 *
 * @returns Always true.
 */
function defaultShouldRetry(): boolean {
    return true
}

/**
 * Sleeps for provided duration in milliseconds.
 *
 * @param durationMs Duration in milliseconds.
 * @returns Promise resolved after delay.
 */
async function sleepFor(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, durationMs)
    })
}
