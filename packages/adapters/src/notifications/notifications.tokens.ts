import {createToken, type INotificationProvider} from "@codenautic/core"

import type {INotificationProviderFactory} from "./notification-provider.factory"

/**
 * DI tokens for notifications adapter domain.
 */
export const NOTIFICATION_TOKENS = {
    Providers: createToken<readonly INotificationProvider[]>("adapters.notifications.providers"),
    ProviderFactory: createToken<INotificationProviderFactory>("adapters.notifications.provider-factory"),
} as const
