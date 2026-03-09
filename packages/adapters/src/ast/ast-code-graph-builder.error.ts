/**
 * Typed error codes for AST code graph builder.
 */
export const AST_CODE_GRAPH_BUILDER_ERROR_CODE = {
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    DUPLICATE_NODE_ID: "DUPLICATE_NODE_ID",
} as const

/**
 * AST code graph builder error code literal.
 */
export type AstCodeGraphBuilderErrorCode =
    (typeof AST_CODE_GRAPH_BUILDER_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_BUILDER_ERROR_CODE]

/**
 * Structured metadata for AST code graph builder failures.
 */
export interface IAstCodeGraphBuilderErrorDetails {
    /**
     * Raw repository id that failed validation.
     */
    readonly repositoryId?: string

    /**
     * Normalized duplicate file path when available.
     */
    readonly filePath?: string

    /**
     * Duplicate graph node identifier when available.
     */
    readonly nodeId?: string

    /**
     * Root cause message from lower-level validation.
     */
    readonly causeMessage?: string
}

/**
 * Typed AST code graph builder error with stable metadata.
 */
export class AstCodeGraphBuilderError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphBuilderErrorCode

    /**
     * Raw repository id when validation failed.
     */
    public readonly repositoryId?: string

    /**
     * Duplicate file path when available.
     */
    public readonly filePath?: string

    /**
     * Duplicate node identifier when available.
     */
    public readonly nodeId?: string

    /**
     * Underlying validation message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed builder error with stable public message.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphBuilderErrorCode,
        details: IAstCodeGraphBuilderErrorDetails = {},
    ) {
        super(createAstCodeGraphBuilderErrorMessage(code, details))

        this.name = "AstCodeGraphBuilderError"
        this.code = code
        this.repositoryId = details.repositoryId
        this.filePath = details.filePath
        this.nodeId = details.nodeId
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public error message for AST code graph builder failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public error message.
 */
function createAstCodeGraphBuilderErrorMessage(
    code: AstCodeGraphBuilderErrorCode,
    details: IAstCodeGraphBuilderErrorDetails,
): string {
    if (code === AST_CODE_GRAPH_BUILDER_ERROR_CODE.INVALID_REPOSITORY_ID) {
        return `Invalid repository id for AST code graph builder: ${details.repositoryId ?? "<empty>"}`
    }

    if (code === AST_CODE_GRAPH_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH) {
        return `Duplicate parsed source file path for AST code graph builder: ${details.filePath ?? "<unknown>"}`
    }

    return `Duplicate code graph node id for AST code graph builder: ${details.nodeId ?? "<unknown>"}`
}
