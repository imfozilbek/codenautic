import {describe, expect, test} from "bun:test"

import type {IConversationThreadRepository} from "../../../../../src/application/ports/outbound/messaging/conversation-thread-repository.port"
import {ConversationThread, CONVERSATION_THREAD_STATUS} from "../../../../../src/domain/entities/conversation-thread.entity"
import {ConversationMessage} from "../../../../../src/domain/value-objects/conversation-message.value-object"
import {UniqueId} from "../../../../../src/domain/value-objects/unique-id.value-object"

class InMemoryConversationThreadRepository implements IConversationThreadRepository {
    private readonly storage: Map<string, ConversationThread>

    public constructor() {
        this.storage = new Map<string, ConversationThread>()
    }

    public findById(id: UniqueId): Promise<ConversationThread | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(thread: ConversationThread): Promise<void> {
        this.storage.set(thread.id.value, thread)
        return Promise.resolve()
    }

    public findByChannelId(channelId: string): Promise<ConversationThread | null> {
        for (const thread of this.storage.values()) {
            if (thread.channelId === channelId) {
                return Promise.resolve(thread)
            }
        }

        return Promise.resolve(null)
    }

    public findActiveByParticipant(userId: string): Promise<readonly ConversationThread[]> {
        const byParticipant = [...this.storage.values()].filter((thread) => {
            if (thread.status !== CONVERSATION_THREAD_STATUS.ACTIVE) {
                return false
            }

            return thread.participantIds.includes(userId)
        })

        return Promise.resolve(byParticipant)
    }

    public markAsSaved(thread: ConversationThread): void {
        void this.save(thread)
    }
}

describe("IConversationThreadRepository contract", () => {
    test("сохраняет thread и ищет по channelId", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const thread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-1",
            participantIds: ["u1", "u2"],
            messages: [
                ConversationMessage.create({
                    role: "user",
                    content: "hello",
                }),
            ],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })

        await repository.save(thread)
        const found = await repository.findByChannelId("channel-1")

        expect(found).not.toBeNull()
        expect(found?.channelId).toBe("channel-1")
    })

    test("ищет только активные thread по участнику", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const activeThread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-2",
            participantIds: ["u1"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })
        const closedThread = new ConversationThread(UniqueId.create(), {
            channelId: "channel-3",
            participantIds: ["u1"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.CLOSED,
            closedAt: new Date(),
        })

        await repository.save(activeThread)
        await repository.save(closedThread)

        const found = await repository.findActiveByParticipant("u1")

        expect(found).toHaveLength(1)
        expect(found.at(0)?.channelId).toBe("channel-2")
    })
})
