/**
 * Typed error codes for AST piscina worker pool.
 */
export const AST_PISCINA_WORKER_POOL_ERROR_CODE = {
    INVALID_CPU_COUNT: "INVALID_CPU_COUNT",
    INVALID_MAX_QUEUE_SIZE: "INVALID_MAX_QUEUE_SIZE",
    INVALID_CONCURRENCY_PER_WORKER: "INVALID_CONCURRENCY_PER_WORKER",
    INVALID_MAX_ATTEMPTS: "INVALID_MAX_ATTEMPTS",
    INVALID_INITIAL_BACKOFF_MS: "INVALID_INITIAL_BACKOFF_MS",
    INVALID_MAX_BACKOFF_MS: "INVALID_MAX_BACKOFF_MS",
    INVALID_TASK_PROCESSOR: "INVALID_TASK_PROCESSOR",
    QUEUE_CAPACITY_EXCEEDED: "QUEUE_CAPACITY_EXCEEDED",
    TASK_EXECUTION_FAILED: "TASK_EXECUTION_FAILED",
} as const

/**
 * AST piscina worker pool error code literal.
 */
export type AstPiscinaWorkerPoolErrorCode =
    (typeof AST_PISCINA_WORKER_POOL_ERROR_CODE)[keyof typeof AST_PISCINA_WORKER_POOL_ERROR_CODE]

/**
 * Structured metadata for AST piscina worker pool failures.
 */
export interface IAstPiscinaWorkerPoolErrorDetails {
    /**
     * Invalid CPU count value when available.
     */
    readonly cpuCount?: number

    /**
     * Invalid max queue size value when available.
     */
    readonly maxQueueSize?: number

    /**
     * Invalid concurrency per worker value when available.
     */
    readonly concurrencyPerWorker?: number

    /**
     * Invalid max retry attempts value when available.
     */
    readonly maxAttempts?: number

    /**
     * Invalid initial backoff value when available.
     */
    readonly initialBackoffMs?: number

    /**
     * Invalid max backoff value when available.
     */
    readonly maxBackoffMs?: number

    /**
     * Queue size at failure time when available.
     */
    readonly queueSize?: number

    /**
     * Stable idempotency key when available.
     */
    readonly idempotencyKey?: string

    /**
     * Number of attempts that were executed.
     */
    readonly attempts?: number

    /**
     * Failure message when available.
     */
    readonly reason?: string
}

/**
 * Typed AST piscina worker pool error with stable metadata.
 */
export class AstPiscinaWorkerPoolError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstPiscinaWorkerPoolErrorCode

    /**
     * Invalid CPU count value when available.
     */
    public readonly cpuCount?: number

    /**
     * Invalid max queue size value when available.
     */
    public readonly maxQueueSize?: number

    /**
     * Invalid concurrency per worker value when available.
     */
    public readonly concurrencyPerWorker?: number

    /**
     * Invalid max retry attempts value when available.
     */
    public readonly maxAttempts?: number

    /**
     * Invalid initial backoff value when available.
     */
    public readonly initialBackoffMs?: number

    /**
     * Invalid max backoff value when available.
     */
    public readonly maxBackoffMs?: number

    /**
     * Queue size at failure time when available.
     */
    public readonly queueSize?: number

    /**
     * Stable idempotency key when available.
     */
    public readonly idempotencyKey?: string

    /**
     * Number of attempts that were executed.
     */
    public readonly attempts?: number

    /**
     * Failure message when available.
     */
    public readonly reason?: string

    /**
     * Creates typed AST piscina worker pool error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstPiscinaWorkerPoolErrorCode,
        details: IAstPiscinaWorkerPoolErrorDetails = {},
    ) {
        super(createAstPiscinaWorkerPoolErrorMessage(code, details))

        this.name = "AstPiscinaWorkerPoolError"
        this.code = code
        this.cpuCount = details.cpuCount
        this.maxQueueSize = details.maxQueueSize
        this.concurrencyPerWorker = details.concurrencyPerWorker
        this.maxAttempts = details.maxAttempts
        this.initialBackoffMs = details.initialBackoffMs
        this.maxBackoffMs = details.maxBackoffMs
        this.queueSize = details.queueSize
        this.idempotencyKey = details.idempotencyKey
        this.attempts = details.attempts
        this.reason = details.reason
    }
}

/**
 * Builds stable public message for AST piscina worker pool failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstPiscinaWorkerPoolErrorMessage(
    code: AstPiscinaWorkerPoolErrorCode,
    details: IAstPiscinaWorkerPoolErrorDetails,
): string {
    return AST_PISCINA_WORKER_POOL_ERROR_MESSAGES[code](details)
}

const AST_PISCINA_WORKER_POOL_ERROR_MESSAGES: Readonly<
    Record<AstPiscinaWorkerPoolErrorCode, (details: IAstPiscinaWorkerPoolErrorDetails) => string>
> = {
    INVALID_CPU_COUNT: (details) =>
        `Invalid cpuCount for piscina worker pool: ${details.cpuCount ?? Number.NaN}`,
    INVALID_MAX_QUEUE_SIZE: (details) =>
        `Invalid maxQueueSize for piscina worker pool: ${details.maxQueueSize ?? Number.NaN}`,
    INVALID_CONCURRENCY_PER_WORKER: (details) =>
        `Invalid concurrencyPerWorker for piscina worker pool: ${
            details.concurrencyPerWorker ?? Number.NaN
        }`,
    INVALID_MAX_ATTEMPTS: (details) =>
        `Invalid maxAttempts for piscina worker pool: ${details.maxAttempts ?? Number.NaN}`,
    INVALID_INITIAL_BACKOFF_MS: (details) =>
        `Invalid initialBackoffMs for piscina worker pool: ${
            details.initialBackoffMs ?? Number.NaN
        }`,
    INVALID_MAX_BACKOFF_MS: (details) =>
        `Invalid maxBackoffMs for piscina worker pool: ${details.maxBackoffMs ?? Number.NaN}`,
    INVALID_TASK_PROCESSOR: () => "Piscina worker pool task processor must be a function",
    QUEUE_CAPACITY_EXCEEDED: (details) =>
        `Piscina worker pool queue limit reached: ${
            details.queueSize ?? Number.NaN
        }/${details.maxQueueSize ?? Number.NaN}`,
    TASK_EXECUTION_FAILED: (details) =>
        `Piscina worker pool task failed after ${details.attempts ?? Number.NaN} attempts: ${
            details.reason ?? "<unknown>"
        }`,
}
