import type {BaseDomainEvent, DomainEventPayload} from "../../../../domain/events/base-domain-event"

/**
 * Outbound contract for domain event publication.
 */
export interface IDomainEventBus {
    /**
     * Publishes domain events.
     *
     * @param events Domain events batch.
     * @returns Promise that resolves when publication is completed.
     */
    publish(events: readonly BaseDomainEvent<DomainEventPayload>[]): Promise<void>
}
