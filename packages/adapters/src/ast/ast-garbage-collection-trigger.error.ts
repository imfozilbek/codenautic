/**
 * Typed error codes for AST garbage collection trigger service.
 */
export const AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE = {
    INVALID_THRESHOLD_PERCENT: "INVALID_THRESHOLD_PERCENT",
    INVALID_CHECK_INTERVAL_MS: "INVALID_CHECK_INTERVAL_MS",
    INVALID_USED_BYTES: "INVALID_USED_BYTES",
    INVALID_TOTAL_BYTES: "INVALID_TOTAL_BYTES",
    INVALID_MAX_ATTEMPTS: "INVALID_MAX_ATTEMPTS",
    INVALID_INITIAL_BACKOFF_MS: "INVALID_INITIAL_BACKOFF_MS",
    INVALID_MAX_BACKOFF_MS: "INVALID_MAX_BACKOFF_MS",
    INVALID_SNAPSHOT_PROVIDER: "INVALID_SNAPSHOT_PROVIDER",
    INVALID_GC_INVOKER: "INVALID_GC_INVOKER",
    INVALID_SLEEP: "INVALID_SLEEP",
    INVALID_NOW: "INVALID_NOW",
    INVALID_SET_INTERVAL: "INVALID_SET_INTERVAL",
    INVALID_CLEAR_INTERVAL: "INVALID_CLEAR_INTERVAL",
    SNAPSHOT_PROVIDER_FAILED: "SNAPSHOT_PROVIDER_FAILED",
    GC_TRIGGER_FAILED: "GC_TRIGGER_FAILED",
} as const

/**
 * AST garbage collection trigger error code literal.
 */
export type AstGarbageCollectionTriggerErrorCode =
    (typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE)[keyof typeof AST_GARBAGE_COLLECTION_TRIGGER_ERROR_CODE]

/**
 * Structured metadata for AST garbage collection trigger failures.
 */
export interface IAstGarbageCollectionTriggerErrorDetails {
    /**
     * Invalid threshold percent when available.
     */
    readonly thresholdPercent?: number

    /**
     * Invalid check interval in milliseconds when available.
     */
    readonly checkIntervalMs?: number

    /**
     * Invalid used bytes value when available.
     */
    readonly usedBytes?: number

    /**
     * Invalid total bytes value when available.
     */
    readonly totalBytes?: number

    /**
     * Invalid max attempts when available.
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
     * Number of attempts executed.
     */
    readonly attempts?: number

    /**
     * Stable failure reason when available.
     */
    readonly reason?: string
}

/**
 * Typed AST garbage collection trigger error with stable metadata.
 */
export class AstGarbageCollectionTriggerError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstGarbageCollectionTriggerErrorCode

    /**
     * Invalid threshold percent when available.
     */
    public readonly thresholdPercent?: number

    /**
     * Invalid check interval in milliseconds when available.
     */
    public readonly checkIntervalMs?: number

    /**
     * Invalid used bytes value when available.
     */
    public readonly usedBytes?: number

    /**
     * Invalid total bytes value when available.
     */
    public readonly totalBytes?: number

    /**
     * Invalid max attempts when available.
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
     * Number of attempts executed.
     */
    public readonly attempts?: number

    /**
     * Stable failure reason when available.
     */
    public readonly reason?: string

    /**
     * Creates typed AST garbage collection trigger error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstGarbageCollectionTriggerErrorCode,
        details: IAstGarbageCollectionTriggerErrorDetails = {},
    ) {
        super(createAstGarbageCollectionTriggerErrorMessage(code, details))

        this.name = "AstGarbageCollectionTriggerError"
        this.code = code
        this.thresholdPercent = details.thresholdPercent
        this.checkIntervalMs = details.checkIntervalMs
        this.usedBytes = details.usedBytes
        this.totalBytes = details.totalBytes
        this.maxAttempts = details.maxAttempts
        this.initialBackoffMs = details.initialBackoffMs
        this.maxBackoffMs = details.maxBackoffMs
        this.attempts = details.attempts
        this.reason = details.reason
    }
}

/**
 * Builds stable public message for AST garbage collection trigger failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstGarbageCollectionTriggerErrorMessage(
    code: AstGarbageCollectionTriggerErrorCode,
    details: IAstGarbageCollectionTriggerErrorDetails,
): string {
    return AST_GARBAGE_COLLECTION_TRIGGER_ERROR_MESSAGES[code](details)
}

const AST_GARBAGE_COLLECTION_TRIGGER_ERROR_MESSAGES: Readonly<
    Record<
        AstGarbageCollectionTriggerErrorCode,
        (details: IAstGarbageCollectionTriggerErrorDetails) => string
    >
> = {
    INVALID_THRESHOLD_PERCENT: (details) =>
        `Invalid thresholdPercent for garbage collection trigger: ${
            details.thresholdPercent ?? Number.NaN
        }`,
    INVALID_CHECK_INTERVAL_MS: (details) =>
        `Invalid checkIntervalMs for garbage collection trigger: ${
            details.checkIntervalMs ?? Number.NaN
        }`,
    INVALID_USED_BYTES: (details) =>
        `Invalid usedBytes for garbage collection trigger: ${details.usedBytes ?? Number.NaN}`,
    INVALID_TOTAL_BYTES: (details) =>
        `Invalid totalBytes for garbage collection trigger: ${details.totalBytes ?? Number.NaN}`,
    INVALID_MAX_ATTEMPTS: (details) =>
        `Invalid maxAttempts for garbage collection trigger: ${details.maxAttempts ?? Number.NaN}`,
    INVALID_INITIAL_BACKOFF_MS: (details) =>
        `Invalid initialBackoffMs for garbage collection trigger: ${
            details.initialBackoffMs ?? Number.NaN
        }`,
    INVALID_MAX_BACKOFF_MS: (details) =>
        `Invalid maxBackoffMs for garbage collection trigger: ${details.maxBackoffMs ?? Number.NaN}`,
    INVALID_SNAPSHOT_PROVIDER: () =>
        "Garbage collection trigger snapshotProvider must be a function when provided",
    INVALID_GC_INVOKER: () => "Garbage collection trigger gcInvoker must be a function when provided",
    INVALID_SLEEP: () => "Garbage collection trigger sleep must be a function when provided",
    INVALID_NOW: () => "Garbage collection trigger now must be a function when provided",
    INVALID_SET_INTERVAL: () =>
        "Garbage collection trigger setIntervalFn must be a function when provided",
    INVALID_CLEAR_INTERVAL: () =>
        "Garbage collection trigger clearIntervalFn must be a function when provided",
    SNAPSHOT_PROVIDER_FAILED: (details) =>
        `Garbage collection trigger snapshotProvider failed after ${
            details.attempts ?? Number.NaN
        } attempts: ${details.reason ?? "<unknown>"}`,
    GC_TRIGGER_FAILED: (details) =>
        `Garbage collection trigger invocation failed after ${details.attempts ?? Number.NaN} attempts: ${
            details.reason ?? "<unknown>"
        }`,
}
