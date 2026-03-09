import type {IExternalContext, IJiraTicket, ILinearIssue} from "@codenautic/core"

const DEFAULT_FETCHED_AT = new Date(0)
const EMPTY_RECORD: Readonly<Record<string, unknown>> = {}

/**
 * Normalizes external Jira payload to shared ticket DTO.
 *
 * @param payload External Jira payload.
 * @returns Normalized Jira ticket DTO.
 */
export function mapExternalJiraTicket(payload: unknown): IJiraTicket {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const fields = toRecord(root["fields"])
    const statusField = toRecord(fields?.["status"])
    const statusRoot = toRecord(root["status"])
    const sprint = resolveJiraSprint(root)
    const description = resolveJiraDescription(root)
    const acceptanceCriteria = resolveJiraAcceptanceCriteria(root, description)

    return {
        key: readIdentifier(root, ["key", "issueKey", "id"], "UNKNOWN"),
        summary: readText(fields, ["summary"], readText(root, ["summary", "title"], "(no summary)")),
        status: readText(
            statusField,
            ["name", "statusCategory"],
            readText(statusRoot, ["name"], readText(root, ["status"], "unknown")),
        ),
        ...(description !== undefined ? {description} : {}),
        ...(acceptanceCriteria !== undefined ? {acceptanceCriteria} : {}),
        ...(sprint !== undefined ? {sprint} : {}),
    }
}

/**
 * Normalizes external Linear payload to shared issue DTO.
 *
 * @param payload External Linear payload.
 * @returns Normalized Linear issue DTO.
 */
export function mapExternalLinearIssue(payload: unknown): ILinearIssue {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const state = toRecord(root["state"])
    const status = toRecord(root["status"])

    return {
        id: readIdentifier(root, ["id", "identifier", "issueId"], "UNKNOWN"),
        title: readText(root, ["title", "name"], "(no title)"),
        state: readText(state, ["name"], readText(status, ["name"], readText(root, ["state"], "unknown"))),
    }
}

/**
 * Normalizes external Jira context payload.
 *
 * @param payload External Jira payload.
 * @returns Shared external context.
 */
