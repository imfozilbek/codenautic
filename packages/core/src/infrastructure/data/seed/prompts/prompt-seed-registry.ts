import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
} from "../../../../domain/entities/prompt-template.entity"

/**
 * Prompt category used by seed payloads.
 */
export type PromptCategory = PromptTemplateCategory

/**
 * Prompt type used by seed payloads.
 */
export type PromptType = PromptTemplateType

/**
 * Prompt template seed payload used by migrations and bootstrap scripts.
 */
export interface IPromptSeedData {
    readonly name: string
    readonly category: PromptCategory
    readonly type: PromptType
    readonly content: string
    readonly variables: readonly string[]
}

/**
 * Canonical prompt template registry used by seed pipeline.
 */
export const PROMPT_SEED_REGISTRY: readonly IPromptSeedData[] = definePromptSeedRegistry([])

/**
 * Defines immutable prompt seed registry with normalization and guardrails.
 *
 * @param entries Raw seed entries.
 * @returns Frozen seed entries safe for import pipeline usage.
 */
export function definePromptSeedRegistry(entries: readonly IPromptSeedData[]): readonly IPromptSeedData[] {
    const uniqueEntryKeys = new Set<string>()
    const normalizedEntries = entries.map((entry) => normalizeEntry(entry, uniqueEntryKeys))
    return Object.freeze(normalizedEntries)
}

/**
 * Normalizes one prompt seed entry and validates uniqueness.
 *
 * @param entry Raw seed entry.
 * @param uniqueEntryKeys Deduplication store by name/category/type.
 * @returns Normalized immutable entry.
 */
function normalizeEntry(entry: IPromptSeedData, uniqueEntryKeys: Set<string>): IPromptSeedData {
    const name = normalizeRequiredText(entry.name, "Prompt seed name cannot be empty")
    const category = normalizeCategory(entry.category)
    const type = normalizeType(entry.type)
    const content = normalizeRequiredText(entry.content, "Prompt seed content cannot be empty")
    const variables = normalizeVariables(entry.variables)
    const uniqueKey = `${name.toLowerCase()}::${category}::${type}`

    if (uniqueEntryKeys.has(uniqueKey)) {
        throw new Error(`Duplicate prompt seed registry entry: ${name} (${category}/${type})`)
    }

    uniqueEntryKeys.add(uniqueKey)

    return Object.freeze({
        name,
        category,
        type,
        content,
        variables,
    })
}

/**
 * Normalizes required string field.
 *
 * @param value Raw text value.
 * @param errorMessage Validation error message.
 * @returns Trimmed non-empty value.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalizedValue = value.trim()
    if (normalizedValue.length === 0) {
        throw new Error(errorMessage)
    }

    return normalizedValue
}

/**
 * Validates prompt category against domain-level constants.
 *
 * @param value Raw category.
 * @returns Normalized category.
 */
function normalizeCategory(value: string): PromptCategory {
    const normalizedValue = value.trim().toLowerCase()
    if (
        Object.values(PROMPT_TEMPLATE_CATEGORY).includes(normalizedValue as PromptTemplateCategory) === false
    ) {
        throw new Error(`Unknown prompt seed category: ${value}`)
    }

    return normalizedValue as PromptCategory
}

/**
 * Validates prompt type against domain-level constants.
 *
 * @param value Raw type.
 * @returns Normalized type.
 */
function normalizeType(value: string): PromptType {
    const normalizedValue = value.trim().toLowerCase()
    if (Object.values(PROMPT_TEMPLATE_TYPE).includes(normalizedValue as PromptTemplateType) === false) {
        throw new Error(`Unknown prompt seed type: ${value}`)
    }

    return normalizedValue as PromptType
}

/**
 * Normalizes and deduplicates variable names preserving original order.
 *
 * @param values Raw variable names.
 * @returns Frozen normalized variable names.
 */
function normalizeVariables(values: readonly string[]): readonly string[] {
    const uniqueVariables = new Set<string>()
    const normalizedVariables: string[] = []
    for (const value of values) {
        const normalizedValue = normalizeRequiredText(
            value,
            "Prompt seed variable name cannot be empty",
        )
        if (uniqueVariables.has(normalizedValue) === true) {
            continue
        }

        uniqueVariables.add(normalizedValue)
        normalizedVariables.push(normalizedValue)
    }

    return Object.freeze(normalizedVariables)
}
