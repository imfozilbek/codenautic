import type {IChatRequestDTO, IChatResponseDTO} from "../../dto/llm/chat.dto"
import type {ITokenUsageDTO} from "../../dto/review/token-usage.dto"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {IConversationThreadRepository} from "../../ports/outbound/messaging/conversation-thread-repository.port"
import {ConversationThreadFactory} from "../../../domain/factories/conversation-thread.factory"
import {
    ConversationMessage,
    CONVERSATION_MESSAGE_ROLE,
} from "../../../domain/value-objects/conversation-message.value-object"
import {ConversationThread, CONVERSATION_THREAD_STATUS} from "../../../domain/entities/conversation-thread.entity"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {Result} from "../../../shared/result"
import {type IMessageDTO} from "../../dto/llm/message.dto"
import {MESSAGE_ROLE} from "../../dto/llm/message.dto"
import type {IMessagingChatDefaults} from "../../dto/config/system-defaults.dto"

/** Limit for optional file context injection into request. */
const MAX_FILE_CONTEXT_LENGTH = 5000

/** Standard error message for validation failures. */
const CHAT_USE_CASE_ERROR_MESSAGE = "Chat use case validation failed"

/** Stable system prompt for all assistant interactions. */
const CHAT_SYSTEM_PROMPT =
    "You are an internal technical assistant. " +
    "Use provided context to answer accurately and concisely."

/** Instruction marker for optional file context block. */
const FILE_CONTEXT_LABEL = "Optional file context:"

/** Temperature used for assistant responses. */
const CHAT_TEMPERATURE = 0.2

/** Input for interactive chat use case. */
export interface IChatInput {
    /**
     * Channel identifier (merge request, user chat room, etc.).
     */
    readonly channelId: string

    /**
     * User message text.
     */
    readonly message: string

    /**
     * Actor identifier.
     */
    readonly userId: string

    /**
     * Optional file context appended to conversation prompt.
     */
    readonly fileContext?: string
}

/** Output of interactive chat use case. */
export interface IChatOutput {
    /**
     * Normalized channel identifier.
     */
    readonly channelId: string

    /**
     * Assistant message text.
     */
    readonly assistantMessage: string

    /**
     * Token usage metadata from LLM provider.
     */
    readonly usage: ITokenUsageDTO
}

/** Dependencies for chat use case. */
export interface IChatUseCaseDependencies {
    /**
     * Conversation thread repository.
     */
    readonly conversationThreadRepository: IConversationThreadRepository

    /**
     * Conversation thread factory.
     */
    readonly conversationThreadFactory: ConversationThreadFactory

    /**
     * LLM provider to generate assistant message.
     */
    readonly llmProvider: ILLMProvider

    /**
     * Defaults resolved from config-service.
     */
    readonly defaults: IMessagingChatDefaults
}

/**
 * Обрабатывает интерактивный чат для agent сценариев.
 */
export class ChatUseCase implements IUseCase<IChatInput, IChatOutput, ValidationError> {
    private readonly conversationThreadRepository: IConversationThreadRepository
    private readonly conversationThreadFactory: ConversationThreadFactory
    private readonly llmProvider: ILLMProvider
    private readonly model: string
    private readonly maxTokens: number

    /**
     * Creates chat use case instance.
     *
     * @param dependencies Required dependencies and optional LLM overrides.
     */
    public constructor(dependencies: IChatUseCaseDependencies) {
        this.conversationThreadRepository = dependencies.conversationThreadRepository
        this.conversationThreadFactory = dependencies.conversationThreadFactory
        this.llmProvider = dependencies.llmProvider
        this.model = dependencies.defaults.model
        this.maxTokens = dependencies.defaults.maxTokens
    }

