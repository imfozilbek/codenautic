/**
 * Rule category config payload item.
 */
export interface IRuleCategoryConfigData {
    readonly slug: string
    readonly name: string
    readonly description: string
    readonly weight: number
}

/**
 * Rule category config item alias for import payloads.
 */
export type IConfigRuleCategoryItem = IRuleCategoryConfigData

/**
 * Parses rule category config payload.
 *
 * @param value Raw payload.
 * @returns Normalized category items or undefined when invalid.
 */
export function parseRuleCategoryConfigList(
    value: unknown,
): readonly IRuleCategoryConfigData[] | undefined {
    const root = readObject(value)
    if (root === undefined) {
        return undefined
    }

    const items = root["items"]
    if (!Array.isArray(items)) {
        return undefined
    }

    const seenSlugs = new Set<string>()
    const normalized: IRuleCategoryConfigData[] = []

    for (const item of items) {
        const parsed = parseRuleCategoryItem(item)
        if (parsed === undefined) {
            return undefined
        }

        const slugKey = parsed.slug.toLowerCase()
        if (seenSlugs.has(slugKey)) {
            return undefined
        }

        seenSlugs.add(slugKey)
        normalized.push(parsed)
    }

    return Object.freeze(normalized)
}

/**
 * Parses one rule category item.
 *
 * @param value Raw item value.
 * @returns Parsed item or undefined.
 */
function parseRuleCategoryItem(value: unknown): IRuleCategoryConfigData | undefined {
    const raw = readObject(value) ?? {}

    const slug = normalizeSlug(raw["slug"])
    const name = readNonEmptyText(raw["name"])
    const description = readNonEmptyText(raw["description"])
    const weight = readWeight(raw["weight"])
    if (slug === undefined || name === undefined || description === undefined || weight === undefined) {
        return undefined
    }

    return {
        slug,
        name,
        description,
        weight,
    }
}

/**
 * Normalizes slug and validates kebab-case format.
 *
 * @param value Raw slug value.
 * @returns Normalized slug or undefined.
 */
function normalizeSlug(value: unknown): string | undefined {
    const raw = readNonEmptyText(value)
    return raw !== undefined && RULE_CATEGORY_SLUG_PATTERN.test(raw) ? raw : undefined
}

/**
 * Reads non-empty text value.
 *
 * @param value Raw value.
 * @returns Trimmed string or undefined.
 */
function readNonEmptyText(value: unknown): string | undefined {
    const normalized = typeof value === "string" ? value.trim() : ""
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Reads optional non-negative weight value.
 *
 * @param value Raw value.
 * @returns Weight value or undefined when invalid.
 */
function readWeight(value: unknown): number | undefined {
    if (value === undefined) {
        return 0
    }

    if (typeof value !== "number" || Number.isFinite(value) === false || value < 0) {
        return undefined
    }

    return value
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

/**
 * Valid kebab-case rule slug.
 */
const RULE_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
