import type {InboxMessage} from "../../../../domain/entities/inbox-message.entity"
import type {UniqueId} from "../../../../domain/value-objects/unique-id.value-object"
import type {IRepository} from "../common/repository.port"

/**
 * Outbound persistence contract for inbox deduplication.
 */
export interface IInboxRepository extends IRepository<InboxMessage> {
    /**
     * Finds message by external identifier.
     *
     * @param messageId External message id.
     */
    findByMessageId(messageId: string): Promise<InboxMessage | null>

    /**
     * Marks message as processed.
     *
     * @param id Message identifier.
     */
    markProcessed(id: string | UniqueId): Promise<void>
}