export function mapJiraContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD
    const ticket = mapExternalJiraTicket(payload)

    return {
        source: "JIRA",
        data: {
            ticket,
            ...(ticket.sprint !== undefined ? {sprint: ticket.sprint} : {}),
            ...(ticket.acceptanceCriteria !== undefined
                ? {acceptanceCriteria: ticket.acceptanceCriteria}
                : {}),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Normalizes external Linear context payload.
 *
 * @param payload External Linear payload.
 * @returns Shared external context.
 */
export function mapLinearContext(payload: unknown): IExternalContext {
    const root = toRecord(payload) ?? EMPTY_RECORD

    return {
        source: "LINEAR",
        data: {
            issue: mapExternalLinearIssue(payload),
            cycle: resolveLinearCycle(root),
        },
        fetchedAt: resolveFetchedAt(root),
    }
}

/**
 * Resolves Jira sprint from common payload locations.
 *
 * @param root Jira root payload.
 * @returns Sprint name when available.
 */
function resolveJiraSprint(root: Readonly<Record<string, unknown>>): string | undefined {
    const fields = toRecord(root["fields"])
    const sprint = toRecord(fields?.["sprint"])
    const sprintName = readText(sprint, ["name"])

    if (sprintName.length > 0) {
        return sprintName
    }

    const boardSprint = toArray(fields?.["customfield_10020"])
    const firstBoardSprint = toRecord(boardSprint[0])
    const boardSprintName = readText(firstBoardSprint, ["name"])

    if (boardSprintName.length > 0) {
        return boardSprintName
    }

    return undefined
}

/**
 * Resolves normalized Jira description from common field locations.
 *
 * @param root Jira root payload.
 * @returns Plain-text description when available.
 */
function resolveJiraDescription(root: Readonly<Record<string, unknown>>): string | undefined {
    const fields = toRecord(root["fields"])
    const renderedFields = toRecord(root["renderedFields"])

    const description = extractRichText(
        fields?.["description"] ??
            renderedFields?.["description"] ??
            root["description"] ??
            root["renderedDescription"],
    )

    if (description === undefined || description.length === 0) {
        return undefined
    }

    return description
}

/**
 * Resolves Jira acceptance criteria from explicit fields or description headings.
 *
 * @param root Jira root payload.
 * @param description Normalized description text.
 * @returns Acceptance-criteria checklist.
 */
function resolveJiraAcceptanceCriteria(
    root: Readonly<Record<string, unknown>>,
    description: string | undefined,
): readonly string[] | undefined {
    const fields = toRecord(root["fields"])
    const explicitCandidates: readonly unknown[] = [
        fields?.["acceptanceCriteria"],
        fields?.["acceptance_criteria"],
        root["acceptanceCriteria"],
        root["acceptance_criteria"],
    ]

    for (const candidate of explicitCandidates) {
        const explicitItems = extractChecklistItems(candidate)
        if (explicitItems.length > 0) {
            return explicitItems
        }
    }

    if (description === undefined) {
        return undefined
    }

    const parsedFromDescription = parseAcceptanceCriteriaFromDescription(description)
    if (parsedFromDescription.length > 0) {
        return parsedFromDescription
    }

    return undefined
}

/**
 * Resolves Linear cycle from common payload locations.
 *
 * @param root Linear root payload.
 * @returns Cycle name when available.
 */
function resolveLinearCycle(root: Readonly<Record<string, unknown>>): string | undefined {
    const cycle = toRecord(root["cycle"])
    const cycleName = readText(cycle, ["name"])

    if (cycleName.length > 0) {
        return cycleName
    }

    return readText(root, ["cycleName"])
}

/**
 * Extracts plain text from strings, HTML, or Atlassian document payloads.
 *
 * @param value Rich-text candidate.
 * @returns Normalized plain text or undefined.
 */
function extractRichText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return normalizeMultilineText(stripHtmlTags(value))
    }

    const lines = extractRichTextLines(value)
    if (lines.length === 0) {
        return undefined
    }

    return lines.join("\n")
}

/**
 * Extracts checklist items from common Jira field shapes.
 *
 * @param value Checklist candidate.
 * @returns Normalized checklist entries.
 */
function extractChecklistItems(value: unknown): readonly string[] {
    if (Array.isArray(value)) {
        return extractChecklistItemsFromArray(value)
    }

    if (typeof value === "string") {
        return splitChecklistText(normalizeMultilineText(stripHtmlTags(value)) ?? "")
    }

    const record = toRecord(value)
    if (record === null) {
        return []
    }

    return extractChecklistItemsFromRecord(record)
}

/**
 * Parses acceptance-criteria section from normalized description text.
 *
 * @param description Normalized Jira description.
 * @returns Checklist items from matching section.
 */
function parseAcceptanceCriteriaFromDescription(description: string): readonly string[] {
    const lines = normalizeDescriptionLines(description)
    const headingIndex = findAcceptanceCriteriaHeadingIndex(lines)
    if (headingIndex < 0) {
        return []
    }

    const inlineItems = resolveInlineAcceptanceCriteria(lines[headingIndex] ?? "")
    if (inlineItems.length > 0) {
        return deduplicateTextList([
            ...inlineItems,
            ...collectAcceptanceCriteriaLines(lines, headingIndex),
        ])
    }

    return collectAcceptanceCriteriaLines(lines, headingIndex)
}

/**
 * Extracts normalized text lines from nested rich-text nodes.
 *
 * @param value Rich-text node.
 * @returns Plain-text lines.
 */
