/**
 * Typed error codes for AST code graph clustering service.
 */
export const AST_CODE_GRAPH_CLUSTERING_ERROR_CODE = {
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_RESOLUTION: "INVALID_RESOLUTION",
    INVALID_ITERATIONS: "INVALID_ITERATIONS",
} as const

/**
 * AST code graph clustering error code literal.
 */
export type AstCodeGraphClusteringErrorCode =
    (typeof AST_CODE_GRAPH_CLUSTERING_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_CLUSTERING_ERROR_CODE]

/**
 * Structured metadata for AST code graph clustering failures.
 */
export interface IAstCodeGraphClusteringErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid Louvain resolution when available.
     */
    readonly resolution?: number

    /**
     * Invalid optimization pass count when available.
     */
    readonly iterations?: number
}

/**
 * Typed AST code graph clustering error with stable metadata.
 */
export class AstCodeGraphClusteringError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphClusteringErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid Louvain resolution when available.
     */
    public readonly resolution?: number

    /**
     * Invalid optimization pass count when available.
     */
    public readonly iterations?: number

    /**
     * Creates typed clustering error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphClusteringErrorCode,
        details: IAstCodeGraphClusteringErrorDetails = {},
    ) {
        super(createAstCodeGraphClusteringErrorMessage(code, details))

        this.name = "AstCodeGraphClusteringError"
        this.code = code
        this.filePath = details.filePath
        this.resolution = details.resolution
        this.iterations = details.iterations
    }
}

/**
 * Builds stable public message for AST code graph clustering failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstCodeGraphClusteringErrorMessage(
    code: AstCodeGraphClusteringErrorCode,
    details: IAstCodeGraphClusteringErrorDetails,
): string {
    if (code === AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_FILE_PATH) {
        return `Invalid file path for AST code graph clustering: ${details.filePath ?? "<empty>"}`
    }

    if (code === AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_RESOLUTION) {
        return `Invalid resolution for AST code graph clustering: ${details.resolution ?? Number.NaN}`
    }

    return `Invalid iterations for AST code graph clustering: ${details.iterations ?? Number.NaN}`
}
