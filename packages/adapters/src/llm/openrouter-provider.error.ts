/**
 * Normalized error metadata exposed by OpenRouter provider.
 */
export interface IOpenRouterProviderErrorDetails {
    /**
     * HTTP status code when available.
     */
    readonly statusCode?: number

    /**
     * Provider-specific machine-readable error code.
     */
    readonly code?: string

    /**
     * Provider-specific error type.
     */
    readonly type?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    readonly retryAfterMs?: number

    /**
     * Indicates whether the request is retryable.
     */
    readonly isRetryable: boolean
}

/**
 * Error thrown by OpenRouter provider after request normalization and retry evaluation.
 */
export class OpenRouterProviderError extends Error {
    /**
     * HTTP status code when available.
     */
    public readonly statusCode?: number

    /**
     * Provider-specific machine-readable error code.
     */
    public readonly code?: string

    /**
     * Provider-specific error type.
     */
    public readonly type?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    public readonly retryAfterMs?: number

    /**
     * Indicates whether the request is retryable.
     */
    public readonly isRetryable: boolean

    /**
     * Creates provider error.
     *
     * @param message Human-readable error message.
     * @param details Normalized error details.
     */
    public constructor(message: string, details: IOpenRouterProviderErrorDetails) {
        super(message)
        this.name = "OpenRouterProviderError"
        this.statusCode = details.statusCode
        this.code = details.code
        this.type = details.type
        this.retryAfterMs = details.retryAfterMs
        this.isRetryable = details.isRetryable
    }
}
