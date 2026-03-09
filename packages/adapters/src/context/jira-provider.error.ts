/**
 * Normalized error metadata exposed by Jira provider.
 */
export interface IJiraProviderErrorDetails {
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
 * Error thrown by Jira provider after request normalization and retry evaluation.
 */
export class JiraProviderError extends Error {
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
     * Creates Jira provider error.
     *
     * @param message Human-readable error message.
     * @param details Normalized error details.
     */
    public constructor(message: string, details: IJiraProviderErrorDetails) {
        super(message)
        this.name = "JiraProviderError"
        this.statusCode = details.statusCode
        this.code = details.code
        this.retryAfterMs = details.retryAfterMs
        this.isRetryable = details.isRetryable
    }
}
