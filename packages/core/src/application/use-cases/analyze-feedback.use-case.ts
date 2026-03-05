import type {IUseCase} from "../ports/inbound/use-case.port"
import {FEEDBACK_TYPE} from "../../domain/events/feedback-received"
import {
    type IFeedbackAnalysisCriteria,
    type IFeedbackRecord,
    type IFeedbackRepository,
    type IFeedbackAnalysisSeverity,
} from "../ports/outbound/feedback-repository.port"
import {ValidationError, type IValidationErrorField} from "../../domain/errors/validation.error"
import {Result} from "../../shared/result"
import {normalizeSeverity} from "../shared/severity-normalization"

/**
 * Raw feedback counters per rule.
 */
interface IRuleFeedbackAccumulate {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * Total records for rule.
     */
    total: number

    /**
     * Helpful feedback count.
     */
    helpfulCount: number

    /**
     * False-positive feedback count.
     */
    falsePositiveCount: number
}

/**
 * Input for feedback analytics.
 */
export interface IAnalyzeFeedbackInput {
    /**
     * Optional rule filter.
     */
    readonly ruleIds?: readonly unknown[]

    /**
     * Optional team filter.
     */
    readonly teamIds?: readonly unknown[]

    /**
     * Optional severity filter.
     */
    readonly severities?: readonly unknown[]
}

/**
 * Output metric for one rule.
 */
export interface IAnalyzeFeedbackOutput {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * Helpful feedback ratio from 0 to 1.
     */
    readonly helpfulRate: number

    /**
     * False-positive feedback ratio from 0 to 1.
     */
    readonly falsePositiveRate: number

    /**
     * Total feedback count.
     */
    readonly total: number
}

/**
 * Aggregate feedback by rule id and compute simple effectiveness rates.
 */
