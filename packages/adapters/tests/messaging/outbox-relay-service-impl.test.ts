import {describe, expect, test} from "bun:test"

import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
    UniqueId,
    type IMessageBroker,
    type IOutboxRepository,
    type MessageBrokerHandler,
} from "@codenautic/core"

import {OutboxRelayServiceImpl, type OutboxRelaySleep} from "../../src/messaging"

/**
 * In-memory outbox repository with operation tracing.
 */
class InMemoryOutboxRepository implements IOutboxRepository {
    private readonly storage: Map<string, OutboxMessage>

    public readonly saveCalls: string[] = []
    public readonly markSentCalls: string[] = []
    public readonly markFailedCalls: string[] = []

    /**
     * Creates in-memory repository.
     *
     * @param messages Optional initial messages.
     */
    public constructor(messages: readonly OutboxMessage[] = []) {
        this.storage = new Map<string, OutboxMessage>()
        for (const message of messages) {
            this.storage.set(message.id.value, message)
        }
    }

    /**
     * Finds outbox message by identifier.
     *
     * @param id Message identifier.
     * @returns Outbox message or null.
     */
    public findById(id: UniqueId): Promise<OutboxMessage | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    /**
     * Saves message state.
     *
     * @param message Outbox message.
     */
    public save(message: OutboxMessage): Promise<void> {
        this.saveCalls.push(message.id.value)
        this.storage.set(message.id.value, message)
        return Promise.resolve()
    }

    /**
     * Finds pending messages.
     *
     * @param limit Optional batch limit.
     * @returns Pending messages.
     */
    public findPending(limit?: number): Promise<readonly OutboxMessage[]> {
        const pending = [...this.storage.values()].filter((message): boolean => {
            return message.status === OUTBOX_MESSAGE_STATUS.PENDING
        })
        if (limit === undefined || limit <= 0) {
            return Promise.resolve(pending)
        }

        return Promise.resolve(pending.slice(0, limit))
    }

    /**
     * Marks message as sent.
     *
     * @param id Message identifier.
     */
    public markSent(id: string | UniqueId): Promise<void> {
        const resolvedId = resolveMessageId(id)
        this.markSentCalls.push(resolvedId)
        const message = this.storage.get(resolvedId)
        if (message !== undefined) {
            message.markSent()
        }

        return Promise.resolve()
    }

    /**
     * Marks message as failed.
     *
     * @param id Message identifier.
     */
    public markFailed(id: string | UniqueId): Promise<void> {
        const resolvedId = resolveMessageId(id)
        this.markFailedCalls.push(resolvedId)
        const message = this.storage.get(resolvedId)
        if (message !== undefined) {
            message.markFailed()
        }

        return Promise.resolve()
    }
}

/**
 * Message broker double with scripted publish failures.
 */
class ScriptedMessageBroker implements IMessageBroker {
    private readonly pendingFailuresByEventType: Map<string, number>
    public readonly publishedEventTypes: string[] = []

    /**
     * Creates broker with optional per-event failure script.
     *
     * @param failuresByEventType Number of failures before success per event type.
     */
    public constructor(failuresByEventType: Readonly<Record<string, number>> = {}) {
        this.pendingFailuresByEventType = new Map<string, number>(
            Object.entries(failuresByEventType),
        )
    }

    /**
     * Publishes message payload.
     *
     * @param eventType Event type.
     * @param _payload Event payload.
     */
    public publish(eventType: string, _payload: Readonly<Record<string, unknown>>): Promise<void> {
        this.publishedEventTypes.push(eventType)

        const remainingFailures = this.pendingFailuresByEventType.get(eventType) ?? 0
        if (remainingFailures > 0) {
            this.pendingFailuresByEventType.set(eventType, remainingFailures - 1)
            return Promise.reject(new Error(`Broker publish failure for ${eventType}`))
        }

        return Promise.resolve()
    }

    /**
     * No-op subscribe contract for tests.
     *
     * @param _eventType Event type.
     * @param _handler Handler callback.
     */
    public subscribe(_eventType: string, _handler: MessageBrokerHandler): Promise<void> {
        return Promise.resolve()
    }
}

