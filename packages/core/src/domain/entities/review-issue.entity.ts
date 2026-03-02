import {FilePath} from "../value-objects/file-path.value-object"
import {LineRange} from "../value-objects/line-range.value-object"
import {Severity} from "../value-objects/severity.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {Entity} from "./entity"

/**
 * Supported issue categories for review findings.
 */
export const ISSUE_CATEGORY = {
    BUG: "BUG",
    SECURITY: "SECURITY",
    PERFORMANCE: "PERFORMANCE",
    MAINTAINABILITY: "MAINTAINABILITY",
    STYLE: "STYLE",
    OTHER: "OTHER",
} as const

/**
 * Literal issue category type.
 */
export type IssueCategory = (typeof ISSUE_CATEGORY)[keyof typeof ISSUE_CATEGORY]

const ISSUE_CATEGORY_WEIGHT: Readonly<Record<IssueCategory, number>> = {
    [ISSUE_CATEGORY.BUG]: 40,
    [ISSUE_CATEGORY.SECURITY]: 50,
    [ISSUE_CATEGORY.PERFORMANCE]: 30,
    [ISSUE_CATEGORY.MAINTAINABILITY]: 20,
    [ISSUE_CATEGORY.STYLE]: 10,
    [ISSUE_CATEGORY.OTHER]: 0,
}

/**
 * State container for review issue entity.
 */
export interface IReviewIssueProps {
    filePath: FilePath
    lineRange: LineRange
    severity: Severity
    category: IssueCategory
    message: string
    suggestion?: string
    codeBlock?: string
}

/**
 * Entity that represents a single detected review issue.
 */
export class ReviewIssue extends Entity<IReviewIssueProps> {
    /**
     * Creates review issue entity.
     *
     * @param id Entity identifier.
     * @param props Entity props.
     */
    public constructor(id: UniqueId, props: IReviewIssueProps) {
        super(id, props)
        this.ensureStateIsValid()
    }

    /**
     * File path where issue was found.
     *
     * @returns Issue file path.
     */
    public get filePath(): FilePath {
        return this.props.filePath
    }

    /**
     * Line range where issue was found.
     *
     * @returns Issue line range.
     */
    public get lineRange(): LineRange {
        return this.props.lineRange
    }

    /**
     * Severity of issue.
     *
     * @returns Issue severity.
     */
    public get severity(): Severity {
        return this.props.severity
    }

    /**
     * Category of issue.
     *
     * @returns Issue category.
     */
    public get category(): IssueCategory {
        return this.props.category
    }

    /**
     * Human-readable issue message.
     *
     * @returns Issue message.
     */
    public get message(): string {
        return this.props.message
    }

    /**
     * Optional suggestion on how to fix the issue.
     *
     * @returns Suggestion text or undefined.
     */
    public get suggestion(): string | undefined {
        return this.props.suggestion
    }

    /**
     * Optional code block associated with issue.
     *
     * @returns Code block or undefined.
     */
    public get codeBlock(): string | undefined {
        return this.props.codeBlock
    }

    /**
     * Calculates rank score for sorting/prioritization.
     *
     * @returns Category weight plus severity weight.
     */
    public calculateRankScore(): number {
        return ISSUE_CATEGORY_WEIGHT[this.props.category] + this.props.severity.weight
    }

    /**
     * Validates and normalizes entity state.
     *
     * @throws Error When required fields are invalid.
     */
    private ensureStateIsValid(): void {
        if (!isIssueCategory(this.props.category)) {
            throw new Error(`Unknown issue category: ${String(this.props.category)}`)
        }

        this.props.message = normalizeRequiredText(this.props.message, "Issue message cannot be empty")
        this.props.suggestion = normalizeOptionalText(this.props.suggestion, "Issue suggestion cannot be empty")
        this.props.codeBlock = normalizeOptionalText(this.props.codeBlock, "Issue code block cannot be empty")
    }
}

/**
 * Type guard for issue category literal.
 *
 * @param value Candidate category.
 * @returns True when value is supported issue category.
 */
function isIssueCategory(value: string): value is IssueCategory {
    return Object.values(ISSUE_CATEGORY).includes(value as IssueCategory)
}

/**
 * Normalizes required text field.
 *
 * @param value Raw value.
 * @param errorMessage Error message for empty result.
 * @returns Trimmed text value.
 * @throws Error When normalized value is empty.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(errorMessage)
    }
    return normalized
}

/**
 * Normalizes optional text field.
 *
 * @param value Raw optional text.
 * @param errorMessage Error message for empty normalized value.
 * @returns Trimmed text or undefined.
 * @throws Error When normalized value is empty string.
 */
function normalizeOptionalText(value: string | undefined, errorMessage: string): string | undefined {
    if (value === undefined) {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(errorMessage)
    }

    return normalized
}
