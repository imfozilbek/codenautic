/**
 * Typed error codes for AST LOC calculator.
 */
export const AST_LOC_CALCULATOR_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILES: "EMPTY_FILES",
    EMPTY_FILE_PATH_FILTER: "EMPTY_FILE_PATH_FILTER",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_LANGUAGE: "INVALID_LANGUAGE",
    INVALID_SOURCE_CODE: "INVALID_SOURCE_CODE",
} as const

/**
 * AST LOC calculator error code literal.
 */
export type AstLocCalculatorErrorCode =
    (typeof AST_LOC_CALCULATOR_ERROR_CODE)[keyof typeof AST_LOC_CALCULATOR_ERROR_CODE]

/**
 * Structured metadata for AST LOC calculator failures.
 */
export interface IAstLocCalculatorErrorDetails {
    /**
     * Repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Language label when available.
     */
    readonly language?: string
}

/**
 * Typed AST LOC calculator error with stable metadata.
 */
export class AstLocCalculatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstLocCalculatorErrorCode

    /**
     * Repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Language label when available.
     */
    public readonly language?: string

    /**
     * Creates typed AST LOC calculator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Structured error metadata.
     */
    public constructor(code: AstLocCalculatorErrorCode, details: IAstLocCalculatorErrorDetails = {}) {
        super(createAstLocCalculatorErrorMessage(code, details))

        this.name = "AstLocCalculatorError"
        this.code = code
        this.filePath = details.filePath
        this.language = details.language
    }
}

/**
 * Builds stable public message for AST LOC calculator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Structured error metadata.
 * @returns Stable public message.
 */
function createAstLocCalculatorErrorMessage(
    code: AstLocCalculatorErrorCode,
    details: IAstLocCalculatorErrorDetails,
): string {
    return AST_LOC_CALCULATOR_ERROR_MESSAGES[code](details)
}

const AST_LOC_CALCULATOR_ERROR_MESSAGES: Readonly<
    Record<AstLocCalculatorErrorCode, (details: IAstLocCalculatorErrorDetails) => string>
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate file path for LOC calculator: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILES: () => "LOC calculator requires at least one source file",
    EMPTY_FILE_PATH_FILTER: () => "LOC calculator file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for LOC calculator: ${details.filePath ?? "<empty>"}`,
    INVALID_LANGUAGE: (details) =>
        `Invalid language for LOC calculator: ${details.language ?? "<empty>"}`,
    INVALID_SOURCE_CODE: (details) =>
        `Invalid source code for LOC calculator file: ${details.filePath ?? "<empty>"}`,
}
