import {describe, expect, test} from "bun:test"

import {ChatUseCase} from "../../../../src/application/use-cases/messaging/chat.use-case"
import type {IChatRequestDTO, IChatResponseDTO} from "../../../../src/application/dto/llm/chat.dto"
import type {IStreamingChatResponseDTO} from "../../../../src/application/dto/llm/streaming-chat.dto"
import type {IMessageDTO} from "../../../../src/application/dto/llm/message.dto"
import type {IConversationThreadRepository} from "../../../../src/application/ports/outbound/messaging/conversation-thread-repository.port"
import type {ILLMProvider} from "../../../../src/application/ports/outbound/llm/llm-provider.port"
import type {ITokenUsageDTO} from "../../../../src/application/dto/review/token-usage.dto"
import {ConversationMessage} from "../../../../src/domain/value-objects/conversation-message.value-object"
import {
    ConversationThread,
    CONVERSATION_THREAD_STATUS,
    MAX_MESSAGES_PER_CONVERSATION_THREAD,
} from "../../../../src/domain/entities/conversation-thread.entity"
import {ConversationThreadFactory} from "../../../../src/domain/factories/conversation-thread.factory"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {type Result} from "../../../../src/shared/result"

const defaultUsage = {
    input: 4,
    output: 12,
    total: 16,
}

type IChatUseCaseOutput = {
    readonly channelId: string
    readonly assistantMessage: string
    readonly usage: ITokenUsageDTO
}

class InMemoryConversationThreadRepository implements IConversationThreadRepository {
    private readonly storage: Map<string, ConversationThread>

    public constructor(storage?: readonly ConversationThread[]) {
        this.storage = new Map(storage?.map((thread) => [thread.id.value, thread]))
    }

    public findById(id: UniqueId): Promise<ConversationThread | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(thread: ConversationThread): Promise<void> {
        for (const [existingId, existingThread] of this.storage.entries()) {
            if (existingThread.channelId === thread.channelId) {
                this.storage.delete(existingId)
            }
        }
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
        return Promise.resolve([...this.storage.values()].filter((thread) => {
            return thread.status === CONVERSATION_THREAD_STATUS.ACTIVE &&
                thread.participantIds.includes(userId)
        }))
    }
}

class FakeLLMProvider implements ILLMProvider {
    private readonly responses: IChatResponseDTO[]
    public readonly requests: IChatRequestDTO[] = []

    public constructor(responses: readonly IChatResponseDTO[] = []) {
        this.responses = responses.map((response) => {
            return response
        })
    }

    public chat(_request: IChatRequestDTO): Promise<IChatResponseDTO> {
        this.requests.push(_request)
        const response = this.responses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("LLM response not configured"))
        }

        return Promise.resolve(response)
    }

    public stream(_request: IChatRequestDTO): IStreamingChatResponseDTO {
        void _request

        return {
            async *[Symbol.asyncIterator]() {
                await Promise.resolve()
                yield {
                    delta: "",
                }
            },
        }
    }

    public embed(texts: readonly string[]): Promise<readonly number[][]> {
        return Promise.resolve(texts.map(() => []))
    }
}

function createUseCase(
    options: {
        readonly repository: InMemoryConversationThreadRepository
        readonly provider: FakeLLMProvider
        readonly factory?: ConversationThreadFactory
    },
): ChatUseCase {
    return new ChatUseCase({
        conversationThreadRepository: options.repository,
        conversationThreadFactory: options.factory ?? new ConversationThreadFactory(),
        llmProvider: options.provider,
        defaults: {
            model: "gpt-4o-mini",
            maxTokens: 1200,
        },
    })
}

function unwrapSuccessResult(result: Result<IChatUseCaseOutput, ValidationError>): IChatUseCaseOutput {
    if (result.isFail) {
        throw new Error("Expected success")
    }

    return result.value
}

function unwrapFailureResult(result: Result<IChatUseCaseOutput, ValidationError>): ValidationError {
    if (result.isOk) {
        throw new Error("Expected failure")
    }

    return result.error
}

async function getThread(repository: InMemoryConversationThreadRepository, channelId: string): Promise<ConversationThread> {
    const thread = await repository.findByChannelId(channelId)
    if (thread === null) {
        throw new Error(`Expected thread for channel ${channelId}`)
    }

    return thread
}

function getDefinedRequest(requests: readonly IChatRequestDTO[]): IChatRequestDTO {
    expect(requests).toHaveLength(1)
    const request = requests[0]
    if (request === undefined) {
        throw new Error("Expected one request")
    }

    return request
}