function extractRichTextLines(value: unknown): readonly string[] {
    const fragments: string[] = []
    collectRichTextLines(value, fragments)

    const normalizedLines = fragments
        .join("\n")
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(stripHtmlTags(line))
        })
        .filter((line) => {
            return line.length > 0
        })

    return deduplicateSequentialLines(normalizedLines)
}

/**
 * Traverses nested rich-text nodes and emits line fragments.
 *
 * @param value Rich-text node.
 * @param output Mutable fragment accumulator.
 */
function collectRichTextLines(value: unknown, output: string[]): void {
    if (typeof value === "string") {
        output.push(value)
        return
    }

    if (Array.isArray(value)) {
        collectRichTextLinesFromArray(value, output)
        return
    }

    const record = toRecord(value)
    if (record === null) {
        return
    }

    appendRichTextValue(record, output)
    appendRichTextLineBreak(record, output)

    const content = toArray(record["content"])
    collectRichTextLinesFromArray(content, output)
    appendRichTextBlockBreak(record, output)
}

/**
 * Extracts checklist items from array-based Jira field values.
 *
 * @param value Checklist candidate array.
 * @returns Normalized checklist entries.
 */
function extractChecklistItemsFromArray(value: readonly unknown[]): readonly string[] {
    const items = value.flatMap((item) => {
        return [...extractChecklistItems(item)]
    })

    return deduplicateTextList(items)
}

/**
 * Extracts checklist items from record-based Jira field values.
 *
 * @param record Checklist candidate record.
 * @returns Normalized checklist entries.
 */
function extractChecklistItemsFromRecord(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    if (isChecklistNode(record)) {
        return extractChecklistItemsFromListNode(record)
    }

    const nestedItems = extractChecklistItemsFromNestedContent(record)
    if (nestedItems.length > 0) {
        return nestedItems
    }

    return extractChecklistItemsFromTextValue(record)
}

/**
 * Determines whether record represents a checklist item node.
 *
 * @param record Candidate rich-text record.
 * @returns True when record is a checklist node.
 */
function isChecklistNode(record: Readonly<Record<string, unknown>>): boolean {
    const type = readText(record, ["type"])
    return type === "listItem" || type === "taskItem"
}

/**
 * Extracts checklist items from nested list node content.
 *
 * @param record Checklist node.
 * @returns Checklist entries.
 */
function extractChecklistItemsFromListNode(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const line = extractRichText({
        type: "doc",
        content: toArray(record["content"]),
    })

    return line === undefined ? [] : [line]
}

/**
 * Extracts checklist items from nested content arrays.
 *
 * @param record Rich-text record.
 * @returns Nested checklist entries.
 */
function extractChecklistItemsFromNestedContent(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const content = toArray(record["content"])
    if (content.length === 0) {
        return []
    }

    const nestedItems = content.flatMap((item) => {
        return [...extractChecklistItems(item)]
    })

    return deduplicateTextList(nestedItems)
}

/**
 * Extracts checklist items from plain text-like record properties.
 *
 * @param record Candidate rich-text record.
 * @returns Checklist entries.
 */
function extractChecklistItemsFromTextValue(
    record: Readonly<Record<string, unknown>>,
): readonly string[] {
    const text = extractRichText(record["text"] ?? record["value"])
    return text === undefined ? [] : splitChecklistText(text)
}

/**
 * Normalizes multi-line description into non-empty lines.
 *
 * @param description Jira description text.
 * @returns Normalized lines.
 */
function normalizeDescriptionLines(description: string): readonly string[] {
    return description
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(line)
        })
        .filter((line) => {
            return line.length > 0
        })
}

/**
 * Finds acceptance-criteria heading line index.
 *
 * @param lines Normalized description lines.
 * @returns Heading index or -1.
 */
function findAcceptanceCriteriaHeadingIndex(lines: readonly string[]): number {
    return lines.findIndex((line) => {
        return /^acceptance criteria:?$/i.test(line)
            || /^acceptance criteria:\s+.+$/i.test(line)
    })
}

