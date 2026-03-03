import type {IChatInput, IChatOutput} from "./chat.use-case"
import {
    type ICommandResult,
    type ICommandHandler,
    type IMentionCommand,
    type CommandType,
} from "./mention-command.types"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {IUseCase} from "../../ports/inbound/use-case.port"

/**
 * Minimal chat command for mention flow.
 */
const CHAT_COMMAND_TYPE: CommandType = "chat"

/**
 * Error message when chat command body is missing.
 */
const CHAT_COMMAND_MISSING_MESSAGE = "Используйте `@codenautic chat <message>`."

/**
 * Command handler that delegates @codenautic chat to ChatUseCase.
 */
export class ChatCommandHandler implements ICommandHandler {
    private readonly chatUseCase: IUseCase<IChatInput, IChatOutput, ValidationError>

    /**
     * Creates chat handler.
     *
     * @param chatUseCase Chat use case dependency.
     */
    public constructor(chatUseCase: IUseCase<IChatInput, IChatOutput, ValidationError>) {
        this.chatUseCase = chatUseCase
    }

    /**
     * Returns handled command type.
     */
    public get commandType(): CommandType {
        return CHAT_COMMAND_TYPE
    }

    /**
     * Executes chat command.
     *
     * @param command Parsed mention command.
     * @returns Execution result.
     */
    public async handle(command: IMentionCommand, _context?: unknown): Promise<ICommandResult> {
        if (command.commandType !== CHAT_COMMAND_TYPE) {
            return {
                success: false,
                response: "Unsupported command type",
            }
        }

        const message = this.extractMessage(command.args)
        if (message === undefined) {
            return {
                success: false,
                response: `Mention command validation failed ${CHAT_COMMAND_MISSING_MESSAGE}`,
            }
        }

        const input = this.buildUseCaseInput(command, message)

        const result = await this.chatUseCase.execute(input)
        if (result.isFail) {
            return {
                success: false,
                response: this.buildFailureResponse(result.error),
            }
        }

        return {
            success: true,
            response: result.value.assistantMessage,
        }
    }

    /**
     * Extracts chat message from parsed args.
     *
     * @param args Parsed command arguments.
     * @returns Parsed chat message or undefined.
     */
    private extractMessage(args: readonly string[]): string | undefined {
        if (args.length < 2) {
            return undefined
        }

        const message = args.slice(1).join(" ").trim()
        if (message.length === 0) {
            return undefined
        }

        return message
    }

    /**
     * Builds input for chat use case.
     *
     * @param command Parsed mention command.
     * @param message Parsed message text.
     * @returns Chat use case input.
     */
    private buildUseCaseInput(
        command: IMentionCommand,
        message: string,
    ): IChatInput {
        return {
            channelId: command.mergeRequestId,
            message,
            userId: command.userId,
        }
    }

    /**
     * Возвращает человекочитаемый ответ по ошибке use case.
     *
     * @param error Validation error.
     * @returns Error response string.
     */
    private buildFailureResponse(error: ValidationError): string {
        const details = this.buildErrorDetails(error.fields)
        if (details.length === 0) {
            return error.message
        }

        return `${error.message}: ${details}`
    }

    /**
     * Формирует детальную строку ошибки для пользователя.
     *
     * @param fields Ошибки валидации.
     * @returns Детализация через точку с запятой.
     */
    private buildErrorDetails(fields: readonly IValidationErrorField[]): string {
        const parts: string[] = []
        for (const field of fields) {
            parts.push(`${field.field}: ${field.message}`)
        }

        return parts.join("; ")
    }
}
