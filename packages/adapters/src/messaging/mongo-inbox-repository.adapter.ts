import {InboxMessage, UniqueId, type IInboxRepository} from "@codenautic/core"

/**
 * Inbox persistence document shape.
 */
export interface IInboxMessageDocument {
    readonly _id: string
    readonly messageId: string
    readonly eventType: string
    readonly processedAt: Date | null
    readonly createdAt: Date
    readonly updatedAt: Date
}

/**
 * Minimal Mongo model contract for inbox repository.
 */
export interface IMongoInboxModel {
    /**
     * Finds one document by filter.
     *
     * @param filter Mongo-like filter.
     * @returns Matching document or null.
     */
    findOne(filter: Readonly<Record<string, unknown>>): Promise<IInboxMessageDocument | null>

    /**
     * Replaces one document by filter.
     *
     * @param filter Mongo-like filter.
     * @param replacement Replacement payload.
     * @param options Replace options.
     */
    replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: IInboxMessageDocument,
        options: Readonly<{upsert: boolean}>,
    ): Promise<void>
}

/**
 * Constructor options for Mongo inbox repository.
 */
export interface IMongoInboxRepositoryOptions {
    /**
     * Mongo model used for inbox persistence.
     */
    readonly model: IMongoInboxModel

    /**
     * Optional deterministic clock for tests.
     */
    readonly now?: () => Date
}

/**
 * MongoDB implementation of inbox repository port.
 */
export class MongoInboxRepository implements IInboxRepository {
    private readonly model: IMongoInboxModel
    private readonly now: () => Date

    /**
     * Creates repository instance.
     *
     * @param options Repository dependencies.
     */
    public constructor(options: IMongoInboxRepositoryOptions) {
        this.model = options.model
        this.now = options.now ?? (() => new Date())
    }

    /**
     * Finds message by internal identifier.
     *
     * @param id Message identifier.
     * @returns Inbox message or null.
     */
    public async findById(id: UniqueId): ReturnType<IInboxRepository["findById"]> {
        const document = await this.model.findOne({
            _id: id.value,
        })
        if (document === null) {
            return null
        }

        return toInboxEntity(document)
    }

    /**
     * Saves inbox message using upsert semantics.
     *
     * @param message Inbox message.
     */
    public async save(message: InboxMessage): ReturnType<IInboxRepository["save"]> {
        await this.model.replaceOne(
            {
                _id: message.id.value,
            },
            toInboxDocument(message, this.now()),
            {
                upsert: true,
            },
        )
    }

    /**
     * Finds message by external broker message id.
     *
     * @param messageId External message identifier.
     * @returns Inbox message or null.
     */
    public async findByMessageId(
        messageId: string,
    ): ReturnType<IInboxRepository["findByMessageId"]> {
        const normalizedMessageId = normalizeMessageId(messageId)
        const document = await this.model.findOne({
            messageId: normalizedMessageId,
        })
        if (document === null) {
            return null
        }

        return toInboxEntity(document)
    }

    /**
     * Marks inbox message as processed.
     *
     * @param id Message identifier.
     */
    public async markProcessed(
        id: string | UniqueId,
    ): ReturnType<IInboxRepository["markProcessed"]> {
        const messageId = resolveInboxMessageId(id)
        const document = await this.model.findOne({
            _id: messageId,
        })
        if (document === null) {
            return
        }

        const message = toInboxEntity(document)
        message.markProcessed(this.now())
        await this.model.replaceOne(
            {
                _id: messageId,
            },
            toInboxDocument(message, this.now(), document.createdAt),
            {
                upsert: false,
            },
        )
    }
}

/**
 * Maps inbox document to domain entity.
 *
 * @param document Persistence document.
 * @returns Inbox entity.
 */
function toInboxEntity(document: IInboxMessageDocument): InboxMessage {
    return new InboxMessage(UniqueId.create(document._id), {
        messageId: document.messageId,
        eventType: document.eventType,
        processedAt: document.processedAt ?? undefined,
    })
}

/**
 * Maps inbox entity to persistence document.
 *
 * @param message Inbox entity.
 * @param now Current timestamp.
 * @param existingCreatedAt Optional original created-at.
 * @returns Persistence document.
 */
function toInboxDocument(
    message: InboxMessage,
    now: Date,
    existingCreatedAt?: Date,
): IInboxMessageDocument {
    return {
        _id: message.id.value,
        messageId: message.messageId,
        eventType: message.eventType,
        processedAt: message.processedAt,
        createdAt: existingCreatedAt ?? now,
        updatedAt: now,
    }
}

/**
 * Resolves inbox message id from union type.
 *
 * @param value Message identifier.
 * @returns Normalized message id.
 */
function resolveInboxMessageId(value: string | UniqueId): string {
    if (value instanceof UniqueId) {
        return value.value
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Inbox message id cannot be empty")
    }

    return normalized
}

/**
 * Normalizes external message id.
 *
 * @param value Raw message id.
 * @returns Normalized message id.
 */
function normalizeMessageId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Inbox messageId cannot be empty")
    }

    return normalized
}
