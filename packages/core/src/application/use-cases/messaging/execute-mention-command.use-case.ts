import type {IUseCase} from "../../ports/inbound/use-case.port"
import {
    type ICommandResult,
    type ICommandHandler,
    type IMentionCommand,
    type IRawMentionCommandInput,
    type CommandType,
    COMMAND_TYPES,
} from "./mention-command.types"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {Result} from "../../../shared/result"

/** Mention prefix used for detection and parsing. */
const MENTION_PREFIX = "@codenautic"

/** Mention prefix pattern for quick detection in comment text. */
const MENTION_PREFIX_PATTERN = /@codenautic\b/i

/** Error returned when mention format is not parseable. */
const INVALID_MENTION_FORMAT_MESSAGE = "Could not parse mention command"

/** Error returned when command input is missing required fields. */
const INVALID_INPUT_MESSAGE = "Mention command validation failed"

/** Use case command input. */
interface IParsedMentionCommand {
    /** Parsed command type. */
    readonly commandType: CommandType

    /** Parsed command args, including command itself as first item. */
    readonly args: readonly string[]

    /** Unknown command, if parsed as help fallback. */
    readonly unknownCommand?: string
}

/** Dependencies for execute mention command use case. */
export interface IExecuteMentionCommandUseCaseDependencies {
    /** Available command handlers by command type. */
    readonly handlers: readonly ICommandHandler[]
}

/**
 * Executes parsed @codenautic command via appropriate command handler.
 */
export class ExecuteMentionCommandUseCase
    implements IUseCase<IRawMentionCommandInput, ICommandResult, ValidationError>
{
    private readonly handlers: ReadonlyMap<CommandType, ICommandHandler>

    /**
     * Creates execute mention command use case.
     *
     * @param dependencies Registered handlers.
     */
    public constructor(dependencies: IExecuteMentionCommandUseCaseDependencies) {
        this.handlers = this.createHandlerIndex(dependencies.handlers)
    }

    /**
     * Executes parsing and dispatch for a single mention command.
     *
     * @param input Mention execution input.
     * @returns Command result or validation failure.
     */
    public async execute(input: IRawMentionCommandInput): Promise<Result<ICommandResult, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.length > 0) {
            return Result.fail<ICommandResult, ValidationError>(
                new ValidationError(INVALID_INPUT_MESSAGE, validation),
            )
        }

        const parsed = this.parseCommand(input.sourceComment)
        if (parsed === undefined) {
            return Result.fail<ICommandResult, ValidationError>(
                new ValidationError(
                    INVALID_MENTION_FORMAT_MESSAGE,
                    [
                        {
                            field: "sourceComment",
                            message: "must contain @codenautic <command>",
                        },
                    ],
                ),
            )
        }

        if (parsed.commandType === "help") {
            return Result.ok<ICommandResult, ValidationError>(
                this.buildHelpResponse(parsed.unknownCommand),
            )
        }

        const command = this.createMentionCommand(input, parsed)
        const handler = this.handlers.get(command.commandType)
        if (handler === undefined) {
            return Result.ok<ICommandResult, ValidationError>({
                success: false,
                response: this.buildMissingHandlerHelpResponse(command.commandType),
            })
        }

        try {
            return Result.ok<ICommandResult, ValidationError>(await handler.handle(command, input.context))
        } catch (error: unknown) {
            return Result.fail<ICommandResult, ValidationError>(
                new ValidationError(
                    "Mention command execution failed",
                    [
                        {
                            field: "command",
                            message: this.describeExecutionError(error),
                        },
                    ],
                ),
            )
        }
    }

    /**
     * Parse raw source comment into normalized command and args.
     *
     * @param sourceComment Source comment text.
     * @returns Parsed command or undefined.
     */
    private parseCommand(sourceComment: string): IParsedMentionCommand | undefined {
        const match = sourceComment.match(MENTION_PREFIX_PATTERN)
        if (match === null || match.index === undefined) {
            return undefined
        }

        const afterPrefix = sourceComment
            .slice(match.index + MENTION_PREFIX.length)
            .trim()
        if (afterPrefix.length === 0) {
            return undefined
        }

        const tokens = afterPrefix.split(/\s+/)
        if (tokens.length === 0) {
            return undefined
        }

        const commandType = tokens[0]?.toLowerCase()
        if (commandType === undefined || commandType.length === 0) {
            return undefined
        }

        if (this.isKnownCommandType(commandType) === false) {
            return {
                commandType: "help",
                args: ["help", commandType],
                unknownCommand: commandType,
            }
        }

        return {
            commandType,
            args: tokens,
        }
    }

    /**
     * Creates mention command from parsed tokens.
     *
     * @param input Original raw input.
     * @param parsed Parsed command data.
     * @returns Mentions command payload.
     */
    private createMentionCommand(
        input: IRawMentionCommandInput,
        parsed: IParsedMentionCommand,
    ): IMentionCommand {
        return {
            commandType: parsed.commandType,
            args: parsed.args,
            sourceComment: input.sourceComment,
            userId: input.userId,
            mergeRequestId: input.mergeRequestId,
        }
    }

    /**
     * Builds help response.
     *
     * @param unknownCommand Unknown command, if any.
     * @returns Help response for user.
     */
    private buildHelpResponse(unknownCommand?: string): ICommandResult {
        const unknownNotice =
            unknownCommand === undefined
                ? ""
                : `Команда ${unknownCommand} не поддерживается. `

        return {
            success: true,
            response: `${unknownNotice}Доступные команды: ${COMMAND_TYPES.join(", ")}.`,
        }
    }

    /**
     * Builds missing handler help response.
     *
     * @param commandType Command type without handler.
     * @returns Suggestion with help text.
     */
    private buildMissingHandlerHelpResponse(commandType: CommandType): string {
        return `Команда ${commandType} пока не подключена. ${
            this.buildHelpResponse().response
        }`
    }

    /**
     * Builds map of available handlers.
     *
     * @param handlers Registered handlers.
     * @returns Map by command type.
     */
    private createHandlerIndex(handlers: readonly ICommandHandler[]): ReadonlyMap<CommandType, ICommandHandler> {
        const index = new Map<CommandType, ICommandHandler>()
        for (const handler of handlers) {
            index.set(handler.commandType, handler)
        }

        return index
    }

    /**
     * Validates raw input for use case execution.
     *
     * @param input Raw input.
     * @returns Validation fields.
     */
    private validateInput(input: IRawMentionCommandInput): readonly IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.sourceComment !== "string" || input.sourceComment.trim().length === 0) {
            fields.push({
                field: "sourceComment",
                message: "must be a non-empty string",
            })
        }

        if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
            fields.push({
                field: "userId",
                message: "must be a non-empty string",
            })
        }

        if (typeof input.mergeRequestId !== "string" || input.mergeRequestId.trim().length === 0) {
            fields.push({
                field: "mergeRequestId",
                message: "must be a non-empty string",
            })
        }

        return fields
    }

    /**
     * Checks if command type is supported.
     *
     * @param commandType Candidate command type.
     * @returns True if command type is known.
     */
    private isKnownCommandType(commandType: string): commandType is CommandType {
        return COMMAND_TYPES.includes(commandType as CommandType)
    }

    /**
     * Converts thrown error to user-facing text.
     *
     * @param error Unknown failure.
     * @returns Error message.
     */
    private describeExecutionError(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return "unknown error"
    }
}
