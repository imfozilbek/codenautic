import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IFeedbackRepository} from "../ports/outbound/feedback-repository.port"
import {FEEDBACK_TYPE} from "../../domain/events/feedback-received"
import {ValidationError, type IValidationErrorField} from "../../domain/errors/validation.error"
import {Result} from "../../shared/result"

interface ITeamPatternConfig {
    readonly minSampleSize: number
    readonly minConfidence: number
    readonly minWeightDelta: number
    readonly maxAdjustments: number
    readonly ruleIds?: readonly string[]
}

/**
 * Input for learning team coding patterns.
 */
export interface ILearnTeamPatternsInput {
    /**
     * Team identifier to scope patterns.
     */
    readonly teamId?: unknown

    /**
     * Minimum samples needed for a rule to be considered.
     */
    readonly minSampleSize?: unknown

    /**
     * Minimum confidence for emitted adjustment.
     */
    readonly minConfidence?: unknown

    /**
     * Minimal absolute adjustment magnitude to include.
     */
    readonly minWeightDelta?: unknown

    /**
     * Maximum number of adjustments returned.
     */
    readonly maxAdjustments?: unknown

    /**
     * Optional rule filter.
     */
    readonly ruleIds?: readonly unknown[]
}

/**
 * Team adjustment item.
 */
export interface ITeamPatternAdjustment {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * Normalized weight delta in [-1, 1].
     */
    readonly weightDelta: number

    /**
     * Confidence score in [0, 1].
     */
    readonly confidence: number

    /**
     * Number of feedback samples used.
     */
    readonly samples: number

    /**
     * False-positive feedback ratio.
     */
    readonly falsePositiveRate: number

    /**
     * Accepted feedback ratio.
     */
    readonly helpfulRate: number
}

/**
 * Team-specific learning output.
 */
export interface ILearnTeamPatternsOutput {
    /**
     * Team identifier.
     */
    readonly teamId: string

    /**
     * Team-specific suggestion weight adjustments.
     */
    readonly adjustments: readonly ITeamPatternAdjustment[]

    /**
     * Processed feedback rows after filtering.
     */
    readonly processedFeedbackCount: number
}

/**
 * Use case that extracts team-specific correction signals from feedback.
 */
