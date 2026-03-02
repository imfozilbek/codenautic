/**
 * Supported notification channels.
 */
export const NOTIFICATION_CHANNEL = {
    SLACK: "slack",
    DISCORD: "discord",
    TEAMS: "teams",
    EMAIL: "email",
    WEBHOOK: "webhook",
} as const

/**
 * Notification channel value.
 */
export type NotificationChannel =
    (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL]

/**
 * Notification dispatch status values.
 */
export const NOTIFICATION_DELIVERY_STATUS = {
    SENT: "sent",
    DUPLICATE: "duplicate",
} as const

/**
 * Notification dispatch status value.
 */
export type NotificationDeliveryStatus =
    (typeof NOTIFICATION_DELIVERY_STATUS)[keyof typeof NOTIFICATION_DELIVERY_STATUS]

/**
 * Notification dispatch request DTO.
 */
export interface INotificationDispatchRequest {
    readonly channel: NotificationChannel
    readonly recipient: string
    readonly body: string
    readonly subject?: string
    readonly metadata?: Readonly<Record<string, unknown>>
    readonly idempotencyKey: string
}

/**
 * Notification delivery result DTO.
 */
export interface INotificationDeliveryResult {
    readonly status: NotificationDeliveryStatus
    readonly messageId: string
    readonly channel: NotificationChannel
    readonly recipient: string
    readonly dispatchedAt: Date
}
