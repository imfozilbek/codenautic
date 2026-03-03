import {
    ConversationThread,
    CONVERSATION_THREAD_STATUS,
    type ConversationThreadStatus,
    type IConversationThreadProps,
} from "../entities/conversation-thread.entity"
import {ConversationMessage} from "../value-objects/conversation-message.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating conversation thread.
 */
export interface ICreateConversationThreadProps {
    /**
     * Logical channel id.
     */
    readonly channelId: string

    /**
     * Participants.
     */
    readonly participantIds: readonly string[]
}

/**
 * Persistence snapshot for conversation thread.
 */
export interface IReconstituteConversationThreadProps {
    /**
     * Existing identifier.
     */
    readonly id: string

    /**
     * Channel id.
     */
    readonly channelId: string

    /**
     * Participants list.
     */
    readonly participantIds: readonly string[]

    /**
     * Persisted messages.
     */
    readonly messages: readonly {
        readonly role: "user" | "assistant"
        readonly content: string
        readonly timestamp?: Date
        readonly metadata?: Readonly<Record<string, unknown>>
    }[]

    /**
     * Thread status.
     */
    readonly status: ConversationThreadStatus

    /**
     * Thread closed time.
     */
    readonly closedAt?: Date
}

/**
 * Factory for conversation thread aggregate.
 */
export class ConversationThreadFactory
    implements IEntityFactory<ConversationThread, ICreateConversationThreadProps, IReconstituteConversationThreadProps>
{
    /**
     * Creates factory instance.
     */
    public constructor() {}

    /**
     * Creates brand new conversation thread.
     *
     * @param input Creation input.
     * @returns New conversation thread.
     */
    public create(input: ICreateConversationThreadProps): ConversationThread {
        const props: IConversationThreadProps = {
            channelId: input.channelId,
            participantIds: [...input.participantIds],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        }

        return new ConversationThread(UniqueId.create(), props)
    }

    /**
     * Rehydrates thread from persistence snapshot.
     *
     * @param input Snapshot payload.
     * @returns Reconstituted thread.
     */
    public reconstitute(input: IReconstituteConversationThreadProps): ConversationThread {
        const messages = input.messages.map((message) => {
            return ConversationMessage.create({
                role: message.role,
                content: message.content,
                timestamp: message.timestamp,
                metadata: message.metadata,
            })
        })

        return new ConversationThread(UniqueId.create(input.id), {
            channelId: input.channelId,
            participantIds: [...input.participantIds],
            messages,
            status: input.status,
            closedAt: input.closedAt,
        })
    }
}
