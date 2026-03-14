/**
 * Typed error codes for AST code graph diff service.
 */
export const AST_CODE_GRAPH_DIFF_ERROR_CODE = {
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
} as const

/**
 * AST code graph diff error code literal.
 */
export type AstCodeGraphDiffErrorCode =
    (typeof AST_CODE_GRAPH_DIFF_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_DIFF_ERROR_CODE]

/**
 * Structured metadata for AST code graph diff failures.
 */
export interface IAstCodeGraphDiffErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string
}

/**
 * Typed AST code graph diff error with stable metadata.
 */
export class AstCodeGraphDiffError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphDiffErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Creates typed graph diff error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphDiffErrorCode,
        details: IAstCodeGraphDiffErrorDetails = {},
    ) {
        super(createAstCodeGraphDiffErrorMessage(code, details))

        this.name = "AstCodeGraphDiffError"
        this.code = code
        this.filePath = details.filePath
    }
}

/**
 * Builds stable public message for AST code graph diff failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstCodeGraphDiffErrorMessage(
    code: AstCodeGraphDiffErrorCode,
    details: IAstCodeGraphDiffErrorDetails,
): string {
    if (code === AST_CODE_GRAPH_DIFF_ERROR_CODE.INVALID_FILE_PATH) {
        return `Invalid file path for AST code graph diff: ${details.filePath ?? "<empty>"}`
    }

    return "Unknown AST code graph diff error"
}