describe("OutboxRelayServiceImpl", () => {
    test("retries with backoff and eventually sends message", async () => {
        const repository = new InMemoryOutboxRepository([
            createOutboxMessage("outbox-retry", "event.retry", 0, 3),
        ])
        const broker = new ScriptedMessageBroker({
            "event.retry": 1,
        })
        const delays: number[] = []
        const sleep: OutboxRelaySleep = (delayMs: number): Promise<void> => {
            delays.push(delayMs)
            return Promise.resolve()
        }
        const relayService = new OutboxRelayServiceImpl({
            outboxRepository: repository,
            messageBroker: broker,
            batchSize: 10,
            maxAttemptsPerRun: 3,
            initialBackoffMs: 50,
            backoffMultiplier: 2,
            sleep,
        })

        const result = await relayService.relay()

        expect(result).toEqual({
            total: 1,
            sent: 1,
            failed: 0,
            retriable: 0,
            permanentlyFailed: 0,
        })
        expect(delays).toEqual([50])
        expect(broker.publishedEventTypes).toEqual([
            "event.retry",
            "event.retry",
        ])
        expect(repository.saveCalls).toEqual(["outbox-retry"])
        expect(repository.markSentCalls).toEqual(["outbox-retry"])
        expect(repository.markFailedCalls).toEqual([])
    })

    test("marks permanently failed message and continues batch processing", async () => {
        const repository = new InMemoryOutboxRepository([
            createOutboxMessage("outbox-fail", "event.fail", 0, 1),
            createOutboxMessage("outbox-ok", "event.ok", 0, 2),
        ])
        const broker = new ScriptedMessageBroker({
            "event.fail": 3,
        })
        const relayService = new OutboxRelayServiceImpl({
            outboxRepository: repository,
            messageBroker: broker,
            batchSize: 10,
            maxAttemptsPerRun: 3,
            sleep: (): Promise<void> => Promise.resolve(),
        })

        const result = await relayService.relay()

        expect(result).toEqual({
            total: 2,
            sent: 1,
            failed: 1,
            retriable: 0,
            permanentlyFailed: 1,
        })
        expect(repository.markFailedCalls).toEqual(["outbox-fail"])
        expect(repository.markSentCalls).toEqual(["outbox-ok"])
    })

    test("returns retriable failure when per-run attempts are exhausted", async () => {
        const repository = new InMemoryOutboxRepository([
            createOutboxMessage("outbox-retriable", "event.retriable", 0, 5),
        ])
        const broker = new ScriptedMessageBroker({
            "event.retriable": 5,
        })
        const relayService = new OutboxRelayServiceImpl({
            outboxRepository: repository,
            messageBroker: broker,
            batchSize: 10,
            maxAttemptsPerRun: 1,
            sleep: (): Promise<void> => Promise.resolve(),
        })

        const result = await relayService.relay()

        expect(result).toEqual({
            total: 1,
            sent: 0,
            failed: 1,
            retriable: 1,
            permanentlyFailed: 0,
        })
        expect(repository.saveCalls).toEqual(["outbox-retriable"])
        expect(repository.markSentCalls).toEqual([])
        expect(repository.markFailedCalls).toEqual([])
    })

    test("validates numeric relay configuration", () => {
        const repository = new InMemoryOutboxRepository()
        const broker = new ScriptedMessageBroker()

        expect(
            () =>
                new OutboxRelayServiceImpl({
                    outboxRepository: repository,
                    messageBroker: broker,
                    batchSize: 0,
                }),
        ).toThrow("batchSize must be greater than zero")
        expect(
            () =>
                new OutboxRelayServiceImpl({
                    outboxRepository: repository,
                    messageBroker: broker,
                    batchSize: 1,
                    maxAttemptsPerRun: 0,
                }),
        ).toThrow("maxAttemptsPerRun must be greater than zero")
        expect(
            () =>
                new OutboxRelayServiceImpl({
                    outboxRepository: repository,
                    messageBroker: broker,
                    batchSize: 1,
                    backoffMultiplier: 0,
                }),
        ).toThrow("backoffMultiplier must be greater than zero")
    })
})

/**
 * Creates deterministic outbox message for tests.
 *
 * @param id Message identifier.
 * @param eventType Event type.
 * @param retryCount Current retry count.
 * @param maxRetries Retry limit.
 * @returns Outbox message entity.
 */
function createOutboxMessage(
    id: string,
    eventType: string,
    retryCount: number,
    maxRetries: number,
): OutboxMessage {
    return new OutboxMessage(UniqueId.create(id), {
        eventType,
        payload: `{"id":"${id}"}`,
        status: OUTBOX_MESSAGE_STATUS.PENDING,
        retryCount,
        maxRetries,
    })
}

/**
 * Resolves message id from string or UniqueId.
 *
 * @param value Message identifier.
 * @returns String identifier.
 */
function resolveMessageId(value: string | UniqueId): string {
    if (value instanceof UniqueId) {
        return value.value
    }

    return value
}