export class AnalyzeFeedbackUseCase
    implements IUseCase<IAnalyzeFeedbackInput, readonly IAnalyzeFeedbackOutput[], ValidationError>
{
    private readonly feedbackRepository: IFeedbackRepository

    /**
     * Creates analyzer use case.
     *
     * @param feedbackRepository Source of feedback rows.
     */
    public constructor(feedbackRepository: IFeedbackRepository) {
        this.feedbackRepository = feedbackRepository
    }

    /**
     * Анализирует feedback и считает метрики по ruleId.
     *
     * @param input Raw filters from caller.
     * @returns Rate metrics grouped by ruleId.
     */
    public async execute(
        input: IAnalyzeFeedbackInput,
    ): Promise<Result<readonly IAnalyzeFeedbackOutput[], ValidationError>> {
        if (this.isInvalidInput(input) === true) {
            return Result.fail<readonly IAnalyzeFeedbackOutput[], ValidationError>(
                new ValidationError("Analyze feedback validation failed", [
                    {
                        field: "input",
                        message: "must be an object",
                    },
                ]),
            )
        }

        const normalized = this.normalizeInput(input)
        if (normalized.result.isFail) {
            return Result.fail<readonly IAnalyzeFeedbackOutput[], ValidationError>(
                normalized.result.error,
            )
        }

        const feedback = await this.feedbackRepository.findByFilter(normalized.criteria)
        const aggregated = this.aggregateByRule(feedback)

        const output = [...aggregated.values()]
            .map((item: IRuleFeedbackAccumulate): IAnalyzeFeedbackOutput => {
                return {
                    ruleId: item.ruleId,
                    helpfulRate: item.helpfulCount / item.total,
                    falsePositiveRate: item.falsePositiveCount / item.total,
                    total: item.total,
                }
            })
            .sort((first, second) => {
                if (first.ruleId < second.ruleId) {
                    return -1
                }

                if (first.ruleId > second.ruleId) {
                    return 1
                }

                return 0
            })

        return Result.ok<readonly IAnalyzeFeedbackOutput[], ValidationError>(output)
    }

    /**
     * Detects when input is not plain object.
     *
     * @param input Input payload.
     * @returns True when input shape is invalid.
     */
    private isInvalidInput(input: IAnalyzeFeedbackInput): boolean {
        return (
            typeof input !== "object" ||
            input === null ||
            Array.isArray(input)
        )
    }

    /**
     * Normalizes and validates input filters.
     *
     * @param input Raw input.
     * @returns Validation result and normalized criteria.
     */
    private normalizeInput(
        input: IAnalyzeFeedbackInput,
    ): {readonly result: Result<IFeedbackAnalysisCriteria, ValidationError>; readonly criteria?: IFeedbackAnalysisCriteria} {
        const fields: IValidationErrorField[] = []

        const ruleIds = this.normalizeStringArray(input.ruleIds, fields, "ruleIds")
        const teamIds = this.normalizeStringArray(input.teamIds, fields, "teamIds")
        const severities = this.normalizeSeverities(input.severities, fields)

        if (fields.length > 0) {
            return {
                result: Result.fail<IFeedbackAnalysisCriteria, ValidationError>(
                    new ValidationError("Analyze feedback validation failed", fields),
                ),
            }
        }

        const criteria: IFeedbackAnalysisCriteria = {
            ...(ruleIds === undefined ? {} : {ruleIds}),
            ...(teamIds === undefined ? {} : {teamIds}),
            ...(severities === undefined ? {} : {severities}),
        }

        return {
            result: Result.ok<IFeedbackAnalysisCriteria, ValidationError>(criteria),
            criteria,
        }
    }

    /**
     * Group feedback rows by ruleId and calculate useful rates.
     *
     * @param feedback Raw feedback rows.
     * @returns Rule-based aggregate rows.
     */
    private aggregateByRule(
        feedback: readonly IFeedbackRecord[],
    ): Map<string, IRuleFeedbackAccumulate> {
        const result = new Map<string, IRuleFeedbackAccumulate>()

        for (const item of feedback) {
            this.mergeFeedbackItem(result, item)
        }

        return result
    }

    /**
     * Adds one feedback row into aggregate map.
     *
     * @param aggregate Current map state.
     * @param item Feedback row.
     */
    private mergeFeedbackItem(
        aggregate: Map<string, IRuleFeedbackAccumulate>,
        item: IFeedbackRecord,
    ): void {
        const ruleId = item.ruleId?.trim()
        if (ruleId === undefined || ruleId.length === 0) {
            return
        }

        const existing = aggregate.get(ruleId)
        const updated = existing === undefined
            ? this.createInitialAccumulator(ruleId)
            : existing

        const isHelpful = item.type === FEEDBACK_TYPE.ACCEPTED
        const isFalsePositive = item.type === FEEDBACK_TYPE.FALSE_POSITIVE

        aggregate.set(ruleId, {
            ...updated,
            total: updated.total + 1,
            helpfulCount: isHelpful ? updated.helpfulCount + 1 : updated.helpfulCount,
            falsePositiveCount: isFalsePositive
                ? updated.falsePositiveCount + 1
                : updated.falsePositiveCount,
        })
    }

    /**
     * Initial accumulator for new rule.
     *
     * @param ruleId Rule identifier.
     * @returns Empty counters for rule.
     */
    private createInitialAccumulator(ruleId: string): IRuleFeedbackAccumulate {
        return {
            ruleId,
            total: 0,
            helpfulCount: 0,
            falsePositiveCount: 0,
        }
    }

    /**
     * Normalizes optional string list.
     *
     * @param values Raw values.
     * @param fields Validation accumulator.
     * @param fieldName Field for diagnostics.
     * @returns Trimmed unique values or undefined.
     */
    private normalizeStringArray(
        values: readonly unknown[] | undefined,
        fields: IValidationErrorField[],
        fieldName: string,
    ): readonly string[] | undefined {
        if (values === undefined) {
            return undefined
        }

        if (Array.isArray(values) === false) {
            fields.push({
                field: fieldName,
                message: `${fieldName} must be an array of strings`,
            })
            return undefined
        }

        const normalized: string[] = []
        const dedup = new Set<string>()

        for (const value of values) {
            if (typeof value !== "string" || value.trim().length === 0) {
                fields.push({
                    field: fieldName,
                    message: `${fieldName} must be an array of non-empty strings`,
                })
                return undefined
            }

            const normalizedValue = value.trim()
            if (dedup.has(normalizedValue) === false) {
                dedup.add(normalizedValue)
                normalized.push(normalizedValue)
            }
        }

        return normalized
    }

    /**
     * Normalizes severity filter values.
     *
     * @param severities Raw severities.
     * @param fields Validation accumulator.
     * @returns Normalized severities or undefined.
     */
    private normalizeSeverities(
        severities: readonly unknown[] | undefined,
        fields: IValidationErrorField[],
    ): ReadonlyArray<IFeedbackAnalysisSeverity> | undefined {
        if (severities === undefined) {
            return undefined
        }

        const values = this.normalizeStringArray(severities, fields, "severities")
        if (values === undefined) {
            return undefined
        }

        const normalized: IFeedbackAnalysisSeverity[] = []
        const dedup = new Set<string>()

        for (const severity of values) {
            const normalizedSeverity = this.resolveSeverity(severity)
            if (normalizedSeverity === undefined) {
                fields.push({
                    field: "severities",
                    message: "severities must contain known Severity values",
                })
                return undefined
            }

            if (dedup.has(normalizedSeverity) === false) {
                dedup.add(normalizedSeverity)
                normalized.push(normalizedSeverity)
            }
        }

        return normalized
    }

    /**
     * Normalizes and validates one severity value.
     *
     * @param rawValue Raw severity string.
     * @returns Normalized severity level or undefined.
     */
    private resolveSeverity(rawValue: string): IFeedbackAnalysisSeverity | undefined {
        return normalizeSeverity(rawValue)
    }
}
