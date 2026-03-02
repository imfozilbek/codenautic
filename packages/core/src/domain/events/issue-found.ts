import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Payload for IssueFound event.
 */
export interface IIssueFoundPayload extends DomainEventPayload {
    readonly issueId: string
    readonly reviewId: string
    readonly severity: string
    readonly filePath: string
    readonly lineRange: string
}

/**
 * Event emitted when new issue is added to review.
 */
export class IssueFound extends BaseDomainEvent<IIssueFoundPayload> {
    /**
     * Creates IssueFound event.
     *
     * @param aggregateId Review aggregate identifier.
     * @param payload Event payload.
     * @param occurredAt Optional event timestamp.
     */
    public constructor(aggregateId: string, payload: IIssueFoundPayload, occurredAt?: Date) {
        super(aggregateId, payload, occurredAt)
    }

    /**
     * Resolves event name.
     *
     * @returns Event name literal.
     */
    protected resolveEventName(): string {
        return "IssueFound"
    }
}
