import {AggregateRoot} from "./aggregate-root"
import {ReviewSeverityBudgetExceededError} from "../errors/review-severity-budget-exceeded.error"
import {ReviewStatusTransitionError} from "../errors/review-status-transition.error"
import {ReviewCompleted} from "../events/review-completed"
import {ReviewStarted} from "../events/review-started"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Allowed lifecycle states for review aggregate.
 */
export const REVIEW_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    FAILED: "failed",
} as const

/**
 * Review lifecycle status.
 */
export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS]

/**
 * Internal state container for review aggregate.
 */
export interface IReviewProps {
    repositoryId: string
    status: ReviewStatus
    severityBudget: number
    consumedSeverity: number
    startedAt: Date | null
    completedAt: Date | null
    failedAt: Date | null
    failureReason: string | null
}

/**
 * Aggregate root for review workflow lifecycle.
 */
export class Review extends AggregateRoot<IReviewProps> {
    /**
     * Creates review aggregate.
     *
     * @param id Aggregate identifier.
     * @param props Aggregate state.
     */
    public constructor(id: UniqueId, props: IReviewProps) {
        super(id, props)
        this.ensureStateIsValid()
    }

    /**
     * Repository identifier bound to review.
     *
     * @returns Repository identifier.
     */
    public get repositoryId(): string {
        return this.props.repositoryId
    }

    /**
     * Current lifecycle status.
     *
     * @returns Review status.
     */
    public get status(): ReviewStatus {
        return this.props.status
    }

    /**
     * Total severity budget.
     *
     * @returns Budget value.
     */
    public get severityBudget(): number {
        return this.props.severityBudget
    }

    /**
     * Current consumed severity.
     *
     * @returns Consumed severity amount.
     */
    public get consumedSeverity(): number {
        return this.props.consumedSeverity
    }

    /**
     * Processing start timestamp.
     *
     * @returns Start time or null.
     */
    public get startedAt(): Date | null {
        if (this.props.startedAt === null) {
            return null
        }
        return new Date(this.props.startedAt)
    }

    /**
     * Processing completion timestamp.
     *
     * @returns Completion time or null.
     */
    public get completedAt(): Date | null {
        if (this.props.completedAt === null) {
            return null
        }
        return new Date(this.props.completedAt)
    }

    /**
     * Processing failure timestamp.
     *
     * @returns Failure time or null.
     */
    public get failedAt(): Date | null {
        if (this.props.failedAt === null) {
            return null
        }
        return new Date(this.props.failedAt)
    }

    /**
     * Failure reason for failed review.
     *
     * @returns Failure reason or null.
     */
    public get failureReason(): string | null {
        return this.props.failureReason
    }

    /**
     * Starts review processing.
     *
     * @param startedAt Processing start time.
     * @throws ReviewStatusTransitionError when transition is forbidden.
     */
    public start(startedAt: Date): void {
        if (this.props.status !== REVIEW_STATUS.PENDING) {
            throw new ReviewStatusTransitionError(this.props.status, "start")
        }

        this.props.status = REVIEW_STATUS.IN_PROGRESS
        this.props.startedAt = new Date(startedAt)
        this.props.completedAt = null
        this.props.failedAt = null
        this.props.failureReason = null

        this.addDomainEvent(
            new ReviewStarted(this.id.value, {
                reviewId: this.id.value,
                repositoryId: this.props.repositoryId,
                severityBudget: this.props.severityBudget,
            }),
        )
    }

    /**
     * Completes review processing with final severity usage.
     *
     * @param consumedSeverity Final consumed severity.
     * @param completedAt Completion time.
     * @throws ReviewStatusTransitionError when transition is forbidden.
     * @throws ReviewSeverityBudgetExceededError when budget is exceeded.
     */
    public complete(consumedSeverity: number, completedAt: Date): void {
        if (this.props.status !== REVIEW_STATUS.IN_PROGRESS) {
            throw new ReviewStatusTransitionError(this.props.status, "complete")
        }
        this.ensureSeverityValue(consumedSeverity)

        if (consumedSeverity > this.props.severityBudget) {
            throw new ReviewSeverityBudgetExceededError(consumedSeverity, this.props.severityBudget)
        }

        this.props.status = REVIEW_STATUS.COMPLETED
        this.props.consumedSeverity = consumedSeverity
        this.props.completedAt = new Date(completedAt)
        this.props.failedAt = null
        this.props.failureReason = null

        this.addDomainEvent(
            new ReviewCompleted(this.id.value, {
                reviewId: this.id.value,
                consumedSeverity,
                severityBudget: this.props.severityBudget,
            }),
        )
    }

    /**
     * Marks review as failed.
     *
     * @param reason Failure reason.
     * @param failedAt Failure timestamp.
     * @throws ReviewStatusTransitionError when transition is forbidden.
     */
    public fail(reason: string, failedAt: Date): void {
        if (
            this.props.status !== REVIEW_STATUS.PENDING &&
            this.props.status !== REVIEW_STATUS.IN_PROGRESS
        ) {
            throw new ReviewStatusTransitionError(this.props.status, "fail")
        }

        const normalizedReason = reason.trim()
        if (normalizedReason.length === 0) {
            throw new Error("Failure reason cannot be empty")
        }

        this.props.status = REVIEW_STATUS.FAILED
        this.props.failedAt = new Date(failedAt)
        this.props.failureReason = normalizedReason
        this.props.completedAt = null
    }

    /**
     * Validates aggregate state invariants.
     *
     * @throws Error when state is invalid.
     */
    private ensureStateIsValid(): void {
        this.ensureSeverityValue(this.props.severityBudget)
        this.ensureSeverityValue(this.props.consumedSeverity)

        if (this.props.consumedSeverity > this.props.severityBudget) {
            throw new ReviewSeverityBudgetExceededError(
                this.props.consumedSeverity,
                this.props.severityBudget,
            )
        }
    }

    /**
     * Validates severity value shape.
     *
     * @param severity Severity value.
     * @throws Error when value is invalid.
     */
    private ensureSeverityValue(severity: number): void {
        if (!Number.isFinite(severity)) {
            throw new Error("Severity must be finite")
        }
        if (severity < 0) {
            throw new Error("Severity must be greater than or equal to zero")
        }
    }
}
