import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Payload for ReviewCompleted event.
 */
export interface IReviewCompletedPayload extends DomainEventPayload {
    readonly reviewId: string
    readonly consumedSeverity: number
    readonly severityBudget: number
}

/**
 * Review lifecycle event raised when processing is completed.
 */
export class ReviewCompleted extends BaseDomainEvent<IReviewCompletedPayload> {
    /**
     * Creates ReviewCompleted event.
     *
     * @param aggregateId Review aggregate id.
     * @param payload Event payload.
     * @param occurredAt Event creation time.
     */
    public constructor(aggregateId: string, payload: IReviewCompletedPayload, occurredAt?: Date) {
        super("ReviewCompleted", aggregateId, payload, occurredAt)
    }
}
