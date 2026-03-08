import {
    CHAT_RESPONSE_FORMAT,
    MESSAGE_ROLE,
    type IChatRequestDTO,
    type IChatResponseFormatDTO,
    type IMessageDTO,
    type IToolDefinitionDTO,
} from "@codenautic/core"

import {
    LLM_ACL_PROVIDER,
    type ILlmAclRequestNormalizationOptions,
    type LlmAclProvider,
} from "./llm-acl.types"

const DEFAULT_ANTHROPIC_MAX_TOKENS = 1024

const DEFAULT_PROVIDER_MODEL: Readonly<Record<LlmAclProvider, string>> = {
    OPENAI: "gpt-4o-mini",
    ANTHROPIC: "claude-3-5-haiku-latest",
}

/**
 * OpenAI-compatible tool payload.
 */
export interface IOpenAiTool {
    readonly type: "function"
    readonly function: {
        readonly name: string
        readonly description: string
        readonly parameters: Readonly<Record<string, unknown>>
    }
}

/**
 * OpenAI-compatible request payload.
 */
export interface IOpenAiChatRequest {
    readonly model: string
    readonly messages: readonly IMessageDTO[]
    readonly temperature?: number
    readonly max_tokens?: number
    readonly tools?: readonly IOpenAiTool[]
    readonly response_format?: IOpenAiResponseFormat
}

/**
 * OpenAI-compatible text response format.
 */
interface IOpenAiTextResponseFormat {
    readonly type: "text"
}

/**
 * OpenAI-compatible legacy JSON mode response format.
 */
interface IOpenAiJsonObjectResponseFormat {
    readonly type: "json_object"
}

/**
 * OpenAI-compatible JSON schema response format.
 */
interface IOpenAiJsonSchemaResponseFormat {
    readonly type: "json_schema"
    readonly json_schema: {
        readonly name: string
        readonly schema: Readonly<Record<string, unknown>>
        readonly description?: string
        readonly strict?: boolean
    }
}

/**
 * OpenAI-compatible response format union.
 */
type IOpenAiResponseFormat =
    | IOpenAiTextResponseFormat
    | IOpenAiJsonObjectResponseFormat
    | IOpenAiJsonSchemaResponseFormat

/**
 * Anthropic-compatible content block payload.
 */
export interface IAnthropicTextContent {
    readonly type: "text"
    readonly text: string
}

/**
 * Anthropic-compatible message payload.
 */
export interface IAnthropicMessage {
    readonly role: "user" | "assistant"
    readonly content: readonly IAnthropicTextContent[]
}

/**
 * Anthropic-compatible tool payload.
 */
export interface IAnthropicTool {
    readonly name: string
    readonly description: string
    readonly input_schema: Readonly<Record<string, unknown>>
}

/**
 * Anthropic-compatible request payload.
 */
export interface IAnthropicChatRequest {
    readonly model: string
    readonly messages: readonly IAnthropicMessage[]
    readonly system?: string
    readonly max_tokens: number
    readonly temperature?: number
    readonly tools?: readonly IAnthropicTool[]
}

/**
 * Provider-specific request payload union.
 */
export type LlmProviderChatRequest = IOpenAiChatRequest | IAnthropicChatRequest

/**
 * Normalizes shared request DTO into OpenAI request shape.
 *
 * @param provider Target provider.
 * @param request Shared request DTO.
 * @param options Request normalization options.
 * @returns OpenAI-compatible request.
 */
export function normalizeLlmProviderRequest(
    provider: typeof LLM_ACL_PROVIDER.OPENAI,
    request: IChatRequestDTO,
    options?: ILlmAclRequestNormalizationOptions,
): IOpenAiChatRequest

/**
 * Normalizes shared request DTO into Anthropic request shape.
 *
 * @param provider Target provider.
 * @param request Shared request DTO.
 * @param options Request normalization options.
 * @returns Anthropic-compatible request.
 */
export function normalizeLlmProviderRequest(
    provider: typeof LLM_ACL_PROVIDER.ANTHROPIC,
    request: IChatRequestDTO,
    options?: ILlmAclRequestNormalizationOptions,
): IAnthropicChatRequest

