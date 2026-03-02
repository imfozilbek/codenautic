/**
 * Supported LLM message roles.
 */
export const MESSAGE_ROLE = {
    SYSTEM: "system",
    USER: "user",
    ASSISTANT: "assistant",
    TOOL: "tool",
} as const

/**
 * LLM message role literal type.
 */
export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE]

/**
 * Chat message payload.
 */
export interface IMessageDTO {
    readonly role: MessageRole
    readonly content: string
    readonly name?: string
    readonly toolCallId?: string
}

/**
 * Tool call payload returned by LLM provider.
 */
export interface IToolCallDTO {
    readonly id: string
    readonly name: string
    readonly arguments: string
}

/**
 * Tool definition payload provided to LLM provider.
 */
export interface IToolDefinitionDTO {
    readonly name: string
    readonly description: string
    readonly parameters: Readonly<Record<string, unknown>>
}