/**
 * Extracts inline acceptance-criteria items from heading line when present.
 *
 * @param line Heading line candidate.
 * @returns Inline checklist items.
 */
function resolveInlineAcceptanceCriteria(line: string): readonly string[] {
    const inlineMatch = /^acceptance criteria:\s+(.+)$/i.exec(line)
    if (inlineMatch?.[1] === undefined) {
        return []
    }

    return splitChecklistText(inlineMatch[1])
}

/**
 * Collects checklist items after acceptance-criteria heading.
 *
 * @param lines Normalized description lines.
 * @param headingIndex Acceptance-criteria heading index.
 * @returns Checklist entries.
 */
function collectAcceptanceCriteriaLines(
    lines: readonly string[],
    headingIndex: number,
): readonly string[] {
    const items: string[] = []

    for (const line of lines.slice(headingIndex + 1)) {
        if (shouldStopAcceptanceCriteriaCollection(line, items.length > 0)) {
            break
        }

        const normalizedItem = normalizeChecklistItem(line)
        if (shouldStopAfterEmptyChecklistItem(normalizedItem, items.length > 0)) {
            return deduplicateTextList(items)
        }

        if (normalizedItem.length === 0) {
            continue
        }

        items.push(normalizedItem)
    }

    return deduplicateTextList(items)
}

/**
 * Determines whether acceptance-criteria collection should stop.
 *
 * @param line Candidate line.
 * @param hasCollectedItems Whether at least one item is already collected.
 * @returns True when section parsing should stop.
 */
function shouldStopAcceptanceCriteriaCollection(
    line: string,
    hasCollectedItems: boolean,
): boolean {
    return hasCollectedItems && isSectionHeading(line)
}

/**
 * Determines whether checklist parsing should stop after an empty normalized item.
 *
 * @param normalizedItem Normalized checklist item.
 * @param hasCollectedItems Whether at least one item is already collected.
 * @returns True when parser should stop.
 */
function shouldStopAfterEmptyChecklistItem(
    normalizedItem: string,
    hasCollectedItems: boolean,
): boolean {
    return normalizedItem.length === 0 && hasCollectedItems
}

/**
 * Traverses nested rich-text arrays and appends line fragments.
 *
 * @param value Rich-text array.
 * @param output Mutable fragment accumulator.
 */
function collectRichTextLinesFromArray(value: readonly unknown[], output: string[]): void {
    for (const item of value) {
        collectRichTextLines(item, output)
    }
}

/**
 * Appends text value from rich-text record.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextValue(record: Readonly<Record<string, unknown>>, output: string[]): void {
    const text = readText(record, ["text"])
    if (text.length > 0) {
        output.push(text)
    }
}

/**
 * Appends hard-break newline when rich-text record represents one.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextLineBreak(
    record: Readonly<Record<string, unknown>>,
    output: string[],
): void {
    if (readText(record, ["type"]) === "hardBreak") {
        output.push("\n")
    }
}

/**
 * Appends block-separator newline for paragraph-like nodes.
 *
 * @param record Rich-text record.
 * @param output Mutable fragment accumulator.
 */
function appendRichTextBlockBreak(
    record: Readonly<Record<string, unknown>>,
    output: string[],
): void {
    const type = readText(record, ["type"])
    if (type === "paragraph" || type === "heading" || type === "listItem" || type === "taskItem") {
        output.push("\n")
    }
}

/**
 * Resolves fetched-at timestamp from payload.
 *
 * @param root Payload root object.
 * @returns Valid timestamp.
 */
function resolveFetchedAt(root: Readonly<Record<string, unknown>>): Date {
    const candidates: readonly unknown[] = [
        root["fetchedAt"],
        root["updatedAt"],
        root["updated_at"],
        root["timestamp"],
    ]

    for (const candidate of candidates) {
        if (candidate instanceof Date && Number.isNaN(candidate.valueOf()) === false) {
            return new Date(candidate.getTime())
        }

        if (typeof candidate === "string" || typeof candidate === "number") {
            const parsed = new Date(candidate)
            if (Number.isNaN(parsed.valueOf()) === false) {
                return parsed
            }
        }
    }

    return new Date(DEFAULT_FETCHED_AT.getTime())
}