/**
 * Normalizes shared request DTO into provider-specific request shape.
 *
 * @param provider Target provider kind.
 * @param request Shared request DTO.
 * @param options Request normalization options.
 * @returns Provider-specific normalized request.
 */
export function normalizeLlmProviderRequest(
    provider: LlmAclProvider,
    request: IChatRequestDTO,
    options: ILlmAclRequestNormalizationOptions = {},
): LlmProviderChatRequest {
    if (provider === LLM_ACL_PROVIDER.OPENAI) {
        return normalizeOpenAiRequest(provider, request, options)
    }

    return normalizeAnthropicRequest(provider, request, options)
}

/**
 * Builds OpenAI-compatible request payload.
 *
 * @param provider Target provider.
 * @param request Shared request DTO.
 * @param options Request normalization options.
 * @returns OpenAI request payload.
 */
function normalizeOpenAiRequest(
    provider: LlmAclProvider,
    request: IChatRequestDTO,
    options: ILlmAclRequestNormalizationOptions,
): IOpenAiChatRequest {
    const normalizedTools = toOpenAiTools(request.tools)

    return {
        model: resolveModel(provider, request.model, options),
        messages: normalizeMessages(request.messages),
        temperature: resolveTemperature(request.temperature),
        max_tokens: resolveMaxTokens(request.maxTokens),
        tools: normalizedTools.length > 0 ? normalizedTools : undefined,
        response_format: toOpenAiResponseFormat(request.responseFormat),
    }
}

/**
 * Builds Anthropic-compatible request payload.
 *
 * @param provider Target provider.
 * @param request Shared request DTO.
 * @param options Request normalization options.
 * @returns Anthropic request payload.
 */
function normalizeAnthropicRequest(
    provider: LlmAclProvider,
    request: IChatRequestDTO,
    options: ILlmAclRequestNormalizationOptions,
): IAnthropicChatRequest {
    const system = extractSystemMessage(request.messages)
    const messages = toAnthropicMessages(request.messages)
    const tools = toAnthropicTools(request.tools)
    const maxTokens = resolveAnthropicMaxTokens(request.maxTokens, options)

    return {
        model: resolveModel(provider, request.model, options),
        messages,
        system,
        max_tokens: maxTokens,
        temperature: resolveTemperature(request.temperature),
        tools: tools.length > 0 ? tools : undefined,
    }
}

/**
 * Extracts system instruction from message collection.
 *
 * @param messages Shared message list.
 * @returns System instruction when available.
 */
function extractSystemMessage(messages: readonly IMessageDTO[]): string | undefined {
    for (const message of messages) {
        if (message.role === MESSAGE_ROLE.SYSTEM) {
            return normalizeContent(message.content)
        }
    }

    return undefined
}

/**
 * Converts shared messages to Anthropic-compatible list.
 *
 * @param messages Shared message list.
 * @returns Anthropic messages.
 */
function toAnthropicMessages(messages: readonly IMessageDTO[]): readonly IAnthropicMessage[] {
    const result: IAnthropicMessage[] = []

    for (const message of messages) {
        if (message.role === MESSAGE_ROLE.SYSTEM || message.role === MESSAGE_ROLE.TOOL) {
            continue
        }

        const role: "user" | "assistant" =
            message.role === MESSAGE_ROLE.ASSISTANT ? "assistant" : "user"

        result.push({
            role,
            content: [
                {
                    type: "text",
                    text: normalizeContent(message.content),
                },
            ],
        })
    }

    return result
}

/**
 * Converts shared tool definitions to OpenAI payload format.
 *
 * @param tools Shared tool definitions.
 * @returns OpenAI-formatted tools.
 */
function toOpenAiTools(tools: readonly IToolDefinitionDTO[] | undefined): readonly IOpenAiTool[] {
    if (tools === undefined) {
        return []
    }

    return tools.map((tool) => {
        return {
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }
    })
}

