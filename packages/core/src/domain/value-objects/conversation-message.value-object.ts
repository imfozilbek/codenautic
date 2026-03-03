export const CONVERSATION_MESSAGE_ROLE = {
    USER: "user",
    ASSISTANT: "assistant",
} as const

/**
 * Supported conversation message roles.
 */
export type ConversationMessageRole =
    (typeof CONVERSATION_MESSAGE_ROLE)[keyof typeof CONVERSATION_MESSAGE_ROLE]

/**
 * Serializable payload for conversation message creation.
 */
export interface IConversationMessageProps {
    /**
     * Who authored the message.
     */
    readonly role: ConversationMessageRole

    /**
     * Message content.
     */
    readonly content: string

    /**
     * Message creation timestamp.
     */
    readonly timestamp?: Date

    /**
     * Optional metadata for provider-specific payload.
     */
    readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * Immutable value object describing one conversation message.
 */
export class ConversationMessage {
    private readonly roleValue: ConversationMessageRole
    private readonly contentValue: string
    private readonly timestampValue: Date
    private readonly metadataValue: Record<string, unknown>

    private constructor(props: IConversationMessageProps) {
        this.roleValue = normalizeRole(props.role)
        this.contentValue = normalizeContent(props.content)
        this.timestampValue = normalizeTimestamp(props.timestamp)
        this.metadataValue = normalizeMetadata(props.metadata)
        Object.freeze(this)
    }

    /**
     * Creates new conversation message.
     *
     * @param props Raw message payload.
     * @returns Immutable message object.
     */
    public static create(props: IConversationMessageProps): ConversationMessage {
        return new ConversationMessage({
            ...props,
            timestamp: props.timestamp ?? new Date(),
            metadata: props.metadata ?? {},
        })
    }

    /**
     * Message role.
     *
     * @returns Message role constant value.
     */
    public get role(): ConversationMessageRole {
        return this.roleValue
    }

    /**
     * Message content.
     *
     * @returns Normalized content.
     */
    public get content(): string {
        return this.contentValue
    }

    /**
     * Timestamp of message creation.
     *
     * @returns Message creation time copy.
     */
    public get timestamp(): Date {
        return new Date(this.timestampValue)
    }

    /**
     * Optional metadata.
     *
     * @returns Metadata copy.
     */
    public get metadata(): Readonly<Record<string, unknown>> {
        return {...this.metadataValue}
    }
}

/**
 * Validates conversation role.
 *
 * @param value Raw role value.
 * @returns Normalized role.
 */
function normalizeRole(value: ConversationMessageRole): ConversationMessageRole {
    if (Object.values(CONVERSATION_MESSAGE_ROLE).includes(value) === false) {
        throw new Error(`Unsupported message role: ${String(value)}`)
    }

    return value
}

/**
 * Validates message text and returns trimmed value.
 *
 * @param value Raw content.
 * @returns Normalized non-empty content.
 */
function normalizeContent(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Conversation message content cannot be empty")
    }

    return normalized
}

/**
 * Normalizes timestamp.
 *
 * @param value Timestamp.
 * @returns Copy of date value.
 */
function normalizeTimestamp(value: Date | undefined): Date {
    const timestamp = value ?? new Date()
    if (Number.isNaN(timestamp.getTime())) {
        throw new Error("Conversation message timestamp must be valid date")
    }

    return new Date(timestamp)
}

/**
 * Clones metadata object.
 *
 * @param metadata Optional metadata.
 * @returns Defensive copy.
 */
function normalizeMetadata(metadata?: Readonly<Record<string, unknown>>): Record<string, unknown> {
    if (metadata === undefined) {
        return {}
    }

    return {...metadata}
}
