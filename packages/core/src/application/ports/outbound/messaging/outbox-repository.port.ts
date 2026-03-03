import type {OutboxMessage} from "../../../../domain/entities/outbox-message.entity"
import type {UniqueId} from "../../../../domain/value-objects/unique-id.value-object"
import type {IRepository} from "../common/repository.port"

/**
 * Outbound persistence contract for outbox messages.
 */
export interface IOutboxRepository extends IRepository<OutboxMessage> {
    /**
     * Finds messages pending to publish.
     *
     * @param limit Optional batch limit.
     * @returns Pending messages in insertion order.
     */
    findPending(limit?: number): Promise<readonly OutboxMessage[]>

    /**
     * Marks message as sent.
     *
     * @param id Message identifier.
     */
    markSent(id: string | UniqueId): Promise<void>

    /**
     * Marks message as failed.
     *
     * @param id Message identifier.
     */
    markFailed(id: string | UniqueId): Promise<void>
}
