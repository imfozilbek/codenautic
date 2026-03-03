import type {IInboxRepository} from "../../ports/outbound/messaging/inbox-repository.port"
import {InboxMessage} from "../../../domain/entities/inbox-message.entity"
import {UniqueId} from "../../../domain/value-objects/unique-id.value-object"

/**
 * Dependencies for inbox deduplication service.
 */
export interface IInboxDeduplicationServiceDependencies {
    /**
     * Inbox repository implementation.
     */
    readonly inboxRepository: IInboxRepository

    /**
     * Deterministic clock for tests.
     */
    readonly now?: () => Date
}

/**
 * Inbox deduplication service contract.
 */
export interface IInboxDeduplicationService {
    /**
     * Checks if message was already processed.
     *
     * @param messageId External message identifier.
     */
    isDuplicate(messageId: string): Promise<boolean>

    /**
     * Processes message idempotently: mark existing as processed or create new.
     *
     * @param messageId External message identifier.
     * @param eventType Event type.
     * @returns True when message was first seen and processed now.
     */
    process(messageId: string, eventType: string): Promise<boolean>
}

/**
 * Service for exactly-once inbox processing by message id.
 */
export class InboxDeduplicationService implements IInboxDeduplicationService {
    private readonly inboxRepository: IInboxRepository
    private readonly now: () => Date

    /**
     * Creates inbox deduplication service.
     *
     * @param dependencies Service dependencies.
     */
    public constructor(dependencies: IInboxDeduplicationServiceDependencies) {
        this.inboxRepository = dependencies.inboxRepository
        this.now = dependencies.now ?? (() => new Date())
    }

    /**
     * Checks if message already processed.
     *
     * @param messageId External message identifier.
     * @returns True when already seen and processed.
     */
    public async isDuplicate(messageId: string): Promise<boolean> {
        const normalizedMessageId = normalizeMessageId(messageId)
        const existing = await this.inboxRepository.findByMessageId(normalizedMessageId)
        if (existing === null) {
            return false
        }

        return existing.isProcessed()
    }

    /**
     * Processes message idempotently and returns true only for first-time processing.
     *
     * @param messageId External message identifier.
     * @param eventType Event type.
     * @returns True if message was first time.
     */
    public async process(messageId: string, eventType: string): Promise<boolean> {
        const normalizedMessageId = normalizeMessageId(messageId)
        const normalizedEventType = normalizeEventType(eventType)

        const existing = await this.inboxRepository.findByMessageId(normalizedMessageId)
        if (existing !== null) {
            if (existing.isProcessed()) {
                return false
            }

            existing.markProcessed(this.now())
            await this.inboxRepository.markProcessed(existing.id)
            return false
        }

        const message = new InboxMessage(UniqueId.create(), {
            messageId: normalizedMessageId,
            eventType: normalizedEventType,
            processedAt: this.now(),
        })
        await this.inboxRepository.save(message)
        return true
    }
}

/**
 * Normalizes message id.
 *
 * @param messageId Raw id.
 * @returns Normalized id.
 */
function normalizeMessageId(messageId: string): string {
    const normalized = messageId.trim()
    if (normalized.length === 0) {
        throw new Error("messageId cannot be empty")
    }

    return normalized
}

/**
 * Normalizes event type.
 *
 * @param eventType Raw type.
 * @returns Normalized type.
 */
function normalizeEventType(eventType: string): string {
    const normalized = eventType.trim()
    if (normalized.length === 0) {
        throw new Error("eventType cannot be empty")
    }

    return normalized
}
