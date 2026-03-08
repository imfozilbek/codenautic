import {
    type ChatFinishReason,
    type IChatResponseDTO,
    type IToolCallDTO,
    type ITokenUsageDTO,
} from "@codenautic/core"

import {
    type ILlmAclNormalizedResponse,
    type ILlmAclPricing,
    type ILlmAclResponseNormalizationOptions,
    LLM_ACL_PROVIDER,
    type LlmAclProvider,
} from "./llm-acl.types"

const EMPTY_RECORD: Readonly<Record<string, unknown>> = {}

/**
 * Normalizes provider response payload to shared domain DTO and cost metadata.
 *
 * @param provider Source provider kind.
 * @param payload Raw provider response.
 * @param options Response normalization options.
 * @returns Normalized response with cost estimation.
 */
export function normalizeLlmProviderResponse(
    provider: LlmAclProvider,
    payload: unknown,
    options: ILlmAclResponseNormalizationOptions = {},
): ILlmAclNormalizedResponse {
    if (provider === LLM_ACL_PROVIDER.OPENAI) {
        return normalizeOpenAiResponse(payload, options)
    }

    return normalizeAnthropicResponse(payload, options)
}

/**
 * Normalizes OpenAI-like payload.
 *
 * @param payload Raw payload.
 * @param options Normalization options.
 * @returns Normalized response.
 */
function normalizeOpenAiResponse(
    payload: unknown,
    options: ILlmAclResponseNormalizationOptions,
): ILlmAclNormalizedResponse {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const choices = toArray(root["choices"])
    const firstChoice = toRecord(choices[0]) ?? EMPTY_RECORD
    const message = toRecord(firstChoice["message"]) ?? EMPTY_RECORD
    const usageRecord = toRecord(root["usage"])

    const content = readString(message, ["content"], readString(root, ["output_text"], ""))
    const toolCalls = mapOpenAiToolCalls(message["tool_calls"])
    const usage = normalizeUsage(
        readNumber(usageRecord, ["prompt_tokens"]),
        readNumber(usageRecord, ["completion_tokens"]),
        readNumber(usageRecord, ["total_tokens"]),
    )
    const finishReason = readFinishReason(firstChoice["finish_reason"])

    const estimatedCostUsd = resolveCost(
        LLM_ACL_PROVIDER.OPENAI,
        root,
        usageRecord,
        usage,
        options.pricingByProvider?.[LLM_ACL_PROVIDER.OPENAI],
    )

    return {
        response: buildChatResponse(content, toolCalls, usage, finishReason),
        estimatedCostUsd,
    }
}

/**
 * Normalizes Anthropic-like payload.
 *
 * @param payload Raw payload.
 * @param options Normalization options.
 * @returns Normalized response.
 */
function normalizeAnthropicResponse(
    payload: unknown,
    options: ILlmAclResponseNormalizationOptions,
): ILlmAclNormalizedResponse {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const blocks = toArray(root["content"])
    const usageRecord = toRecord(root["usage"])

    const content = extractAnthropicContent(blocks, readString(root, ["completion"], ""))
    const toolCalls = mapAnthropicToolCalls(blocks)
    const usage = normalizeUsage(
        readNumber(usageRecord, ["input_tokens"]),
        readNumber(usageRecord, ["output_tokens"]),
        readNumber(usageRecord, ["total_tokens"]),
    )
    const finishReason = readFinishReason(root["stop_reason"])

    const estimatedCostUsd = resolveCost(
        LLM_ACL_PROVIDER.ANTHROPIC,
        root,
        usageRecord,
        usage,
        options.pricingByProvider?.[LLM_ACL_PROVIDER.ANTHROPIC],
    )

    return {
        response: buildChatResponse(content, toolCalls, usage, finishReason),
        estimatedCostUsd,
    }
}

/**
 * Maps OpenAI tool call array into shared DTO list.
 *
 * @param rawToolCalls Raw tool call value.
 * @returns Shared tool call DTO list.
 */
function mapOpenAiToolCalls(rawToolCalls: unknown): readonly IToolCallDTO[] {
    const toolCalls: IToolCallDTO[] = []

    for (const entry of toArray(rawToolCalls)) {
        const record = toRecord(entry) ?? EMPTY_RECORD
        const functionRecord = toRecord(record["function"]) ?? EMPTY_RECORD

        const id = readString(record, ["id"], "")
        const name = readString(functionRecord, ["name"], readString(record, ["name"], ""))
        const argumentsText = readString(functionRecord, ["arguments"], "{}")

        toolCalls.push({
            id,
            name,
            arguments: argumentsText,
        })
    }

    return toolCalls
}

/**
 * Maps Anthropic content blocks with tool use data.
 *
 * @param rawBlocks Raw content block array.
 * @returns Shared tool call DTO list.
 */
function mapAnthropicToolCalls(rawBlocks: readonly unknown[]): readonly IToolCallDTO[] {
    const toolCalls: IToolCallDTO[] = []

    for (const entry of rawBlocks) {
        const record = toRecord(entry)
        if (record?.["type"] !== "tool_use") {
            continue
        }

        const input = toRecord(record["input"]) ?? EMPTY_RECORD
        toolCalls.push({
            id: readString(record, ["id"], ""),
            name: readString(record, ["name"], ""),
            arguments: JSON.stringify(input),
        })
    }

    return toolCalls
}

