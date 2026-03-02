import {REVIEW_STATUS, Review, type IReviewProps, type ReviewStatus} from "../aggregates/review.aggregate"
import {type ReviewIssue} from "../entities/review-issue.entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating new review aggregate.
 */
export interface ICreateReviewProps {
    repositoryId: string
    mergeRequestId?: string
    severityBudget: number
}

/**
 * Persistence snapshot for review reconstitution.
 */
export interface IReconstituteReviewProps {
    id: string
    repositoryId: string
    mergeRequestId?: string
    status: ReviewStatus
    issues?: ReviewIssue[]
    severityBudget: number
    consumedSeverity: number
    startedAt: Date | string | null
    completedAt: Date | string | null
    failedAt: Date | string | null
    failureReason: string | null
}

/**
 * Factory for review aggregate creation and restoration.
 */
export class ReviewFactory
    implements IEntityFactory<Review, ICreateReviewProps, IReconstituteReviewProps>
{
    /**
     * Creates factory instance.
     */
    public constructor() {}

    /**
     * Creates new review aggregate in pending state.
     *
     * @param input New review payload.
     * @returns New review aggregate.
     */
    public create(input: ICreateReviewProps): Review {
        const props: IReviewProps = {
            repositoryId: normalizeRequiredText(input.repositoryId, "Repository id cannot be empty"),
            mergeRequestId: normalizeRequiredText(
                input.mergeRequestId ?? input.repositoryId,
                "Merge request id cannot be empty",
            ),
            status: REVIEW_STATUS.PENDING,
            issues: [],
            severityBudget: input.severityBudget,
            consumedSeverity: 0,
            startedAt: null,
            completedAt: null,
            failedAt: null,
            failureReason: null,
        }

        return new Review(UniqueId.create(), props)
    }

    /**
     * Restores review aggregate from persistence state.
     *
     * @param input Persistence snapshot.
     * @returns Restored review aggregate.
     */
    public reconstitute(input: IReconstituteReviewProps): Review {
        const props: IReviewProps = {
            repositoryId: normalizeRequiredText(input.repositoryId, "Repository id cannot be empty"),
            mergeRequestId: normalizeRequiredText(
                input.mergeRequestId ?? input.repositoryId,
                "Merge request id cannot be empty",
            ),
            status: input.status,
            issues: this.cloneIssues(input.issues),
            severityBudget: input.severityBudget,
            consumedSeverity: input.consumedSeverity,
            startedAt: this.parseDate(input.startedAt),
            completedAt: this.parseDate(input.completedAt),
            failedAt: this.parseDate(input.failedAt),
            failureReason: input.failureReason,
        }

        return new Review(UniqueId.create(input.id), props)
    }

    /**
     * Parses persisted date value.
     *
     * @param value Persisted date value.
     * @returns Parsed date or null.
     */
    private parseDate(value: Date | string | null): Date | null {
        if (value === null) {
            return null
        }

        if (value instanceof Date) {
            return new Date(value)
        }

        return new Date(value)
    }

    /**
     * Clones restored issues to avoid state aliasing.
     *
     * @param issues Restored issue entities.
     * @returns Mutable cloned issue collection.
     */
    private cloneIssues(issues: readonly ReviewIssue[] | undefined): ReviewIssue[] {
        if (issues === undefined) {
            return []
        }

        return [...issues]
    }
}

/**
 * Normalizes and validates required string value.
 *
 * @param value Raw value.
 * @param errorMessage Error message for empty value.
 * @returns Trimmed string value.
 * @throws Error When value is empty.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(errorMessage)
    }
    return normalized
}
