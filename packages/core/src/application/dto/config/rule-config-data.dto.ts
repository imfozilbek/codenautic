/**
 * Example payload for library rule config.
 */
export interface IRuleConfigExampleData {
    readonly snippet: string
    readonly isCorrect: boolean
}

/**
 * Library rule config payload item.
 */
export interface IRuleConfigData {
    readonly uuid: string
    readonly title: string
    readonly rule: string
    readonly whyIsThisImportant: string
    readonly severity: string
    readonly examples: readonly IRuleConfigExampleData[]
    readonly language: string
    readonly buckets: readonly string[]
    readonly scope: LibraryRuleScope
    readonly plugAndPlay: boolean
}

/**
 * Library rule config item alias for import payloads.
 */
export type IConfigLibraryRuleItem = IRuleConfigData

/**
 * Parses rule config payload list.
 *
 * @param value Raw settings payload.
 * @returns Parsed rules or undefined when invalid.
 */
export function parseRuleConfigList(value: unknown): readonly IRuleConfigData[] | undefined {
    const root = readObject(value)
    if (root === undefined) {
        return undefined
    }

    const items = root["items"]
    if (Array.isArray(items) === false) {
        return undefined
    }

    const seen = new Set<string>()
    const parsed: IRuleConfigData[] = []

    for (const item of items) {
        const rule = parseRuleItem(item)
        if (rule === undefined) {
            return undefined
        }

        const key = rule.uuid.toLowerCase()
        if (seen.has(key)) {
            return undefined
        }

        seen.add(key)
        parsed.push(rule)
    }

    return Object.freeze(parsed)
}

/**
 * Parses one rule config item.
 *
 * @param value Raw item payload.
 * @returns Parsed rule or undefined.
 */
function parseRuleItem(value: unknown): IRuleConfigData | undefined {
    const raw = readObject(value)
    if (raw === undefined) {
        return undefined
    }

    const textFields = parseRuleTextFields(raw)
    if (textFields === undefined) {
        return undefined
    }

    const examples = parseExamples(raw["examples"])
    const buckets = parseBuckets(raw["buckets"])
    const ruleOptions = parseRuleOptions(raw)

    if (examples === undefined || buckets === undefined || ruleOptions === undefined) {
        return undefined
    }

    return {
        uuid: textFields.uuid,
        title: textFields.title,
        rule: textFields.rule,
        whyIsThisImportant: textFields.whyIsThisImportant,
        severity: textFields.severity,
        examples,
        language: ruleOptions.language,
        buckets,
        scope: ruleOptions.scope,
        plugAndPlay: ruleOptions.plugAndPlay,
    }
}

/**
 * Parses rule examples list.
 *
 * @param value Raw examples payload.
 * @returns Parsed examples or undefined.
 */
function parseExamples(value: unknown): readonly IRuleConfigExampleData[] | undefined {
    if (Array.isArray(value) === false) {
        return undefined
    }

    const normalized: IRuleConfigExampleData[] = []
    for (const entry of value) {
        const parsed = parseExample(entry)
        if (parsed === undefined) {
            return undefined
        }

        normalized.push(parsed)
    }

    return Object.freeze(normalized)
}

/**
 * Parses single rule example.
 *
 * @param value Raw example payload.
 * @returns Parsed example or undefined.
 */
function parseExample(value: unknown): IRuleConfigExampleData | undefined {
    const raw = readObject(value)
    if (raw === undefined) {
        return undefined
    }

    const snippet = readNonEmptyText(raw["snippet"])
    const isCorrect = readBoolean(raw["isCorrect"])

    if (snippet === undefined || isCorrect === undefined) {
        return undefined
    }

    return {
        snippet,
        isCorrect,
    }
}

/**
 * Parses bucket list.
 *
 * @param value Raw buckets payload.
 * @returns Parsed buckets or undefined.
 */
function parseBuckets(value: unknown): readonly string[] | undefined {
    if (Array.isArray(value) === false) {
        return undefined
    }

    const normalized: string[] = []
    const seen = new Set<string>()

    for (const entry of value) {
        const bucket = readNonEmptyText(entry)
        if (bucket === undefined) {
            return undefined
        }

        if (seen.has(bucket) === false) {
            seen.add(bucket)
            normalized.push(bucket)
        }
    }

    if (normalized.length === 0) {
        return undefined
    }

    return Object.freeze(normalized)
}

/**
 * Parses core text fields for rule.
 *
 * @param raw Raw rule object.
 * @returns Parsed text fields or undefined.
 */
function parseRuleTextFields(
    raw: Record<string, unknown>,
): {
    readonly uuid: string
    readonly title: string
    readonly rule: string
    readonly whyIsThisImportant: string
    readonly severity: string
} | undefined {
    const uuid = readNonEmptyText(raw["uuid"])
    const title = readNonEmptyText(raw["title"])
    const rule = readNonEmptyText(raw["rule"])
    const whyIsThisImportant = readNonEmptyText(raw["whyIsThisImportant"])
    const severity = readNonEmptyText(raw["severity"])

    if (
        uuid === undefined
        || title === undefined
        || rule === undefined
        || whyIsThisImportant === undefined
        || severity === undefined
    ) {
        return undefined
    }

    return {
        uuid,
        title,
        rule,
        whyIsThisImportant,
        severity,
    }
}

/**
 * Parses language/scope options for rule.
 *
 * @param raw Raw rule object.
 * @returns Parsed options or undefined.
 */
function parseRuleOptions(
    raw: Record<string, unknown>,
): {readonly language: string; readonly scope: LibraryRuleScope; readonly plugAndPlay: boolean} | undefined {
    const language = normalizeLanguage(raw["language"])
    const scope = normalizeScope(raw["scope"])
    const plugAndPlay = readBoolean(raw["plugAndPlay"])

    if (language === undefined || scope === undefined || plugAndPlay === undefined) {
        return undefined
    }

    return {
        language,
        scope,
        plugAndPlay,
    }
}

/**
 * Normalizes language payload.
 *
 * @param value Raw language value.
 * @returns Normalized language or undefined.
 */
function normalizeLanguage(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return "*"
    }

    if (normalized === "*") {
        return normalized
    }

    return normalized.toLowerCase()
}

/**
 * Normalizes rule scope payload.
 *
 * @param value Raw scope value.
 * @returns Normalized scope or undefined.
 */
function normalizeScope(value: unknown): LibraryRuleScope | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    const normalizedToken = normalized.replace(/[\s-]+/g, "_").toUpperCase()
    if (normalizedToken === "FILE") {
        return "FILE"
    }

    if (normalizedToken === "PULL_REQUEST" || normalizedToken === "CCR") {
        return "PULL_REQUEST"
    }

    return undefined
}

/**
 * Reads non-empty text value.
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
 * Reads boolean value.
 *
 * @param value Raw value.
 * @returns Boolean when value is boolean.
 */
function readBoolean(value: unknown): boolean | undefined {
    if (typeof value !== "boolean") {
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
import type {LibraryRuleScope} from "../../../domain/entities/library-rule.entity"
