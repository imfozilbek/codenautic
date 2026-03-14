import {
    Container,
    TOKENS,
    type IInboxRepository,
    type IOutboxRelayService,
    type IOutboxRepository,
} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {InboxDeduplicator} from "./inbox-deduplicator.adapter"
import {MESSAGING_TOKENS} from "./messaging.tokens"
import type {OutboxWriter} from "./outbox-writer.adapter"

/**
 * Registration options for messaging adapter module.
 */
export interface IRegisterMessagingModuleOptions {
    /**
     * Outbox writer adapter instance.
     */
    readonly outboxWriter: OutboxWriter

    /**
     * Inbox deduplication adapter instance.
     */
    readonly inboxDeduplicator: InboxDeduplicator

    /**
     * Optional outbox repository implementation.
     */
    readonly outboxRepository?: IOutboxRepository

    /**
     * Optional inbox repository implementation.
     */
    readonly inboxRepository?: IInboxRepository

    /**
     * Optional outbox relay service implementation.
     */
    readonly outboxRelayService?: IOutboxRelayService
}

/**
 * Registers messaging adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerMessagingModule(
    container: Container,
    options: IRegisterMessagingModuleOptions,
): void {
    bindConstantSingleton(container, MESSAGING_TOKENS.OutboxWriter, options.outboxWriter)
    bindConstantSingleton(
        container,
        MESSAGING_TOKENS.InboxDeduplicator,
        options.inboxDeduplicator,
    )

    if (options.outboxRepository !== undefined) {
        bindConstantSingleton(
            container,
            MESSAGING_TOKENS.OutboxRepository,
            options.outboxRepository,
        )
        bindConstantSingleton(
            container,
            TOKENS.Messaging.OutboxRepository,
            options.outboxRepository,
        )
    }

    if (options.inboxRepository !== undefined) {
        bindConstantSingleton(
            container,
            MESSAGING_TOKENS.InboxRepository,
            options.inboxRepository,
        )
        bindConstantSingleton(
            container,
            TOKENS.Messaging.InboxRepository,
            options.inboxRepository,
        )
    }

    if (options.outboxRelayService !== undefined) {
        bindConstantSingleton(
            container,
            MESSAGING_TOKENS.OutboxRelayService,
            options.outboxRelayService,
        )
    }
}
