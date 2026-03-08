/**
 * Canonical finish reasons surfaced by LLM providers.
 */
export const CHAT_FINISH_REASON = {
    STOP: "stop",
    LENGTH: "length",
    TOOL_CALLS: "tool_calls",
    CONTENT_FILTER: "content_filter",
    FUNCTION_CALL: "function_call",
} as const

/**
 * Finish reason literal with forward-compatible string support.
 */
export type ChatFinishReason =
    | (typeof CHAT_FINISH_REASON)[keyof typeof CHAT_FINISH_REASON]
    | (string & {})
