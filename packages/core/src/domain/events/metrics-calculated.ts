import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Token usage metrics payload.
 */
export interface ITokenUsagePayload extends DomainEventPayload {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly totalTokens: number
}

/**
 * Payload for MetricsCalculated event.
 */
export interface IMetricsCalculatedPayload extends DomainEventPayload {
    readonly reviewId: string
    readonly tokenUsage: ITokenUsagePayload
    readonly costEstimate: number
    readonly duration: number
}

/**
 * Event emitted when review metrics are calculated.
 */
export class MetricsCalculated extends BaseDomainEvent<IMetricsCalculatedPayload> {
    /**
     * Creates MetricsCalculated event.
     *
     * @param aggregateId Review aggregate identifier.
     * @param payload Event payload.
     * @param occurredAt Optional event timestamp.
     */
    public constructor(aggregateId: string, payload: IMetricsCalculatedPayload, occurredAt?: Date) {
        super(aggregateId, payload, occurredAt)
    }

    /**
     * Resolves event name.
     *
     * @returns Event name literal.
     */
    protected resolveEventName(): string {
        return "MetricsCalculated"
    }
}
