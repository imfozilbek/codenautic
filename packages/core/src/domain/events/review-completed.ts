import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Possible terminal outcomes for review lifecycle.
 */
export const REVIEW_COMPLETION_STATUS = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const

/**
 * Review completion status literal type.
 */
export type ReviewCompletionStatus =
    (typeof REVIEW_COMPLETION_STATUS)[keyof typeof REVIEW_COMPLETION_STATUS]

/**
 * Payload for ReviewCompleted event.
 */
export interface IReviewCompletedPayload extends DomainEventPayload {
    readonly reviewId: string
    readonly status: ReviewCompletionStatus
    readonly issueCount: number
    readonly durationMs: number
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
        super(aggregateId, payload, occurredAt)
    }

    /**
     * Resolves event name literal.
     *
     * @returns Event name.
     */
    protected resolveEventName(): string {
        return "ReviewCompleted"
    }
}
