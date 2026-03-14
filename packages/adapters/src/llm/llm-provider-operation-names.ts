/**
 * Public llm-provider operation names used by shared wrappers.
 */
export const LLM_PROVIDER_OPERATION_NAMES = [
    "chat",
    "stream",
    "embed",
] as const

/**
 * Fast operation-name lookup for proxy wrappers.
 */
export const LLM_PROVIDER_OPERATION_NAME_SET = new Set<string>(LLM_PROVIDER_OPERATION_NAMES)
