import {REVIEW_STATUS, Review, type IReviewProps, type ReviewStatus} from "../aggregates/review.aggregate"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating new review aggregate.
 */
export interface ICreateReviewProps {
    repositoryId: string
    severityBudget: number
}

/**
 * Persistence snapshot for review reconstitution.
 */
export interface IReconstituteReviewProps {
    id: string
    repositoryId: string
    status: ReviewStatus
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
            repositoryId: input.repositoryId,
            status: REVIEW_STATUS.PENDING,
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
            repositoryId: input.repositoryId,
            status: input.status,
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
}
