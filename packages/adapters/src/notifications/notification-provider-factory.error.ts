import type {NotificationChannel} from "@codenautic/core"

/**
 * Typed error codes for notification provider factory failures.
 */
export const NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE = {
    UNKNOWN_CHANNEL: "UNKNOWN_CHANNEL",
    PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
    PROVIDER_CHANNEL_MISMATCH: "PROVIDER_CHANNEL_MISMATCH",
} as const

/**
 * Notification provider factory error code.
 */
export type NotificationProviderFactoryErrorCode =
    (typeof NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE)[keyof typeof NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE]

/**
 * Typed error raised by notification provider factory.
 */
export class NotificationProviderFactoryError extends Error {
    /**
     * Typed error code.
     */
    public readonly code: NotificationProviderFactoryErrorCode

    /**
     * Raw channel input or canonical slot name that triggered error.
     */
    public readonly channel: string

    /**
     * Expected canonical channel when configuration mismatch happens.
     */
    public readonly expectedChannel?: NotificationChannel

    /**
     * Actual provider channel when configuration mismatch happens.
     */
    public readonly actualChannel?: NotificationChannel

    /**
     * Creates factory error.
     *
     * @param code Typed error code.
     * @param channel Raw channel input or slot name.
     * @param details Optional mismatch details.
     */
    public constructor(
        code: NotificationProviderFactoryErrorCode,
        channel: string,
        details: {
            readonly expectedChannel?: NotificationChannel
            readonly actualChannel?: NotificationChannel
        } = {},
    ) {
        super(buildMessage(code, channel, details.expectedChannel, details.actualChannel))
        this.name = "NotificationProviderFactoryError"
        this.code = code
        this.channel = channel
        this.expectedChannel = details.expectedChannel
        this.actualChannel = details.actualChannel
    }
}

/**
 * Builds stable error message for factory failures.
 *
 * @param code Error code.
 * @param channel Raw channel value.
 * @param expectedChannel Expected channel when available.
 * @param actualChannel Actual channel when available.
 * @returns Error message.
 */
function buildMessage(
    code: NotificationProviderFactoryErrorCode,
    channel: string,
    expectedChannel?: NotificationChannel,
    actualChannel?: NotificationChannel,
): string {
    const normalizedChannel = channel.trim()
    const channelLabel = normalizedChannel.length > 0 ? normalizedChannel : "<empty>"

    if (code === NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_CHANNEL) {
        return `Unknown notification channel: ${channelLabel}`
    }

    if (code === NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_CHANNEL_MISMATCH) {
        return "Notification provider for slot "
            + `${channelLabel} is misconfigured: expected ${expectedChannel ?? "<unknown>"}, `
            + `received ${actualChannel ?? "<unknown>"}`
    }

    return `Notification provider is not configured for channel: ${channelLabel}`
}
