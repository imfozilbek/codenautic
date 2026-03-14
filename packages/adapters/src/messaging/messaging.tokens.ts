import {
    createToken,
    type IOutboxRelayService,
    type IOutboxRepository,
} from "@codenautic/core"

import type {InboxDeduplicator} from "./inbox-deduplicator.adapter"
import type {OutboxWriter} from "./outbox-writer.adapter"

/**
 * DI tokens for messaging adapter domain.
 */
export const MESSAGING_TOKENS = {
    InboxDeduplicator: createToken<InboxDeduplicator>("adapters.messaging.inbox-deduplicator"),
    OutboxRelayService: createToken<IOutboxRelayService>(
        "adapters.messaging.outbox-relay-service",
    ),
    OutboxRepository: createToken<IOutboxRepository>("adapters.messaging.outbox-repository"),
    OutboxWriter: createToken<OutboxWriter>("adapters.messaging.outbox-writer"),
} as const
