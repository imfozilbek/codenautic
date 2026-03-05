import {describe, expect, test} from "bun:test"

import {InboxDeduplicationService} from "../../../../src/application/services/messaging/inbox-deduplication.service"
import {InboxMessage} from "../../../../src/domain/entities/inbox-message.entity"
import type {IInboxRepository} from "../../../../src/application/ports/outbound/messaging/inbox-repository.port"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

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
        const found = this.storage.get(id instanceof UniqueId ? id.value : id)
        if (found !== undefined) {
            found.markProcessed(new Date("2026-03-03T05:00:00.000Z"))
        }

        return Promise.resolve()
    }
}

describe("InboxDeduplicationService", () => {
    test("помечает первое событие как обработанное и возвращает true", async () => {
        const repository = new InMemoryInboxRepository()
        const service = new InboxDeduplicationService({
            inboxRepository: repository,
            now: () => new Date("2026-03-03T05:00:00.000Z"),
        })

        const first = await service.process("msg-1", "EVENT_CREATED")
        const duplicate = await service.process("msg-1", "EVENT_CREATED")
        const found = await repository.findByMessageId("msg-1")

        expect(first).toBe(true)
        expect(duplicate).toBe(false)
        expect(found?.isProcessed()).toBe(true)
    })

    test("использует default now при отсутствии провайдера", async () => {
        const repository = new InMemoryInboxRepository()
        const service = new InboxDeduplicationService({
            inboxRepository: repository,
        })

        const first = await service.process("msg-default", "EVENT_CREATED")
        const found = await repository.findByMessageId("msg-default")

        expect(first).toBe(true)
        expect(found?.processedAt).toBeInstanceOf(Date)
    })

    test("isDuplicate возвращает корректный статус", async () => {
        const repository = new InMemoryInboxRepository()
        const service = new InboxDeduplicationService({
            inboxRepository: repository,
            now: () => new Date("2026-03-03T06:00:00.000Z"),
        })

        expect(await service.isDuplicate("msg-missing")).toBe(false)

        await repository.save(
            new InboxMessage(UniqueId.create("stored"), {
                messageId: "msg-unprocessed",
                eventType: "EVENT_CREATED",
            }),
        )
        expect(await service.isDuplicate("msg-unprocessed")).toBe(false)

        await repository.save(
            new InboxMessage(UniqueId.create("stored-2"), {
                messageId: "msg-processed",
                eventType: "EVENT_CREATED",
                processedAt: new Date("2026-03-03T06:00:00.000Z"),
            }),
        )
        expect(await service.isDuplicate("msg-processed")).toBe(true)
    })

    test("не падает при повторной обработке уже обработанного сообщения", async () => {
        const repository = new InMemoryInboxRepository()
        await repository.save(
            new InboxMessage(UniqueId.create("stored"), {
                messageId: "msg-existing",
                eventType: "EVENT_CREATED",
                processedAt: new Date("2026-03-03T04:00:00.000Z"),
            }),
        )
        const service = new InboxDeduplicationService({
            inboxRepository: repository,
        })

        const result = await service.process("msg-existing", "EVENT_CREATED")
        expect(result).toBe(false)
    })

    test("валидация входных значений", () => {
        const repository = new InMemoryInboxRepository()
        const service = new InboxDeduplicationService({inboxRepository: repository})

        return service
            .process("   ", "EVENT_CREATED")
            .then(() => {
                throw new Error("Expected rejection for empty messageId")
            })
            .catch((error: unknown) => {
                expect((error as Error).message).toBe("messageId cannot be empty")
            })
            .then(() => service.process("msg-valid", "   "))
            .then(() => {
                throw new Error("Expected rejection for empty eventType")
            })
            .catch((error: unknown) => {
                expect((error as Error).message).toBe("eventType cannot be empty")
            })
    })
})
