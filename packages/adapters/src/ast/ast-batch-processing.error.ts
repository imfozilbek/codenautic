/**
 * Typed error codes for AST batch processing service.
 */
export const AST_BATCH_PROCESSING_ERROR_CODE = {
    EMPTY_ITEMS: "EMPTY_ITEMS",
    INVALID_CPU_COUNT: "INVALID_CPU_COUNT",
    INVALID_SMALL_INPUT_THRESHOLD: "INVALID_SMALL_INPUT_THRESHOLD",
    INVALID_MIN_BATCH_SIZE: "INVALID_MIN_BATCH_SIZE",
    INVALID_MAX_BATCH_SIZE: "INVALID_MAX_BATCH_SIZE",
    INVALID_FAST_DURATION_PER_ITEM_MS: "INVALID_FAST_DURATION_PER_ITEM_MS",
    INVALID_SLOW_DURATION_PER_ITEM_MS: "INVALID_SLOW_DURATION_PER_ITEM_MS",
    INVALID_MAX_ATTEMPTS: "INVALID_MAX_ATTEMPTS",
    INVALID_INITIAL_BACKOFF_MS: "INVALID_INITIAL_BACKOFF_MS",
    INVALID_MAX_BACKOFF_MS: "INVALID_MAX_BACKOFF_MS",
    INVALID_PROCESSOR: "INVALID_PROCESSOR",
    BATCH_PROCESSING_FAILED: "BATCH_PROCESSING_FAILED",
} as const

/**
 * AST batch processing error code literal.
 */
export type AstBatchProcessingErrorCode =
    (typeof AST_BATCH_PROCESSING_ERROR_CODE)[keyof typeof AST_BATCH_PROCESSING_ERROR_CODE]

/**
 * Structured metadata for AST batch processing failures.
 */
export interface IAstBatchProcessingErrorDetails {
    /**
     * Invalid CPU count value when available.
     */
    readonly cpuCount?: number

    /**
     * Invalid threshold value when available.
     */
    readonly smallInputThreshold?: number

    /**
     * Invalid min batch size when available.
     */
    readonly minBatchSize?: number

    /**
     * Invalid max batch size when available.
     */
    readonly maxBatchSize?: number

    /**
     * Invalid fast duration threshold when available.
     */
    readonly fastDurationPerItemMs?: number

    /**
     * Invalid slow duration threshold when available.
     */
    readonly slowDurationPerItemMs?: number

    /**
     * Invalid max retry attempts when available.
     */
    readonly maxAttempts?: number

    /**
     * Invalid initial backoff when available.
     */
    readonly initialBackoffMs?: number

    /**
     * Invalid max backoff when available.
     */
    readonly maxBackoffMs?: number

    /**
     * Number of attempts that were executed.
     */
    readonly attempts?: number

    /**
     * Zero-based failed batch index.
     */
    readonly batchIndex?: number

    /**
     * Failure reason when available.
     */
    readonly reason?: string
}

/**
 * Typed AST batch processing error with stable metadata.
 */
export class AstBatchProcessingError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstBatchProcessingErrorCode

    /**
     * Invalid CPU count value when available.
     */
    public readonly cpuCount?: number

    /**
     * Invalid threshold value when available.
     */
    public readonly smallInputThreshold?: number

    /**
     * Invalid min batch size when available.
     */
    public readonly minBatchSize?: number

    /**
     * Invalid max batch size when available.
     */
    public readonly maxBatchSize?: number

    /**
     * Invalid fast duration threshold when available.
     */
    public readonly fastDurationPerItemMs?: number

    /**
     * Invalid slow duration threshold when available.
     */
    public readonly slowDurationPerItemMs?: number

    /**
     * Invalid max retry attempts when available.
     */
    public readonly maxAttempts?: number

    /**
     * Invalid initial backoff when available.
     */
    public readonly initialBackoffMs?: number

    /**
     * Invalid max backoff when available.
     */
    public readonly maxBackoffMs?: number

    /**
     * Number of attempts that were executed.
     */
    public readonly attempts?: number

    /**
     * Zero-based failed batch index.
     */
    public readonly batchIndex?: number

    /**
     * Failure reason when available.
     */
    public readonly reason?: string

    /**
     * Creates typed AST batch processing error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstBatchProcessingErrorCode,
        details: IAstBatchProcessingErrorDetails = {},
    ) {
        super(createAstBatchProcessingErrorMessage(code, details))

        this.name = "AstBatchProcessingError"
        this.code = code
        this.cpuCount = details.cpuCount
        this.smallInputThreshold = details.smallInputThreshold
        this.minBatchSize = details.minBatchSize
        this.maxBatchSize = details.maxBatchSize
        this.fastDurationPerItemMs = details.fastDurationPerItemMs
        this.slowDurationPerItemMs = details.slowDurationPerItemMs
        this.maxAttempts = details.maxAttempts
        this.initialBackoffMs = details.initialBackoffMs
        this.maxBackoffMs = details.maxBackoffMs
        this.attempts = details.attempts
        this.batchIndex = details.batchIndex
        this.reason = details.reason
    }
}

/**
 * Builds stable public message for AST batch processing failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstBatchProcessingErrorMessage(
    code: AstBatchProcessingErrorCode,
    details: IAstBatchProcessingErrorDetails,
): string {
    return AST_BATCH_PROCESSING_ERROR_MESSAGES[code](details)
}

const AST_BATCH_PROCESSING_ERROR_MESSAGES: Readonly<
    Record<AstBatchProcessingErrorCode, (details: IAstBatchProcessingErrorDetails) => string>
> = {
    EMPTY_ITEMS: () => "Batch processing item list cannot be empty",
    INVALID_CPU_COUNT: (details) =>
        `Invalid cpuCount for batch processing service: ${details.cpuCount ?? Number.NaN}`,
    INVALID_SMALL_INPUT_THRESHOLD: (details) =>
        `Invalid smallInputThreshold for batch processing service: ${
            details.smallInputThreshold ?? Number.NaN
        }`,
    INVALID_MIN_BATCH_SIZE: (details) =>
        `Invalid minBatchSize for batch processing service: ${details.minBatchSize ?? Number.NaN}`,
    INVALID_MAX_BATCH_SIZE: (details) =>
        `Invalid maxBatchSize for batch processing service: ${details.maxBatchSize ?? Number.NaN}`,
    INVALID_FAST_DURATION_PER_ITEM_MS: (details) =>
        `Invalid fastDurationPerItemMs for batch processing service: ${
            details.fastDurationPerItemMs ?? Number.NaN
        }`,
    INVALID_SLOW_DURATION_PER_ITEM_MS: (details) =>
        `Invalid slowDurationPerItemMs for batch processing service: ${
            details.slowDurationPerItemMs ?? Number.NaN
        }`,
    INVALID_MAX_ATTEMPTS: (details) =>
        `Invalid maxAttempts for batch processing service: ${details.maxAttempts ?? Number.NaN}`,
    INVALID_INITIAL_BACKOFF_MS: (details) =>
        `Invalid initialBackoffMs for batch processing service: ${
            details.initialBackoffMs ?? Number.NaN
        }`,
    INVALID_MAX_BACKOFF_MS: (details) =>
        `Invalid maxBackoffMs for batch processing service: ${details.maxBackoffMs ?? Number.NaN}`,
    INVALID_PROCESSOR: () => "Batch processing processor must be a function",
    BATCH_PROCESSING_FAILED: (details) =>
        `Batch processing failed at batch #${details.batchIndex ?? Number.NaN} after ${
            details.attempts ?? Number.NaN
        } attempts: ${details.reason ?? "<unknown>"}`,
}
