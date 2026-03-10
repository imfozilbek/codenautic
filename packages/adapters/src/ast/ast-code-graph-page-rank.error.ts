/**
 * Typed error codes for AST code graph PageRank service.
 */
export const AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE = {
    INVALID_DAMPING_FACTOR: "INVALID_DAMPING_FACTOR",
    INVALID_ITERATIONS: "INVALID_ITERATIONS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
} as const

/**
 * AST code graph PageRank error code literal.
 */
export type AstCodeGraphPageRankErrorCode =
    (typeof AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE]

/**
 * Structured metadata for AST code graph PageRank failures.
 */
export interface IAstCodeGraphPageRankErrorDetails {
    /**
     * Invalid damping factor when available.
     */
    readonly dampingFactor?: number

    /**
     * Invalid iteration count when available.
     */
    readonly iterations?: number

    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string
}

/**
 * Typed AST code graph PageRank error with stable metadata.
 */
export class AstCodeGraphPageRankError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphPageRankErrorCode

    /**
     * Invalid damping factor when available.
     */
    public readonly dampingFactor?: number

    /**
     * Invalid iteration count when available.
     */
    public readonly iterations?: number

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Creates typed PageRank error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphPageRankErrorCode,
        details: IAstCodeGraphPageRankErrorDetails = {},
    ) {
        super(createAstCodeGraphPageRankErrorMessage(code, details))

        this.name = "AstCodeGraphPageRankError"
        this.code = code
        this.dampingFactor = details.dampingFactor
        this.iterations = details.iterations
        this.filePath = details.filePath
    }
}

/**
 * Builds stable public message for AST code graph PageRank failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstCodeGraphPageRankErrorMessage(
    code: AstCodeGraphPageRankErrorCode,
    details: IAstCodeGraphPageRankErrorDetails,
): string {
    if (code === AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_DAMPING_FACTOR) {
        return `Invalid damping factor for AST code graph PageRank: ${details.dampingFactor ?? Number.NaN}`
    }

    if (code === AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_ITERATIONS) {
        return `Invalid iteration count for AST code graph PageRank: ${details.iterations ?? Number.NaN}`
    }

    return `Invalid file path for AST code graph PageRank: ${details.filePath ?? "<empty>"}`
}