    /**
     * Executes chat flow: load/create thread, send request to LLM, persist messages.
     *
     * @param input Chat input.
     * @returns Assistant answer and token usage.
     */
    public async execute(input: IChatInput): Promise<Result<IChatOutput, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.length > 0) {
            return Result.fail<IChatOutput, ValidationError>(
                new ValidationError(CHAT_USE_CASE_ERROR_MESSAGE, validation),
            )
        }

        const channelId = input.channelId.trim()
        const userId = input.userId.trim()
        const message = input.message.trim()
        const fileContext = this.normalizeFileContext(input.fileContext)

        const threadResult = await this.resolveActiveThread(channelId, userId)
        if (threadResult.isFail) {
            return Result.fail<IChatOutput, ValidationError>(threadResult.error)
        }

        const thread = threadResult.value
        const userMessage = ConversationMessage.create({
            role: CONVERSATION_MESSAGE_ROLE.USER,
            content: message,
            metadata: {
                origin: "chat-use-case",
            },
        })

        const addUserMessageResult = this.tryAppendMessage(thread, userMessage)
        if (addUserMessageResult.isFail) {
            return Result.fail<IChatOutput, ValidationError>(addUserMessageResult.error)
        }

        const request = this.buildChatRequest(thread, userMessage, fileContext)

        let response: IChatResponseDTO
        try {
            response = await this.llmProvider.chat(request)
        } catch (error: unknown) {
            return Result.fail<IChatOutput, ValidationError>(
                new ValidationError(CHAT_USE_CASE_ERROR_MESSAGE, [
                    {
                        field: "message",
                        message: this.buildProviderErrorMessage(error),
                    },
                ]),
            )
        }

        const assistantText = response.content.trim()
        if (assistantText.length === 0) {
            return Result.fail<IChatOutput, ValidationError>(
                new ValidationError(CHAT_USE_CASE_ERROR_MESSAGE, [
                    {
                        field: "message",
                        message: "LLM response content cannot be empty",
                    },
                ]),
            )
        }

        const assistantMessage = ConversationMessage.create({
            role: CONVERSATION_MESSAGE_ROLE.ASSISTANT,
            content: assistantText,
            metadata: {
                model: this.model,
                usage: response.usage,
            },
        })
        const addAssistantMessageResult = this.tryAppendMessage(thread, assistantMessage)
        if (addAssistantMessageResult.isFail) {
            return Result.fail<IChatOutput, ValidationError>(addAssistantMessageResult.error)
        }

        await this.conversationThreadRepository.save(thread)

        return Result.ok<IChatOutput, ValidationError>({
            channelId,
            assistantMessage: assistantText,
            usage: response.usage,
        })
    }

    /**
     * Loads active thread by channel or creates new active thread.
     *
     * @param channelId Channel identifier.
     * @param userId Message sender.
     * @returns Active conversation thread.
     */
    private async resolveActiveThread(
        channelId: string,
        userId: string,
    ): Promise<Result<ConversationThread, ValidationError>> {
        const existing = await this.conversationThreadRepository.findByChannelId(channelId)
        if (existing === null || existing.status !== CONVERSATION_THREAD_STATUS.ACTIVE) {
            return Result.ok<ConversationThread, ValidationError>(
                this.conversationThreadFactory.create({
                    channelId,
                    participantIds: [userId],
                }),
            )
        }

        if (existing.participantIds.includes(userId) === false) {
            return Result.fail<ConversationThread, ValidationError>(
                new ValidationError(CHAT_USE_CASE_ERROR_MESSAGE, [
                    {
                        field: "userId",
                        message: "userId must be a participant in existing thread",
                    },
                ]),
            )
        }

        return Result.ok<ConversationThread, ValidationError>(existing)
    }

    /**
     * Tries to add message to thread and maps domain failures to ValidationError.
     *
     * @param thread Target thread.
     * @param message Message payload.
     * @returns Success or validation failure.
     */
    private tryAppendMessage(
        thread: ConversationThread,
        message: ConversationMessage,
    ): Result<void, ValidationError> {
        try {
            thread.addMessage(message)
        } catch (error: unknown) {
            return Result.fail<void, ValidationError>(new ValidationError(
                CHAT_USE_CASE_ERROR_MESSAGE,
                [
                    {
                        field: "message",
                        message: this.resolveThreadMutationError(error),
                    },
                ],
            ))
        }

        return Result.ok<void, ValidationError>(undefined)
    }

    /**
     * Builds request using thread context and optional file context.
     *
     * @param thread Target thread.
     * @param userMessage New user message.
     * @param fileContext Optional file payload.
     * @returns Chat provider request.
     */
    private buildChatRequest(
        thread: ConversationThread,
        userMessage: ConversationMessage,
        fileContext: string | undefined,
    ): IChatRequestDTO {
        const contextMessages: IMessageDTO[] = this.buildContextMessages(thread.messages)
        if (fileContext !== undefined) {
            contextMessages.push({
                role: MESSAGE_ROLE.SYSTEM,
                content: `${FILE_CONTEXT_LABEL}\n${fileContext}`,
            })
        }

        contextMessages.push({
            role: userMessage.role,
            content: userMessage.content,
        })

        return {
            model: this.model,
            temperature: CHAT_TEMPERATURE,
            maxTokens: this.maxTokens,
            messages: contextMessages,
        }
    }

    /**
     * Builds normalized message list with system prompt and history.
     *
     * @param messages Thread history.
     * @returns Context messages.
     */
    private buildContextMessages(messages: readonly ConversationMessage[]): IMessageDTO[] {
        const history: IMessageDTO[] = [
            {
                role: MESSAGE_ROLE.SYSTEM,
                content: CHAT_SYSTEM_PROMPT,
            },
        ]
        for (const message of messages) {
            history.push({
                role: message.role,
                content: message.content,
            })
        }

        return history
    }

    /**
     * Normalizes optional file context.
     *
     * @param fileContext Raw context value.
     * @returns Truncated context or undefined.
     */
    private normalizeFileContext(fileContext: unknown): string | undefined {
        if (typeof fileContext !== "string") {
            return undefined
        }

        const trimmed = fileContext.trim()
        if (trimmed.length === 0) {
            return undefined
        }

        if (trimmed.length <= MAX_FILE_CONTEXT_LENGTH) {
            return trimmed
        }

        return trimmed.slice(0, MAX_FILE_CONTEXT_LENGTH)
    }

    /**
     * Validates input payload.
     *
     * @param input Chat input.
     * @returns Validation fields.
     */
    private validateInput(input: IChatInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.channelId !== "string" || input.channelId.trim().length === 0) {
            fields.push({
                field: "channelId",
                message: "must be a non-empty string",
            })
        }

        if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
            fields.push({
                field: "userId",
                message: "must be a non-empty string",
            })
        }

        if (typeof input.message !== "string" || input.message.trim().length === 0) {
            fields.push({
                field: "message",
                message: "must be a non-empty string",
            })
        }

        return fields
    }

    /**
     * Converts provider failure into clear message.
     *
     * @param error Raw error.
     * @returns Message for validation output.
     */
    private buildProviderErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return `provider error: ${error.message}`
        }

        return "provider error: unknown error"
    }

    /**
     * Extracts message for thread mutation failures.
     *
     * @param error Domain mutation error.
     * @returns Readable message.
     */
    private resolveThreadMutationError(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return "conversation thread mutation failed"
    }
}
