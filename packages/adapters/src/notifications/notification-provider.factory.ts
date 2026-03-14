import {
    NOTIFICATION_CHANNEL,
    type INotificationProvider,
    type NotificationChannel,
} from "@codenautic/core"

import {
    NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE,
    NotificationProviderFactoryError,
} from "./notification-provider-factory.error"

/**
 * Notification provider registry options.
 */
export interface INotificationProviderFactoryOptions {
    /**
     * Slack provider implementation.
     */
    readonly slack?: INotificationProvider

    /**
     * Microsoft Teams provider implementation.
     */
    readonly teams?: INotificationProvider

    /**
     * Email provider implementation.
     */
    readonly email?: INotificationProvider

    /**
     * Webhook provider implementation.
     */
    readonly webhook?: INotificationProvider

    /**
     * Discord provider implementation mapped to WEBHOOK channel.
     */
    readonly discord?: INotificationProvider
}

/**
 * Notification provider factory contract.
 */
export interface INotificationProviderFactory {
    /**
     * Resolves provider by channel.
     *
     * @param channel Notification channel or alias.
     * @returns Matching provider implementation.
     * @throws NotificationProviderFactoryError when channel is unknown or provider is not configured.
     */
    create(channel: string): INotificationProvider
}

const NOTIFICATION_CHANNEL_ALIAS_TO_TYPE: Readonly<Record<string, NotificationChannel>> = {
    slack: NOTIFICATION_CHANNEL.SLACK,
    sl: NOTIFICATION_CHANNEL.SLACK,
    teams: NOTIFICATION_CHANNEL.TEAMS,
    "ms-teams": NOTIFICATION_CHANNEL.TEAMS,
    mst: NOTIFICATION_CHANNEL.TEAMS,
    "microsoft-teams": NOTIFICATION_CHANNEL.TEAMS,
    email: NOTIFICATION_CHANNEL.EMAIL,
    mail: NOTIFICATION_CHANNEL.EMAIL,
    webhook: NOTIFICATION_CHANNEL.WEBHOOK,
    hook: NOTIFICATION_CHANNEL.WEBHOOK,
    discord: NOTIFICATION_CHANNEL.WEBHOOK,
}

/**
 * Factory for selecting notification provider by configured channel.
 */
export class NotificationProviderFactory implements INotificationProviderFactory {
    private readonly providers: ReadonlyMap<NotificationChannel, INotificationProvider>

    /**
     * Creates notification provider factory.
     *
     * @param options Provider registry.
     */
    public constructor(options: INotificationProviderFactoryOptions) {
        this.providers = buildProviderMap(options)
    }

    /**
     * Resolves provider by channel.
     *
     * @param channel Notification channel or alias.
     * @returns Matching provider implementation.
     * @throws NotificationProviderFactoryError when channel is unknown or missing in registry.
     */
    public create(channel: string): INotificationProvider {
        const normalizedChannel = normalizeNotificationProviderChannel(channel)
        const provider = this.providers.get(normalizedChannel)

        if (provider === undefined) {
            throw new NotificationProviderFactoryError(
                NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
                channel,
            )
        }

        return provider
    }
}

/**
 * Normalizes notification channel into canonical value.
 *
 * @param channel Raw channel value.
 * @returns Canonical notification channel.
 * @throws NotificationProviderFactoryError when channel is unsupported.
 */
export function normalizeNotificationProviderChannel(channel: string): NotificationChannel {
    const normalizedValue = channel.trim().toLowerCase()
    const normalizedChannel = NOTIFICATION_CHANNEL_ALIAS_TO_TYPE[normalizedValue]

    if (normalizedChannel === undefined) {
        throw new NotificationProviderFactoryError(
            NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_CHANNEL,
            channel,
        )
    }

    return normalizedChannel
}

/**
 * Builds immutable provider map from factory options.
 *
 * @param options Provider registry options.
 * @returns Immutable provider map.
 */
function buildProviderMap(
    options: INotificationProviderFactoryOptions,
): ReadonlyMap<NotificationChannel, INotificationProvider> {
    const providers = new Map<NotificationChannel, INotificationProvider>()
    const webhookProvider = options.webhook ?? options.discord

    registerProvider(providers, NOTIFICATION_CHANNEL.SLACK, options.slack)
    registerProvider(providers, NOTIFICATION_CHANNEL.TEAMS, options.teams)
    registerProvider(providers, NOTIFICATION_CHANNEL.EMAIL, options.email)
    registerProvider(providers, NOTIFICATION_CHANNEL.WEBHOOK, webhookProvider)

    return providers
}

/**
 * Registers one provider after validating channel-slot consistency.
 *
 * @param providers Mutable provider registry.
 * @param expectedChannel Expected canonical channel.
 * @param provider Optional provider implementation.
 */
function registerProvider(
    providers: Map<NotificationChannel, INotificationProvider>,
    expectedChannel: NotificationChannel,
    provider: INotificationProvider | undefined,
): void {
    if (provider === undefined) {
        return
    }

    assertProviderChannel(provider, expectedChannel)
    providers.set(expectedChannel, provider)
}

/**
 * Validates that configured provider matches registry slot.
 *
 * @param provider Provider implementation.
 * @param expectedChannel Expected canonical channel.
 */
function assertProviderChannel(
    provider: INotificationProvider,
    expectedChannel: NotificationChannel,
): void {
    if (provider.channel !== expectedChannel) {
        throw new NotificationProviderFactoryError(
            NOTIFICATION_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_CHANNEL_MISMATCH,
            expectedChannel,
            {
                expectedChannel,
                actualChannel: provider.channel,
            },
        )
    }
}
