import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Supported feedback kinds for review findings.
 */
export const FEEDBACK_TYPE = {
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    FALSE_POSITIVE: "FALSE_POSITIVE",
    IGNORED: "IGNORED",
} as const

/**
 * Feedback type literal.
 */
export type FeedbackType = (typeof FEEDBACK_TYPE)[keyof typeof FEEDBACK_TYPE]

/**
 * Payload for FeedbackReceived event.
 */
export interface IFeedbackReceivedPayload extends DomainEventPayload {
    readonly issueId: string
    readonly reviewId: string
    readonly feedbackType: FeedbackType
    readonly userId: string
}

/**
 * Event emitted when user feedback is attached to issue.
 */
export class FeedbackReceived extends BaseDomainEvent<IFeedbackReceivedPayload> {
    /**
     * Creates FeedbackReceived event.
     *
     * @param aggregateId Review aggregate identifier.
     * @param payload Event payload.
     * @param occurredAt Optional event timestamp.
     */
    public constructor(aggregateId: string, payload: IFeedbackReceivedPayload, occurredAt?: Date) {
        super(aggregateId, payload, occurredAt)
    }

    /**
     * Resolves event name.
     *
     * @returns Event name literal.
     */
    protected resolveEventName(): string {
        return "FeedbackReceived"
    }
}
