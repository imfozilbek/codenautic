import {describe, expect, test} from "bun:test"

import type {
    IMessageBroker,
    MessageBrokerHandler,
    MessageBrokerPayload,
} from "../../../../src/application/ports/outbound/messaging/message-broker.port"
import type {IOutboxRepository} from "../../../../src/application/ports/outbound/messaging/outbox-repository.port"
import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
} from "../../../../src/domain/entities/outbox-message.entity"
import {OutboxRelayService} from "../../../../src/application/services/messaging/outbox-relay.service"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory repository for relay service.
 */
class InMemoryOutboxRepository implements IOutboxRepository {
    private readonly storage: Map<string, OutboxMessage>
    private readonly events: string[]

    public constructor(messages: readonly OutboxMessage[]) {
        this.storage = new Map<string, OutboxMessage>()
        this.events = []
        for (const message of messages) {
            this.storage.set(message.id.value, message)
        }
    }

    public getEvents(): readonly string[] {
        return this.events
    }

    public findById(id: UniqueId): Promise<OutboxMessage | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(message: OutboxMessage): Promise<void> {
        this.events.push(`save:${message.id.value}`)
        this.storage.set(message.id.value, message)
        return Promise.resolve()
    }

    public findPending(limit?: number): Promise<readonly OutboxMessage[]> {
        const all = [...this.storage.values()].filter((message) => {
            return message.status === OUTBOX_MESSAGE_STATUS.PENDING
        })

        if (limit === undefined || limit <= 0) {
            return Promise.resolve(all)
        }

        return Promise.resolve(all.slice(0, limit))
    }

    public markSent(id: string | UniqueId): Promise<void> {
        const message = this.storage.get(typeof id === "string" ? id : id.value)
        if (message !== undefined) {
            message.markSent()
            this.events.push(`markSent:${message.id.value}`)
        }
        return Promise.resolve()
    }

    public markFailed(id: string | UniqueId): Promise<void> {
        const message = this.storage.get(typeof id === "string" ? id : id.value)
        if (message !== undefined) {
            message.markFailed()
            this.events.push(`markFailed:${message.id.value}`)
        }
        return Promise.resolve()
    }
}

/**
 * Deterministic broker with per-event failure strategy.
 */
class InMemoryMessageBroker implements IMessageBroker {
    private readonly failByEventType: Set<string>
    private readonly calls: string[]

    public constructor(failByEventType: readonly string[] = []) {
        this.failByEventType = new Set(failByEventType)
        this.calls = []
    }

    public getCalls(): readonly string[] {
        return this.calls
    }

    public publish(eventType: string, _payload: MessageBrokerPayload): Promise<void> {
        this.calls.push(eventType)
        if (this.failByEventType.has(eventType)) {
            return Promise.reject(new Error(`Broker simulated failure for ${eventType}`))
        }

        return Promise.resolve()
    }

    public subscribe(eventType: string, _handler: MessageBrokerHandler): Promise<void> {
        this.calls.push(`subscribe:${eventType}`)
        return Promise.resolve()
    }
}

describe("OutboxRelayService", () => {
    test("успешно публикует pending-сообщения и помечает их as sent", async () => {
        const messages = [
            new OutboxMessage(UniqueId.create("outbox-success"), {
                eventType: "EVENT_SUCCESS",
                payload: '{"status":"ok"}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            }),
            new OutboxMessage(UniqueId.create("outbox-skipped"), {
                eventType: "EVENT_SENT",
                payload: '{"status":"already"}',
                status: OUTBOX_MESSAGE_STATUS.SENT,
                retryCount: 0,
                maxRetries: 1,
            }),
        ]

        const repository = new InMemoryOutboxRepository(messages)
        const broker = new InMemoryMessageBroker()
        const relayService = new OutboxRelayService(repository, broker, {batchSize: 10})
        const result = await relayService.relay()

        expect(result.total).toBe(1)
        expect(result.sent).toBe(1)
        expect(result.failed).toBe(0)
        expect(repository.getEvents()).toEqual([
            "markSent:outbox-success",
        ])
        expect(broker.getCalls()).toEqual(["EVENT_SUCCESS"])
    })

    test("помечает как retriable при ошибке до исчерпания лимита", async () => {
        const message = new OutboxMessage(UniqueId.create("outbox-retry"), {
            eventType: "EVENT_RETRY",
            payload: '{"attempt":"retry"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 2,
        })
        const repository = new InMemoryOutboxRepository([message])
        const broker = new InMemoryMessageBroker(["EVENT_RETRY"])
        const relayService = new OutboxRelayService(repository, broker, {batchSize: 10})
        const result = await relayService.relay()

        const updated = await repository.findById(message.id)

        expect(updated?.isFailed()).toBe(false)
        expect(updated?.canRetry()).toBe(true)
        expect(result.total).toBe(1)
        expect(result.failed).toBe(1)
        expect(result.retriable).toBe(1)
        expect(result.permanentlyFailed).toBe(0)
        expect(repository.getEvents()).toEqual([`save:${message.id.value}`])
        expect(updated?.retryCount).toBe(1)
    })

    test("помечает как permanently failed после исчерпания retry", async () => {
        const message = new OutboxMessage(UniqueId.create("outbox-permanent"), {
            eventType: "EVENT_PERMANENT",
            payload: '{"attempt":"fail"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 0,
        })
        const repository = new InMemoryOutboxRepository([message])
        const broker = new InMemoryMessageBroker(["EVENT_PERMANENT"])
        const relayService = new OutboxRelayService(repository, broker, {batchSize: 10})
        const result = await relayService.relay()

        const updated = await repository.findById(message.id)
        expect(updated?.isFailed()).toBe(true)
        expect(result.total).toBe(1)
        expect(result.failed).toBe(1)
        expect(result.permanentlyFailed).toBe(1)
        expect(result.retriable).toBe(0)
        expect(updated?.retryCount).toBe(1)
        expect(repository.getEvents()).toEqual([`markFailed:${message.id.value}`])
    })

    test("exposes configured batch size", () => {
        const repository = new InMemoryOutboxRepository([])
        const broker = new InMemoryMessageBroker()
        const relayService = new OutboxRelayService(repository, broker, {batchSize: 7})

        expect(relayService.getBatchSize()).toBe(7)
    })
})
