/**
 * Typed error codes for AST churn calculator.
 */
export const AST_CHURN_CALCULATOR_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    GIT_LOG_FAILED: "GIT_LOG_FAILED",
    INVALID_DAYS: "INVALID_DAYS",
    INVALID_EXECUTE_GIT: "INVALID_EXECUTE_GIT",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_REPOSITORY_PATH: "INVALID_REPOSITORY_PATH",
} as const

/**
 * AST churn calculator error code literal.
 */
export type AstChurnCalculatorErrorCode =
    (typeof AST_CHURN_CALCULATOR_ERROR_CODE)[keyof typeof AST_CHURN_CALCULATOR_ERROR_CODE]

/**
 * Structured metadata for AST churn calculator failures.
 */
export interface IAstChurnCalculatorErrorDetails {
    /**
     * Repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Repository path when available.
     */
    readonly repositoryPath?: string

    /**
     * Invalid days value when available.
     */
    readonly days?: number

    /**
     * Underlying error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST churn calculator error with stable metadata.
 */
export class AstChurnCalculatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstChurnCalculatorErrorCode

    /**
     * Repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Repository path when available.
     */
    public readonly repositoryPath?: string

    /**
     * Invalid days value when available.
     */
    public readonly days?: number

    /**
     * Underlying error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed AST churn calculator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(code: AstChurnCalculatorErrorCode, details: IAstChurnCalculatorErrorDetails = {}) {
        super(createAstChurnCalculatorErrorMessage(code, details))

        this.name = "AstChurnCalculatorError"
        this.code = code
        this.filePath = details.filePath
        this.repositoryPath = details.repositoryPath
        this.days = details.days
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public message for AST churn calculator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstChurnCalculatorErrorMessage(
    code: AstChurnCalculatorErrorCode,
    details: IAstChurnCalculatorErrorDetails,
): string {
    return AST_CHURN_CALCULATOR_ERROR_MESSAGES[code](details)
}

const AST_CHURN_CALCULATOR_ERROR_MESSAGES: Readonly<
    Record<AstChurnCalculatorErrorCode, (details: IAstChurnCalculatorErrorDetails) => string>
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate file path for churn calculator: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILE_PATHS: () => "Churn calculator requires at least one file path",
    GIT_LOG_FAILED: (details) =>
        `Git log failed for churn calculator on ${details.filePath ?? "<unknown>"}: ${
            details.causeMessage ?? "<unknown>"
        }`,
    INVALID_DAYS: (details) =>
        `Invalid churn calculator lookback days: ${details.days ?? Number.NaN}`,
    INVALID_EXECUTE_GIT: () => "Churn calculator executeGit must be a function",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for churn calculator: ${details.filePath ?? "<empty>"}`,
    INVALID_REPOSITORY_PATH: (details) =>
        `Invalid repository path for churn calculator: ${details.repositoryPath ?? "<empty>"}`,
}
