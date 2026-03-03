import {describe, expect, test} from "bun:test"

import {
    type ConversationMessageRole,
    CONVERSATION_MESSAGE_ROLE,
    ConversationMessage,
} from "../../../src/domain/value-objects/conversation-message.value-object"

describe("ConversationMessage", () => {
    test("создает валидное сообщение пользователя с timestamp", () => {
        const message = ConversationMessage.create({
            role: CONVERSATION_MESSAGE_ROLE.USER,
            content: "  Привет!  ",
            metadata: {
                source: "ui",
            },
        })

        expect(message.role).toBe(CONVERSATION_MESSAGE_ROLE.USER)
        expect(message.content).toBe("Привет!")
        expect(message.metadata).toEqual({source: "ui"})
        expect(message.timestamp instanceof Date).toBe(true)
    })

    test("создает валидное сообщение ассистента с пользовательским timestamp", () => {
        const timestamp = new Date("2026-03-03T10:15:00.000Z")
        const message = ConversationMessage.create({
            role: CONVERSATION_MESSAGE_ROLE.ASSISTANT,
            content: "Готово",
            timestamp,
        })

        expect(message.role).toBe(CONVERSATION_MESSAGE_ROLE.ASSISTANT)
        expect(message.timestamp.getTime()).toBe(timestamp.getTime())
        expect(message.metadata).toEqual({})
    })

    test("throws when content is empty", () => {
        expect(() => {
            ConversationMessage.create({
                role: CONVERSATION_MESSAGE_ROLE.USER,
                content: "   ",
            })
        }).toThrow("Conversation message content cannot be empty")
    })

    test("throws on unsupported role", () => {
        expect(() => {
            ConversationMessage.create({
                role: "system" as unknown as ConversationMessageRole,
                content: "Hello",
            })
        }).toThrow("Unsupported message role: system")
    })

    test("defensive copies returned data", () => {
        const message = ConversationMessage.create({
            role: CONVERSATION_MESSAGE_ROLE.USER,
            content: "Hello",
            metadata: {
                level: 1,
            },
        })
        const metadata = message.metadata

        expect(metadata).not.toBe(message.metadata)
        expect(message.timestamp).not.toBe(message.timestamp)
    })
})
