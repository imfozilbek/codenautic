import {toMessageBrokerEnvelope} from "../../ports/outbound/messaging/message-broker.port"
import type {IOutboxRepository} from "../../ports/outbound/messaging/outbox-repository.port"
import type {IMessageBroker} from "../../ports/outbound/messaging/message-broker.port"
import {OUTBOX_MESSAGE_STATUS} from "../../../domain/entities/outbox-message.entity"
import type {IOutboxRelayDefaults} from "../../dto/config/system-defaults.dto"

/**
 * Relay execution result.
 */
export interface IOutboxRelayResult {
    /**
     * Messages fetched from repository.
     */
    total: number

    /**
     * Messages sent successfully.
     */
    sent: number

    /**
     * Messages failed in current batch.
     */
    failed: number

    /**
     * Messages with pending retry left.
     */
    retriable: number

    /**
     * Messages marked as permanently failed.
     */
    permanentlyFailed: number
}

/**
 * Reliable relay for outbox messages.
 */
export interface IOutboxRelayService {
    /**
     * Runs one relay batch.
     *
     * @returns Relay summary.
     */
    relay(): Promise<IOutboxRelayResult>
}

/**
 * Domain service for publishing outbox batch and managing retry state.
 */
export class OutboxRelayService implements IOutboxRelayService {
    private readonly outboxRepository: IOutboxRepository
    private readonly messageBroker: IMessageBroker
    private readonly batchSize: number

    /**
     * Creates relay service.
     *
     * @param outboxRepository Outbox persistence.
     * @param messageBroker Broker transport.
     * @param defaults Defaults resolved from config-service.
     */
    public constructor(
        outboxRepository: IOutboxRepository,
        messageBroker: IMessageBroker,
        defaults: IOutboxRelayDefaults,
    ) {
        this.outboxRepository = outboxRepository
        this.messageBroker = messageBroker
        this.batchSize = defaults.batchSize
    }

    /**
     * Runs one batch of pending messages.
     *
     * @returns Batch execution result.
     */
    public async relay(): Promise<IOutboxRelayResult> {
        const messages = await this.outboxRepository.findPending(this.batchSize)

        const result: IOutboxRelayResult = {
            total: messages.length,
            sent: 0,
            failed: 0,
            retriable: 0,
            permanentlyFailed: 0,
        }

        for (const message of messages) {
            if (message.status !== OUTBOX_MESSAGE_STATUS.PENDING) {
                continue
            }

            const envelope = toMessageBrokerEnvelope(message)
            try {
                await this.messageBroker.publish(envelope.eventType, envelope.payload)
                message.markSent()
                await this.outboxRepository.markSent(message.id)
                result.sent += 1
                continue
            } catch {
                message.markFailed()
                if (message.isFailed()) {
                    await this.outboxRepository.markFailed(message.id)
                    result.failed += 1
                    result.permanentlyFailed += 1
                } else {
                    await this.outboxRepository.save(message)
                    result.failed += 1
                    result.retriable += 1
                }
            }
        }

        return result
    }

    /**
     * Returns configured batch size.
     *
     * @returns Batch size.
     */
    public getBatchSize(): number {
        return this.batchSize
    }
}
