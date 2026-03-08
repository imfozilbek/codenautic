/**
 * Supported response format kinds for chat requests.
 */
export const CHAT_RESPONSE_FORMAT = {
    TEXT: "text",
    JSON_OBJECT: "json_object",
    JSON_SCHEMA: "json_schema",
} as const

/**
 * Chat response format kind literal.
 */
export type ChatResponseFormatType =
    (typeof CHAT_RESPONSE_FORMAT)[keyof typeof CHAT_RESPONSE_FORMAT]

/**
 * Plain text response format.
 */
export interface ITextChatResponseFormatDTO {
    readonly type: typeof CHAT_RESPONSE_FORMAT.TEXT
}

/**
 * Legacy JSON mode response format.
 */
export interface IJsonObjectChatResponseFormatDTO {
    readonly type: typeof CHAT_RESPONSE_FORMAT.JSON_OBJECT
}

/**
 * Structured JSON schema response format.
 */
export interface IJsonSchemaChatResponseFormatDTO {
    readonly type: typeof CHAT_RESPONSE_FORMAT.JSON_SCHEMA
    readonly name: string
    readonly schema: Readonly<Record<string, unknown>>
    readonly description?: string
    readonly strict?: boolean
}

/**
 * Provider-agnostic response format contract for chat requests.
 */
export type IChatResponseFormatDTO =
    | ITextChatResponseFormatDTO
    | IJsonObjectChatResponseFormatDTO
    | IJsonSchemaChatResponseFormatDTO
