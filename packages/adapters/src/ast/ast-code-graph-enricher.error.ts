/**
 * Typed error codes for AST code graph enrichment.
 */
export const AST_CODE_GRAPH_ENRICHER_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    FILE_NODE_NOT_FOUND: "FILE_NODE_NOT_FOUND",
    CLASS_NODE_NOT_FOUND: "CLASS_NODE_NOT_FOUND",
    FUNCTION_NODE_NOT_FOUND: "FUNCTION_NODE_NOT_FOUND",
} as const

/**
 * AST code graph enricher error code literal.
 */
export type AstCodeGraphEnricherErrorCode =
    (typeof AST_CODE_GRAPH_ENRICHER_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_ENRICHER_ERROR_CODE]

/**
 * Structured metadata for AST code graph enrichment failures.
 */
export interface IAstCodeGraphEnricherErrorDetails {
    /**
     * Normalized repository-relative file path.
     */
    readonly filePath?: string

    /**
     * Missing or conflicting class name when available.
     */
    readonly className?: string

    /**
     * Missing or conflicting function name when available.
     */
    readonly functionName?: string
}

/**
 * Typed AST code graph enricher error with stable metadata.
 */
export class AstCodeGraphEnricherError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstCodeGraphEnricherErrorCode

    /**
     * Normalized repository-relative file path.
     */
    public readonly filePath?: string

    /**
     * Missing or conflicting class name when available.
     */
    public readonly className?: string

    /**
     * Missing or conflicting function name when available.
     */
    public readonly functionName?: string

    /**
     * Creates typed graph enricher error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstCodeGraphEnricherErrorCode,
        details: IAstCodeGraphEnricherErrorDetails = {},
    ) {
        super(createAstCodeGraphEnricherErrorMessage(code, details))

        this.name = "AstCodeGraphEnricherError"
        this.code = code
        this.filePath = details.filePath
        this.className = details.className
        this.functionName = details.functionName
    }
}

/**
 * Builds stable public message for AST graph enrichment errors.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstCodeGraphEnricherErrorMessage(
    code: AstCodeGraphEnricherErrorCode,
    details: IAstCodeGraphEnricherErrorDetails,
): string {
    if (code === AST_CODE_GRAPH_ENRICHER_ERROR_CODE.DUPLICATE_FILE_PATH) {
        return `Duplicate parsed source file path for AST code graph enrichment: ${details.filePath ?? "<unknown>"}`
    }

    if (code === AST_CODE_GRAPH_ENRICHER_ERROR_CODE.FILE_NODE_NOT_FOUND) {
        return `Missing file node for AST code graph enrichment: ${details.filePath ?? "<unknown>"}`
    }

    if (code === AST_CODE_GRAPH_ENRICHER_ERROR_CODE.CLASS_NODE_NOT_FOUND) {
        return `Missing class node for AST code graph enrichment: ${details.className ?? "<unknown>"}`
    }

    return `Missing function node for AST code graph enrichment: ${details.functionName ?? "<unknown>"}`
}
