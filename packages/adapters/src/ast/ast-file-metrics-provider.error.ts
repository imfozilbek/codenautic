/**
 * Typed error codes for AST file metrics provider failures.
 */
export const AST_FILE_METRICS_PROVIDER_ERROR_CODE = {
    CHURN_CALCULATION_FAILED: "CHURN_CALCULATION_FAILED",
    COMPLEXITY_CALCULATION_FAILED: "COMPLEXITY_CALCULATION_FAILED",
    FILE_READ_FAILED: "FILE_READ_FAILED",
    INVALID_DEFAULT_CHURN_DAYS: "INVALID_DEFAULT_CHURN_DAYS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_READ_FILE: "INVALID_READ_FILE",
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    INVALID_REPOSITORY_PATH: "INVALID_REPOSITORY_PATH",
    INVALID_RESOLVE_REPOSITORY_PATH: "INVALID_RESOLVE_REPOSITORY_PATH",
    LANGUAGE_DETECTION_FAILED: "LANGUAGE_DETECTION_FAILED",
    LOC_CALCULATION_FAILED: "LOC_CALCULATION_FAILED",
    REPOSITORY_PATH_RESOLUTION_FAILED: "REPOSITORY_PATH_RESOLUTION_FAILED",
} as const

/**
 * AST file metrics provider error code literal.
 */
export type AstFileMetricsProviderErrorCode =
    (typeof AST_FILE_METRICS_PROVIDER_ERROR_CODE)[keyof typeof AST_FILE_METRICS_PROVIDER_ERROR_CODE]

/**
 * Structured metadata for AST file metrics provider failures.
 */
export interface IAstFileMetricsProviderErrorDetails {
    /**
     * Repository identifier when available.
     */
    readonly repositoryId?: string

    /**
     * Repository path when available.
     */
    readonly repositoryPath?: string

    /**
     * Repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Default churn lookback days value when available.
     */
    readonly days?: number

    /**
     * Underlying failure message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST file metrics provider error with stable metadata.
 */
export class AstFileMetricsProviderError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstFileMetricsProviderErrorCode

    /**
     * Repository identifier when available.
     */
    public readonly repositoryId?: string

    /**
     * Repository path when available.
     */
    public readonly repositoryPath?: string

    /**
     * Repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Default churn lookback days value when available.
     */
    public readonly days?: number

    /**
     * Underlying failure message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST file metrics provider error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(
        code: AstFileMetricsProviderErrorCode,
        details: IAstFileMetricsProviderErrorDetails = {},
    ) {
        super(createAstFileMetricsProviderErrorMessage(code, details))

        this.name = "AstFileMetricsProviderError"
        this.code = code
        this.repositoryId = details.repositoryId
        this.repositoryPath = details.repositoryPath
        this.filePath = details.filePath
        this.days = details.days
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST file metrics provider failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstFileMetricsProviderErrorMessage(
    code: AstFileMetricsProviderErrorCode,
    details: IAstFileMetricsProviderErrorDetails,
): string {
    return AST_FILE_METRICS_PROVIDER_ERROR_MESSAGES[code](details)
}

const AST_FILE_METRICS_PROVIDER_ERROR_MESSAGES: Readonly<
    Record<
        AstFileMetricsProviderErrorCode,
        (details: IAstFileMetricsProviderErrorDetails) => string
    >
> = {
    CHURN_CALCULATION_FAILED: (details) =>
        `AST file metrics churn calculation failed: ${details.causeMessage ?? "<unknown>"}`,
    COMPLEXITY_CALCULATION_FAILED: (details) =>
        `AST file metrics complexity calculation failed: ${details.causeMessage ?? "<unknown>"}`,
    FILE_READ_FAILED: (details) =>
        `AST file metrics file read failed for ${details.filePath ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
    INVALID_DEFAULT_CHURN_DAYS: (details) =>
        `Invalid AST file metrics default churn days: ${details.days ?? Number.NaN}`,
    INVALID_FILE_PATH: (details) =>
        `Invalid AST file metrics file path: ${details.filePath ?? "<empty>"}`,
    INVALID_READ_FILE: () => "AST file metrics readFile must be a function",
    INVALID_REPOSITORY_ID: (details) =>
        `Invalid AST file metrics repository id: ${details.repositoryId ?? "<empty>"}`,
    INVALID_REPOSITORY_PATH: (details) =>
        `Invalid AST file metrics repository path for ${details.repositoryId ?? "<unknown>"}: ${
            details.repositoryPath ?? "<empty>"
        }`,
    INVALID_RESOLVE_REPOSITORY_PATH: () =>
        "AST file metrics resolveRepositoryPath must be a function",
    LANGUAGE_DETECTION_FAILED: (details) =>
        `AST file metrics language detection failed for ${details.filePath ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
    LOC_CALCULATION_FAILED: (details) =>
        `AST file metrics LOC calculation failed: ${details.causeMessage ?? "<unknown>"}`,
    REPOSITORY_PATH_RESOLUTION_FAILED: (details) =>
        `AST file metrics repository path resolution failed for ${details.repositoryId ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
}