describe("ChatUseCase", () => {
    test("создает новый thread и сохраняет сообщение пользователя и ответ ассистента", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const provider = new FakeLLMProvider([
            {
                content: "Готов обсудить контекст",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})
        const output = unwrapSuccessResult(
            await useCase.execute({
                channelId: "  merge-1  ",
                userId: "user-1",
                message: "Привет, давай разберемся",
            }),
        )

        expect(output.channelId).toBe("merge-1")
        expect(output.assistantMessage).toBe("Готов обсудить контекст")
        expect(output.usage).toEqual(defaultUsage)

        const thread = await getThread(repository, "merge-1")
        expect(thread.participantIds).toEqual(["user-1"])
        expect(thread.messages).toHaveLength(2)
        expect(thread.messages[0]?.content).toBe("Привет, давай разберемся")
        expect(thread.messages[1]?.content).toBe("Готов обсудить контекст")
        expect(thread.messages[1]?.role).toBe("assistant")
        const request = getDefinedRequest(provider.requests)
        expect(request.messages[request.messages.length - 1]?.content).toBe("Привет, давай разберемся")
    })

    test("добавляет сообщение в существующий thread и делает новый запрос к LLM", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const thread = new ConversationThread(UniqueId.create("existing-thread"), {
            channelId: "merge-2",
            participantIds: ["user-1"],
            messages: [
                ConversationMessage.create({
                    role: "user",
                    content: "Первый вопрос",
                }),
            ],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })
        await repository.save(thread)

        const provider = new FakeLLMProvider([
            {
                content: "Дополнительно: продолжим",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})
        unwrapSuccessResult(
            await useCase.execute({
                channelId: "merge-2",
                userId: "user-1",
                message: "Второй вопрос",
            }),
        )

        const savedThread = await getThread(repository, "merge-2")
        expect(savedThread.messages).toHaveLength(3)
        expect(savedThread.messages[1]?.content).toBe("Второй вопрос")
        expect(savedThread.messages[2]?.content).toBe("Дополнительно: продолжим")
    })

    test("добавляет fileContext в payload для LLM запроса", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const provider = new FakeLLMProvider([
            {
                content: "Принял контекст файла",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})
        const fileContext = "src/index.ts\n1: console.log('x')"

        unwrapSuccessResult(
            await useCase.execute({
                channelId: "merge-3",
                userId: "user-2",
                message: "Проанализируй файл",
                fileContext,
            }),
        )

        const request = getDefinedRequest(provider.requests)
        const hasContext = request.messages.some((message: IMessageDTO) => {
            return message.role === "system" &&
                message.content.includes("Optional file context:") &&
                message.content.includes(fileContext)
        })
        expect(hasContext).toBe(true)
    })

    test("создает новый thread если текущий закрыт", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const thread = new ConversationThread(UniqueId.create("closed-thread"), {
            channelId: "merge-4",
            participantIds: ["user-3"],
            messages: [
                ConversationMessage.create({
                    role: "user",
                    content: "Предыдущее сообщение",
                }),
            ],
            status: CONVERSATION_THREAD_STATUS.CLOSED,
            closedAt: new Date("2026-03-01T00:00:00.000Z"),
        })
        await repository.save(thread)

        const provider = new FakeLLMProvider([
            {
                content: "Новый диалог",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})
        unwrapSuccessResult(
            await useCase.execute({
                channelId: "merge-4",
                userId: "user-3",
                message: "Пустая история?",
            }),
        )

        const savedThread = await getThread(repository, "merge-4")
        expect(savedThread.status).toBe(CONVERSATION_THREAD_STATUS.ACTIVE)
        expect(savedThread.messages).toHaveLength(2)
    })

    test("не разрешает писать в thread чужого участника", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const thread = new ConversationThread(UniqueId.create("blocked-thread"), {
            channelId: "merge-5",
            participantIds: ["other-user"],
            messages: [],
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })
        await repository.save(thread)

        const provider = new FakeLLMProvider([
            {
                content: "should-not-be-called",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})
        const failure = unwrapFailureResult(
            await useCase.execute({
                channelId: "merge-5",
                userId: "intruder",
                message: "Попробую присоединиться",
            }),
        )

        expect(failure.fields[0]).toEqual({
            field: "userId",
            message: "userId must be a participant in existing thread",
        })
        expect(provider.requests).toHaveLength(0)
    })

    test("возвращает валидацию при пустом или ошибочном сообщении провайдера", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const provider = new FakeLLMProvider([
            {
                content: "   ",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})

        const emptyContentResult = unwrapFailureResult(
            await useCase.execute({
                channelId: "merge-6",
                userId: "user-6",
                message: "Пустой ответ?",
            }),
        )
        expect(emptyContentResult.fields[0]).toEqual({
            field: "message",
            message: "LLM response content cannot be empty",
        })

        const failingProvider = new FakeLLMProvider([])
        const failingUseCase = createUseCase({
            repository: new InMemoryConversationThreadRepository(),
            provider: failingProvider,
        })
        const failResult = unwrapFailureResult(
            await failingUseCase.execute({
                channelId: "merge-7",
                userId: "user-7",
                message: "Проверь ошибку",
            }),
        )
        expect(failResult.fields[0]?.field).toBe("message")
    })

    test("возвращает ошибку при превышении лимита сообщений в thread", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const messages = Array.from({length: MAX_MESSAGES_PER_CONVERSATION_THREAD}, (_, index) => {
            return ConversationMessage.create({
                role: "user",
                content: `Сообщение ${index + 1}`,
            })
        })
        const thread = new ConversationThread(UniqueId.create("overflow-thread"), {
            channelId: "merge-8",
            participantIds: ["user-8"],
            messages,
            status: CONVERSATION_THREAD_STATUS.ACTIVE,
        })
        await repository.save(thread)

        const provider = new FakeLLMProvider([
            {
                content: "ignored",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})

        const result = unwrapFailureResult(
            await useCase.execute({
                channelId: "merge-8",
                userId: "user-8",
                message: "Новое сообщение",
            }),
        )

        expect(result.fields[0]?.message).toBe(
            "Conversation thread message limit reached: 50",
        )
        expect(provider.requests).toHaveLength(0)
    })

    test("возвращает валидацию для некорректного input", async () => {
        const repository = new InMemoryConversationThreadRepository()
        const provider = new FakeLLMProvider([
            {
                content: "ignored",
                usage: defaultUsage,
            },
        ])
        const useCase = createUseCase({repository, provider})

        const result = unwrapFailureResult(
            await useCase.execute({
                channelId: "",
                userId: "",
                message: "   ",
            }),
        )

        expect(result.fields).toEqual([
            {
                field: "channelId",
                message: "must be a non-empty string",
            },
            {
                field: "userId",
                message: "must be a non-empty string",
            },
            {
                field: "message",
                message: "must be a non-empty string",
            },
        ])
        expect(provider.requests).toHaveLength(0)
    })
})
