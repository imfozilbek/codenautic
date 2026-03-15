/**
 * Typed error codes for AST service result caching layer.
 */
export const AST_SERVICE_RESULT_CACHING_ERROR_CODE = {
    CACHE_KEY_RESOLUTION_FAILED: "CACHE_KEY_RESOLUTION_FAILED",
    INVALID_CACHE_TTL_MS: "INVALID_CACHE_TTL_MS",
    INVALID_COMMIT_SHA: "INVALID_COMMIT_SHA",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_IDEMPOTENCY_KEY: "INVALID_IDEMPOTENCY_KEY",
    INVALID_MAX_CACHE_ENTRIES: "INVALID_MAX_CACHE_ENTRIES",
    INVALID_REQUEST_ID: "INVALID_REQUEST_ID",
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    INVALID_RETRY_INITIAL_BACKOFF_MS: "INVALID_RETRY_INITIAL_BACKOFF_MS",
    INVALID_RETRY_MAX_ATTEMPTS: "INVALID_RETRY_MAX_ATTEMPTS",
    INVALID_RETRY_MAX_BACKOFF_MS: "INVALID_RETRY_MAX_BACKOFF_MS",
    RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
    RESULT_FETCH_FAILED: "RESULT_FETCH_FAILED",
} as const

/**
 * AST service result caching error code literal.
 */
export type AstServiceResultCachingErrorCode =
    (typeof AST_SERVICE_RESULT_CACHING_ERROR_CODE)[keyof typeof AST_SERVICE_RESULT_CACHING_ERROR_CODE]

/**
 * Structured metadata for AST service result caching failures.
 */
export interface IAstServiceResultCachingErrorDetails {
    /**
     * Repository id when available.
     */
    readonly repositoryId?: string

    /**
     * Commit sha when available.
     */
    readonly commitSha?: string

    /**
     * Request id when available.
     */
    readonly requestId?: string

    /**
     * File path when available.
     */
    readonly filePath?: string

    /**
     * Idempotency key when available.
     */
    readonly idempotencyKey?: string

    /**
     * Method name when available.
     */
    readonly methodName?: string

    /**
     * Numeric value when available.
     */
    readonly value?: number

    /**
     * Retry attempts when available.
     */
    readonly attempts?: number

    /**
     * Underlying error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST service result caching error with stable metadata.
 */
export class AstServiceResultCachingError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstServiceResultCachingErrorCode

    /**
     * Repository id when available.
     */
    public readonly repositoryId?: string

    /**
     * Commit sha when available.
     */
    public readonly commitSha?: string

    /**
     * Request id when available.
     */
    public readonly requestId?: string

    /**
     * File path when available.
     */
    public readonly filePath?: string

    /**
     * Idempotency key when available.
     */
    public readonly idempotencyKey?: string

    /**
     * Method name when available.
     */
    public readonly methodName?: string

    /**
     * Numeric value when available.
     */
    public readonly value?: number

    /**
     * Retry attempts when available.
     */
    public readonly attempts?: number

    /**
     * Underlying error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST service result caching error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(
        code: AstServiceResultCachingErrorCode,
        details: IAstServiceResultCachingErrorDetails = {},
    ) {
        super(createAstServiceResultCachingErrorMessage(code, details))

        this.name = "AstServiceResultCachingError"
        this.code = code
        this.repositoryId = details.repositoryId
        this.commitSha = details.commitSha
        this.requestId = details.requestId
        this.filePath = details.filePath
        this.idempotencyKey = details.idempotencyKey
        this.methodName = details.methodName
        this.value = details.value
        this.attempts = details.attempts
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST service result caching failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public error message.
 */
function createAstServiceResultCachingErrorMessage(
    code: AstServiceResultCachingErrorCode,
    details: IAstServiceResultCachingErrorDetails,
): string {
    return AST_SERVICE_RESULT_CACHING_ERROR_MESSAGES[code](details)
}

const AST_SERVICE_RESULT_CACHING_ERROR_MESSAGES: Readonly<
    Record<AstServiceResultCachingErrorCode, (details: IAstServiceResultCachingErrorDetails) => string>
> = {
    CACHE_KEY_RESOLUTION_FAILED: (details) =>
        `Failed to resolve AST result cache key for ${details.methodName ?? "<unknown>"}`,
    INVALID_CACHE_TTL_MS: (details) =>
        `Invalid AST result cache ttl ms: ${details.value ?? Number.NaN}`,
    INVALID_COMMIT_SHA: (details) =>
        `Invalid commit sha for AST result caching: ${details.commitSha ?? "<empty>"}`,
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for AST result caching: ${details.filePath ?? "<empty>"}`,
    INVALID_IDEMPOTENCY_KEY: (details) =>
        `Invalid idempotency key for AST result caching: ${details.idempotencyKey ?? "<empty>"}`,
    INVALID_MAX_CACHE_ENTRIES: (details) =>
        `Invalid AST result cache max entries: ${details.value ?? Number.NaN}`,
    INVALID_REQUEST_ID: (details) =>
        `Invalid request id for AST result caching: ${details.requestId ?? "<empty>"}`,
    INVALID_REPOSITORY_ID: (details) =>
        `Invalid repository id for AST result caching: ${details.repositoryId ?? "<empty>"}`,
    INVALID_RETRY_INITIAL_BACKOFF_MS: (details) =>
        `Invalid retry initial backoff ms for AST result caching: ${details.value ?? Number.NaN}`,
    INVALID_RETRY_MAX_ATTEMPTS: (details) =>
        `Invalid retry max attempts for AST result caching: ${details.value ?? Number.NaN}`,
    INVALID_RETRY_MAX_BACKOFF_MS: (details) =>
        `Invalid retry max backoff ms for AST result caching: ${details.value ?? Number.NaN}`,
    RETRY_EXHAUSTED: (details) =>
        `AST result caching retries exhausted for ${details.methodName ?? "<unknown>"} after ${
            details.attempts ?? 0
        } attempts: ${details.causeMessage ?? "<unknown>"}`,
    RESULT_FETCH_FAILED: (details) =>
        `AST result fetch failed for ${details.methodName ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
}
