import {LibraryRule} from "../entities/library-rule.entity"

/**
 * Serializable rule example payload for prompt context.
 */
export interface IRuleContextExample {
    /**
     * Example snippet.
     */
    readonly snippet: string

    /**
     * Whether example is correct.
     */
    readonly isCorrect: boolean
}

/**
 * Rule payload used for prompt injection.
 */
export interface IRuleContextItem {
    /**
     * Human-readable rule title.
     */
    readonly title: string

    /**
     * Rule instruction text.
     */
    readonly rule: string

    /**
     * Severity level string.
     */
    readonly severity: string

    /**
     * Example fixtures for the rule.
     */
    readonly examples: readonly IRuleContextExample[]
}

/**
 * Formats library rules for prompt context injection.
 */
export class RuleContextFormatterService {
    /**
     * Creates formatter service instance.
     */
    public constructor() {}

    /**
     * Formats rules as JSON array string for prompt injection.
     *
     * @param rules Library rules to format.
     * @returns JSON array string with rule context entries.
     */
    public formatForPrompt(rules: readonly LibraryRule[]): string {
        const normalizedRules = normalizeRules(rules)
        const payload = normalizedRules.map((rule) => {
            return toRuleContextItem(rule)
        })

        return JSON.stringify(payload)
    }

    /**
     * Formats rules for a given bucket category as JSON array string.
     *
     * @param rules Library rules to filter.
     * @param category Bucket slug to match.
     * @returns JSON array string for category-specific rules.
     */
    public formatCategorySection(
        rules: readonly LibraryRule[],
        category: string,
    ): string {
        const normalizedCategory = normalizeCategory(category)
        const normalizedRules = normalizeRules(rules)
        const filtered = normalizedRules.filter((rule) => {
            return matchesCategory(rule, normalizedCategory)
        })
        const payload = filtered.map((rule) => {
            return toRuleContextItem(rule)
        })

        return JSON.stringify(payload)
    }
}

/**
 * Normalizes and validates rule collection.
 *
 * @param rules Candidate rules list.
 * @returns Validated rules list.
 */
function normalizeRules(rules: readonly LibraryRule[]): readonly LibraryRule[] {
    if (Array.isArray(rules) === false) {
        throw new Error("Rules must be an array")
    }

    const normalized: LibraryRule[] = []
    for (const rule of rules) {
        if (rule instanceof LibraryRule === false) {
            throw new Error("Rules must contain LibraryRule entities")
        }

        normalized.push(rule)
    }

    return normalized
}

/**
 * Normalizes category name.
 *
 * @param category Raw category slug.
 * @returns Normalized lowercase slug.
 */
function normalizeCategory(category: string): string {
    if (typeof category !== "string") {
        throw new Error("Category must be a non-empty string")
    }

    const normalized = category.trim()
    if (normalized.length === 0) {
        throw new Error("Category must be a non-empty string")
    }

    return normalized.toLowerCase()
}

/**
 * Checks if rule belongs to category bucket.
 *
 * @param rule Library rule.
 * @param category Normalized category slug.
 * @returns True when rule matches category.
 */
function matchesCategory(rule: LibraryRule, category: string): boolean {
    return rule.buckets.some((bucket) => bucket.trim().toLowerCase() === category)
}

/**
 * Converts rule entity to prompt context payload.
 *
 * @param rule Library rule.
 * @returns Serializable rule context item.
 */
function toRuleContextItem(rule: LibraryRule): IRuleContextItem {
    return {
        title: rule.title,
        rule: rule.rule,
        severity: rule.severity.toString(),
        examples: rule.examples.map((example) => {
            return {
                snippet: example.snippet,
                isCorrect: example.isCorrect,
            }
        }),
    }
}
