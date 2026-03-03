import {describe, expect, test} from "bun:test"

import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
} from "../../../src/domain/entities/outbox-message.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("OutboxMessage", () => {
    test("нормализует поля и валидирует статус/тайп payload", () => {
        const message = new OutboxMessage(UniqueId.create("outbox-0"), {
            eventType: "  EVENT_CREATED  ",
            payload: '{ "id": "1", "name": "value" }',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 3,
        })

        expect(message.id.value).toBeDefined()
        expect(message.eventType).toBe("EVENT_CREATED")
        expect(message.payload).toBe('{ "id": "1", "name": "value" }')
        expect(message.status).toBe(OUTBOX_MESSAGE_STATUS.PENDING)
        expect(message.canRetry()).toBe(true)
    })

    test("изменяет статус на SENT только если возможно", () => {
        const message = new OutboxMessage(UniqueId.create("outbox-1"), {
            eventType: "EVENT_UPDATED",
            payload: '{"id":"x"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 1,
        })

        message.markSent()

        expect(message.isSent()).toBe(true)
        expect(message.canRetry()).toBe(false)
    })

    test("считает retry-состояние и переходит в FAILED после лимита", () => {
        const retryable = new OutboxMessage(UniqueId.create("outbox-2"), {
            eventType: "EVENT_PING",
            payload: '{"ping":true}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 0,
            maxRetries: 2,
        })

        retryable.markFailed()
        expect(retryable.isFailed()).toBe(false)
        expect(retryable.canRetry()).toBe(true)
        expect(retryable.retryCount).toBe(1)

        retryable.markFailed()
        expect(retryable.isFailed()).toBe(true)
        expect(retryable.canRetry()).toBe(false)
        expect(retryable.retryCount).toBe(2)
    })

    test("блокирует отправку после FAILED", () => {
        const failed = new OutboxMessage(UniqueId.create("outbox-3"), {
            eventType: "EVENT_FAIL",
            payload: '{"ok":false}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 1,
            maxRetries: 0,
        })

        failed.markFailed()
        expect(failed.isFailed()).toBe(true)

        expect(() => {
            failed.markSent()
        }).toThrow("Failed outbox message cannot be marked as sent")
    })

    test("выбрасывает ошибки для невалидных входов", () => {
        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-1"), {
                eventType: "",
                payload: '{"x":1}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            })
        }).toThrow("Outbox event type cannot be empty")

        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-2"), {
                eventType: "EVENT",
                payload: "not-json",
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            })
        }).toThrow("Outbox payload must be valid JSON")
    })
})
