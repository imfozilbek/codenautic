import {describe, expect, test} from "bun:test"

import {InboxMessage, UniqueId} from "@codenautic/core"

import {
    MongoInboxRepository,
    type IInboxMessageDocument,
    type IMongoInboxModel,
} from "../../src/messaging"

/**
 * In-memory mongo model double for inbox repository tests.
 */
class MockInboxModel implements IMongoInboxModel {
    public readonly findOneFilters: Array<Readonly<Record<string, unknown>>> = []
    public readonly replaceCalls: Array<{
        readonly filter: Readonly<Record<string, unknown>>
        readonly replacement: IInboxMessageDocument
        readonly options: Readonly<{upsert: boolean}>
    }> = []

    public findOneQueue: Array<IInboxMessageDocument | null> = []

    /**
     * Finds one inbox document.
     *
     * @param filter Mongo-like filter.
     * @returns Queued document or null.
     */
    public findOne(
        filter: Readonly<Record<string, unknown>>,
    ): Promise<IInboxMessageDocument | null> {
        this.findOneFilters.push(filter)
        const next = this.findOneQueue.shift()
        return Promise.resolve(next ?? null)
    }

    /**
     * Replaces one inbox document.
     *
     * @param filter Mongo-like filter.
     * @param replacement Replacement payload.
     * @param options Replace options.
     */
    public replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: IInboxMessageDocument,
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

describe("MongoInboxRepository", () => {
    test("saves and finds inbox message by id", async () => {
        const model = new MockInboxModel()
        const now = new Date("2026-03-14T16:00:00.000Z")
        const repository = new MongoInboxRepository({
            model,
            now: () => now,
        })
        const message = new InboxMessage(UniqueId.create("inbox-1"), {
            messageId: "broker-1",
            eventType: "event.created",
        })

        await repository.save(message)
        model.findOneQueue.push(createInboxDocument({
            _id: "inbox-1",
            messageId: "broker-1",
            eventType: "event.created",
            processedAt: null,
        }))
        const found = await repository.findById(UniqueId.create("inbox-1"))

        expect(model.replaceCalls[0]?.filter).toEqual({
            _id: "inbox-1",
        })
        expect(model.replaceCalls[0]?.options).toEqual({
            upsert: true,
        })
        expect(found?.messageId).toBe("broker-1")
        expect(found?.eventType).toBe("event.created")
    })

    test("finds message by normalized external messageId", async () => {
        const model = new MockInboxModel()
        const repository = new MongoInboxRepository({
            model,
        })
        model.findOneQueue.push(createInboxDocument({
            _id: "inbox-2",
            messageId: "broker-2",
            eventType: "event.updated",
            processedAt: null,
        }))

        const found = await repository.findByMessageId(" broker-2 ")

        expect(model.findOneFilters[0]).toEqual({
            messageId: "broker-2",
        })
        expect(found?.id.value).toBe("inbox-2")
    })

    test("marks message as processed", async () => {
        const model = new MockInboxModel()
        const now = new Date("2026-03-14T17:00:00.000Z")
        const repository = new MongoInboxRepository({
            model,
            now: () => now,
        })
        model.findOneQueue.push(createInboxDocument({
            _id: "inbox-3",
            messageId: "broker-3",
            eventType: "event.deleted",
            processedAt: null,
        }))

        await repository.markProcessed("inbox-3")

        expect(model.replaceCalls[0]?.filter).toEqual({
            _id: "inbox-3",
        })
        expect(model.replaceCalls[0]?.options).toEqual({
            upsert: false,
        })
        expect(model.replaceCalls[0]?.replacement.processedAt).toEqual(now)
    })

    test("validates identifiers for lookups and processing", async () => {
        const model = new MockInboxModel()
        const repository = new MongoInboxRepository({
            model,
        })

        let findError: unknown
        try {
            await repository.findByMessageId(" ")
        } catch (error) {
            findError = error
        }
        expect(findError).toBeInstanceOf(Error)
        if (!(findError instanceof Error)) {
            throw new Error("Expected findByMessageId to throw Error")
        }
        expect(findError.message).toBe("Inbox messageId cannot be empty")

        let markProcessedError: unknown
        try {
            await repository.markProcessed(" ")
        } catch (error) {
            markProcessedError = error
        }
        expect(markProcessedError).toBeInstanceOf(Error)
        if (!(markProcessedError instanceof Error)) {
            throw new Error("Expected markProcessed to throw Error")
        }
        expect(markProcessedError.message).toBe("Inbox message id cannot be empty")
    })
})

/**
 * Creates inbox persistence document for tests.
 *
 * @param overrides Partial document overrides.
 * @returns Ready inbox document.
 */
function createInboxDocument(
    overrides: Partial<IInboxMessageDocument>,
): IInboxMessageDocument {
    const createdAt = new Date("2026-03-14T15:00:00.000Z")
    const updatedAt = new Date("2026-03-14T15:00:00.000Z")

    return {
        _id: overrides._id ?? "inbox-default",
        messageId: overrides.messageId ?? "broker-default",
        eventType: overrides.eventType ?? "event.default",
        processedAt: overrides.processedAt ?? null,
        createdAt: overrides.createdAt ?? createdAt,
        updatedAt: overrides.updatedAt ?? updatedAt,
    }
}