export class LearnTeamPatternsUseCase
    implements IUseCase<ILearnTeamPatternsInput, ILearnTeamPatternsOutput, ValidationError>
{
    private static readonly DEFAULT_MIN_SAMPLE_SIZE = 5
    private static readonly DEFAULT_MIN_CONFIDENCE = 0.35
    private static readonly DEFAULT_MIN_WEIGHT_DELTA = 0.1
    private static readonly DEFAULT_MAX_ADJUSTMENTS = 20

    private readonly feedbackRepository: IFeedbackRepository

    /**
     * Creates use case.
     *
     * @param feedbackRepository Feedback source.
     */
    public constructor(feedbackRepository: IFeedbackRepository) {
        this.feedbackRepository = feedbackRepository
    }

    /**
     * Learns team-specific patterns and returns suggestion weight adjustments.
     *
     * @param input Raw input from caller.
     * @returns Team adjustments.
     */
    public async execute(
        input: ILearnTeamPatternsInput,
    ): Promise<Result<ILearnTeamPatternsOutput, ValidationError>> {
        if (this.isInvalidInput(input) === true) {
            return Result.fail<ILearnTeamPatternsOutput, ValidationError>(
                new ValidationError("Learn team patterns validation failed", [
                    {
                        field: "input",
                        message: "must be an object",
                    },
                ]),
            )
        }

        const normalized = this.normalizeInput(input)
        if (normalized.result.isFail) {
            return Result.fail<ILearnTeamPatternsOutput, ValidationError>(
                normalized.result.error,
            )
        }

        if (normalized.criteria === undefined || normalized.teamId === undefined) {
            return Result.fail<ILearnTeamPatternsOutput, ValidationError>(
                new ValidationError("Learn team patterns validation failed", [
                    {
                        field: "internal",
                        message: "Validation result is incomplete",
                    },
                ]),
            )
        }

        const {criteria, teamId} = normalized
        const feedback = await this.feedbackRepository.findByFilter({
            ...(criteria.ruleIds === undefined ? {} : {ruleIds: criteria.ruleIds}),
            teamIds: [teamId],
        })

        const metrics = this.aggregateByRule(feedback)
        const adjustments = [...metrics.entries()]
            .map(([ruleId, item]): ITeamPatternAdjustment | null => {
                return this.resolveAdjustmentWithRuleId(ruleId, item, criteria)
            })
            .filter((item): item is ITeamPatternAdjustment => item !== null)
            .sort((first, second) => {
                const firstImpact = Math.abs(first.weightDelta) * first.confidence
                const secondImpact = Math.abs(second.weightDelta) * second.confidence
                if (firstImpact === secondImpact) {
                    return second.samples - first.samples
                }

                return secondImpact - firstImpact
            })
            .slice(0, criteria.maxAdjustments)

        return Result.ok<ILearnTeamPatternsOutput, ValidationError>({
            teamId,
            adjustments,
            processedFeedbackCount: feedback.length,
        })
    }

    /**
     * Validates plain-object input shape.
     *
     * @param input Input payload.
     * @returns Whether payload is invalid.
     */
    private isInvalidInput(input: ILearnTeamPatternsInput): boolean {
        return (
            typeof input !== "object" ||
            input === null ||
            Array.isArray(input)
        )
    }

    /**
     * Validates and normalizes input.
     *
     * @param input Raw input.
     * @returns Validation result and criteria.
     */
    private normalizeInput(
        input: ILearnTeamPatternsInput,
    ): {
        readonly result: Result<ITeamPatternConfig, ValidationError>
        readonly criteria?: ITeamPatternConfig
        readonly teamId?: string
    } {
        const fields: IValidationErrorField[] = []

        const teamId = this.normalizeTeamId(input.teamId, fields)
        const minSampleSize = this.normalizePositiveInt(
            input.minSampleSize,
            LearnTeamPatternsUseCase.DEFAULT_MIN_SAMPLE_SIZE,
            fields,
            "minSampleSize",
        )
        const minConfidence = this.normalizeRate(
            input.minConfidence,
            LearnTeamPatternsUseCase.DEFAULT_MIN_CONFIDENCE,
            fields,
            "minConfidence",
        )
        const minWeightDelta = this.normalizeRate(
            input.minWeightDelta,
            LearnTeamPatternsUseCase.DEFAULT_MIN_WEIGHT_DELTA,
            fields,
            "minWeightDelta",
        )
        const maxAdjustments = this.normalizePositiveInt(
            input.maxAdjustments,
            LearnTeamPatternsUseCase.DEFAULT_MAX_ADJUSTMENTS,
            fields,
            "maxAdjustments",
        )
        const ruleIds = this.normalizeStringArray(input.ruleIds, fields)

        if (fields.length > 0) {
            return {
                result: Result.fail<ITeamPatternConfig, ValidationError>(
                    new ValidationError("Learn team patterns validation failed", fields),
                ),
            }
        }

        const criteria: ITeamPatternConfig = {
            minSampleSize,
            minConfidence,
            minWeightDelta,
            maxAdjustments,
            ...(ruleIds === undefined ? {} : {ruleIds}),
        }

        return {
            result: Result.ok<ITeamPatternConfig, ValidationError>(criteria),
            criteria,
            teamId,
        }
    }

    /**
     * Normalizes team id.
     *
     * @param rawTeamId Raw team id.
     * @param fields Validation accumulator.
     * @returns Trimmed team id or undefined.
     */
    private normalizeTeamId(
        rawTeamId: unknown,
        fields: IValidationErrorField[],
    ): string | undefined {
        if (typeof rawTeamId !== "string" || rawTeamId.trim().length === 0) {
            fields.push({
                field: "teamId",
                message: "teamId must be a non-empty string",
            })
            return undefined
        }

        return rawTeamId.trim()
    }

    /**
     * Normalizes optional string list.
     *
     * @param values Raw values.
     * @param fields Validation accumulator.
     * @returns Trimmed unique values or undefined.
     */
    private normalizeStringArray(
        values: readonly unknown[] | undefined,
        fields: IValidationErrorField[],
    ): readonly string[] | undefined {
        if (values === undefined) {
            return undefined
        }

        if (Array.isArray(values) === false) {
            fields.push({
                field: "ruleIds",
                message: "ruleIds must be an array of strings",
            })
            return undefined
        }

        const dedup = new Set<string>()
        const normalized: string[] = []

        for (const value of values) {
            if (typeof value !== "string" || value.trim().length === 0) {
                fields.push({
                    field: "ruleIds",
                    message: "ruleIds must be an array of non-empty strings",
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
     * Normalizes optional integer values.
     *
     * @param rawValue Raw value.
     * @param defaultValue Default fallback.
     * @param fields Validation accumulator.
     * @param fieldName Field for diagnostics.
     * @returns Valid integer or NaN.
     */
    private normalizePositiveInt(
        rawValue: unknown,
        defaultValue: number,
        fields: IValidationErrorField[],
        fieldName: string,
    ): number {
        if (rawValue === undefined) {
            return defaultValue
        }

        if (
            typeof rawValue !== "number" ||
            Number.isInteger(rawValue) === false ||
            rawValue < 1 ||
            Number.isNaN(rawValue)
        ) {
            fields.push({
                field: fieldName,
                message: `${fieldName} must be a positive integer`,
            })
            return Number.NaN
        }

        return rawValue
    }

    /**
     * Normalizes optional rate values.
     *
     * @param rawValue Raw value.
     * @param defaultValue Default fallback.
     * @param fields Validation accumulator.
     * @param fieldName Field for diagnostics.
     * @returns Number in [0,1] or NaN.
     */
    private normalizeRate(
        rawValue: unknown,
        defaultValue: number,
        fields: IValidationErrorField[],
        fieldName: string,
    ): number {
        if (rawValue === undefined) {
            return defaultValue
        }

        if (
            typeof rawValue !== "number" ||
            Number.isNaN(rawValue) ||
            rawValue < 0 ||
            rawValue > 1
        ) {
            fields.push({
                field: fieldName,
                message: `${fieldName} must be a number between 0 and 1`,
            })
            return Number.NaN
        }

        return rawValue
    }

    /**
     * Aggregates feedback rows by ruleId.
     *
     * @param feedback Feedback rows.
     * @returns Aggregated counters.
     */
    private aggregateByRule(
        feedback: readonly {
            readonly ruleId: string
            readonly type: string
        }[],
    ): Map<string, {
        total: number
        accepted: number
        falsePositive: number
    }> {
        const result = new Map<string, {total: number; accepted: number; falsePositive: number}>()

        for (const record of feedback) {
            const ruleId = record.ruleId.trim()
            if (ruleId.length === 0) {
                continue
            }

            const current = result.get(ruleId)
            const next = current ?? {total: 0, accepted: 0, falsePositive: 0}
            const merged = {
                total: next.total + 1,
                accepted: next.accepted + (record.type === FEEDBACK_TYPE.ACCEPTED ? 1 : 0),
                falsePositive: next.falsePositive + (record.type === FEEDBACK_TYPE.FALSE_POSITIVE ? 1 : 0),
            }

            result.set(ruleId, merged)
        }

        return result
    }

    /**
     * Resolves one team-specific weight adjustment.
     *
     * @param metric Aggregated rule metric.
     * @param config Input configuration.
     * @returns Adjustment row or null when not actionable.
     */
    private resolveAdjustment(
        metric: {
            readonly total: number
            readonly accepted: number
            readonly falsePositive: number
        },
        config: ITeamPatternConfig,
    ): ITeamPatternAdjustment | null {
        const acceptedRate = metric.accepted / metric.total
        const falsePositiveRate = metric.falsePositive / metric.total
        const confidence = Math.min(1, metric.total / config.minSampleSize)

        if (confidence < config.minConfidence || metric.total < config.minSampleSize) {
            return null
        }

        const rawAdjustment = acceptedRate - falsePositiveRate
        const weightDelta = Math.max(-1, Math.min(1, rawAdjustment))

        if (Math.abs(weightDelta) < config.minWeightDelta) {
            return null
        }

        return {
            ruleId: "",
            weightDelta,
            confidence,
            samples: metric.total,
            falsePositiveRate,
            helpfulRate: acceptedRate,
        }
    }

    /**
     * Populates ruleId into resolved adjustment by key.
     *
     * @param metric Metric entry.
     * @param config Input configuration.
     * @returns Adjustment or null.
     */
    private resolveAdjustmentWithRuleId(
        ruleId: string,
        metric: {
            readonly total: number
            readonly accepted: number
            readonly falsePositive: number
        },
        config: ITeamPatternConfig,
    ): ITeamPatternAdjustment | null {
        const adjustment = this.resolveAdjustment(metric, config)
        if (adjustment === null) {
            return null
        }

        return {
            ...adjustment,
            ruleId,
        }
    }
}
