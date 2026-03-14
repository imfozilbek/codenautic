/**
 * Normalized error metadata exposed by ClickUp provider.
 */
export interface IClickUpProviderErrorDetails {
    /**
     * HTTP status code when available.
     */
    readonly statusCode?: number

    /**
     * Provider-specific machine-readable error code.
     */
    readonly code?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    readonly retryAfterMs?: number

    /**
     * Indicates whether request is retryable.
     */
    readonly isRetryable: boolean
}

/**
 * Error thrown by ClickUp provider after request normalization and retry evaluation.
 */
export class ClickUpProviderError extends Error {
    /**
     * HTTP status code when available.
     */
    public readonly statusCode?: number

    /**
     * Provider-specific machine-readable error code.
     */
    public readonly code?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    public readonly retryAfterMs?: number

    /**
     * Indicates whether request is retryable.
     */
    public readonly isRetryable: boolean

    /**
     * Creates ClickUp provider error.
     *
     * @param message Human-readable error message.
     * @param details Normalized error details.
     */
    public constructor(message: string, details: IClickUpProviderErrorDetails) {
        super(message)
        this.name = "ClickUpProviderError"
        this.statusCode = details.statusCode
        this.code = details.code
        this.retryAfterMs = details.retryAfterMs
        this.isRetryable = details.isRetryable
    }
}
