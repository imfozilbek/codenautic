import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
    UniqueId,
    type IOutboxRepository,
    type OutboxMessageStatus,
} from "@codenautic/core"

const UNLIMITED_PENDING = Number.MAX_SAFE_INTEGER

/**
 * Outbox persistence document shape.
 */
export interface IOutboxMessageDocument {
    readonly _id: string
    readonly eventType: string
    readonly payload: string
    readonly status: OutboxMessageStatus
    readonly retryCount: number
    readonly maxRetries: number
    readonly createdAt: Date
    readonly updatedAt: Date
}

/**
 * Query options for pending outbox fetch.
 */
export interface IMongoOutboxFindOptions {
    readonly limit?: number
    readonly sort?: Readonly<Record<string, 1 | -1>>
}

/**
 * Minimal Mongo model contract for outbox repository.
 */
export interface IMongoOutboxModel {
    /**
     * Finds one document by filter.
     *
     * @param filter Mongo-like filter.
     * @returns Matching document or null.
     */
    findOne(filter: Readonly<Record<string, unknown>>): Promise<IOutboxMessageDocument | null>

    /**
     * Finds many documents by filter.
     *
     * @param filter Mongo-like filter.
     * @param options Optional query options.
     * @returns Matching documents.
     */
    find(
        filter: Readonly<Record<string, unknown>>,
        options?: IMongoOutboxFindOptions,
    ): Promise<readonly IOutboxMessageDocument[]>

    /**
     * Replaces one document by filter.
     *
     * @param filter Mongo-like filter.
     * @param replacement Replacement payload.
     * @param options Replace options.
     */
    replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: IOutboxMessageDocument,
        options: Readonly<{upsert: boolean}>,
    ): Promise<void>
}

/**
 * Constructor options for Mongo outbox repository.
 */
export interface IMongoOutboxRepositoryOptions {
    /**
     * Mongo model used for outbox persistence.
     */
    readonly model: IMongoOutboxModel

    /**
     * Optional deterministic clock for tests.
     */
    readonly now?: () => Date
}

/**
 * MongoDB implementation of outbox repository port.
 */
export class MongoOutboxRepository implements IOutboxRepository {
    private readonly model: IMongoOutboxModel
    private readonly now: () => Date

    /**
     * Creates repository instance.
     *
     * @param options Repository dependencies.
     */
    public constructor(options: IMongoOutboxRepositoryOptions) {
        this.model = options.model
        this.now = options.now ?? (() => new Date())
    }

    /**
     * Finds outbox message by identifier.
     *
     * @param id Message identifier.
     * @returns Outbox message or null.
     */
    public async findById(
        id: UniqueId,
    ): ReturnType<IOutboxRepository["findById"]> {
        const document = await this.model.findOne({
            _id: id.value,
        })
        if (document === null) {
            return null
        }

        return toOutboxEntity(document)
    }

    /**
     * Saves outbox message using upsert semantics.
     *
     * @param message Outbox message.
     */
    public async save(message: OutboxMessage): ReturnType<IOutboxRepository["save"]> {
        await this.model.replaceOne(
            {
                _id: message.id.value,
            },
            toOutboxDocument(message, this.now()),
            {
                upsert: true,
            },
        )
    }

    /**
     * Finds pending outbox batch in insertion order.
     *
     * @param limit Optional batch limit.
     * @returns Pending messages.
     */
    public async findPending(
        limit?: number,
    ): ReturnType<IOutboxRepository["findPending"]> {
        const normalizedLimit = normalizePendingLimit(limit)
        const options: IMongoOutboxFindOptions = normalizedLimit === UNLIMITED_PENDING
            ? {
                sort: {
                    createdAt: 1,
                },
            }
            : {
                limit: normalizedLimit,
                sort: {
                    createdAt: 1,
                },
            }

        const documents = await this.model.find(
            {
                status: OUTBOX_MESSAGE_STATUS.PENDING,
            },
            options,
        )

        return documents.map((document): OutboxMessage => {
            return toOutboxEntity(document)
        })
    }

    /**
     * Marks message as sent.
     *
     * @param id Message identifier.
     */
    public async markSent(id: string | UniqueId): ReturnType<IOutboxRepository["markSent"]> {
        const messageId = resolveOutboxMessageId(id)
        const document = await this.model.findOne({
            _id: messageId,
        })
        if (document === null) {
            return
        }

        const message = toOutboxEntity(document)
        message.markSent()
        await this.model.replaceOne(
            {
                _id: messageId,
            },
            toOutboxDocument(message, this.now(), document.createdAt),
            {
                upsert: false,
            },
        )
    }

    /**
     * Marks message as failed and increments retry counter.
     *
     * @param id Message identifier.
     */
    public async markFailed(id: string | UniqueId): ReturnType<IOutboxRepository["markFailed"]> {
        const messageId = resolveOutboxMessageId(id)
        const document = await this.model.findOne({
            _id: messageId,
        })
        if (document === null) {
            return
        }

        const message = toOutboxEntity(document)
        message.markFailed()
        await this.model.replaceOne(
            {
                _id: messageId,
            },
            toOutboxDocument(message, this.now(), document.createdAt),
            {
                upsert: false,
            },
        )
    }
}

/**
 * Maps persistence document to outbox entity.
 *
 * @param document Persistence document.
 * @returns Domain entity.
 */
function toOutboxEntity(document: IOutboxMessageDocument): OutboxMessage {
    return new OutboxMessage(UniqueId.create(document._id), {
        eventType: document.eventType,
        payload: document.payload,
        status: document.status,
        retryCount: document.retryCount,
        maxRetries: document.maxRetries,
    })
}

/**
 * Maps outbox entity to persistence document.
 *
 * @param message Domain entity.
 * @param now Current timestamp.
 * @param existingCreatedAt Optional original creation timestamp.
 * @returns Persistence document.
 */
function toOutboxDocument(
    message: OutboxMessage,
    now: Date,
    existingCreatedAt?: Date,
): IOutboxMessageDocument {
    return {
        _id: message.id.value,
        eventType: message.eventType,
        payload: message.payload,
        status: message.status,
        retryCount: message.retryCount,
        maxRetries: message.maxRetries,
        createdAt: existingCreatedAt ?? now,
        updatedAt: now,
    }
}

/**
 * Resolves outbox message id from union type.
 *
 * @param value Message identifier.
 * @returns Normalized message id.
 */
function resolveOutboxMessageId(value: string | UniqueId): string {
    if (value instanceof UniqueId) {
        return value.value
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Outbox message id cannot be empty")
    }

    return normalized
}

/**
 * Normalizes pending batch limit.
 *
 * @param value Raw limit.
 * @returns Finite non-negative limit.
 */
function normalizePendingLimit(value: number | undefined): number {
    if (value === undefined) {
        return UNLIMITED_PENDING
    }

    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error("limit must be finite number")
    }

    const normalized = Math.trunc(value)
    if (normalized <= 0) {
        return UNLIMITED_PENDING
    }

    return normalized
}
