import type {ISuggestionDTO} from "../dto/review/suggestion.dto"
import {hash} from "../../shared/utils/hash"

/**
 * Supported id seed components for suggestion hashing.
 */
export type SuggestionIdComponent = "category" | "filePath" | "lineStart" | "lineEnd" | "message"

/**
 * Normalized raw suggestion fields.
 */
export interface IParsedSuggestionFields {
    readonly message: string
    readonly category: string
    readonly severity: string
    readonly committable: boolean
    readonly rankScore: number
    readonly codeBlock?: string
}

/**
 * Defaults for suggestion enrichment.
 */
export interface ISuggestionEnrichmentDefaults {
    readonly category: string
    readonly severity: string
    readonly committable: boolean
    readonly rankScore: number
}

/**
 * Options for suggestion enrichment.
 */
export interface ISuggestionEnrichmentOptions {
    readonly idPrefix: string
    readonly idComponents: readonly SuggestionIdComponent[]
    readonly defaultFilePath: string
    readonly defaultLineStart: number
    readonly defaults: ISuggestionEnrichmentDefaults
}

/**
 * Parses raw suggestion fields and applies defaults.
 *
 * @param record Raw suggestion record.
 * @param defaults Default values for optional fields.
 * @returns Parsed suggestion fields or null when message is invalid.
 */
export function parseRawSuggestionFields(
    record: Readonly<Record<string, unknown>>,
    defaults: ISuggestionEnrichmentDefaults,
): IParsedSuggestionFields | null {
    const rawMessage = record["message"]
    if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
        return null
    }

    const message = rawMessage.trim()

    return {
        message,
        category: readString(record["category"], defaults.category),
        severity: readString(record["severity"], defaults.severity),
        committable: readBoolean(record["committable"], defaults.committable),
        rankScore: readPositiveInteger(record["rankScore"], defaults.rankScore),
        codeBlock: readCodeBlock(record),
    }
}

/**
 * Resolves file path for suggestion.
 *
 * @param record Raw suggestion record.
 * @param fallback Fallback file path.
 * @returns Normalized file path.
 */
export function resolveFilePath(
    record: Readonly<Record<string, unknown>>,
    fallback: string,
): string {
    return readString(record["filePath"], fallback)
}

/**
 * Resolves line range for suggestion.
 *
 * @param record Raw suggestion record.
 * @param defaultLineStart Default line start.
 * @returns Normalized line range.
 */
export function resolveLineRange(
    record: Readonly<Record<string, unknown>>,
    defaultLineStart: number,
): {readonly lineStart: number; readonly lineEnd: number} {
    const lineStart = readPositiveInteger(record["lineStart"], defaultLineStart)
    const lineEnd = readPositiveInteger(record["lineEnd"], lineStart)

    return {lineStart, lineEnd}
}

/**
 * Enriches raw suggestion records into typed suggestion DTOs.
 *
 * @param items Candidate suggestion records.
 * @param options Enrichment options.
 * @returns Enriched suggestion list.
 */
export function enrichSuggestions(
    items: readonly unknown[],
    options: ISuggestionEnrichmentOptions,
): readonly ISuggestionDTO[] {
    const suggestions: ISuggestionDTO[] = []

    for (const item of items) {
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
            continue
        }

        const record = item as Readonly<Record<string, unknown>>
        const fields = parseRawSuggestionFields(record, options.defaults)
        if (fields === null) {
            continue
        }

        const filePath = resolveFilePath(record, options.defaultFilePath)
        const {lineStart, lineEnd} = resolveLineRange(record, options.defaultLineStart)
        const idSeed = buildIdSeed(
            fields,
            filePath,
            lineStart,
            lineEnd,
            options.idComponents,
        )

        suggestions.push({
            id: `${options.idPrefix}-${hash(idSeed)}`,
            filePath,
            lineStart,
            lineEnd,
            severity: fields.severity,
            category: fields.category,
            message: fields.message,
            codeBlock: fields.codeBlock,
            committable: fields.committable,
            rankScore: fields.rankScore,
        })
    }

    return suggestions
}

/**
 * Builds suggestion identifier seed string.
 *
 * @param fields Parsed suggestion fields.
 * @param filePath Normalized file path.
 * @param lineStart Line start.
 * @param lineEnd Line end.
 * @param components Id seed component list.
 * @returns Seed string for hashing.
 */
function buildIdSeed(
    fields: IParsedSuggestionFields,
    filePath: string,
    lineStart: number,
    lineEnd: number,
    components: readonly SuggestionIdComponent[],
): string {
    const values: Record<SuggestionIdComponent, string> = {
        category: fields.category,
        filePath,
        lineStart: String(lineStart),
        lineEnd: String(lineEnd),
        message: fields.message,
    }

    return components.map((component) => values[component]).join("|")
}

/**
 * Reads string value with fallback.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @returns Normalized string.
 */
function readString(value: unknown, fallback: string): string {
    if (typeof value !== "string") {
        return fallback
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return fallback
    }

    return normalized
}

/**
 * Reads boolean value with fallback.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @returns Boolean value.
 */
function readBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value !== "boolean") {
        return fallback
    }

    return value
}

/**
 * Reads optional trimmed code block.
 *
 * @param source Raw suggestion record.
 * @returns Trimmed code block or undefined.
 */
function readCodeBlock(source: Readonly<Record<string, unknown>>): string | undefined {
    const raw = source["codeBlock"]
    if (typeof raw !== "string") {
        return undefined
    }

    const normalized = raw.trim()
    if (normalized.length === 0) {
        return undefined
    }

    return normalized
}

/**
 * Reads positive integer with fallback.
 *
 * @param value Candidate value.
 * @param fallback Fallback value.
 * @returns Positive integer.
 */
function readPositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
        return fallback
    }

    return value
}
