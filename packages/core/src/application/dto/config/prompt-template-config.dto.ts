import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
} from "../../../domain/entities/prompt-template.entity"

/**
 * Prompt template config payload item.
 */
export interface IPromptTemplateConfigData {
    readonly name: string
    readonly category: PromptTemplateCategory
    readonly type: PromptTemplateType
    readonly content: string
    readonly variables: readonly string[]
}

/**
 * Prompt template config item alias for import payloads.
 */
export type IConfigPromptTemplateItem = IPromptTemplateConfigData

/**
 * Parses prompt template config payload list.
 *
 * @param value Raw payload.
 * @returns Parsed templates or undefined when invalid.
 */
export function parsePromptTemplateConfigList(
    value: unknown,
): readonly IPromptTemplateConfigData[] | undefined {
    const root = readObject(value)
    if (root === undefined) {
        return undefined
    }

    const items = root["items"]
    if (Array.isArray(items) === false) {
        return undefined
    }

    const normalized: IPromptTemplateConfigData[] = []
    const seen = new Set<string>()

    for (const entry of items) {
        const parsed = parsePromptTemplateItem(entry)
        if (parsed === undefined) {
            return undefined
        }

        const key = parsed.name.toLowerCase()
        if (seen.has(key)) {
            return undefined
        }

        seen.add(key)
        normalized.push(parsed)
    }

    return Object.freeze(normalized)
}

/**
 * Parses prompt template item.
 *
 * @param value Raw item payload.
 * @returns Parsed template item or undefined.
 */
function parsePromptTemplateItem(value: unknown): IPromptTemplateConfigData | undefined {
    const raw = readObject(value)
    if (raw === undefined) {
        return undefined
    }

    const name = readNonEmptyText(raw["name"])
    const category = normalizeCategory(raw["category"])
    const type = normalizeType(raw["type"])
    const content = readNonEmptyText(raw["content"])
    const variables = parseVariables(raw["variables"])

    if (
        name === undefined
        || category === undefined
        || type === undefined
        || content === undefined
        || variables === undefined
    ) {
        return undefined
    }

    return {
        name,
        category,
        type,
        content,
        variables,
    }
}

/**
 * Normalizes category value.
 *
 * @param value Raw value.
 * @returns Normalized category or undefined.
 */
function normalizeCategory(value: unknown): PromptTemplateCategory | undefined {
    const raw = readNonEmptyText(value)
    if (raw === undefined) {
        return undefined
    }

    const normalized = raw.toLowerCase()
    if (
        Object.values(PROMPT_TEMPLATE_CATEGORY).includes(
            normalized as PromptTemplateCategory,
        ) === false
    ) {
        return undefined
    }

    return normalized as PromptTemplateCategory
}

/**
 * Normalizes type value.
 *
 * @param value Raw value.
 * @returns Normalized type or undefined.
 */
function normalizeType(value: unknown): PromptTemplateType | undefined {
    const raw = readNonEmptyText(value)
    if (raw === undefined) {
        return undefined
    }

    const normalized = raw.toLowerCase()
    if (
        Object.values(PROMPT_TEMPLATE_TYPE).includes(
            normalized as PromptTemplateType,
        ) === false
    ) {
        return undefined
    }

    return normalized as PromptTemplateType
}

/**
 * Parses variables list.
 *
 * @param value Raw variables payload.
 * @returns Normalized variables list.
 */
function parseVariables(value: unknown): readonly string[] | undefined {
    if (value === undefined) {
        return Object.freeze([])
    }

    if (Array.isArray(value) === false) {
        return undefined
    }

    const normalized: string[] = []
    const seen = new Set<string>()

    for (const entry of value) {
        const variable = readNonEmptyText(entry)
        if (variable === undefined) {
            return undefined
        }

        if (seen.has(variable) === false) {
            seen.add(variable)
            normalized.push(variable)
        }
    }

    return Object.freeze(normalized)
}

/**
 * Reads non-empty text.
 *
 * @param value Raw value.
 * @returns Trimmed string or undefined.
 */
function readNonEmptyText(value: unknown): string | undefined {
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
 * Reads record from raw value.
 *
 * @param value Raw value.
 * @returns Record when value is plain object.
 */
function readObject(value: unknown): Record<string, unknown> | undefined {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined
    }

    return value as Record<string, unknown>
}
