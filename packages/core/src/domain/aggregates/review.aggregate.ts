import {AggregateRoot} from "./aggregate-root"
import {ReviewIssue} from "../entities/review-issue.entity"
import {ReviewSeverityBudgetExceededError} from "../errors/review-severity-budget-exceeded.error"
import {ReviewStatusTransitionError} from "../errors/review-status-transition.error"
import {IssueFound} from "../events/issue-found"
import {REVIEW_COMPLETION_STATUS, ReviewCompleted} from "../events/review-completed"
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
    mergeRequestId: string
    status: ReviewStatus
    issues: ReviewIssue[]
    severityBudget: number
    consumedSeverity: number
    startedAt: Date | null
    completedAt: Date | null
    failedAt: Date | null
    failureReason: string | null
}

/**
 * Input metrics for review completion transition.
 */
export interface IReviewCompletionMetrics {
    consumedSeverity: number
    issueCount: number
    durationMs: number
    completedAt: Date
}

/**
 * Aggregate root for review workflow lifecycle.
 *
 * NOTE: this class intentionally extends AggregateRoot without Record constraints.
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
        this.props.issues = [...this.props.issues]
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
     * Merge request identifier bound to review.
     *
     * @returns Merge request identifier.
     */
    public get mergeRequestId(): string {
        return this.props.mergeRequestId
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
     * Issues detected during review.
     *
     * @returns Immutable issues snapshot.
     */
    public get issues(): readonly ReviewIssue[] {
        return [...this.props.issues]
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
        this.ensureDateIsValid(startedAt, "Review startedAt must be valid date")

        this.props.status = REVIEW_STATUS.IN_PROGRESS
        this.props.startedAt = new Date(startedAt)
        this.props.completedAt = null
        this.props.failedAt = null
        this.props.failureReason = null

        this.addDomainEvent(
            new ReviewStarted(this.id.value, {
                reviewId: this.id.value,
                mergeRequestId: this.props.mergeRequestId,
                startedAt: startedAt.toISOString(),
            }),
        )
    }

    /**
     * Adds issue to in-progress review and emits IssueFound event.
     *
     * @param issue Detected review issue.
     * @throws ReviewStatusTransitionError when transition is forbidden.
     */
    public addIssue(issue: ReviewIssue): void {
        if (this.props.status !== REVIEW_STATUS.IN_PROGRESS) {
            throw new ReviewStatusTransitionError(this.props.status, "addIssue")
        }

        this.props.issues = [...this.props.issues, issue]
        this.addDomainEvent(
            new IssueFound(this.id.value, {
                issueId: issue.id.value,
                reviewId: this.id.value,
                severity: issue.severity.toString(),
                filePath: issue.filePath.toString(),
                lineRange: issue.lineRange.toString(),
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
    public complete(consumedSeverity: number, completedAt: Date): void

    /**
     * Completes review processing with explicit metrics payload.
     *
     * @param metrics Completion metrics.
     */
    public complete(metrics: IReviewCompletionMetrics): void

    /**
     * Completes review processing with final severity usage.
     *
     * @param consumedSeverityOrMetrics Final consumed severity or metrics payload.
     * @param completedAt Completion time for legacy signature.
     * @throws ReviewStatusTransitionError when transition is forbidden.
     * @throws ReviewSeverityBudgetExceededError when budget is exceeded.
     */
    public complete(
        consumedSeverityOrMetrics: number | IReviewCompletionMetrics,
        completedAt?: Date,
    ): void {
        if (this.props.status !== REVIEW_STATUS.IN_PROGRESS) {
            throw new ReviewStatusTransitionError(this.props.status, "complete")
        }

        const metrics = this.normalizeCompletionMetrics(consumedSeverityOrMetrics, completedAt)
        this.ensureSeverityValue(metrics.consumedSeverity)
        this.ensureIssueCountValue(metrics.issueCount)
        this.ensureDurationValue(metrics.durationMs)

        if (metrics.consumedSeverity > this.props.severityBudget) {
            throw new ReviewSeverityBudgetExceededError(
                metrics.consumedSeverity,
                this.props.severityBudget,
            )
        }

        this.props.status = REVIEW_STATUS.COMPLETED
        this.props.consumedSeverity = metrics.consumedSeverity
        this.props.completedAt = new Date(metrics.completedAt)
        this.props.failedAt = null
        this.props.failureReason = null

        this.addDomainEvent(
            new ReviewCompleted(this.id.value, {
                reviewId: this.id.value,
                status: REVIEW_COMPLETION_STATUS.COMPLETED,
                issueCount: metrics.issueCount,
                durationMs: metrics.durationMs,
                consumedSeverity: metrics.consumedSeverity,
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
        this.ensureDateIsValid(failedAt, "Review failedAt must be valid date")

        const normalizedReason = reason.trim()
        if (normalizedReason.length === 0) {
            throw new Error("Failure reason cannot be empty")
        }

        this.props.status = REVIEW_STATUS.FAILED
        this.props.failedAt = new Date(failedAt)
        this.props.failureReason = normalizedReason
        this.props.completedAt = null

        this.addDomainEvent(
            new ReviewCompleted(this.id.value, {
                reviewId: this.id.value,
                status: REVIEW_COMPLETION_STATUS.FAILED,
                issueCount: this.props.issues.length,
                durationMs: this.calculateDurationMs(this.props.startedAt, failedAt),
                consumedSeverity: this.props.consumedSeverity,
                severityBudget: this.props.severityBudget,
            }),
        )
    }

    /**
     * Validates aggregate state invariants.
     *
     * @throws Error when state is invalid.
     */
    private ensureStateIsValid(): void {
        this.ensureRequiredText(this.props.repositoryId, "Repository id cannot be empty")
        this.ensureRequiredText(this.props.mergeRequestId, "Merge request id cannot be empty")
        this.ensureSeverityValue(this.props.severityBudget)
        this.ensureSeverityValue(this.props.consumedSeverity)
        this.ensureIssueCollection(this.props.issues)

        if (this.props.consumedSeverity > this.props.severityBudget) {
            throw new ReviewSeverityBudgetExceededError(
                this.props.consumedSeverity,
                this.props.severityBudget,
            )
        }
    }

    /**
     * Normalizes completion metrics from overloaded method signature.
     *
     * @param consumedSeverityOrMetrics Consumed severity or metrics payload.
     * @param completedAt Legacy completedAt value.
     * @returns Completion metrics.
     */
    private normalizeCompletionMetrics(
        consumedSeverityOrMetrics: number | IReviewCompletionMetrics,
        completedAt: Date | undefined,
    ): IReviewCompletionMetrics {
        if (typeof consumedSeverityOrMetrics === "number") {
            if (completedAt === undefined) {
                throw new Error("completedAt must be provided for legacy completion signature")
            }

            this.ensureDateIsValid(completedAt, "Review completedAt must be valid date")
            return {
                consumedSeverity: consumedSeverityOrMetrics,
                issueCount: this.props.issues.length,
                durationMs: this.calculateDurationMs(this.props.startedAt, completedAt),
                completedAt: new Date(completedAt),
            }
        }

        this.ensureDateIsValid(
            consumedSeverityOrMetrics.completedAt,
            "Review completedAt must be valid date",
        )
        return {
            consumedSeverity: consumedSeverityOrMetrics.consumedSeverity,
            issueCount: consumedSeverityOrMetrics.issueCount,
            durationMs: consumedSeverityOrMetrics.durationMs,
            completedAt: new Date(consumedSeverityOrMetrics.completedAt),
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

    /**
     * Validates issue count value shape.
     *
     * @param issueCount Issue count.
     * @throws Error when value is invalid.
     */
    private ensureIssueCountValue(issueCount: number): void {
        if (!Number.isInteger(issueCount)) {
            throw new Error("Issue count must be an integer")
        }
        if (issueCount < 0) {
            throw new Error("Issue count must be greater than or equal to zero")
        }
    }

    /**
     * Validates duration value shape.
     *
     * @param durationMs Duration in milliseconds.
     * @throws Error when value is invalid.
     */
    private ensureDurationValue(durationMs: number): void {
        if (!Number.isFinite(durationMs)) {
            throw new Error("Duration must be finite")
        }
        if (durationMs < 0) {
            throw new Error("Duration must be greater than or equal to zero")
        }
    }

    /**
     * Validates issue collection shape.
     *
     * @param issues Candidate issue collection.
     * @throws Error when collection contains invalid items.
     */
    private ensureIssueCollection(issues: readonly ReviewIssue[]): void {
        for (const issue of issues) {
            if (!(issue instanceof ReviewIssue)) {
                throw new Error("Review issues collection must contain ReviewIssue entities only")
            }
        }
    }

    /**
     * Validates required text field.
     *
     * @param value Candidate text.
     * @param errorMessage Error message for invalid value.
     * @throws Error when value is empty after trim.
     */
    private ensureRequiredText(value: string, errorMessage: string): void {
        if (value.trim().length === 0) {
            throw new Error(errorMessage)
        }
    }

    /**
     * Validates date value.
     *
     * @param value Candidate date.
     * @param errorMessage Error message for invalid value.
     * @throws Error when date is invalid.
     */
    private ensureDateIsValid(value: Date, errorMessage: string): void {
        if (Number.isNaN(value.getTime())) {
            throw new Error(errorMessage)
        }
    }

    /**
     * Calculates duration from optional start to finish date.
     *
     * @param startedAt Optional start timestamp.
     * @param finishedAt Finish timestamp.
     * @returns Non-negative duration in milliseconds.
     */
    private calculateDurationMs(startedAt: Date | null, finishedAt: Date): number {
        if (startedAt === null) {
            return 0
        }

        const durationMs = finishedAt.getTime() - startedAt.getTime()
        if (durationMs < 0) {
            return 0
        }

        return durationMs
    }
}