/**
 * Converts unknown to plain object record.
 *
 * @param value Candidate value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Converts unknown value to readonly array.
 *
 * @param value Candidate value.
 * @returns Array or empty list.
 */
function toArray(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) {
        return value
    }

    return []
}

/**
 * Reads textual value by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Normalized string.
 */
function readText(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = source?.[key]
        if (typeof value === "string") {
            const normalized = value.trim()
            if (normalized.length > 0) {
                return normalized
            }
        }
    }

    return fallback
}

/**
 * Reads identifier value by candidate keys.
 *
 * @param source Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Normalized identifier.
 */
function readIdentifier(
    source: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = source?.[key]

        if (typeof value === "string") {
            const normalized = value.trim()
            if (normalized.length > 0) {
                return normalized
            }
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value)
        }
    }

    return fallback
}

/**
 * Normalizes multi-line text while preserving logical line breaks.
 *
 * @param value Raw text.
 * @returns Normalized text or undefined.
 */
function normalizeMultilineText(value: string): string | undefined {
    const normalized = value
        .split("\n")
        .map((line) => {
            return normalizeSingleLineText(line)
        })
        .filter((line) => {
            return line.length > 0
        })
        .join("\n")

    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes a single line of text.
 *
 * @param value Raw text.
 * @returns Trimmed single-line text.
 */
function normalizeSingleLineText(value: string): string {
    return value.replace(/\s+/g, " ").trim()
}

/**
 * Removes HTML tags while preserving simple line breaks.
 *
 * @param value Raw HTML or text.
 * @returns Plain text.
 */
function stripHtmlTags(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
}

/**
 * Splits plain text into normalized checklist items.
 *
 * @param value Plain checklist text.
 * @returns Checklist items.
 */
function splitChecklistText(value: string): readonly string[] {
    const normalizedText = normalizeMultilineText(value)
    if (normalizedText === undefined) {
        return []
    }

    const items = normalizedText
        .split("\n")
        .map((line) => {
            return normalizeChecklistItem(line)
        })
        .filter((line) => {
            return line.length > 0
        })

    return deduplicateTextList(items)
}

/**
 * Normalizes a single checklist line by removing common bullet prefixes.
 *
 * @param value Checklist candidate.
 * @returns Plain checklist item.
 */
function normalizeChecklistItem(value: string): string {
    return normalizeSingleLineText(value.replace(/^[-*[\]xX0-9().\s]+/, ""))
}

/**
 * Detects heading-like text that likely starts a new section.
 *
 * @param value Candidate line.
 * @returns True when line looks like a section heading.
 */
function isSectionHeading(value: string): boolean {
    return /^[A-Z][A-Za-z0-9 /_-]{1,50}:$/.test(value)
}

/**
 * Removes duplicate items while keeping original order.
 *
 * @param items Candidate items.
 * @returns Deduplicated items.
 */
function deduplicateTextList(items: readonly string[]): readonly string[] {
    const uniqueItems: string[] = []
    const seen = new Set<string>()

    for (const item of items) {
        if (seen.has(item)) {
            continue
        }

        seen.add(item)
        uniqueItems.push(item)
    }

    return uniqueItems
}

/**
 * Removes only adjacent duplicate lines emitted by the recursive rich-text traversal.
 *
 * @param lines Candidate lines.
 * @returns Sequentially deduplicated lines.
 */
function deduplicateSequentialLines(lines: readonly string[]): readonly string[] {
    const normalized: string[] = []

    for (const line of lines) {
        const previous = normalized[normalized.length - 1]
        if (previous === line) {
            continue
        }

        normalized.push(line)
    }

    return normalized
}
