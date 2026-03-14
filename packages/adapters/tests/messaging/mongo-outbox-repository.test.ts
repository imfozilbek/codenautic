import {describe, expect, test} from "bun:test"

import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
    UniqueId,
} from "@codenautic/core"

import {
    MongoOutboxRepository,
    type IMongoOutboxFindOptions,
    type IMongoOutboxModel,
    type IOutboxMessageDocument,
} from "../../src/messaging"

/**
 * In-memory mongo model double for outbox repository tests.
 */
class MockOutboxModel implements IMongoOutboxModel {
    public readonly findOneFilters: Array<Readonly<Record<string, unknown>>> = []
    public readonly findCalls: Array<{
        readonly filter: Readonly<Record<string, unknown>>
        readonly options?: IMongoOutboxFindOptions
    }> = []
    public readonly replaceCalls: Array<{
        readonly filter: Readonly<Record<string, unknown>>
        readonly replacement: IOutboxMessageDocument
        readonly options: Readonly<{upsert: boolean}>
    }> = []

    public findOneQueue: Array<IOutboxMessageDocument | null> = []
    public findQueue: Array<readonly IOutboxMessageDocument[]> = []

    /**
     * Finds one outbox document.
     *
     * @param filter Mongo-like filter.
     * @returns Queued document or null.
     */
    public findOne(
        filter: Readonly<Record<string, unknown>>,
    ): Promise<IOutboxMessageDocument | null> {
        this.findOneFilters.push(filter)
        const next = this.findOneQueue.shift()
        return Promise.resolve(next ?? null)
    }

    /**
     * Finds many outbox documents.
     *
     * @param filter Mongo-like filter.
     * @param options Query options.
     * @returns Queued documents.
     */
    public find(
        filter: Readonly<Record<string, unknown>>,
        options?: IMongoOutboxFindOptions,
    ): Promise<readonly IOutboxMessageDocument[]> {
        this.findCalls.push({
            filter,
            options,
        })
        const next = this.findQueue.shift()
        return Promise.resolve(next ?? [])
    }

    /**
     * Replaces one outbox document.
     *
     * @param filter Mongo-like filter.
     * @param replacement Replacement payload.
     * @param options Replace options.
     */
    public replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: IOutboxMessageDocument,
        options: Readonly<{upsert: boolean}>,
    ): Promise<void> {
        this.replaceCalls.push({
            filter,
            replacement,
            options,
        })
        return Promise.resolve()
    }
}

describe("MongoOutboxRepository", () => {
    test("saves and finds outbox message by id", async () => {
        const model = new MockOutboxModel()
        const now = new Date("2026-03-14T10:00:00.000Z")
        const repository = new MongoOutboxRepository({
            model,
            now: () => now,
        })
        const message = new OutboxMessage(UniqueId.create("outbox-1"), {
            eventType: "review.completed",
            payload: "{\"reviewId\":\"r-1\"}",
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 3,
        })

        await repository.save(message)
        model.findOneQueue.push(createOutboxDocument({
            _id: "outbox-1",
            eventType: "review.completed",
            payload: "{\"reviewId\":\"r-1\"}",
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 3,
        }))
        const found = await repository.findById(UniqueId.create("outbox-1"))

        expect(model.replaceCalls[0]?.filter).toEqual({
            _id: "outbox-1",
        })
        expect(model.replaceCalls[0]?.options).toEqual({
            upsert: true,
        })
        expect(found?.eventType).toBe("review.completed")
        expect(found?.payload).toBe("{\"reviewId\":\"r-1\"}")
    })

    test("loads pending batch with stable order options and limit", async () => {
        const model = new MockOutboxModel()
        const repository = new MongoOutboxRepository({
            model,
        })
        model.findQueue.push([
            createOutboxDocument({
                _id: "outbox-2",
                eventType: "event.2",
            }),
            createOutboxDocument({
                _id: "outbox-3",
                eventType: "event.3",
            }),
        ])

        const pending = await repository.findPending(2)

        expect(model.findCalls[0]?.filter).toEqual({
            status: OUTBOX_MESSAGE_STATUS.PENDING,
        })
        expect(model.findCalls[0]?.options).toEqual({
            limit: 2,
            sort: {
                createdAt: 1,
            },
        })
        expect(pending).toHaveLength(2)
        expect(pending[0]?.id.value).toBe("outbox-2")
    })

    test("marks pending message as sent", async () => {
        const model = new MockOutboxModel()
        const repository = new MongoOutboxRepository({
            model,
            now: () => new Date("2026-03-14T11:00:00.000Z"),
        })
        model.findOneQueue.push(createOutboxDocument({
            _id: "outbox-4",
            status: OUTBOX_MESSAGE_STATUS.PENDING,
        }))

        await repository.markSent("outbox-4")

        expect(model.findOneFilters[0]).toEqual({
            _id: "outbox-4",
        })
        expect(model.replaceCalls[0]?.filter).toEqual({
            _id: "outbox-4",
        })
        expect(model.replaceCalls[0]?.replacement.status).toBe(OUTBOX_MESSAGE_STATUS.SENT)
        expect(model.replaceCalls[0]?.options).toEqual({
            upsert: false,
        })
    })

    test("increments retries and transitions to FAILED when exhausted", async () => {
        const model = new MockOutboxModel()
        const repository = new MongoOutboxRepository({
            model,
            now: () => new Date("2026-03-14T12:00:00.000Z"),
        })
        model.findOneQueue.push(createOutboxDocument({
            _id: "outbox-5",
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 1,
        }))

        await repository.markFailed(UniqueId.create("outbox-5"))

        expect(model.replaceCalls[0]?.replacement.status).toBe(OUTBOX_MESSAGE_STATUS.FAILED)
        expect(model.replaceCalls[0]?.replacement.retryCount).toBe(1)

        let capturedError: unknown
        try {
            await repository.markFailed(" ")
        } catch (error) {
            capturedError = error
        }
        expect(capturedError).toBeInstanceOf(Error)
        if (!(capturedError instanceof Error)) {
            throw new Error("Expected markFailed to throw Error")
        }
        expect(capturedError.message).toBe("Outbox message id cannot be empty")
    })
})

/**
 * Creates outbox persistence document for tests.
 *
 * @param overrides Partial document overrides.
 * @returns Ready outbox document.
 */
function createOutboxDocument(
    overrides: Partial<IOutboxMessageDocument>,
): IOutboxMessageDocument {
    const createdAt = new Date("2026-03-14T09:00:00.000Z")
    const updatedAt = new Date("2026-03-14T09:00:00.000Z")

    return {
        _id: overrides._id ?? "outbox-default",
        eventType: overrides.eventType ?? "event.default",
        payload: overrides.payload ?? "{\"ok\":true}",
        status: overrides.status ?? OUTBOX_MESSAGE_STATUS.PENDING,
        retryCount: overrides.retryCount ?? 0,
        maxRetries: overrides.maxRetries ?? 3,
        createdAt: overrides.createdAt ?? createdAt,
        updatedAt: overrides.updatedAt ?? updatedAt,
    }
}
