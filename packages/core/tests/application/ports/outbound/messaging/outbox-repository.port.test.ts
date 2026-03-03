import {describe, expect, test} from "bun:test"

import type {IOutboxRepository} from "../../../../../src/application/ports/outbound/messaging/outbox-repository.port"
import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
} from "../../../../../src/domain/entities/outbox-message.entity"
import {UniqueId} from "../../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory implementation for `IOutboxRepository` contract.
 */
class InMemoryOutboxRepository implements IOutboxRepository {
    private readonly storage: Map<string, OutboxMessage>

    public constructor() {
        this.storage = new Map<string, OutboxMessage>()
    }

    public findById(id: UniqueId): Promise<OutboxMessage | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(message: OutboxMessage): Promise<void> {
        this.storage.set(message.id.value, message)
        return Promise.resolve()
    }

    public findPending(limit?: number): Promise<readonly OutboxMessage[]> {
        const pending = [...this.storage.values()].filter((message) => {
            return message.status === OUTBOX_MESSAGE_STATUS.PENDING
        })

        if (limit === undefined || limit <= 0) {
            return Promise.resolve(pending)
        }

        return Promise.resolve(pending.slice(0, limit))
    }

    public markSent(id: string | UniqueId): Promise<void> {
        const messageId = id instanceof UniqueId ? id.value : id
        const message = this.storage.get(messageId)
        if (message !== undefined) {
            message.markSent()
        }

        return Promise.resolve()
    }

    public markFailed(id: string | UniqueId): Promise<void> {
        const messageId = id instanceof UniqueId ? id.value : id
        const message = this.storage.get(messageId)
        if (message === undefined) {
            return Promise.resolve()
        }

        message.markFailed()
        return Promise.resolve()
    }
}

describe("IOutboxRepository contract", () => {
    test("сохраняет и находит сообщение по идентификатору", async () => {
        const repository = new InMemoryOutboxRepository()
        const message = new OutboxMessage(UniqueId.create("outbox-1"), {
            eventType: "EVENT_CREATED",
            payload: '{"id":"1"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 1,
        })

        await repository.save(message)
        const found = await repository.findById(message.id)

        expect(found).not.toBeNull()
        expect(found?.id.equals(message.id)).toBe(true)
        expect(found?.eventType).toBe("EVENT_CREATED")
    })

    test("возвращает все pending-сообщения в порядке добавления", async () => {
        const repository = new InMemoryOutboxRepository()
        await repository.save(
            new OutboxMessage(UniqueId.create("outbox-2"), {
                eventType: "PENDING_1",
                payload: '{"id":"2"}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            }),
        )
        await repository.save(
            new OutboxMessage(UniqueId.create("outbox-3"), {
                eventType: "PENDING_2",
                payload: '{"id":"3"}',
                status: OUTBOX_MESSAGE_STATUS.SENT,
                retryCount: 0,
                maxRetries: 1,
            }),
        )
        await repository.save(
            new OutboxMessage(UniqueId.create("outbox-4"), {
                eventType: "PENDING_3",
                payload: '{"id":"4"}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            }),
        )

        const pending = await repository.findPending()

        expect(pending).toHaveLength(2)
        expect(pending.at(0)?.eventType).toBe("PENDING_1")
        expect(pending.at(1)?.eventType).toBe("PENDING_3")
    })

    test("ограничивает размер выборки findPending", async () => {
        const repository = new InMemoryOutboxRepository()
        for (let i = 0; i < 5; i += 1) {
            await repository.save(
                new OutboxMessage(UniqueId.create(`outbox-${i}`), {
                    eventType: `EVENT_${i}`,
                    payload: `{"i":${i}}`,
                    status: OUTBOX_MESSAGE_STATUS.PENDING,
                    retryCount: 0,
                    maxRetries: 1,
                }),
            )
        }

        const pending = await repository.findPending(3)
        expect(pending).toHaveLength(3)
        expect(pending.at(2)?.eventType).toBe("EVENT_2")
    })

    test("отмечает сообщения как sent и failed", async () => {
        const repository = new InMemoryOutboxRepository()
        const message = new OutboxMessage(UniqueId.create("outbox-5"), {
            eventType: "EVENT_5",
            payload: '{"id":"5"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 1,
            maxRetries: 1,
        })

        await repository.save(message)
        await repository.markSent(message.id)

        const sentMessage = await repository.findById(message.id)
        expect(sentMessage?.isSent()).toBe(true)

        const failed = new OutboxMessage(UniqueId.create("outbox-6"), {
            eventType: "EVENT_6",
            payload: '{"id":"6"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 0,
        })
        await repository.save(failed)
        await repository.markFailed(failed.id)

        const failedMessage = await repository.findById(failed.id)
        expect(failedMessage?.isFailed()).toBe(true)
    })
})
