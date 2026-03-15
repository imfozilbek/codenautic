/**
 * Typed error codes for AST function hash generator.
 */
export const AST_FUNCTION_HASH_GENERATOR_ERROR_CODE = {
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_FUNCTION_NAME: "INVALID_FUNCTION_NAME",
    INVALID_PARAMETER_TYPE: "INVALID_PARAMETER_TYPE",
    INVALID_RETURN_TYPE: "INVALID_RETURN_TYPE",
} as const

/**
 * AST function hash generator error code literal.
 */
export type AstFunctionHashGeneratorErrorCode =
    (typeof AST_FUNCTION_HASH_GENERATOR_ERROR_CODE)[keyof typeof AST_FUNCTION_HASH_GENERATOR_ERROR_CODE]

/**
 * Structured metadata for AST function hash generator failures.
 */
export interface IAstFunctionHashGeneratorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid function name when available.
     */
    readonly functionName?: string

    /**
     * Invalid parameter type token when available.
     */
    readonly parameterType?: string

    /**
     * Invalid return type token when available.
     */
    readonly returnType?: string
}

/**
 * Typed AST function hash generator error with stable metadata.
 */
export class AstFunctionHashGeneratorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstFunctionHashGeneratorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid function name when available.
     */
    public readonly functionName?: string

    /**
     * Invalid parameter type token when available.
     */
    public readonly parameterType?: string

    /**
     * Invalid return type token when available.
     */
    public readonly returnType?: string

    /**
     * Creates typed AST function hash generator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstFunctionHashGeneratorErrorCode,
        details: IAstFunctionHashGeneratorErrorDetails = {},
    ) {
        super(createAstFunctionHashGeneratorErrorMessage(code, details))

        this.name = "AstFunctionHashGeneratorError"
        this.code = code
        this.filePath = details.filePath
        this.functionName = details.functionName
        this.parameterType = details.parameterType
        this.returnType = details.returnType
    }
}

/**
 * Builds stable public message for AST function hash generator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstFunctionHashGeneratorErrorMessage(
    code: AstFunctionHashGeneratorErrorCode,
    details: IAstFunctionHashGeneratorErrorDetails,
): string {
    return AST_FUNCTION_HASH_GENERATOR_ERROR_MESSAGES[code](details)
}

const AST_FUNCTION_HASH_GENERATOR_ERROR_MESSAGES: Readonly<
    Record<AstFunctionHashGeneratorErrorCode, (details: IAstFunctionHashGeneratorErrorDetails) => string>
> = {
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for AST function hash generator: ${details.filePath ?? "<empty>"}`,
    INVALID_FUNCTION_NAME: (details) =>
        `Invalid function name for AST function hash generator: ${details.functionName ?? "<empty>"}`,
    INVALID_PARAMETER_TYPE: (details) =>
        `Invalid parameter type for AST function hash generator: ${
            details.parameterType ?? "<empty>"
        }`,
    INVALID_RETURN_TYPE: (details) =>
        `Invalid return type for AST function hash generator: ${details.returnType ?? "<empty>"}`,
}
