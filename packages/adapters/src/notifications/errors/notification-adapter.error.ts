/**
 * Stable error codes exposed by notification adapters.
 */
export const NOTIFICATION_ADAPTER_ERROR_CODE = {
    INVALID_REQUEST: "NOTIFICATION_ADAPTER_INVALID_REQUEST",
} as const

/**
 * Notification adapter error code value.
 */
export type NotificationAdapterErrorCode =
    (typeof NOTIFICATION_ADAPTER_ERROR_CODE)[keyof typeof NOTIFICATION_ADAPTER_ERROR_CODE]

/**
 * Construction params for notification adapter error.
 */
export interface ICreateNotificationAdapterErrorParams {
    readonly code: NotificationAdapterErrorCode
    readonly message: string
    readonly retryable: boolean
    readonly cause?: Error
}

/**
 * Normalized adapter error used by notification contracts.
 */
export class NotificationAdapterError extends Error {
    public readonly code: NotificationAdapterErrorCode
    public readonly retryable: boolean
    public readonly cause?: Error

    /**
     * Creates notification adapter error instance.
     *
     * @param params Error initialization parameters.
     */
    public constructor(params: ICreateNotificationAdapterErrorParams) {
        super(params.message)
        this.name = "NotificationAdapterError"
        this.code = params.code
        this.retryable = params.retryable
        this.cause = params.cause
    }
}
