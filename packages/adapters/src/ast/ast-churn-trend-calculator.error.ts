/**
 * Typed error codes for AST churn trend calculator.
 */
export const AST_CHURN_TREND_CALCULATOR_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    EMPTY_SAMPLES: "EMPTY_SAMPLES",
    INVALID_ACCELERATION_THRESHOLD: "INVALID_ACCELERATION_THRESHOLD",
    INVALID_CACHE_TTL_MS: "INVALID_CACHE_TTL_MS",
    INVALID_CHURN_VALUE: "INVALID_CHURN_VALUE",
    INVALID_DECELERATION_THRESHOLD: "INVALID_DECELERATION_THRESHOLD",
    INVALID_LOAD_SAMPLES: "INVALID_LOAD_SAMPLES",
    INVALID_MAX_LOAD_ATTEMPTS: "INVALID_MAX_LOAD_ATTEMPTS",
    INVALID_OBSERVED_AT: "INVALID_OBSERVED_AT",
    INVALID_RETRY_BACKOFF_MS: "INVALID_RETRY_BACKOFF_MS",
    INVALID_SAMPLE_FILE_PATH: "INVALID_SAMPLE_FILE_PATH",
    INVALID_SLEEP: "INVALID_SLEEP",
    INVALID_THRESHOLD_RELATION: "INVALID_THRESHOLD_RELATION",
    INVALID_WINDOW_SIZE: "INVALID_WINDOW_SIZE",
    LOAD_SAMPLES_FAILED: "LOAD_SAMPLES_FAILED",
    RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
} as const

/**
 * AST churn trend calculator error code literal.
 */
export type AstChurnTrendCalculatorErrorCode =
    (typeof AST_CHURN_TREND_CALCULATOR_ERROR_CODE)[keyof typeof AST_CHURN_TREND_CALCULATOR_ERROR_CODE]

/**
 * Structured metadata for AST churn trend calculator failures.
 */
export interface IAstChurnTrendCalculatorErrorDetails {
    /**
     * Repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid window value when available.
     */
    readonly windowSize?: number

    /**
     * Invalid threshold when available.
     */
    readonly threshold?: number

    /**
     * Invalid churn value when available.
     */
    readonly churn?: number

    /**
     * Invalid observedAt payload when available.
     */
    readonly observedAt?: string

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
 * Typed AST churn trend calculator error with stable metadata.
 */
export class AstChurnTrendCalculatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstChurnTrendCalculatorErrorCode

    /**
     * Repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid window value when available.
     */
    public readonly windowSize?: number

    /**
     * Invalid threshold when available.
     */
    public readonly threshold?: number

    /**
     * Invalid churn value when available.
     */
    public readonly churn?: number

    /**
     * Invalid observedAt payload when available.
     */
    public readonly observedAt?: string

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
     * Creates typed AST churn trend calculator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(
        code: AstChurnTrendCalculatorErrorCode,
        details: IAstChurnTrendCalculatorErrorDetails = {},
    ) {
        super(createAstChurnTrendCalculatorErrorMessage(code, details))

        this.name = "AstChurnTrendCalculatorError"
        this.code = code
        this.filePath = details.filePath
        this.windowSize = details.windowSize
        this.threshold = details.threshold
        this.churn = details.churn
        this.observedAt = details.observedAt
        this.attempt = details.attempt
        this.maxLoadAttempts = details.maxLoadAttempts
        this.retryBackoffMs = details.retryBackoffMs
        this.cacheTtlMs = details.cacheTtlMs
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST churn trend calculator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstChurnTrendCalculatorErrorMessage(
    code: AstChurnTrendCalculatorErrorCode,
    details: IAstChurnTrendCalculatorErrorDetails,
): string {
    return AST_CHURN_TREND_CALCULATOR_ERROR_MESSAGES[code](details)
}

const AST_CHURN_TREND_CALCULATOR_ERROR_MESSAGES: Readonly<
    Record<AstChurnTrendCalculatorErrorCode, (details: IAstChurnTrendCalculatorErrorDetails) => string>
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate churn trend file path: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILE_PATHS: () => "Churn trend calculator requires at least one file path",
    EMPTY_SAMPLES: () => "Churn trend calculator requires at least one sample",
    INVALID_ACCELERATION_THRESHOLD: (details) =>
        `Invalid acceleration threshold: ${details.threshold ?? Number.NaN}`,
    INVALID_CACHE_TTL_MS: (details) =>
        `Invalid churn trend cache TTL in milliseconds: ${details.cacheTtlMs ?? Number.NaN}`,
    INVALID_CHURN_VALUE: (details) =>
        `Invalid churn value for file ${details.filePath ?? "<unknown>"}: ${
            details.churn ?? Number.NaN
        }`,
    INVALID_DECELERATION_THRESHOLD: (details) =>
        `Invalid deceleration threshold: ${details.threshold ?? Number.NaN}`,
    INVALID_LOAD_SAMPLES: () =>
        "Churn trend calculator loadSamples callback must be a function",
    INVALID_MAX_LOAD_ATTEMPTS: (details) =>
        `Invalid max load attempts for churn trend calculator: ${
            details.maxLoadAttempts ?? Number.NaN
        }`,
    INVALID_OBSERVED_AT: (details) =>
        `Invalid observedAt value for file ${details.filePath ?? "<unknown>"}: ${
            details.observedAt ?? "<empty>"
        }`,
    INVALID_RETRY_BACKOFF_MS: (details) =>
        `Invalid churn trend retry backoff in milliseconds: ${
            details.retryBackoffMs ?? Number.NaN
        }`,
    INVALID_SAMPLE_FILE_PATH: (details) =>
        `Invalid sample file path for churn trend calculator: ${details.filePath ?? "<empty>"}`,
    INVALID_SLEEP: () => "Churn trend calculator sleep callback must be a function",
    INVALID_THRESHOLD_RELATION: (details) =>
        `Invalid threshold relation: acceleration ${details.threshold ?? Number.NaN}`,
    INVALID_WINDOW_SIZE: (details) =>
        `Invalid rolling window size for churn trend calculator: ${details.windowSize ?? Number.NaN}`,
    LOAD_SAMPLES_FAILED: (details) =>
        `Failed to load churn trend samples: ${details.causeMessage ?? "<unknown>"}`,
    RETRY_EXHAUSTED: (details) =>
        `Churn trend sample loading retries exhausted after ${
            details.maxLoadAttempts ?? Number.NaN
        } attempts: ${details.causeMessage ?? "<unknown>"}`,
}
