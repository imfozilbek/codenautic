import {describe, expect, test} from "bun:test"

import type {IInboxRepository} from "../../../../../src/application/ports/outbound/messaging/inbox-repository.port"
import {InboxMessage} from "../../../../../src/domain/entities/inbox-message.entity"
import {UniqueId} from "../../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory implementation for `IInboxRepository` contract.
 */
class InMemoryInboxRepository implements IInboxRepository {
    private readonly storage: Map<string, InboxMessage>

    public constructor() {
        this.storage = new Map<string, InboxMessage>()
    }

    public findById(id: UniqueId): Promise<InboxMessage | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(message: InboxMessage): Promise<void> {
        this.storage.set(message.id.value, message)
        return Promise.resolve()
    }

    public findByMessageId(messageId: string): Promise<InboxMessage | null> {
        for (const message of this.storage.values()) {
            if (message.messageId === messageId) {
                return Promise.resolve(message)
            }
        }

        return Promise.resolve(null)
    }

    public markProcessed(id: string | UniqueId): Promise<void> {
        const stored = this.storage.get(id instanceof UniqueId ? id.value : id)
        if (stored === undefined) {
            return Promise.resolve()
        }

        stored.markProcessed(new Date("2026-03-03T00:00:00.000Z"))
        return Promise.resolve()
    }
}

describe("IInboxRepository contract", () => {
    test("сохраняет и ищет сообщение по идентификатору", async () => {
        const repository = new InMemoryInboxRepository()
        const message = new InboxMessage(UniqueId.create("inbox-1"), {
            messageId: "msg-1",
            eventType: "EVENT_CREATED",
            processedAt: new Date("2026-03-03T01:00:00.000Z"),
        })

        await repository.save(message)
        const found = await repository.findById(message.id)

        expect(found).not.toBeNull()
        expect(found?.id.equals(message.id)).toBe(true)
        expect(found?.messageId).toBe("msg-1")
    })

    test("ищет сообщение по messageId", async () => {
        const repository = new InMemoryInboxRepository()
        const message = new InboxMessage(UniqueId.create("inbox-2"), {
            messageId: "msg-by-key",
            eventType: "EVENT_CREATED",
        })

        await repository.save(message)

        const found = await repository.findByMessageId("msg-by-key")
        expect(found).not.toBeNull()
        expect(found?.id.equals(message.id)).toBe(true)
    })

    test("помечает существующее сообщение как обработанное", async () => {
        const repository = new InMemoryInboxRepository()
        const message = new InboxMessage(UniqueId.create("inbox-3"), {
            messageId: "msg-marked",
            eventType: "EVENT_CREATED",
        })

        await repository.save(message)
        await repository.markProcessed(message.id)
        const found = await repository.findByMessageId("msg-marked")

        expect(found).not.toBeNull()
        expect(found?.isProcessed()).toBe(true)
    })
})
