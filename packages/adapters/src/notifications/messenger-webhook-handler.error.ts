/**
 * Machine-readable messenger webhook handler error codes.
 */
export const MESSENGER_WEBHOOK_HANDLER_ERROR_CODE = {
    CONFIGURATION: "CONFIGURATION",
    UNSUPPORTED_PLATFORM: "UNSUPPORTED_PLATFORM",
    INVALID_SIGNATURE: "INVALID_SIGNATURE",
    INVALID_EVENT: "INVALID_EVENT",
    UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
    PROCESSING_FAILED: "PROCESSING_FAILED",
} as const

/**
 * Messenger webhook handler error code.
 */
export type MessengerWebhookHandlerErrorCode =
    (typeof MESSENGER_WEBHOOK_HANDLER_ERROR_CODE)[keyof typeof MESSENGER_WEBHOOK_HANDLER_ERROR_CODE]

/**
 * Normalized error metadata exposed by messenger webhook handler.
 */
export interface IMessengerWebhookHandlerErrorDetails {
    /**
     * Machine-readable error code.
     */
    readonly code: MessengerWebhookHandlerErrorCode

    /**
     * Indicates whether retry is safe for this failure.
     */
    readonly isRetryable: boolean

    /**
     * Canonical platform identifier when available.
     */
    readonly platform?: string

    /**
     * Delivery deduplication key when available.
     */
    readonly dedupeKey?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    readonly retryAfterMs?: number
}

/**
 * Error thrown by messenger webhook handler after normalization and retry evaluation.
 */
export class MessengerWebhookHandlerError extends Error {
    /**
     * Machine-readable error code.
     */
    public readonly code: MessengerWebhookHandlerErrorCode

    /**
     * Indicates whether retry is safe for this failure.
     */
    public readonly isRetryable: boolean

    /**
     * Canonical platform identifier when available.
     */
    public readonly platform?: string

    /**
     * Delivery deduplication key when available.
     */
    public readonly dedupeKey?: string

    /**
     * Suggested retry delay in milliseconds.
     */
    public readonly retryAfterMs?: number

    /**
     * Creates messenger webhook handler error.
     *
     * @param message Human-readable error message.
     * @param details Normalized error details.
     */
    public constructor(message: string, details: IMessengerWebhookHandlerErrorDetails) {
        super(message)
        this.name = "MessengerWebhookHandlerError"
        this.code = details.code
        this.isRetryable = details.isRetryable
        this.platform = details.platform
        this.dedupeKey = details.dedupeKey
        this.retryAfterMs = details.retryAfterMs
    }
}
