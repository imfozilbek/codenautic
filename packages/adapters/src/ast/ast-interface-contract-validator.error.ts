/**
 * Typed error codes for AST interface contract validator.
 */
export const AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE = {
    EMPTY_FILE_PATHS: "EMPTY_FILE_PATHS",
    INVALID_FILE_PATH: "INVALID_FILE_PATH",
    INVALID_MAX_ISSUES: "INVALID_MAX_ISSUES",
} as const

/**
 * AST interface contract validator error code literal.
 */
export type AstInterfaceContractValidatorErrorCode =
    (typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE)[keyof typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE]

/**
 * Structured metadata for AST interface contract validator failures.
 */
export interface IAstInterfaceContractValidatorErrorDetails {
    /**
     * Invalid repository-relative file path when available.
     */
    readonly filePath?: string

    /**
     * Invalid max issue count when available.
     */
    readonly maxIssues?: number
}

/**
 * Typed AST interface contract validator error with stable metadata.
 */
export class AstInterfaceContractValidatorError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: AstInterfaceContractValidatorErrorCode

    /**
     * Invalid repository-relative file path when available.
     */
    public readonly filePath?: string

    /**
     * Invalid max issue count when available.
     */
    public readonly maxIssues?: number

    /**
     * Creates typed AST interface contract validator error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: AstInterfaceContractValidatorErrorCode,
        details: IAstInterfaceContractValidatorErrorDetails = {},
    ) {
        super(createAstInterfaceContractValidatorErrorMessage(code, details))

        this.name = "AstInterfaceContractValidatorError"
        this.code = code
        this.filePath = details.filePath
        this.maxIssues = details.maxIssues
    }
}

/**
 * Builds stable public message for AST interface contract validator failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public message.
 */
function createAstInterfaceContractValidatorErrorMessage(
    code: AstInterfaceContractValidatorErrorCode,
    details: IAstInterfaceContractValidatorErrorDetails,
): string {
    return AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_MESSAGES[code](details)
}

const AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_MESSAGES: Readonly<
    Record<
        AstInterfaceContractValidatorErrorCode,
        (details: IAstInterfaceContractValidatorErrorDetails) => string
    >
> = {
    EMPTY_FILE_PATHS: () => "Interface contract validator file path filter cannot be empty",
    INVALID_FILE_PATH: (details) =>
        `Invalid file path for interface contract validator: ${details.filePath ?? "<empty>"}`,
    INVALID_MAX_ISSUES: (details) =>
        `Invalid max issues for interface contract validator: ${details.maxIssues ?? Number.NaN}`,
}
