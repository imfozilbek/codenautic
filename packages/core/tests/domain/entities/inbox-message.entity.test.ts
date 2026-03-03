import {describe, expect, test} from "bun:test"

import {InboxMessage} from "../../../src/domain/entities/inbox-message.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("InboxMessage", () => {
    test("нормализует поля и определяет статус обработки", () => {
        const message = new InboxMessage(UniqueId.create("inbox-1"), {
            messageId: "  message-1  ",
            eventType: "  EVENT_CREATED  ",
        })

        expect(message.messageId).toBe("message-1")
        expect(message.eventType).toBe("EVENT_CREATED")
        expect(message.isProcessed()).toBe(false)
        expect(message.processedAt).toBeNull()
    })

    test("markProcessed сохраняет корректное время обработки", () => {
        const processedAt = new Date("2026-03-03T12:00:00.000Z")
        const message = new InboxMessage(UniqueId.create("inbox-2"), {
            messageId: "message-2",
            eventType: "EVENT_UPDATED",
        })

        message.markProcessed(processedAt)

        expect(message.isProcessed()).toBe(true)
        expect(message.processedAt?.getTime()).toBe(processedAt.getTime())
    })

    test("генерирует ошибку для некорректных значений", () => {
        expect(() => {
            new InboxMessage(UniqueId.create("invalid-1"), {
                messageId: "   ",
                eventType: "EVENT_CREATED",
            })
        }).toThrow("Inbox messageId cannot be empty")

        expect(() => {
            new InboxMessage(UniqueId.create("invalid-2"), {
                messageId: "message-2",
                eventType: "   ",
            })
        }).toThrow("Inbox eventType cannot be empty")

        expect(() => {
            new InboxMessage(UniqueId.create("invalid-3"), {
                messageId: "message-3",
                eventType: "EVENT_CREATED",
                processedAt: new Date("invalid"),
            })
        }).toThrow("Inbox processedAt must be valid date")
    })
})