/**
 * Converts shared tool definitions to Anthropic payload format.
 *
 * @param tools Shared tool definitions.
 * @returns Anthropic-formatted tools.
 */
function toAnthropicTools(tools: readonly IToolDefinitionDTO[] | undefined): readonly IAnthropicTool[] {
    if (tools === undefined) {
        return []
    }

    return tools.map((tool) => {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters,
        }
    })
}

/**
 * Normalizes shared messages for OpenAI request.
 *
 * @param messages Shared message list.
 * @returns Normalized message list.
 */
function normalizeMessages(messages: readonly IMessageDTO[]): readonly IMessageDTO[] {
    return messages.map((message) => {
        return {
            role: message.role,
            content: normalizeContent(message.content),
            name: message.name,
            toolCallId: message.toolCallId,
        }
    })
}

/**
 * Resolves final model name with provider-specific fallback.
 *
 * @param provider Target provider.
 * @param model Requested model.
 * @param options Request options.
 * @returns Model identifier.
 */
function resolveModel(
    provider: LlmAclProvider,
    model: string,
    options: ILlmAclRequestNormalizationOptions,
): string {
    const trimmed = model.trim()
    if (trimmed.length > 0) {
        return trimmed
    }

    const fallbackModel = options.fallbackModelByProvider?.[provider]
    if (fallbackModel !== undefined && fallbackModel.trim().length > 0) {
        return fallbackModel.trim()
    }

    return DEFAULT_PROVIDER_MODEL[provider]
}

/**
 * Normalizes optional temperature value.
 *
 * @param temperature Raw temperature.
 * @returns Bounded temperature or undefined.
 */
function resolveTemperature(temperature: number | undefined): number | undefined {
    if (temperature === undefined || Number.isFinite(temperature) === false) {
        return undefined
    }

    if (temperature < 0) {
        return 0
    }

    if (temperature > 2) {
        return 2
    }

    return temperature
}

/**
 * Normalizes optional max tokens for OpenAI-like payload.
 *
 * @param maxTokens Raw max token value.
 * @returns Normalized max token value.
 */
function resolveMaxTokens(maxTokens: number | undefined): number | undefined {
    if (maxTokens === undefined || Number.isFinite(maxTokens) === false) {
        return undefined
    }

    if (maxTokens <= 0) {
        return undefined
    }

    return Math.trunc(maxTokens)
}

/**
 * Normalizes max token value for Anthropic payload.
 *
 * @param maxTokens Raw max token value.
 * @param options Request options.
 * @returns Positive max token value.
 */
function resolveAnthropicMaxTokens(
    maxTokens: number | undefined,
    options: ILlmAclRequestNormalizationOptions,
): number {
    const normalized = resolveMaxTokens(maxTokens)
    if (normalized !== undefined) {
        return normalized
    }

    const configured = options.anthropicDefaultMaxTokens
    if (configured !== undefined && Number.isFinite(configured) && configured > 0) {
        return Math.trunc(configured)
    }

    return DEFAULT_ANTHROPIC_MAX_TOKENS
}

/**
 * Normalizes free-form content.
 *
 * @param content Raw content.
 * @returns Trimmed content.
 */
function normalizeContent(content: string): string {
    return content.trim()
}

/**
 * Converts shared response format DTO to OpenAI payload shape.
 *
 * @param responseFormat Shared response format DTO.
 * @returns OpenAI-formatted response format.
 */
function toOpenAiResponseFormat(
    responseFormat: IChatResponseFormatDTO | undefined,
): IOpenAiResponseFormat | undefined {
    if (responseFormat === undefined) {
        return undefined
    }

    if (responseFormat.type === CHAT_RESPONSE_FORMAT.TEXT) {
        return {
            type: "text",
        }
    }

    if (responseFormat.type === CHAT_RESPONSE_FORMAT.JSON_OBJECT) {
        return {
            type: "json_object",
        }
    }

    return {
        type: "json_schema",
        json_schema: {
            name: responseFormat.name.trim(),
            schema: responseFormat.schema,
            description: responseFormat.description?.trim(),
            strict: responseFormat.strict,
        },
    }
}
