/**
 * Typed error codes for AST function call chain builder.
 */
export const AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE = {
    DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
    EMPTY_FILES: "EMPTY_FILES",
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    FUNCTION_NODE_NOT_FOUND: "FUNCTION_NODE_NOT_FOUND",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MAX_CHAINS: "INVALID_MAX_CHAINS",
    INVALID_MAX_DEPTH: "INVALID_MAX_DEPTH",
} as const

/**
 * AST function call chain builder error code literal.
 */
export type AstFunctionCallChainBuilderErrorCode =
    (typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE)[keyof typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE]

/**
 * Structured metadata for AST function call chain builder failures.
 */
export interface IAstFunctionCallChainBuilderErrorDetails {
    /**
     * Invalid or duplicated repository-relative file path.
     */
    readonly filePath?: string

    /**
     * Invalid traversal max depth when available.
     */
    readonly maxDepth?: number

    /**
     * Invalid traversal max chains when available.
     */
    readonly maxChains?: number

    /**
     * Missing function node identifier when available.
     */
    readonly nodeId?: string
}

/**
 * Typed AST function call chain builder error with stable metadata.
 */
export class AstFunctionCallChainBuilderError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstFunctionCallChainBuilderErrorCode

    /**
     * Invalid or duplicated repository-relative file path.
     */
    public readonly filePath?: string

    /**
     * Invalid traversal max depth when available.
     */
    public readonly maxDepth?: number

    /**
     * Invalid traversal max chains when available.
     */
    public readonly maxChains?: number

    /**
     * Missing function node identifier when available.
     */
    public readonly nodeId?: string

    /**
     * Creates typed AST function call chain builder error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstFunctionCallChainBuilderErrorCode,
        details: IAstFunctionCallChainBuilderErrorDetails = {},
    ) {
        super(createAstFunctionCallChainBuilderErrorMessage(code, details))

        this.name = "AstFunctionCallChainBuilderError"
        this.code = code
        this.filePath = details.filePath
        this.maxDepth = details.maxDepth
        this.maxChains = details.maxChains
        this.nodeId = details.nodeId
    }
}

/**
 * Builds stable public message for AST function call chain builder failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstFunctionCallChainBuilderErrorMessage(
    code: AstFunctionCallChainBuilderErrorCode,
    details: IAstFunctionCallChainBuilderErrorDetails,
): string {
    return AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_MESSAGES[code](details)
}

const AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_MESSAGES: Readonly<
    Record<
        AstFunctionCallChainBuilderErrorCode,
        (details: IAstFunctionCallChainBuilderErrorDetails) => string
    >
> = {
    DUPLICATE_FILE_PATH: (details) =>
        `Duplicate file path for function call chain builder: ${details.filePath ?? "<empty>"}`,
    EMPTY_FILES: () => "Function call chain builder requires at least one parsed source file",
    EMPTY_FILE_PATHS: () => "Function call chain builder file path filter cannot be empty",
    FUNCTION_NODE_NOT_FOUND: (details) =>
        `Function call chain builder node not found: ${details.nodeId ?? "<empty>"}`,
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for function call chain builder: ${details.filePath ?? "<empty>"}`,
    INVALID_MAX_CHAINS: (details) =>
        `Invalid max chains for function call chain builder: ${
            details.maxChains ?? Number.NaN
        }`,
    INVALID_MAX_DEPTH: (details) =>
        `Invalid max depth for function call chain builder: ${details.maxDepth ?? Number.NaN}`,
}
