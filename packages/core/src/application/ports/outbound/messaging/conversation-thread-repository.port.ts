import {ConversationThread} from "../../../../domain/entities/conversation-thread.entity"
import type {IRepository} from "../common/repository.port"

/**
 * Outbound persistence contract for conversation threads.
 */
export interface IConversationThreadRepository extends IRepository<ConversationThread> {
    /**
     * Finds thread by channel identifier.
     *
     * @param channelId Channel identifier.
     * @returns Matching thread when exists.
     */
    findByChannelId(channelId: string): Promise<ConversationThread | null>

    /**
     * Finds active threads for participant.
     *
     * @param userId Participant id.
     * @returns Active threads where participantId is included.
     */
    findActiveByParticipant(userId: string): Promise<readonly ConversationThread[]>
}
