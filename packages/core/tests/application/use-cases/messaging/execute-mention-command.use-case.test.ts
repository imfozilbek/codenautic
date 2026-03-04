import {describe, expect, test} from "bun:test"

import type {
    ICommandHandler,
    IMentionCommand,
    ICommandResult,
    CommandType,
    IRawMentionCommandInput,
} from "../../../../src/application/use-cases/messaging/mention-command.types"
import {
    ExecuteMentionCommandUseCase,
    type IExecuteMentionCommandUseCaseDependencies,
} from "../../../../src/application/use-cases/messaging/execute-mention-command.use-case"

class FakeCommandHandler implements ICommandHandler {
    private readonly handler: (
        command: IMentionCommand,
        context?: unknown,
    ) => Promise<ICommandResult>
    public readonly calls: Array<{
        readonly commandType: CommandType
        readonly context: unknown
        readonly userId: string
        readonly mergeRequestId: string
    }> = []

    public constructor(
        handler: (command: IMentionCommand, context?: unknown) => Promise<ICommandResult>,
    ) {
        this.handler = handler
    }

    public get commandType(): CommandType {
        return "chat"
    }

    public async handle(
        command: IMentionCommand,
        context?: unknown,
    ): Promise<ICommandResult> {
        this.calls.push({
            commandType: command.commandType,
            context,
            userId: command.userId,
            mergeRequestId: command.mergeRequestId,
        })

        return this.handler(command, context)
    }

    public get lastContext(): unknown {
        return this.calls[0]?.context
    }
}

function createInput(overrides: Partial<IRawMentionCommandInput> = {}): IRawMentionCommandInput {
    return {
        sourceComment: "@codenautic chat Проверим команду",
        userId: "user-1",
        mergeRequestId: "mr-1",
        context: {
            source: "web",
        },
        ...overrides,
    }
}

describe("ExecuteMentionCommandUseCase", () => {
    const allowedCommands = [
        "review",
        "explain",
        "fix",
        "summary",
        "help",
        "config",
        "chat",
    ]
    test("маршрутизирует известную команду к handler и прокидывает контекст", async () => {
        const handler = new FakeCommandHandler(
            () => Promise.resolve({
                success: true,
                response: "chat handled",
            }),
        )
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [handler],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput())

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: true,
            response: "chat handled",
        })
        expect(handler.calls).toHaveLength(1)
        expect(handler.calls[0]).toEqual({
            commandType: "chat",
            context: {
                source: "web",
            },
            userId: "user-1",
            mergeRequestId: "mr-1",
        })
        expect(handler.lastContext).toEqual({source: "web"})
    })

    test("возвращает help для команды help", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "@codenautic help",
        }))

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: true,
            response: "Доступные команды: review, explain, fix, summary, help, config, chat.",
        })
    })

    test("возвращает help для неизвестной команды с указанием имени", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "@codenautic unknown",
        }))

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: true,
            response: "Команда unknown не поддерживается. Доступные команды: review, explain, fix, summary, help, config, chat.",
        })
    })

    test("возвращает подсказку, если handler для команды отсутствует", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "@codenautic chat Нужно ответить",
        }))

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: false,
            response:
                "Команда chat пока не подключена. Доступные команды: review, explain, fix, summary, help, config, chat.",
        })
    })

    test("валидацирует пустые обязательные поля", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "",
            userId: "",
            mergeRequestId: "",
        }))

        expect(result.isFail).toBe(true)
        expect(result.error.message).toBe("Mention command validation failed")
        expect(result.error.fields).toEqual([
            {
                field: "sourceComment",
                message: "must be a non-empty string",
            },
            {
                field: "userId",
                message: "must be a non-empty string",
            },
            {
                field: "mergeRequestId",
                message: "must be a non-empty string",
            },
        ])
    })

    test("валидацирует некорректный формат упоминания", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "просто текст без упоминания",
        }))

        expect(result.isFail).toBe(true)
        expect(result.error.message).toBe("Could not parse mention command")
        expect(result.error.fields).toEqual([
            {
                field: "sourceComment",
                message: "must contain @codenautic <command>",
            },
        ])
    })

    test("возвращает failure при ошибке handler", async () => {
        const handler = new class implements ICommandHandler {
            public readonly commandType = "chat" as const

            public handle(): Promise<ICommandResult> {
                return Promise.reject(new Error("handler exploded"))
            }
        }()

        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [handler],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput())

        expect(result.isFail).toBe(true)
        expect(result.error.message).toBe("Mention command execution failed")
        expect(result.error.fields).toEqual([
            {
                field: "command",
                message: "handler exploded",
            },
        ])
    })

    test("возвращает ValidationError когда chat handler падает валидацией", async () => {
        const handler = new FakeCommandHandler(() => Promise.resolve({
            success: false,
            response: "chat failed",
        }))
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [handler],
            defaults: {
                allowedCommands,
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput())

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: false,
            response: "chat failed",
        })
    })

    test("возвращает help для команды вне allowlist", async () => {
        const useCase = new ExecuteMentionCommandUseCase({
            handlers: [],
            defaults: {
                allowedCommands: ["review", "help"],
            },
        } satisfies IExecuteMentionCommandUseCaseDependencies)

        const result = await useCase.execute(createInput({
            sourceComment: "@codenautic fix пропущенные тесты",
        }))

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            success: true,
            response: "Команда fix не поддерживается. Доступные команды: review, help.",
        })
    })

    test("бросает ошибку при пустом allowlist", () => {
        expect(() => {
            return new ExecuteMentionCommandUseCase({
                handlers: [],
                defaults: {
                    allowedCommands: [],
                },
            } satisfies IExecuteMentionCommandUseCaseDependencies)
        }).toThrow("Mention command allowlist is empty")
    })
})
