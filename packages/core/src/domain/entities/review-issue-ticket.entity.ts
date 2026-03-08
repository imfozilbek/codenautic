import {Entity} from "./entity"
import {FilePath} from "../value-objects/file-path.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Supported issue ticket statuses.
 */
export const REVIEW_ISSUE_TICKET_STATUS = {
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    DISMISSED: "DISMISSED",
} as const

/**
 * Review issue ticket lifecycle status.
 */
export type ReviewIssueTicketStatus =
    (typeof REVIEW_ISSUE_TICKET_STATUS)[keyof typeof REVIEW_ISSUE_TICKET_STATUS]

/**
 * Review issue ticket state container.
 */
export interface IReviewIssueTicketProps {
    sourceReviewId: string
    sourceSuggestionIds: readonly string[]
    filePath: FilePath
    category: string
    occurrenceCount: number
    status: ReviewIssueTicketStatus
}

/**
 * Entity that tracks repeated issues surfaced by review suggestions.
 */
export class ReviewIssueTicket extends Entity<IReviewIssueTicketProps> {
    /**
     * Creates review issue ticket.
     *
     * @param id Entity identifier.
     * @param props Ticket state.
     */
    public constructor(id: UniqueId, props: IReviewIssueTicketProps) {
        const sourceSuggestionIds = normalizeSuggestionIds(props.sourceSuggestionIds)
        const occurrenceCount = normalizeOccurrenceCount(
            props.occurrenceCount,
            sourceSuggestionIds.length,
        )

        super(id, {
            sourceReviewId: normalizeReviewId(props.sourceReviewId),
            sourceSuggestionIds,
            filePath: props.filePath,
            category: normalizeCategory(props.category),
            occurrenceCount,
            status: normalizeStatus(props.status),
        })
    }

    /**
     * Review ticket status.
     *
     * @returns Current ticket status.
     */
    public get status(): ReviewIssueTicketStatus {
        return this.props.status
    }

    /**
     * Origin review identifier.
     *
     * @returns Review identifier.
     */
    public get sourceReviewId(): string {
        return this.props.sourceReviewId
    }

    /**
     * Suggestions that triggered the ticket.
     *
     * @returns Suggestion ids snapshot.
     */
    public get sourceSuggestionIds(): readonly string[] {
        return [...this.props.sourceSuggestionIds]
    }

    /**
     * File path tied to the issue.
     *
     * @returns File path value object.
     */
    public get filePath(): FilePath {
        return this.props.filePath
    }

    /**
     * Stable category for repeated issue matching.
     *
     * @returns Issue category.
     */
    public get category(): string {
        return this.props.category
    }

    /**
     * Number of occurrences for the issue ticket.
     *
     * @returns Occurrence count.
     */
    public get occurrenceCount(): number {
        return this.props.occurrenceCount
    }

    /**
     * Resolves the issue ticket.
     */
    public resolve(): void {
        this.ensureInProgress("resolve")
        this.props.status = REVIEW_ISSUE_TICKET_STATUS.RESOLVED
    }

    /**
     * Dismisses the issue ticket.
     */
    public dismiss(): void {
        this.ensureInProgress("dismiss")
        this.props.status = REVIEW_ISSUE_TICKET_STATUS.DISMISSED
    }

    /**
     * Adds another occurrence of the issue.
     *
     * @param suggestionId Source suggestion identifier.
     */
    public addOccurrence(suggestionId: string): void {
        this.ensureInProgress("add occurrence to")

        const normalizedId = normalizeSuggestionId(suggestionId)
        if (this.props.sourceSuggestionIds.includes(normalizedId) === false) {
            this.props.sourceSuggestionIds = [...this.props.sourceSuggestionIds, normalizedId]
        }
        this.props.occurrenceCount += 1
    }

    /**
     * Ensures current status is IN_PROGRESS.
     *
     * @param action Action label for error message.
     */
    private ensureInProgress(action: string): void {
        if (this.props.status !== REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS) {
            throw new Error(
                `Cannot ${action} review issue ticket in status ${this.props.status}`,
            )
        }
    }
}

/**
 * Normalizes review identifier.
 *
 * @param value Raw review identifier.
 * @returns Normalized review id.
 */
function normalizeReviewId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("ReviewIssueTicket sourceReviewId cannot be empty")
    }

    return normalized
}

/**
 * Normalizes ticket status.
 *
 * @param value Raw status.
 * @returns Validated status.
 */
function normalizeStatus(value: ReviewIssueTicketStatus): ReviewIssueTicketStatus {
    if (!Object.values(REVIEW_ISSUE_TICKET_STATUS).includes(value)) {
        throw new Error(`Unknown review issue ticket status: ${String(value)}`)
    }

    return value
}

/**
 * Normalizes repeated issue category.
 *
 * @param value Raw category.
 * @returns Validated category.
 */
function normalizeCategory(value: string): string {
    const normalized = value.trim().toLowerCase()
    if (normalized.length === 0) {
        throw new Error("ReviewIssueTicket category cannot be empty")
    }

    return normalized
}

/**
 * Normalizes suggestion identifier.
 *
 * @param value Raw suggestion id.
 * @returns Normalized suggestion id.
 */
function normalizeSuggestionId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("ReviewIssueTicket suggestionId cannot be empty")
    }

    return normalized
}

/**
 * Normalizes and deduplicates suggestion id list.
 *
 * @param values Raw suggestion ids.
 * @returns Normalized suggestion ids.
 */
function normalizeSuggestionIds(values: readonly string[]): string[] {
    if (values.length === 0) {
        throw new Error("ReviewIssueTicket must include at least one suggestionId")
    }

    const uniqueIds = new Map<string, string>()

    for (const value of values) {
        const normalized = normalizeSuggestionId(value)
        if (uniqueIds.has(normalized)) {
            throw new Error(`Duplicate suggestionId: ${normalized}`)
        }

        uniqueIds.set(normalized, normalized)
    }

    return [...uniqueIds.values()]
}

/**
 * Normalizes occurrence count value.
 *
 * @param value Raw occurrence count.
 * @param minimumValue Minimum count based on unique suggestion ids.
 * @returns Validated count.
 */
function normalizeOccurrenceCount(value: number, minimumValue: number): number {
    if (!Number.isInteger(value) || value < 1) {
        throw new Error("ReviewIssueTicket occurrenceCount must be a positive integer")
    }
    if (value < minimumValue) {
        throw new Error("ReviewIssueTicket occurrenceCount cannot be less than suggestionIds length")
    }

    return value
}
