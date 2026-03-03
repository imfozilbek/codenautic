import {describe, expect, test} from "bun:test"

import {
    ConversationThread,
    CONVERSATION_THREAD_STATUS,
    MAX_MESSAGES_PER_CONVERSATION_THREAD,
} from "../../../src/domain/entities/conversation-thread.entity"
import {ConversationMessage} from "../../../src/domain/value-objects/conversation-message.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("ConversationThread", () => {
    test("создает активную ветку и возвращает защитные копии", () => {
        const thread = new ConversationThread(UniqueId.create(), {
            channelId: "  channel-1  ",
            participantIds: ["u1", "u2", "u1"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })

        expect(thread.channelId).toBe("channel-1")
        expect(thread.participantIds).toEqual(["u1", "u2"])

        const participants = thread.participantIds
        expect(participants).not.toBe(thread.participantIds)

        const messages = thread.messages
        expect(messages).toEqual([])
    })

    test("добавляет сообщение в активный thread", () => {
        const thread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-2",
            participantIds: ["u1", "u2"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })
        const message = ConversationMessage.create({
            role: "user",
            content: "Привет",
        })

        thread.addMessage(message)

        expect(thread.messages).toHaveLength(1)
        expect(thread.messages[0]?.content).toBe("Привет")
    })

    test("блокирует добавление в закрытый thread", () => {
        const thread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-3",
            participantIds: ["u1", "u2"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })

        thread.close()

        expect(thread.status).toBe(CONVERSATION_THREAD_STATUS.CLOSED)
        expect(thread.closedAt).not.toBeNull()
        expect(() => {
            thread.addMessage(
                ConversationMessage.create({role: "user", content: "Сюда нельзя"}),
            )
        }).toThrow("Cannot add message to closed thread")
    })

    test("закрывает thread идемпотентно", () => {
        const thread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-4",
            participantIds: ["u1", "u2"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })

        thread.close()
        thread.close()

        expect(thread.status).toBe(CONVERSATION_THREAD_STATUS.CLOSED)
    })

    test("ограничивает число сообщений до лимита", () => {
        const target = new ConversationThread(UniqueId.create(), {
            channelId: "channel-5",
            participantIds: ["u1", "u2"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })

        for (let i = 0; i < MAX_MESSAGES_PER_CONVERSATION_THREAD; i += 1) {
            target.addMessage(
                ConversationMessage.create({
                    role: "user",
                    content: `Message ${i}`,
                }),
            )
        }

        expect(() => {
            target.addMessage(
                ConversationMessage.create({
                    role: "assistant",
                    content: "overflow",
                }),
            )
        }).toThrow(`Conversation thread message limit reached: ${MAX_MESSAGES_PER_CONVERSATION_THREAD}`)
    })

    test("бросает ошибку для невалидного channelId", () => {
        expect(() => {
            new ConversationThread(UniqueId.create(), {
                channelId: "   ",
                participantIds: ["u1"],
                messages: [],
                status: CONVERSATION_THREAD_STATUS.ACTIVE,
            })
        }).toThrow("Conversation channelId cannot be empty")
    })
})
