/**
 * Typed error codes for AST worker task executor.
 */
export const AST_WORKER_TASK_EXECUTOR_ERROR_CODE = {
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_LANGUAGE: "INVALID_LANGUAGE",
    INVALID_CONTENT: "INVALID_CONTENT",
    INVALID_TIMEOUT_MS: "INVALID_TIMEOUT_MS",
    INVALID_MAX_ATTEMPTS: "INVALID_MAX_ATTEMPTS",
    INVALID_INITIAL_BACKOFF_MS: "INVALID_INITIAL_BACKOFF_MS",
    INVALID_MAX_BACKOFF_MS: "INVALID_MAX_BACKOFF_MS",
    INVALID_RUNNER: "INVALID_RUNNER",
    INVALID_WORKER_SCRIPT_URL: "INVALID_WORKER_SCRIPT_URL",
    WORKER_TIMEOUT: "WORKER_TIMEOUT",
    WORKER_TERMINATED: "WORKER_TERMINATED",
    WORKER_EXECUTION_FAILED: "WORKER_EXECUTION_FAILED",
    INVALID_WORKER_RESPONSE: "INVALID_WORKER_RESPONSE",
} as const

/**
 * AST worker task executor error code literal.
 */
export type AstWorkerTaskExecutorErrorCode =
    (typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE)[keyof typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE]

/**
 * Structured metadata for AST worker task executor failures.
 */
export interface IAstWorkerTaskExecutorErrorDetails {
    /**
     * Invalid file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid language value when available.
     */
    readonly language?: string

    /**
     * Invalid timeout value when available.
     */
    readonly timeoutMs?: number

    /**
     * Invalid max-attempts value when available.
     */
    readonly maxAttempts?: number

    /**
     * Invalid initial-backoff value when available.
     */
    readonly initialBackoffMs?: number

    /**
     * Invalid max-backoff value when available.
     */
    readonly maxBackoffMs?: number

    /**
     * Executed attempt count when available.
     */
    readonly attempts?: number

    /**
     * Worker exit code when available.
     */
    readonly exitCode?: number

    /**
     * Failure reason when available.
     */
    readonly reason?: string
}

/**
 * Typed AST worker task executor error with stable metadata.
 */
export class AstWorkerTaskExecutorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstWorkerTaskExecutorErrorCode

    /**
     * Invalid file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid language value when available.
     */
    public readonly language?: string

    /**
     * Invalid timeout value when available.
     */
    public readonly timeoutMs?: number

    /**
     * Invalid max-attempts value when available.
     */
    public readonly maxAttempts?: number

    /**
     * Invalid initial-backoff value when available.
     */
    public readonly initialBackoffMs?: number

    /**
     * Invalid max-backoff value when available.
     */
    public readonly maxBackoffMs?: number

    /**
     * Executed attempt count when available.
     */
    public readonly attempts?: number

    /**
     * Worker exit code when available.
     */
    public readonly exitCode?: number

    /**
     * Failure reason when available.
     */
    public readonly reason?: string

    /**
     * Creates typed AST worker task executor error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstWorkerTaskExecutorErrorCode,
        details: IAstWorkerTaskExecutorErrorDetails = {},
    ) {
        super(createAstWorkerTaskExecutorErrorMessage(code, details))

        this.name = "AstWorkerTaskExecutorError"
        this.code = code
        this.filePath = details.filePath
        this.language = details.language
        this.timeoutMs = details.timeoutMs
        this.maxAttempts = details.maxAttempts
        this.initialBackoffMs = details.initialBackoffMs
        this.maxBackoffMs = details.maxBackoffMs
        this.attempts = details.attempts
        this.exitCode = details.exitCode
        this.reason = details.reason
    }
}

/**
 * Builds stable public message for AST worker task executor failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstWorkerTaskExecutorErrorMessage(
    code: AstWorkerTaskExecutorErrorCode,
    details: IAstWorkerTaskExecutorErrorDetails,
): string {
    return AST_WORKER_TASK_EXECUTOR_ERROR_MESSAGES[code](details)
}

const AST_WORKER_TASK_EXECUTOR_ERROR_MESSAGES: Readonly<
    Record<AstWorkerTaskExecutorErrorCode, (details: IAstWorkerTaskExecutorErrorDetails) => string>
> = {
    INVALID_FILE_PATH: (details) =>
        `Invalid filePath for worker task executor: ${details.filePath ?? "<empty>"}`,
    INVALID_LANGUAGE: (details) =>
        `Invalid language for worker task executor: ${details.language ?? "<empty>"}`,
    INVALID_CONTENT: () => "Worker task executor content must be a string",
    INVALID_TIMEOUT_MS: (details) =>
        `Invalid timeoutMs for worker task executor: ${details.timeoutMs ?? Number.NaN}`,
    INVALID_MAX_ATTEMPTS: (details) =>
        `Invalid maxAttempts for worker task executor: ${details.maxAttempts ?? Number.NaN}`,
    INVALID_INITIAL_BACKOFF_MS: (details) =>
        `Invalid initialBackoffMs for worker task executor: ${
            details.initialBackoffMs ?? Number.NaN
        }`,
    INVALID_MAX_BACKOFF_MS: (details) =>
        `Invalid maxBackoffMs for worker task executor: ${details.maxBackoffMs ?? Number.NaN}`,
    INVALID_RUNNER: () => "Worker task executor runner must be a function when provided",
    INVALID_WORKER_SCRIPT_URL: () =>
        "Worker task executor workerScriptUrl must be a valid URL when provided",
    WORKER_TIMEOUT: (details) =>
        `Worker task execution timed out after ${details.timeoutMs ?? Number.NaN} ms`,
    WORKER_TERMINATED: (details) =>
        `Worker task terminated with exit code ${details.exitCode ?? Number.NaN}`,
    WORKER_EXECUTION_FAILED: (details) =>
        `Worker task execution failed after ${details.attempts ?? Number.NaN} attempts: ${
            details.reason ?? "<unknown>"
        }`,
    INVALID_WORKER_RESPONSE: () => "Worker task executor received invalid worker response payload",
}
