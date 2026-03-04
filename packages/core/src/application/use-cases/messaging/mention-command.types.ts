
/**
 * All supported @codenautic command types.
 */
export const SUPPORTED_COMMAND_TYPES = [
    "review",
    "explain",
    "fix",
    "summary",
    "help",
    "config",
    "chat",
] as const

/**
 * One command result per execution.
 */
export interface ICommandResult {
    /**
     * True when command executed successfully.
     */
    readonly success: boolean

    /**
     * Human-readable response.
     */
    readonly response: string
}

/**
 * Supported @codenautic command type.
 */
export type CommandType = (typeof SUPPORTED_COMMAND_TYPES)[number]

/**
 * Parsed mention command.
 */
export interface IMentionCommand {
    /**
     * Parsed command type.
     */
    readonly commandType: CommandType

    /**
     * Parsed command arguments.
     */
    readonly args: readonly string[]

    /**
     * Source comment text containing command.
     */
    readonly sourceComment: string

    /**
     * User who sent command.
     */
    readonly userId: string

    /**
     * Merge request identifier used as default chat channel.
     */
    readonly mergeRequestId: string
}

/**
 * Raw mention command input before parsing.
 */
export interface IRawMentionCommandInput {
    /**
     * Source comment text containing @codenautic mention.
     */
    readonly sourceComment: string

    /**
     * User who sent mention.
     */
    readonly userId: string

    /**
     * Merge request identifier used as default chat channel.
     */
    readonly mergeRequestId: string

    /**
     * Additional execution context for handlers.
     */
    readonly context?: unknown
}

/**
 * Handler contract for a single command type.
 */
export interface ICommandHandler {
    /**
     * Command type handled by this implementation.
     */
    readonly commandType: CommandType

    /**
     * Executes command and returns response.
     *
     * @param command Parsed mention command.
     * @param context Optional execution context.
     * @returns Execution result.
     */
    handle(command: IMentionCommand, context?: unknown): Promise<ICommandResult>
}
