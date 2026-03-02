import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Payload for ReviewStarted event.
 */
export interface IReviewStartedPayload extends DomainEventPayload {
    readonly reviewId: string
    readonly mergeRequestId: string
    readonly startedAt: string
}

/**
 * Review lifecycle event raised when processing starts.
 */
export class ReviewStarted extends BaseDomainEvent<IReviewStartedPayload> {
    /**
     * Creates ReviewStarted event.
     *
     * @param aggregateId Review aggregate id.
     * @param payload Event payload.
     * @param occurredAt Event creation time.
     */
    public constructor(aggregateId: string, payload: IReviewStartedPayload, occurredAt?: Date) {
        super(aggregateId, payload, occurredAt)
    }

    /**
     * Resolves event name literal.
     *
     * @returns Event name.
     */
    protected resolveEventName(): string {
        return "ReviewStarted"
    }
}
