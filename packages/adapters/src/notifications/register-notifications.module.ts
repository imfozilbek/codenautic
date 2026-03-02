import {Container} from "@codenautic/core"

import {InMemoryNotificationDispatcherAdapter} from "./adapters/in-memory-notification-dispatcher.adapter"
import {NOTIFICATIONS_TOKENS} from "./notifications.tokens"

/**
 * Optional dependency overrides for notifications module registration.
 */
export interface INotificationsModuleOverrides {
    dispatcher?: InMemoryNotificationDispatcherAdapter
}

/**
 * Registers notifications adapter module into target container.
 *
 * @param container Target IoC container.
 * @param overrides Optional dependency overrides.
 * @returns Same container instance for chaining.
 */
export function registerNotificationsModule(
    container: Container,
    overrides: INotificationsModuleOverrides = {},
): Container {
    container.bindSingleton(NOTIFICATIONS_TOKENS.Dispatcher, () => {
        return overrides.dispatcher ?? new InMemoryNotificationDispatcherAdapter()
    })

    return container
}
