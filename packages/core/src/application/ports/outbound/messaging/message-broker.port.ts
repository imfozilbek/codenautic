import type {OutboxMessage} from "../../../../domain/entities/outbox-message.entity"

/**
 * Runtime payload passed to broker handlers.
 */
export type MessageBrokerPayload = Readonly<Record<string, unknown>>

/**
 * Event handler for inbound broker messages.
 */
export type MessageBrokerHandler = (payload: MessageBrokerPayload) => Promise<void>

/**
 * Message broker port for outbox/inbox integration.
 */
export interface IMessageBroker {
    /**
     * Publishes event payload by event type.
     *
     * @param eventType Logical event type.
     * @param payload Event payload.
     */
    publish(eventType: string, payload: MessageBrokerPayload): Promise<void>

    /**
     * Subscribes handler for event type.
     *
     * @param eventType Event type to subscribe.
     * @param handler Message handler.
     */
    subscribe(eventType: string, handler: MessageBrokerHandler): Promise<void>
}

/**
 * Message payload prepared from outbox record.
 */
export interface IOutboxMessageEnvelope {
    /**
     * Message identifier.
     */
    readonly messageId: string

    /**
     * Event type.
     */
    readonly eventType: string

    /**
     * Parsed payload.
     */
    readonly payload: MessageBrokerPayload
}

/**
 * Serializes outbox message into broker envelope.
 */
export function toMessageBrokerEnvelope(message: OutboxMessage): IOutboxMessageEnvelope {
    return {
        messageId: message.id.value,
        eventType: message.eventType,
        payload: parsePayload(message.payload),
    }
}

/**
 * Parses outbox payload to broker payload.
 *
 * @param payload JSON payload.
 * @returns Parsed payload.
 */
function parsePayload(payload: string): MessageBrokerPayload {
    const parsed = JSON.parse(payload) as unknown

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Outbox payload must be JSON object")
    }

    return parsed as MessageBrokerPayload
}
