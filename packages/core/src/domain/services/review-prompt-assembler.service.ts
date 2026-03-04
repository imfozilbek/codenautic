/**
 * Category descriptions for review prompts.
 */
export interface IReviewPromptCategoryDescriptions {
    /**
     * Bug category description.
     */
    readonly bug?: string

    /**
     * Performance category description.
     */
    readonly performance?: string

    /**
     * Security category description.
     */
    readonly security?: string
}

/**
 * Severity flag descriptions for review prompts.
 */
export interface IReviewPromptSeverityFlags {
    /**
     * Critical severity description.
     */
    readonly critical?: string

    /**
     * High severity description.
     */
    readonly high?: string

    /**
     * Medium severity description.
     */
    readonly medium?: string

    /**
     * Low severity description.
     */
    readonly low?: string
}

/**
 * Generation instructions for review prompts.
 */
export interface IReviewPromptGenerationInstructions {
    /**
     * Primary generation guidance.
     */
    readonly main?: string
}

/**
 * Rule context payload for review prompts.
 */
export interface IReviewPromptRuleContext {
    /**
     * JSON rule context string.
     */
    readonly context?: string
}

const CATEGORY_LABELS = {
    bug: "Bug",
    performance: "Performance",
    security: "Security",
} as const

const SEVERITY_LABELS = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
} as const

/**
 * Structured prompt sections used for review prompt assembly.
 */
export interface IReviewPromptSections {
    /**
     * Category descriptions section.
     */
    readonly categories?: IReviewPromptCategoryDescriptions

    /**
     * Severity flags section.
     */
    readonly severity?: IReviewPromptSeverityFlags

    /**
     * Generation instructions section.
     */
    readonly generation?: IReviewPromptGenerationInstructions

    /**
     * Rules context section.
     */
    readonly rules?: IReviewPromptRuleContext
}

/**
 * Assembles review prompt sections into a single markdown string.
 */
export class ReviewPromptAssemblerService {
    /**
     * Creates prompt assembler service.
     */
    public constructor() {}

    /**
     * Assembles prompt sections with overrides taking precedence.
     *
     * @param overrides Override sections (higher priority).
     * @param defaults Default sections (fallback).
     * @returns Markdown prompt string with ordered sections.
     */
    public assembleSections(
        overrides: IReviewPromptSections | undefined,
        defaults: IReviewPromptSections | undefined,
    ): string {
        const sections: string[] = []

        const categories = buildCategorySection(overrides, defaults)
        if (categories !== undefined) {
            sections.push(categories)
        }

        const severity = buildSeveritySection(overrides, defaults)
        if (severity !== undefined) {
            sections.push(severity)
        }

        const generation = buildGenerationSection(overrides, defaults)
        if (generation !== undefined) {
            sections.push(generation)
        }

        const rules = buildRulesSection(overrides, defaults)
        if (rules !== undefined) {
            sections.push(rules)
        }

        return sections.join("\n\n")
    }
}

/**
 * Builds category section.
 *
 * @param overrides Override sections.
 * @param defaults Default sections.
 * @returns Markdown section or undefined when empty.
 */
function buildCategorySection(
    overrides: IReviewPromptSections | undefined,
    defaults: IReviewPromptSections | undefined,
): string | undefined {
    return buildLabeledSection(
        "## Categories",
        buildEntries(
            CATEGORY_LABELS,
            overrides?.categories,
            defaults?.categories,
        ),
    )
}

/**
 * Builds severity section.
 *
 * @param overrides Override sections.
 * @param defaults Default sections.
 * @returns Markdown section or undefined when empty.
 */
function buildSeveritySection(
    overrides: IReviewPromptSections | undefined,
    defaults: IReviewPromptSections | undefined,
): string | undefined {
    return buildLabeledSection(
        "## Severity",
        buildEntries(
            SEVERITY_LABELS,
            overrides?.severity,
            defaults?.severity,
        ),
    )
}

