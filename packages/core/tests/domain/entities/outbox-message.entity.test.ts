import {describe, expect, test} from "bun:test"

import {
    OUTBOX_MESSAGE_STATUS,
    OutboxMessage,
    type OutboxMessageStatus,
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

    test("возвращает retry значения через геттеры", () => {
        const message = new OutboxMessage(UniqueId.create("outbox-0a"), {
            eventType: "EVENT_CREATED",
            payload: '{"id":"1"}',
            status: OUTBOX_MESSAGE_STATUS.PENDING,
            retryCount: 2,
            maxRetries: 4,
        })

        expect(message.retryCount).toBe(2)
        expect(message.maxRetries).toBe(4)
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

    test("фиксирует retryCount для FAILED и игнорирует markFailed в не-PENDING", () => {
        const failed = new OutboxMessage(UniqueId.create("outbox-4"), {
            eventType: "EVENT_FAIL",
            payload: '{"ok":false}',
            status: OUTBOX_MESSAGE_STATUS.FAILED,
            retryCount: 1,
            maxRetries: 3,
        })

        expect(failed.retryCount).toBe(3)
        expect(failed.isFailed()).toBe(true)

        const sent = new OutboxMessage(UniqueId.create("outbox-5"), {
            eventType: "EVENT_SENT",
            payload: '{"ok":true}',
            status: OUTBOX_MESSAGE_STATUS.SENT,
            retryCount: 0,
            maxRetries: 2,
        })

        sent.markFailed()
        expect(sent.isSent()).toBe(true)
    })

    test("валидирует статус, payload и retry-поля", () => {
        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-3"), {
                eventType: "EVENT",
                payload: "   ",
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: 1,
            })
        }).toThrow("Outbox payload cannot be empty")

        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-4"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: -1,
                maxRetries: 1,
            })
        }).toThrow("Outbox retry count cannot be negative")

        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-5"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: -2,
            })
        }).toThrow("Outbox maxRetries cannot be negative")

        expect(() => {
            const invalidStatus = "UNKNOWN" as unknown as OutboxMessageStatus
            new OutboxMessage(UniqueId.create("invalid-6"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: invalidStatus,
                retryCount: 0,
                maxRetries: 1,
            })
        }).toThrow("Unknown outbox status: UNKNOWN")
    })

    test("не допускает SENT с retryCount > 0", () => {
        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-7"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: OUTBOX_MESSAGE_STATUS.SENT,
                retryCount: 1,
                maxRetries: 2,
            })
        }).toThrow("Sent outbox message cannot have retries")
    })

    test("отклоняет нечисловые retry значения", () => {
        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-8"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: Number.NaN,
                maxRetries: 1,
            })
        }).toThrow("Outbox retry count must be finite number")

        expect(() => {
            new OutboxMessage(UniqueId.create("invalid-9"), {
                eventType: "EVENT",
                payload: '{"ok":true}',
                status: OUTBOX_MESSAGE_STATUS.PENDING,
                retryCount: 0,
                maxRetries: Number.POSITIVE_INFINITY,
            })
        }).toThrow("Outbox maxRetries must be finite number")
    })
})
