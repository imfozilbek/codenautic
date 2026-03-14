import {Container, type INotificationProvider} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {MessengerWebhookHandler} from "./messenger-webhook-handler"
import type {INotificationProviderFactory} from "./notification-provider.factory"
import {NOTIFICATION_TOKENS} from "./notifications.tokens"

/**
 * Registration options for notifications adapter module.
 */
export interface IRegisterNotificationsModuleOptions {
    /**
     * Notification providers available in this runtime.
     */
    readonly providers: readonly INotificationProvider[]

    /**
     * Optional notification provider factory.
     */
    readonly providerFactory?: INotificationProviderFactory

    /**
     * Optional unified messenger webhook handler.
     */
    readonly messengerWebhookHandler?: MessengerWebhookHandler
}

/**
 * Registers notifications adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerNotificationsModule(
    container: Container,
    options: IRegisterNotificationsModuleOptions,
): void {
    bindConstantSingleton(container, NOTIFICATION_TOKENS.Providers, options.providers)

    if (options.providerFactory !== undefined) {
        bindConstantSingleton(
            container,
            NOTIFICATION_TOKENS.ProviderFactory,
            options.providerFactory,
        )
    }

    if (options.messengerWebhookHandler !== undefined) {
        bindConstantSingleton(
            container,
            NOTIFICATION_TOKENS.MessengerWebhookHandler,
            options.messengerWebhookHandler,
        )
    }
}
