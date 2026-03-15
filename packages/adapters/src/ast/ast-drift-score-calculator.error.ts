/**
 * Typed error codes for AST drift score calculator.
 */
export const AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE = {
    EMPTY_IMPORTS: "EMPTY_IMPORTS",
    INVALID_CACHE_TTL_MS: "INVALID_CACHE_TTL_MS",
    INVALID_COMMIT_DATE: "INVALID_COMMIT_DATE",
    INVALID_COMMIT_SHA: "INVALID_COMMIT_SHA",
    INVALID_HISTORY: "INVALID_HISTORY",
    INVALID_HISTORY_COMMIT_DATE: "INVALID_HISTORY_COMMIT_DATE",
    INVALID_HISTORY_COMMIT_SHA: "INVALID_HISTORY_COMMIT_SHA",
    INVALID_HISTORY_DRIFT_SCORE: "INVALID_HISTORY_DRIFT_SCORE",
    INVALID_IMPORT_LAYER: "INVALID_IMPORT_LAYER",
    INVALID_IMPORT_MODULE: "INVALID_IMPORT_MODULE",
    INVALID_IMPORT_PATH: "INVALID_IMPORT_PATH",
    INVALID_IMPORTS: "INVALID_IMPORTS",
    INVALID_LOAD_HISTORY: "INVALID_LOAD_HISTORY",
    INVALID_MAX_LOAD_ATTEMPTS: "INVALID_MAX_LOAD_ATTEMPTS",
    INVALID_RETRY_BACKOFF_MS: "INVALID_RETRY_BACKOFF_MS",
    INVALID_SLEEP: "INVALID_SLEEP",
    INVALID_VIOLATION_MODULE: "INVALID_VIOLATION_MODULE",
    INVALID_VIOLATION_PATH: "INVALID_VIOLATION_PATH",
    INVALID_VIOLATIONS: "INVALID_VIOLATIONS",
    RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
    VIOLATION_IMPORT_MISMATCH: "VIOLATION_IMPORT_MISMATCH",
} as const

/**
 * AST drift score calculator error code literal.
 */
export type AstDriftScoreCalculatorErrorCode =
    (typeof AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE)[keyof typeof AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE]

/**
 * Structured metadata for drift score calculator failures.
 */
export interface IAstDriftScoreCalculatorErrorDetails {
    /**
     * Source file path when available.
     */
    readonly sourcePath?: string

    /**
     * Target file path when available.
     */
    readonly targetPath?: string

    /**
     * Module name when available.
     */
    readonly moduleName?: string

    /**
     * Commit SHA when available.
     */
    readonly commitSha?: string

    /**
     * Commit date string when available.
     */
    readonly committedAt?: string

    /**
     * Drift score value when available.
     */
    readonly driftScore?: number

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
 * Typed AST drift score calculator error with stable metadata.
 */
export class AstDriftScoreCalculatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstDriftScoreCalculatorErrorCode

    /**
     * Source file path when available.
     */
    public readonly sourcePath?: string

    /**
     * Target file path when available.
     */
    public readonly targetPath?: string

    /**
     * Module name when available.
     */
    public readonly moduleName?: string

    /**
     * Commit SHA when available.
     */
    public readonly commitSha?: string

    /**
     * Commit date string when available.
     */
    public readonly committedAt?: string

    /**
     * Drift score value when available.
     */
    public readonly driftScore?: number

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
     * Creates typed AST drift score calculator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(
        code: AstDriftScoreCalculatorErrorCode,
        details: IAstDriftScoreCalculatorErrorDetails = {},
    ) {
        super(createAstDriftScoreCalculatorErrorMessage(code, details))

        this.name = "AstDriftScoreCalculatorError"
        this.code = code
        this.sourcePath = details.sourcePath
        this.targetPath = details.targetPath
        this.moduleName = details.moduleName
        this.commitSha = details.commitSha
        this.committedAt = details.committedAt
        this.driftScore = details.driftScore
        this.attempt = details.attempt
        this.maxLoadAttempts = details.maxLoadAttempts
        this.retryBackoffMs = details.retryBackoffMs
        this.cacheTtlMs = details.cacheTtlMs
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for calculator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstDriftScoreCalculatorErrorMessage(
    code: AstDriftScoreCalculatorErrorCode,
    details: IAstDriftScoreCalculatorErrorDetails,
): string {
    return AST_DRIFT_SCORE_CALCULATOR_ERROR_MESSAGES[code](details)
}

const AST_DRIFT_SCORE_CALCULATOR_ERROR_MESSAGES: Readonly<
    Record<AstDriftScoreCalculatorErrorCode, (details: IAstDriftScoreCalculatorErrorDetails) => string>
> = {
    EMPTY_IMPORTS: () => "Drift score calculator imports cannot be empty",
    INVALID_CACHE_TTL_MS: (details) =>
        `Invalid drift score calculator cache TTL: ${details.cacheTtlMs ?? Number.NaN}`,
    INVALID_COMMIT_DATE: (details) =>
        `Invalid commit date: ${details.committedAt ?? "<empty>"}`,
    INVALID_COMMIT_SHA: (details) => `Invalid commit SHA: ${details.commitSha ?? "<empty>"}`,
    INVALID_HISTORY: () => "Drift score calculator history must be an array",
    INVALID_HISTORY_COMMIT_DATE: (details) =>
        `Invalid history commit date: ${details.committedAt ?? "<empty>"}`,
    INVALID_HISTORY_COMMIT_SHA: (details) =>
        `Invalid history commit SHA: ${details.commitSha ?? "<empty>"}`,
    INVALID_HISTORY_DRIFT_SCORE: (details) =>
        `Invalid history drift score: ${details.driftScore ?? Number.NaN}`,
    INVALID_IMPORT_LAYER: (details) =>
        `Invalid import layer: ${details.moduleName ?? "<empty>"}`,
    INVALID_IMPORT_MODULE: (details) =>
        `Invalid import module: ${details.moduleName ?? "<empty>"}`,
    INVALID_IMPORT_PATH: (details) =>
        `Invalid import path: ${details.sourcePath ?? details.targetPath ?? "<empty>"}`,
    INVALID_IMPORTS: () => "Drift score calculator imports must be an array",
    INVALID_LOAD_HISTORY: () => "Drift score calculator loadHistory callback must be a function",
    INVALID_MAX_LOAD_ATTEMPTS: (details) =>
        `Invalid drift score calculator max load attempts: ${details.maxLoadAttempts ?? Number.NaN}`,
    INVALID_RETRY_BACKOFF_MS: (details) =>
        `Invalid drift score calculator retry backoff: ${details.retryBackoffMs ?? Number.NaN}`,
    INVALID_SLEEP: () => "Drift score calculator sleep callback must be a function",
    INVALID_VIOLATION_MODULE: (details) =>
        `Invalid violation module: ${details.moduleName ?? "<empty>"}`,
    INVALID_VIOLATION_PATH: (details) =>
        `Invalid violation path: ${details.sourcePath ?? details.targetPath ?? "<empty>"}`,
    INVALID_VIOLATIONS: () => "Drift score calculator violations must be an array",
    RETRY_EXHAUSTED: (details) =>
        `History loading retries exhausted after ${details.maxLoadAttempts ?? Number.NaN} attempts: ${
            details.causeMessage ?? "<unknown>"
        }`,
    VIOLATION_IMPORT_MISMATCH: (details) =>
        `Violation has no matching import edge: ${
            details.sourcePath ?? "<empty>"
        } -> ${details.targetPath ?? "<empty>"}`,
}
