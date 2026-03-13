/**
 * Typed error codes for Mongo code graph repository failures.
 */
export const AST_CODE_GRAPH_REPOSITORY_ERROR_CODE = {
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    INVALID_BRANCH: "INVALID_BRANCH",
    INVALID_NODE_ID: "INVALID_NODE_ID",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_EDGE_TYPE: "INVALID_EDGE_TYPE",
    INVALID_MAX_DEPTH: "INVALID_MAX_DEPTH",
    INVALID_MAX_PATHS: "INVALID_MAX_PATHS",
    INVALID_GRAPH_NODE: "INVALID_GRAPH_NODE",
    INVALID_GRAPH_EDGE: "INVALID_GRAPH_EDGE",
    DUPLICATE_NODE_ID: "DUPLICATE_NODE_ID",
    EDGE_REFERENTIAL_INTEGRITY_VIOLATION: "EDGE_REFERENTIAL_INTEGRITY_VIOLATION",
} as const

/**
 * Mongo code graph repository error code literal.
 */
export type AstCodeGraphRepositoryErrorCode =
    (typeof AST_CODE_GRAPH_REPOSITORY_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_REPOSITORY_ERROR_CODE]

/**
 * Structured metadata for Mongo code graph repository failures.
 */
export interface IAstCodeGraphRepositoryErrorDetails {
    /**
     * Raw repository id when repository-scoped validation fails.
     */
    readonly repositoryId?: string

    /**
     * Raw branch value when branch validation fails.
     */
    readonly branch?: string

    /**
     * Node identifier involved in the failure when available.
     */
    readonly nodeId?: string

    /**
     * Edge source identifier involved in the failure when available.
     */
    readonly sourceNodeId?: string

    /**
     * Edge target identifier involved in the failure when available.
     */
    readonly targetNodeId?: string

    /**
     * File path involved in the failure when available.
     */
    readonly filePath?: string

    /**
     * Edge type involved in the failure when available.
     */
    readonly edgeType?: string

    /**
     * Numeric bound involved in the failure when available.
     */
    readonly numericValue?: number

    /**
     * Root cause message from lower-level validation.
     */
    readonly causeMessage?: string
}

/**
 * Typed Mongo code graph repository error with stable metadata.
 */
export class AstCodeGraphRepositoryError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphRepositoryErrorCode

    /**
     * Raw repository id when validation failed.
     */
    public readonly repositoryId?: string

    /**
     * Raw branch value when validation failed.
     */
    public readonly branch?: string

    /**
     * Node id involved in failure when available.
     */
    public readonly nodeId?: string

    /**
     * Edge source id involved in failure when available.
     */
    public readonly sourceNodeId?: string

    /**
     * Edge target id involved in failure when available.
     */
    public readonly targetNodeId?: string

    /**
     * File path involved in failure when available.
     */
    public readonly filePath?: string

    /**
     * Edge type involved in failure when available.
     */
    public readonly edgeType?: string

    /**
     * Numeric bound involved in failure when available.
     */
    public readonly numericValue?: number

    /**
     * Lower-level cause message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed repository error with stable public message.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphRepositoryErrorCode,
        details: IAstCodeGraphRepositoryErrorDetails = {},
    ) {
        super(createAstCodeGraphRepositoryErrorMessage(code, details))

        this.name = "AstCodeGraphRepositoryError"
        this.code = code
        this.repositoryId = details.repositoryId
        this.branch = details.branch
        this.nodeId = details.nodeId
        this.sourceNodeId = details.sourceNodeId
        this.targetNodeId = details.targetNodeId
        this.filePath = details.filePath
        this.edgeType = details.edgeType
        this.numericValue = details.numericValue
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds stable public error message for Mongo code graph repository failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public error message.
 */
function createAstCodeGraphRepositoryErrorMessage(
    code: AstCodeGraphRepositoryErrorCode,
    details: IAstCodeGraphRepositoryErrorDetails,
): string {
    return AST_CODE_GRAPH_REPOSITORY_ERROR_MESSAGE_BUILDERS[code](details)
}

const AST_CODE_GRAPH_REPOSITORY_ERROR_MESSAGE_BUILDERS: Record<
    AstCodeGraphRepositoryErrorCode,
    (details: IAstCodeGraphRepositoryErrorDetails) => string
> = {
    INVALID_REPOSITORY_ID: (
        details: IAstCodeGraphRepositoryErrorDetails,
    ): string => {
        return `Invalid repository id for Mongo code graph repository: ${details.repositoryId ?? "<empty>"}`
    },
    INVALID_BRANCH: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid branch for Mongo code graph repository: ${details.branch ?? "<empty>"}`
    },
    INVALID_NODE_ID: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid node id for Mongo code graph repository: ${details.nodeId ?? "<empty>"}`
    },
    INVALID_FILE_PATH: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid file path for Mongo code graph repository: ${details.filePath ?? "<empty>"}`
    },
    INVALID_EDGE_TYPE: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid edge type for Mongo code graph repository: ${details.edgeType ?? "<empty>"}`
    },
    INVALID_MAX_DEPTH: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid maxDepth for Mongo code graph repository: ${String(details.numericValue ?? "<empty>")}`
    },
    INVALID_MAX_PATHS: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid maxPaths for Mongo code graph repository: ${String(details.numericValue ?? "<empty>")}`
    },
    INVALID_GRAPH_NODE: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid graph node for Mongo code graph repository: ${details.nodeId ?? "<unknown>"}`
    },
    INVALID_GRAPH_EDGE: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Invalid graph edge for Mongo code graph repository: ${details.sourceNodeId ?? "<unknown>"} -> ${details.targetNodeId ?? "<unknown>"}`
    },
    DUPLICATE_NODE_ID: (details: IAstCodeGraphRepositoryErrorDetails): string => {
        return `Duplicate graph node id for Mongo code graph repository: ${details.nodeId ?? "<unknown>"}`
    },
    EDGE_REFERENTIAL_INTEGRITY_VIOLATION: (
        details: IAstCodeGraphRepositoryErrorDetails,
    ): string => {
        return `Graph edge referential integrity violation for Mongo code graph repository: ${details.sourceNodeId ?? "<unknown>"} -> ${details.targetNodeId ?? "<unknown>"}`
    },
}