/**
 * Extracts human-readable text from Anthropic content blocks.
 *
 * @param rawBlocks Raw content block array.
 * @param fallback Fallback text.
 * @returns Joined text content.
 */
function extractAnthropicContent(rawBlocks: readonly unknown[], fallback: string): string {
    const parts: string[] = []

    for (const entry of rawBlocks) {
        const record = toRecord(entry)
        if (record?.["type"] !== "text") {
            continue
        }

        const text = readString(record, ["text"], "")
        if (text.length > 0) {
            parts.push(text)
        }
    }

    if (parts.length > 0) {
        return parts.join("\n")
    }

    return fallback
}

/**
 * Normalizes token usage data.
 *
 * @param input Input token count.
 * @param output Output token count.
 * @param total Total token count.
 * @returns Shared usage DTO.
 */
function normalizeUsage(
    input: number | undefined,
    output: number | undefined,
    total: number | undefined,
): ITokenUsageDTO {
    const normalizedInput = input ?? 0
    const normalizedOutput = output ?? 0

    return {
        input: normalizedInput,
        output: normalizedOutput,
        total: total ?? normalizedInput + normalizedOutput,
    }
}

/**
 * Resolves cost value from explicit fields or pricing fallback.
 *
 * @param provider Provider kind.
 * @param root Response root record.
 * @param usageRecord Usage record.
 * @param usage Normalized usage DTO.
 * @param pricing Optional pricing profile.
 * @returns Estimated USD cost.
 */
function resolveCost(
    _provider: LlmAclProvider,
    root: Readonly<Record<string, unknown>>,
    usageRecord: Readonly<Record<string, unknown>> | null,
    usage: ITokenUsageDTO,
    pricing: ILlmAclPricing | undefined,
): number {
    const explicit = resolveExplicitCost(root, usageRecord)
    if (explicit !== undefined) {
        return explicit
    }

    if (pricing === undefined) {
        return 0
    }

    return estimateCost(usage, pricing)
}

/**
 * Resolves explicit provider-reported cost field.
 *
 * @param root Root payload record.
 * @param usageRecord Usage payload record.
 * @returns Explicit cost value.
 */
function resolveExplicitCost(
    root: Readonly<Record<string, unknown>>,
    usageRecord: Readonly<Record<string, unknown>> | null,
): number | undefined {
    const rootCost = readNumber(root, ["costUsd", "cost_usd"])
    if (rootCost !== undefined) {
        return rootCost
    }

    return readNumber(usageRecord, ["cost_usd", "costUsd"])
}

/**
 * Estimates cost from token usage and pricing profile.
 *
 * @param provider Provider kind.
 * @param usage Normalized usage DTO.
 * @param pricing Pricing profile.
 * @returns Estimated cost rounded to 6 decimals.
 */
function estimateCost(usage: ITokenUsageDTO, pricing: ILlmAclPricing): number {
    const inputCost = (usage.input / 1000) * pricing.inputPer1kUsd
    const outputCost = (usage.output / 1000) * pricing.outputPer1kUsd
    return roundToSix(inputCost + outputCost)
}

/**
 * Builds shared chat response payload.
 *
 * @param content Normalized message content.
 * @param toolCalls Normalized tool calls.
 * @param usage Normalized usage payload.
 * @returns Shared chat response DTO.
 */
function buildChatResponse(
    content: string,
    toolCalls: readonly IToolCallDTO[],
    usage: ITokenUsageDTO,
    finishReason: ChatFinishReason | undefined,
): IChatResponseDTO {
    if (toolCalls.length === 0) {
        return {
            content,
            usage,
            finishReason,
        }
    }

    return {
        content,
        toolCalls,
        usage,
        finishReason,
    }
}

/**
 * Normalizes provider finish reason field.
 *
 * @param value Raw finish reason value.
 * @returns Normalized finish reason or undefined.
 */
function readFinishReason(value: unknown): ChatFinishReason | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    return normalized
}

/**
 * Rounds number to 6 fraction digits.
 *
 * @param value Source number.
 * @returns Rounded number.
 */
function roundToSix(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000
}

/**
 * Converts unknown to plain record.
 *
 * @param value Unknown value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Converts unknown to readonly array.
 *
 * @param value Unknown value.
 * @returns Array or empty list.
 */
function toArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

/**
 * Reads string field by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Normalized string.
 */
function readString(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = source?.[key]
        if (typeof value === "string") {
            return value.trim()
        }
    }

    return fallback
}

/**
 * Reads number field by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @returns Finite number when available.
 */
function readNumber(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
): number | undefined {
    for (const key of keys) {
        const value = source?.[key]

        if (typeof value === "number" && Number.isFinite(value)) {
            return value
        }

        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = Number.parseFloat(value)
            if (Number.isFinite(parsed)) {
                return parsed
            }
        }
    }

    return undefined
}
