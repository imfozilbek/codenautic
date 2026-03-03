import {type FeedbackType} from "../../../domain/events/feedback-received"
import {type SeverityLevel, SEVERITY_LEVEL} from "../../../domain/value-objects/severity.value-object"
import type {UniqueId} from "../../../domain/value-objects/unique-id.value-object"

/**
 * Allowed severity levels for feedback analytics filtering.
 */
export const FEEDBACK_ANALYSIS_SEVERITY_LEVELS = [
    SEVERITY_LEVEL.INFO,
    SEVERITY_LEVEL.LOW,
    SEVERITY_LEVEL.MEDIUM,
    SEVERITY_LEVEL.HIGH,
    SEVERITY_LEVEL.CRITICAL,
] as const

/**
 * Severity level used in feedback analytics filters.
 */
export type IFeedbackAnalysisSeverity = (typeof FEEDBACK_ANALYSIS_SEVERITY_LEVELS)[number]

/**
 * Single persisted feedback row.
 */
export interface IFeedbackRecord {
    /**
     * Review finding identifier.
     */
    readonly issueId: string

    /**
     * Review identifier.
     */
    readonly reviewId: string

    /**
     * Reviewed rule identifier.
     */
    readonly ruleId: string

    /**
     * Optional team scope where feedback originated.
     */
    readonly teamId?: string

    /**
     * Issue severity at time of feedback.
     */
    readonly severity?: SeverityLevel

    /**
     * Feedback type.
     */
    readonly type: FeedbackType

    /**
     * Identifier of user who submitted feedback.
     */
    readonly userId: UniqueId

    /**
     * Feedback creation timestamp.
     */
    readonly createdAt: Date
}

/**
 * Analytics query for feedback buckets.
 */
export interface IFeedbackAnalysisCriteria {
    /**
     * Rule ids to include.
     */
    readonly ruleIds?: readonly string[]

    /**
     * Team ids to include.
     */
    readonly teamIds?: readonly string[]

    /**
     * Severities to include.
     */
    readonly severities?: readonly IFeedbackAnalysisSeverity[]
}

/**
 * Feedback repository contract for analytical queries.
 */
export interface IFeedbackRepository {
    /**
     * Finds feedback rows for optional criteria.
     *
     * @param criteria Optional filter criteria.
     * @returns Matching feedback rows.
     */
    findByFilter(criteria?: IFeedbackAnalysisCriteria): Promise<readonly IFeedbackRecord[]>

    /**
     * Counts feedbacks by rule id for quick health checks.
     *
     * @param ruleId Rule identifier.
     * @returns Total feedback count.
     */
    countByRuleId(ruleId: string): Promise<number>

    /**
     * Counts false-positive feedbacks for quick health checks.
     *
     * @param ruleId Rule identifier.
     * @returns False-positive count.
     */
    countFalsePositiveByRuleId(ruleId: string): Promise<number>
}
