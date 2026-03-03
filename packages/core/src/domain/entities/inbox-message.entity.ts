import {Entity} from "./entity"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Inbox message state.
 */
export interface IInboxMessageProps {
    /**
     * External id for deduplication.
     */
    messageId: string

    /**
     * Logical event name.
     */
    eventType: string

    /**
     * Optional processed timestamp.
     */
    processedAt?: Date
}

/**
 * Inbox message entity.
 */
export class InboxMessage extends Entity<IInboxMessageProps> {
    /**
     * Creates inbox message entity.
     *
     * @param id Entity identifier.
     * @param props Message state.
     */
    public constructor(id: UniqueId, props: IInboxMessageProps) {
        super(id, props)
        this.props.messageId = normalizeMessageId(props.messageId)
        this.props.eventType = normalizeEventType(props.eventType)
        this.props.processedAt = props.processedAt === undefined ? undefined : normalizeDate(props.processedAt)
        this.ensureStateIsValid()
    }

    /**
     * External message identifier for deduplication.
     *
     * @returns Message id.
     */
    public get messageId(): string {
        return this.props.messageId
    }

    /**
     * Event type.
     *
     * @returns Event type.
     */
    public get eventType(): string {
        return this.props.eventType
    }

    /**
     * Processing timestamp.
     *
     * @returns Processed date or null.
     */
    public get processedAt(): Date | null {
        if (this.props.processedAt === undefined) {
            return null
        }
        return new Date(this.props.processedAt)
    }

    /**
     * Marks message as processed.
     *
     * @param processedAt Optional time.
     */
    public markProcessed(processedAt: Date = new Date()): void {
        this.props.processedAt = normalizeDate(processedAt)
    }

    /**
     * Whether message is already processed.
     *
     * @returns True if processedAt set.
     */
    public isProcessed(): boolean {
        return this.props.processedAt !== undefined
    }

    private ensureStateIsValid(): void {
        if (this.props.processedAt === undefined) {
            return
        }

        this.props.processedAt = normalizeDate(this.props.processedAt)
    }
}

/**
 * Normalizes external message id.
 *
 * @param value Raw id.
 * @returns Normalized id.
 */
function normalizeMessageId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Inbox messageId cannot be empty")
    }

    return normalized
}

/**
 * Normalizes event type.
 *
 * @param value Raw event type.
 * @returns Normalized event type.
 */
function normalizeEventType(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Inbox eventType cannot be empty")
    }

    return normalized
}

/**
 * Normalizes date input.
 *
 * @param value Raw date.
 * @returns Safe date copy.
 */
function normalizeDate(value: Date): Date {
    if (Number.isNaN(value.getTime())) {
        throw new Error("Inbox processedAt must be valid date")
    }

    return new Date(value)
}
