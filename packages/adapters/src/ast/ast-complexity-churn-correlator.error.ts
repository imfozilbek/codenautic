/**
 * Typed error codes for AST complexity-churn correlator.
 */
export const AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    EMPTY_POINTS: "EMPTY_POINTS",
    INVALID_CACHE_TTL_MS: "INVALID_CACHE_TTL_MS",
    INVALID_CHURN: "INVALID_CHURN",
    INVALID_COMPLEXITY: "INVALID_COMPLEXITY",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_HIGH_CHURN_PERCENTILE: "INVALID_HIGH_CHURN_PERCENTILE",
    INVALID_HIGH_COMPLEXITY_PERCENTILE: "INVALID_HIGH_COMPLEXITY_PERCENTILE",
    INVALID_LOAD_POINTS: "INVALID_LOAD_POINTS",
    INVALID_MAX_LOAD_ATTEMPTS: "INVALID_MAX_LOAD_ATTEMPTS",
    INVALID_RETRY_BACKOFF_MS: "INVALID_RETRY_BACKOFF_MS",
    INVALID_SLEEP: "INVALID_SLEEP",
    LOAD_POINTS_FAILED: "LOAD_POINTS_FAILED",
    RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
} as const

/**
 * AST complexity-churn correlator error code literal.
 */
export type AstComplexityChurnCorrelatorErrorCode =
    (typeof AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE)[keyof typeof AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE]

/**
 * Structured metadata for AST complexity-churn correlator failures.
 */
export interface IAstComplexityChurnCorrelatorErrorDetails {
    /**
     * Repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid complexity value when available.
     */
    readonly complexity?: number

    /**
     * Invalid churn value when available.
     */
    readonly churn?: number

    /**
     * Invalid percentile threshold when available.
     */
    readonly percentile?: number

    /**
     * Retry attempt number when available.
     */
    readonly attempt?: number

    /**
     * Maximum load attempts when available.
     */
    readonly maxLoadAttempts?: number

    /**
     * Retry backoff in milliseconds when available.
     */
    readonly retryBackoffMs?: number

    /**
     * Cache TTL in milliseconds when available.
     */
    readonly cacheTtlMs?: number

    /**
     * Underlying error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST complexity-churn correlator error with stable metadata.
 */
export class AstComplexityChurnCorrelatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstComplexityChurnCorrelatorErrorCode

    /**
     * Repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid complexity value when available.
     */
    public readonly complexity?: number

    /**
     * Invalid churn value when available.
     */
    public readonly churn?: number

    /**
     * Invalid percentile threshold when available.
     */
    public readonly percentile?: number

    /**
     * Retry attempt number when available.
     */
    public readonly attempt?: number

    /**
     * Maximum load attempts when available.
     */
    public readonly maxLoadAttempts?: number

    /**
     * Retry backoff in milliseconds when available.
     */
    public readonly retryBackoffMs?: number

    /**
     * Cache TTL in milliseconds when available.
     */
    public readonly cacheTtlMs?: number

    /**
     * Underlying error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST complexity-churn correlator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(
        code: AstComplexityChurnCorrelatorErrorCode,
        details: IAstComplexityChurnCorrelatorErrorDetails = {},
    ) {
        super(createAstComplexityChurnCorrelatorErrorMessage(code, details))

        this.name = "AstComplexityChurnCorrelatorError"
        this.code = code
        this.filePath = details.filePath
        this.complexity = details.complexity
        this.churn = details.churn
        this.percentile = details.percentile
        this.attempt = details.attempt
        this.maxLoadAttempts = details.maxLoadAttempts
        this.retryBackoffMs = details.retryBackoffMs
        this.cacheTtlMs = details.cacheTtlMs
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for correlator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstComplexityChurnCorrelatorErrorMessage(
    code: AstComplexityChurnCorrelatorErrorCode,
    details: IAstComplexityChurnCorrelatorErrorDetails,
): string {
    return AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_MESSAGES[code](details)
}

const AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_MESSAGES: Readonly<
    Record<AstComplexityChurnCorrelatorErrorCode, (details: IAstComplexityChurnCorrelatorErrorDetails) => string>
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate complexity-churn file path: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILE_PATHS: () =>
        "Complexity-churn correlator requires at least one file path",
    EMPTY_POINTS: () =>
        "Complexity-churn correlator requires at least one point",
    INVALID_CACHE_TTL_MS: (details) =>
        `Invalid correlator cache TTL in milliseconds: ${details.cacheTtlMs ?? Number.NaN}`,
    INVALID_CHURN: (details) =>
        `Invalid churn value for ${details.filePath ?? "<unknown>"}: ${details.churn ?? Number.NaN}`,
    INVALID_COMPLEXITY: (details) =>
        `Invalid complexity value for ${details.filePath ?? "<unknown>"}: ${
            details.complexity ?? Number.NaN
        }`,
    INVALID_FILE_PATH: (details) =>
        `Invalid correlator file path: ${details.filePath ?? "<empty>"}`,
    INVALID_HIGH_CHURN_PERCENTILE: (details) =>
        `Invalid high churn percentile: ${details.percentile ?? Number.NaN}`,
    INVALID_HIGH_COMPLEXITY_PERCENTILE: (details) =>
        `Invalid high complexity percentile: ${details.percentile ?? Number.NaN}`,
    INVALID_LOAD_POINTS: () => "Complexity-churn correlator loadPoints must be a function",
    INVALID_MAX_LOAD_ATTEMPTS: (details) =>
        `Invalid max load attempts for correlator: ${details.maxLoadAttempts ?? Number.NaN}`,
    INVALID_RETRY_BACKOFF_MS: (details) =>
        `Invalid correlator retry backoff in milliseconds: ${
            details.retryBackoffMs ?? Number.NaN
        }`,
    INVALID_SLEEP: () => "Complexity-churn correlator sleep callback must be a function",
    LOAD_POINTS_FAILED: (details) =>
        `Failed to load complexity-churn points: ${details.causeMessage ?? "<unknown>"}`,
    RETRY_EXHAUSTED: (details) =>
        `Complexity-churn point loading retries exhausted after ${
            details.maxLoadAttempts ?? Number.NaN
        } attempts: ${details.causeMessage ?? "<unknown>"}`,
}
