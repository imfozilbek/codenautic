import {Entity} from "./entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {ConversationMessage} from "../value-objects/conversation-message.value-object"

/**
 * Maximum messages allowed in one thread.
 */
export const MAX_MESSAGES_PER_CONVERSATION_THREAD = 50

/**
 * Supported conversation thread statuses.
 */
export const CONVERSATION_THREAD_STATUS = {
    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
} as const

/**
 * Conversation thread status literal.
 */
export type ConversationThreadStatus =
    (typeof CONVERSATION_THREAD_STATUS)[keyof typeof CONVERSATION_THREAD_STATUS]

/**
 * Thread persistence state.
 */
export interface IConversationThreadProps {
    /**
     * Logical channel id.
     */
    channelId: string

    /**
     * Conversation participants.
     */
    participantIds: readonly string[]

    /**
     * Messages in thread.
     */
    messages: readonly ConversationMessage[]

    /**
     * Current thread status.
     */
    status: ConversationThreadStatus

    /**
     * Time when thread was closed.
     */
    closedAt?: Date
}

/**
 * Domain aggregate for a single chat thread.
 */
export class ConversationThread extends Entity<IConversationThreadProps> {
    /**
     * Creates conversation thread entity.
     *
     * @param id Entity identifier.
     * @param props Thread state.
     */
    public constructor(id: UniqueId, props: IConversationThreadProps) {
        super(id, props)
        this.props.channelId = normalizeChannelId(props.channelId)
        this.props.participantIds = normalizeParticipantIds(props.participantIds)
        this.props.messages = normalizeMessages(props.messages)
        this.props.status = normalizeStatus(props.status)
        this.props.closedAt = props.closedAt === undefined ? undefined : normalizeDate(props.closedAt)
        this.ensureStateIsValid()
    }

    /**
     * Logical channel id.
     *
     * @returns Channel identifier.
     */
    public get channelId(): string {
        return this.props.channelId
    }

    /**
     * Thread participants.
     *
     * @returns Participant ids.
     */
    public get participantIds(): readonly string[] {
        return [...this.props.participantIds]
    }

    /**
     * Messages in thread.
     *
     * @returns Message list copy.
     */
    public get messages(): readonly ConversationMessage[] {
        return [...this.props.messages]
    }

    /**
     * Current thread status.
     *
     * @returns Thread status.
     */
    public get status(): ConversationThreadStatus {
        return this.props.status
    }

    /**
     * Closed timestamp.
     *
     * @returns Date when thread was closed, or null.
     */
    public get closedAt(): Date | null {
        if (this.props.closedAt === undefined) {
            return null
        }

        return new Date(this.props.closedAt)
    }

    /**
     * Is thread active.
     *
     * @returns True when status is ACTIVE.
     */
    public isActive(): boolean {
        return this.props.status === CONVERSATION_THREAD_STATUS.ACTIVE
    }

    /**
     * Adds message to thread with max size rule.
     *
     * @param message Message object.
     */
    public addMessage(message: ConversationMessage): void {
        if (this.props.status !== CONVERSATION_THREAD_STATUS.ACTIVE) {
            throw new Error("Cannot add message to closed thread")
        }

        if (this.props.messages.length >= MAX_MESSAGES_PER_CONVERSATION_THREAD) {
            throw new Error(
                `Conversation thread message limit reached: ${MAX_MESSAGES_PER_CONVERSATION_THREAD}`,
            )
        }

        this.props.messages = [...this.props.messages, message]
    }

    /**
     * Closes current thread.
     */
    public close(): void {
        if (this.props.status === CONVERSATION_THREAD_STATUS.CLOSED) {
            return
        }

        this.props.status = CONVERSATION_THREAD_STATUS.CLOSED
        this.props.closedAt = new Date()
    }

    /**
     * Validates domain invariants.
     */
    private ensureStateIsValid(): void {
        if (
            this.props.status === CONVERSATION_THREAD_STATUS.CLOSED &&
            this.props.closedAt === undefined
        ) {
            throw new Error("Closed conversation thread must include closedAt")
        }

        if (this.props.status === CONVERSATION_THREAD_STATUS.ACTIVE && this.props.closedAt !== undefined) {
            throw new Error("Active conversation thread must not include closedAt")
        }
    }

}

/**
 * Validates participant ids list.
 *
 * @param participantIds Raw ids.
 * @returns Deduplicated participant ids.
 */
function normalizeParticipantIds(participantIds: readonly string[]): string[] {
    const normalized = participantIds.map((participantId) => {
        const normalizedId = participantId.trim()
        if (normalizedId.length === 0) {
            throw new Error("Conversation participantId cannot be empty")
        }

        return normalizedId
    })
    const uniqueParticipants = new Map<string, string>()

    for (const participantId of normalized) {
        uniqueParticipants.set(participantId, participantId)
    }

    return [...uniqueParticipants.values()]
}

/**
 * Validates channel id.
 *
 * @param value Channel identifier.
 * @returns Normalized channel id.
 */
function normalizeChannelId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Conversation channelId cannot be empty")
    }

    return normalized
}

/**
 * Cast and validates message list.
 *
 * @param messages Raw message list.
 * @returns Mutable message list.
 */
function normalizeMessages(messages: readonly ConversationMessage[]): ConversationMessage[] {
    const normalized = messages.map((message) => {
        if (message instanceof ConversationMessage === false) {
            throw new Error("Conversation thread message must be ConversationMessage instance")
        }

        return message
    })

    if (normalized.length > MAX_MESSAGES_PER_CONVERSATION_THREAD) {
        throw new Error(
            `Conversation thread cannot have more than ${MAX_MESSAGES_PER_CONVERSATION_THREAD} messages`,
        )
    }

    return normalized
}

/**
 * Normalizes thread status.
 *
 * @param value Raw status.
 * @returns Normalized status.
 */
function normalizeStatus(value: ConversationThreadStatus): ConversationThreadStatus {
    if (Object.values(CONVERSATION_THREAD_STATUS).includes(value) === false) {
        throw new Error(`Unsupported conversation thread status: ${String(value)}`)
    }

    return value
}

/**
 * Normalizes date.
 *
 * @param value Timestamp.
 * @returns Date copy.
 */
function normalizeDate(value: Date): Date {
    if (Number.isNaN(value.getTime())) {
        throw new Error("Conversation thread closedAt must be valid date")
    }

    return new Date(value)
}
