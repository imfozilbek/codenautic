import {describe, expect, test} from "bun:test"

import {
    CONVERSATION_THREAD_STATUS,
} from "../../../src/domain/entities/conversation-thread.entity"
import {ConversationThreadFactory} from "../../../src/domain/factories/conversation-thread.factory"

describe("ConversationThreadFactory", () => {
    test("создает новый thread с активным статусом и пустыми сообщениями", () => {
        const factory = new ConversationThreadFactory()
        const thread = factory.create({
            channelId: " channel-1 ",
            participantIds: ["u1", "u1", "u2"],
        })

        expect(thread.channelId).toBe("channel-1")
        expect(thread.participantIds).toEqual(["u1", "u2"])
        expect(thread.status).toBe(CONVERSATION_THREAD_STATUS.ACTIVE)
        expect(thread.messages).toEqual([])
        expect(thread.closedAt).toBeNull()
    })

    test("реагрегация thread из снапшота с сообщениями", () => {
        const factory = new ConversationThreadFactory()
        const thread = factory.reconstitute({
            id: "thread-1",
            channelId: "channel-2",
            participantIds: ["u1", "u2"],
            status: CONVERSATION_THREAD_STATUS.CLOSED,
            closedAt: new Date("2026-03-03T00:00:00.000Z"),
            messages: [
                {
                    role: "user",
                    content: "1",
                    timestamp: new Date("2026-03-03T00:00:10.000Z"),
                    metadata: {
                        order: 1,
                    },
                },
            ],
        })

        expect(thread.id.value).toBe("thread-1")
        expect(thread.channelId).toBe("channel-2")
        expect(thread.status).toBe(CONVERSATION_THREAD_STATUS.CLOSED)
        expect(thread.messages).toHaveLength(1)
        expect(thread.messages[0]?.content).toBe("1")
        expect(thread.closedAt?.toISOString()).toBe("2026-03-03T00:00:00.000Z")
    })
})
