import {describe, expect, test} from "bun:test"

import type {IChatInput, IChatOutput} from "../../../../src/application/use-cases/messaging/chat.use-case"
import {ChatCommandHandler} from "../../../../src/application/use-cases/messaging/chat-command.handler"
import type {IMentionCommand} from "../../../../src/application/use-cases/messaging/mention-command.types"
import type {IUseCase} from "../../../../src/application/ports/inbound/use-case.port"
import type {IValidationErrorField} from "../../../../src/domain/errors/validation.error"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {Result} from "../../../../src/shared/result"
import {type ITokenUsageDTO} from "../../../../src/application/dto/review/token-usage.dto"

const defaultUsage: ITokenUsageDTO = {
    input: 4,
    output: 12,
    total: 16,
}

const defaultChatOutput: IChatOutput = {
    channelId: "merge-1",
    assistantMessage: "Готов обсудить.",
    usage: defaultUsage,
}

class FakeChatUseCase implements IUseCase<IChatInput, IChatOutput, ValidationError> {
    public readonly calls: IChatInput[] = []
    private readonly results: Result<IChatOutput, ValidationError>[]

    public constructor(results: Result<IChatOutput, ValidationError>[]) {
        this.results = results
    }

    public execute(input: IChatInput): Promise<Result<IChatOutput, ValidationError>> {
        this.calls.push(input)
        const next = this.results.shift()
        if (next === undefined) {
            return Promise.resolve(
                Result.fail<IChatOutput, ValidationError>(new ValidationError("No fake result configured", [])),
            )
        }

        return Promise.resolve(next)
    }
}

function createCommand(overrides: Partial<IMentionCommand> = {}): IMentionCommand {
    return {
        commandType: "chat",
        args: ["chat", "Привет,", "как", "дела?"],
        sourceComment: "@codenautic chat Привет, как дела?",
        userId: "user-1",
        mergeRequestId: "mr-1",
        ...overrides,
    }
}

function buildFields(
    message: string,
    field = "message",
): readonly IValidationErrorField[] {
    return [
        {
            field,
            message,
        },
    ]
}

describe("ChatCommandHandler", () => {
    test("выполняет ChatUseCase для @codenautic chat команды", async () => {
        const chatUseCase = new FakeChatUseCase([Result.ok<IChatOutput, ValidationError>(defaultChatOutput)])
        const handler = new ChatCommandHandler(chatUseCase)

        const result = await handler.handle(createCommand({
            args: ["chat", "Подскажи,", "какой", "путь", "лучше", "выбрать?"],
            mergeRequestId: "mr-command",
        }))

        expect(result).toEqual({
            success: true,
            response: "Готов обсудить.",
        })
        expect(chatUseCase.calls).toHaveLength(1)
        expect(chatUseCase.calls[0]).toEqual({
            channelId: "mr-command",
            userId: "user-1",
            message: "Подскажи, какой путь лучше выбрать?",
        })
    })

    test("возвращает failure при пустом сообщении после chat", async () => {
        const chatUseCase = new FakeChatUseCase([])
        const handler = new ChatCommandHandler(chatUseCase)

        const result = await handler.handle(createCommand({
            args: ["chat"],
        }))

        expect(result).toEqual({
            success: false,
            response: "Mention command validation failed Используйте `@codenautic chat <message>`.",
        })
        expect(chatUseCase.calls).toHaveLength(0)
    })

    test("пробрасывает failure сообщения из ChatUseCase", async () => {
        const chatUseCase = new FakeChatUseCase([Result.fail<IChatOutput, ValidationError>(
            new ValidationError("Chat use case validation failed", buildFields("message cannot be empty")),
        )])
        const handler = new ChatCommandHandler(chatUseCase)

        const result = await handler.handle(createCommand())

        expect(result).toEqual({
            success: false,
            response: "Chat use case validation failed: message: message cannot be empty",
        })
        expect(chatUseCase.calls).toHaveLength(1)
    })
})
