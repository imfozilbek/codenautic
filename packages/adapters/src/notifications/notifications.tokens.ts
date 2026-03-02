import {createToken} from "@codenautic/core"

import {InMemoryNotificationDispatcherAdapter} from "./adapters/in-memory-notification-dispatcher.adapter"

/**
 * Notifications domain IoC tokens.
 */
export const NOTIFICATIONS_TOKENS = {
    Dispatcher: createToken<InMemoryNotificationDispatcherAdapter>(
        "adapters.notifications.dispatcher",
    ),
} as const
