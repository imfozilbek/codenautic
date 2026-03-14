/**
 * Typed error codes for AST semantic code understanding.
 */
export const AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILES: "EMPTY_FILES",
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MINIMUM_CONFIDENCE: "INVALID_MINIMUM_CONFIDENCE",
} as const

/**
 * AST semantic code understanding error code literal.
 */
export type AstSemanticCodeUnderstandingErrorCode =
    (typeof AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE)[keyof typeof AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE]

/**
 * Structured metadata for AST semantic code understanding failures.
 */
export interface IAstSemanticCodeUnderstandingErrorDetails {
    /**
     * Invalid or duplicate repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid minimum confidence threshold when available.
     */
    readonly minimumConfidence?: number
}

/**
 * Typed AST semantic code understanding error with stable metadata.
 */
export class AstSemanticCodeUnderstandingError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstSemanticCodeUnderstandingErrorCode

    /**
     * Invalid or duplicate repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid minimum confidence threshold when available.
     */
    public readonly minimumConfidence?: number

    /**
     * Creates typed AST semantic code understanding error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstSemanticCodeUnderstandingErrorCode,
        details: IAstSemanticCodeUnderstandingErrorDetails = {},
    ) {
        super(createAstSemanticCodeUnderstandingErrorMessage(code, details))

        this.name = "AstSemanticCodeUnderstandingError"
        this.code = code
        this.filePath = details.filePath
        this.minimumConfidence = details.minimumConfidence
    }
}

/**
 * Builds stable public message for AST semantic-understanding failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstSemanticCodeUnderstandingErrorMessage(
    code: AstSemanticCodeUnderstandingErrorCode,
    details: IAstSemanticCodeUnderstandingErrorDetails,
): string {
    return AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_MESSAGES[code](details)
}

const AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_MESSAGES: Readonly<
    Record<AstSemanticCodeUnderstandingErrorCode, (details: IAstSemanticCodeUnderstandingErrorDetails) => string>
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate file path for AST semantic code understanding: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILES: () =>
        "Parsed source file collection for AST semantic code understanding cannot be empty",
    EMPTY_FILE_PATHS: () => "AST semantic code understanding file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for AST semantic code understanding: ${details.filePath ?? "<empty>"}`,
    INVALID_MINIMUM_CONFIDENCE: (details) =>
        `Invalid minimum confidence for AST semantic code understanding: ${
            details.minimumConfidence ?? Number.NaN
        }`,
}
