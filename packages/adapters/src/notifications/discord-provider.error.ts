/**
 * Machine-readable Discord provider error codes.
 */
export const DISCORD_PROVIDER_ERROR_CODE = {
    CONFIGURATION: "CONFIGURATION",
    INVALID_PAYLOAD: "INVALID_PAYLOAD",
    AUTHENTICATION: "AUTHENTICATION",
    PERMISSION_DENIED: "PERMISSION_DENIED",
    NOT_FOUND: "NOT_FOUND",
    RATE_LIMITED: "RATE_LIMITED",
    UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
    REQUEST_FAILED: "REQUEST_FAILED",
} as const

/**
 * Discord provider error code.
 */
export type DiscordProviderErrorCode =
    (typeof DISCORD_PROVIDER_ERROR_CODE)[keyof typeof DISCORD_PROVIDER_ERROR_CODE]

/**
 * Normalized error metadata exposed by Discord provider.
 */
export interface IDiscordProviderErrorDetails {
    /**
     * Machine-readable error code.
     */
    readonly code: DiscordProviderErrorCode

    /**
     * Indicates whether request may be retried safely.
     */
    readonly isRetryable: boolean

    /**
     * HTTP status code when available.
     */
    readonly statusCode?: number

    /**
     * Suggested retry delay in milliseconds.
     */
    readonly retryAfterMs?: number

    /**
     * Delivery deduplication key associated with the failure.
     */
    readonly dedupeKey?: string
}

/**
 * Error thrown by Discord provider after normalization and retry evaluation.
 */
export class DiscordProviderError extends Error {
    /**
     * Machine-readable error code.
     */
    public readonly code: DiscordProviderErrorCode

    /**
     * Indicates whether request may be retried safely.
     */
    public readonly isRetryable: boolean

    /**
     * HTTP status code when available.
     */
    public readonly statusCode?: number

    /**
     * Suggested retry delay in milliseconds.
     */
    public readonly retryAfterMs?: number

    /**
     * Delivery deduplication key associated with the failure.
     */
    public readonly dedupeKey?: string

    /**
     * Creates provider error.
     *
     * @param message Human-readable message.
     * @param details Normalized error details.
     */
    public constructor(message: string, details: IDiscordProviderErrorDetails) {
        super(message)
        this.name = "DiscordProviderError"
        this.code = details.code
        this.isRetryable = details.isRetryable
        this.statusCode = details.statusCode
        this.retryAfterMs = details.retryAfterMs
        this.dedupeKey = details.dedupeKey
    }
}
