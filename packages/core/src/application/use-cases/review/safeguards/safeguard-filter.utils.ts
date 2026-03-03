import {ISSUE_CATEGORY} from "../../../../domain/entities/review-issue.entity"
import {Severity, SEVERITY_LEVEL} from "../../../../domain/value-objects/severity.value-object"
import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import {hash} from "../../../../shared/utils/hash"

const CATEGORY_WEIGHT_BY_CATEGORY: Readonly<Record<string, number>> = {
    [ISSUE_CATEGORY.BUG]: 40,
    [ISSUE_CATEGORY.SECURITY]: 50,
    [ISSUE_CATEGORY.PERFORMANCE]: 30,
    [ISSUE_CATEGORY.MAINTAINABILITY]: 20,
    [ISSUE_CATEGORY.STYLE]: 10,
    [ISSUE_CATEGORY.OTHER]: 0,
    architecture: 35,
    code_quality: 20,
    architecture_review: 35,
    code_quality_review: 20,
    tests: 25,
    test: 25,
    quality: 20,
    breaking_change: 45,
    breaking: 45,
}

/**
 * Filters and helpers for SafeGuard filter implementations.
 */
export interface IFileContentCandidate {
    readonly patch?: unknown
    readonly hunks?: unknown
    readonly path?: unknown
}

/**
 * Normalizes string value for comparison.
 */
export function normalizeTrimmedText(value: unknown): string | undefined {
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
 * Returns normalized message for ranking and deduplication.
 */
export function normalizeSuggestionMessage(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Resolves stable severity weight.
 */
export function resolveSeverityWeight(severity: string): number {
    try {
        return Severity.create(severity).weight
    } catch {
        return Severity.create(SEVERITY_LEVEL.INFO).weight
    }
}

/**
 * Resolves normalized severity level.
 */
export function resolveSeverityLevel(severity: string): string {
    try {
        return Severity.create(severity).toString()
    } catch {
        return SEVERITY_LEVEL.INFO
    }
}

/**
 * Resolves category weight for ranking and sorting.
 */
export function resolveCategoryWeight(category: string): number {
    const normalized = normalizeCategoryKey(category)
    return CATEGORY_WEIGHT_BY_CATEGORY[normalized] ?? 0
}

/**
 * Builds duplication hash as file + line range + message.
 */
export function buildDeduplicationKey(suggestion: ISuggestionDTO): string {
    const categoryMessage = normalizeSuggestionMessage(suggestion.message)
    const filePath = suggestion.filePath.trim()
    const lineRange = `${suggestion.lineStart}-${suggestion.lineEnd}`

    return hash(`${filePath}|${lineRange}|${categoryMessage}`)
}

/**
 * Creates discarded suggestion payload with required metadata.
 */
export function createDiscardedSuggestion(
    suggestion: ISuggestionDTO,
    filterName: string,
    discardReason: string,
): IDiscardedSuggestionDTO {
    return {
        ...suggestion,
        filterName,
        discardReason,
    }
}

/**
 * Normalizes file content for fuzzy text search.
 */
export function normalizePatchContent(rawContent: string): string {
    return rawContent
        .split("\n")
        .map((line) => {
            if (line.length <= 1) {
                return ""
            }

            const marker = line[0]
            if (marker === "+" || marker === "-" || marker === " ") {
                return line.slice(1)
            }

            return line
        })
        .join("\n")
        .trim()
}

/**
 * Reads file payload content candidates.
 */
export function collectPatchContents(
    file: Readonly<Record<string, unknown>>,
): readonly string[] {
    const contents: string[] = []

    const patch = normalizeTrimmedText(file["patch"])
    if (patch !== undefined) {
        const normalizedPatch = normalizePatchContent(patch)
        if (normalizedPatch.length > 0) {
            contents.push(normalizedPatch)
        }
    }

    const hunks = file["hunks"]
    if (Array.isArray(hunks)) {
        const normalizedHunks = hunks
            .map((hunk) => normalizeTrimmedText(hunk))
            .filter((hunk): hunk is string => {
                return hunk !== undefined
            })
            .map(normalizePatchContent)
            .filter((hunk) => hunk.length > 0)

        contents.push(...normalizedHunks)
    }

    return contents
}

/**
 * Builds normalized category key.
 */
function normalizeCategoryKey(category: string): string {
    return category
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
}

/**
 * Checks whether block exists in file patch context.
 */
export function isCodeBlockInFile(file: IFileContentCandidate, codeBlock: string): boolean {
    const normalizedCode = normalizePatchContent(codeBlock.trim())
    if (normalizedCode.length === 0) {
        return false
    }

    for (const content of collectPatchContents(file as Readonly<Record<string, unknown>>)) {
        if (content.includes(normalizedCode)) {
            return true
        }
    }

    return false
}
