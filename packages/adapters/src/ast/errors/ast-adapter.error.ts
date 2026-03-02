/**
 * Stable error codes exposed by AST adapters.
 */
export const AST_ADAPTER_ERROR_CODE = {
    INVALID_SOURCE: "AST_ADAPTER_INVALID_SOURCE",
} as const

/**
 * AST adapter error code value.
 */
export type AstAdapterErrorCode = (typeof AST_ADAPTER_ERROR_CODE)[keyof typeof AST_ADAPTER_ERROR_CODE]

/**
 * Construction params for AST adapter error.
 */
export interface ICreateAstAdapterErrorParams {
    readonly code: AstAdapterErrorCode
    readonly message: string
    readonly retryable: boolean
    readonly cause?: Error
}

/**
 * Normalized adapter error used by AST contracts.
 */
export class AstAdapterError extends Error {
    public readonly code: AstAdapterErrorCode
    public readonly retryable: boolean
    public readonly cause?: Error

    /**
     * Creates AST adapter error instance.
     *
     * @param params Error initialization parameters.
     */
    public constructor(params: ICreateAstAdapterErrorParams) {
        super(params.message)
        this.name = "AstAdapterError"
        this.code = params.code
        this.retryable = params.retryable
        this.cause = params.cause
    }
}