/**
 * Builds generation section.
 *
 * @param overrides Override sections.
 * @param defaults Default sections.
 * @returns Markdown section or undefined when empty.
 */
function buildGenerationSection(
    overrides: IReviewPromptSections | undefined,
    defaults: IReviewPromptSections | undefined,
): string | undefined {
    const main = resolveText(
        overrides?.generation?.main,
        defaults?.generation?.main,
    )
    if (main === undefined) {
        return undefined
    }

    return ["## Generation", main].join("\n")
}

/**
 * Builds rules context section.
 *
 * @param overrides Override sections.
 * @param defaults Default sections.
 * @returns Markdown section or undefined when empty.
 */
function buildRulesSection(
    overrides: IReviewPromptSections | undefined,
    defaults: IReviewPromptSections | undefined,
): string | undefined {
    const overrideContext = overrides?.rules?.context
    const context =
        overrideContext !== undefined
            ? normalizeRuleContext(overrideContext)
            : normalizeRuleContext(defaults?.rules?.context)

    if (context === undefined) {
        return undefined
    }

    return ["## Rules", context].join("\n")
}

/**
 * Builds normalized entries list from labels and values.
 *
 * @param labels Mapping of keys to labels.
 * @param overrides Override values map.
 * @param defaults Default values map.
 * @returns Entry list for section rendering.
 */
function buildEntries<T extends string>(
    labels: Readonly<Record<T, string>>,
    overrides: Partial<Record<T, string>> | undefined,
    defaults: Partial<Record<T, string>> | undefined,
): readonly {
    readonly label: string
    readonly value: string | undefined
}[] {
    const entries: {
        readonly label: string
        readonly value: string | undefined
    }[] = []

    const overrideValues: Partial<Record<T, string>> = overrides ?? {}
    const defaultValues: Partial<Record<T, string>> = defaults ?? {}

    for (const key in labels) {
        if (Object.prototype.hasOwnProperty.call(labels, key) === false) {
            continue
        }

        const typedKey = key as T
        const label = labels[typedKey]
        const overrideValue = overrideValues[typedKey]
        const defaultValue = defaultValues[typedKey]
        const value = resolveText(overrideValue, defaultValue)
        entries.push({
            label,
            value,
        })
    }

    return entries
}

/**
 * Builds a labeled section with optional entries.
 *
 * @param title Section title.
 * @param entries Entry list with labels and values.
 * @returns Markdown section or undefined when empty.
 */
function buildLabeledSection(
    title: string,
    entries: readonly {
        readonly label: string
        readonly value: string | undefined
    }[],
): string | undefined {
    const lines: string[] = [title]
    for (const entry of entries) {
        if (entry.value === undefined) {
            continue
        }

        lines.push(`### ${entry.label}`, entry.value)
    }

    return lines.length > 1 ? lines.join("\n") : undefined
}

/**
 * Resolves override and default values with override priority.
 *
 * @param override Override value.
 * @param fallback Default value.
 * @returns Normalized text or undefined when missing.
 */
function resolveText(
    override: string | undefined,
    fallback: string | undefined,
): string | undefined {
    const normalizedOverride = normalizeOptionalText(override)
    if (normalizedOverride !== undefined) {
        return normalizedOverride
    }

    return normalizeOptionalText(fallback)
}

/**
 * Normalizes optional text field.
 *
 * @param value Raw value.
 * @returns Trimmed text or undefined when empty.
 */
function normalizeOptionalText(value: string | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return undefined
    }

    return trimmed
}

/**
 * Normalizes rules context and removes empty payloads.
 *
 * @param value Raw rules context.
 * @returns Normalized JSON string or undefined when empty.
 */
function normalizeRuleContext(value: string | undefined): string | undefined {
    const normalized = normalizeOptionalText(value)
    if (normalized === undefined || normalized === "[]") {
        return undefined
    }

    return normalized
}
