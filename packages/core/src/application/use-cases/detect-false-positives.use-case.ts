import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IFeedbackRepository} from "../ports/outbound/feedback-repository.port"
import {RuleEffectivenessService} from "../../domain/services/rule-effectiveness.service"
import {ValidationError, type IValidationErrorField} from "../../domain/errors/validation.error"
import {Result} from "../../shared/result"
import type {IFalsePositiveDetectionDefaults} from "../dto/config/system-defaults.dto"

/**
 * Heuristic output recommendation.
 */
export type IFalsePositiveRecommendation = "DEACTIVATE_RULE" | "MONITOR"

interface IDetectFalsePositivesConfig {
    readonly threshold: number
    readonly deactivateThreshold: number
    readonly minSampleSize: number
    readonly minDeactivateSampleSize: number
}

/**
 * Input for false-positive detection.
 */
export interface IDetectFalsePositivesInput {
    /**
     * Optional lower bound (exclusive) for false-positive rate.
     */
    readonly threshold?: unknown

    /**
     * Optional boundary at which recommendation changes to deactivation.
     */
    readonly deactivateThreshold?: unknown

    /**
     * Optional minimum sample size to include rule in output.
     */
    readonly minSampleSize?: unknown

    /**
     * Optional minimum sample size to recommend deactivation.
     */
    readonly minDeactivateSampleSize?: unknown

    /**
     * Optional rule filter.
     */
    readonly ruleIds?: readonly unknown[]
}

/**
 * One recommendation row.
 */
export interface IDetectFalsePositivesOutput {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * False-positive ratio in [0,1].
     */
    readonly rate: number

    /**
     * Recommended action.
     */
    readonly recommendation: IFalsePositiveRecommendation
}

/**
 * Use case that detects rules with suspicious false-positive rates.
 */
export class DetectFalsePositivesUseCase
    implements IUseCase<IDetectFalsePositivesInput, readonly IDetectFalsePositivesOutput[], ValidationError>
{
    private readonly feedbackRepository: IFeedbackRepository
    private readonly defaults: IFalsePositiveDetectionDefaults

    /**
     * Creates use case.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: {
        readonly feedbackRepository: IFeedbackRepository
        readonly defaults: IFalsePositiveDetectionDefaults
    }) {
        this.feedbackRepository = dependencies.feedbackRepository
        this.defaults = dependencies.defaults
    }

    /**
     * Detects rules that exceed false-positive thresholds.
     *
     * @param input Detection settings and optional rule filter.
     * @returns Sorted recommendations by suspiciousness.
     */
    public async execute(
        input: IDetectFalsePositivesInput,
    ): Promise<Result<readonly IDetectFalsePositivesOutput[], ValidationError>> {
        if (this.isInvalidInput(input) === true) {
            return Result.fail<readonly IDetectFalsePositivesOutput[], ValidationError>(
                new ValidationError("Detect false positives validation failed", [
                    {
                        field: "input",
                        message: "must be an object",
                    },
                ]),
            )
        }

        const normalized = this.normalizeInput(input)
        if (normalized.result.isFail) {
            return Result.fail<readonly IDetectFalsePositivesOutput[], ValidationError>(
                normalized.result.error,
            )
        }
        if (normalized.criteria === undefined) {
            return Result.fail<readonly IDetectFalsePositivesOutput[], ValidationError>(
                new ValidationError("Detect false positives validation failed", [
                    {
                        field: "internal",
                        message: "Validation result is incomplete",
                    },
                ]),
            )
        }
        const {criteria} = normalized

        const feedback = await this.feedbackRepository.findByFilter({
            ...(criteria.ruleIds === undefined ? {} : {ruleIds: criteria.ruleIds}),
        })

        const service = new RuleEffectivenessService()
        const uniqueRuleIds = new Set<string>()

        for (const item of feedback) {
            const ruleId = item.ruleId?.trim()
            if (ruleId === undefined || ruleId.length === 0) {
                continue
            }

            uniqueRuleIds.add(ruleId)
            service.track(ruleId, [{
                type: item.type,
                createdAt: item.createdAt,
            }])
        }

        const output = [...uniqueRuleIds]
            .map((ruleId: string): IDetectFalsePositivesOutput | null => {
                const metrics = service.getEffectiveness(ruleId)

                if (
                    metrics.falsePositiveRate <= criteria.threshold ||
                    metrics.totalSamples < criteria.minSampleSize
                ) {
                    return null
                }

                return {
                    ruleId,
                    rate: metrics.falsePositiveRate,
                    recommendation: this.resolveRecommendation(metrics, criteria),
                }
            })
            .filter((entry): entry is IDetectFalsePositivesOutput => entry !== null)
            .sort((first, second) => second.rate - first.rate)

        return Result.ok<readonly IDetectFalsePositivesOutput[], ValidationError>(output)
    }

    /**
     * Validates plain-object input shape.
     *
     * @param input Input payload.
     * @returns Whether payload is not an object.
     */
    private isInvalidInput(input: IDetectFalsePositivesInput): boolean {
        return (
            typeof input !== "object" ||
            input === null ||
            Array.isArray(input)
        )
    }

    /**
     * Validates and normalizes input into typed config.
     *
     * @param input Raw input.
     * @returns Validation result + normalized config.
     */
    private normalizeInput(
        input: IDetectFalsePositivesInput,
    ): {readonly result: Result<IDetectFalsePositivesConfig & {ruleIds?: readonly string[]}, ValidationError>; readonly criteria?: IDetectFalsePositivesConfig & {
        readonly ruleIds?: readonly string[]
    }} {
        const fields: IValidationErrorField[] = []
        const threshold = this.normalizeRate(input.threshold, this.defaults.threshold)
        const deactivateThreshold = this.normalizeRate(
            input.deactivateThreshold,
            this.defaults.deactivateThreshold,
        )
        const minSampleSize = this.normalizeSampleSize(
            input.minSampleSize,
            this.defaults.minSampleSize,
        )
        const minDeactivateSampleSize = this.normalizeSampleSize(
            input.minDeactivateSampleSize,
            this.defaults.minDeactivateSampleSize,
        )
        const ruleIds = this.normalizeRuleIds(input.ruleIds, fields)

        if (Number.isNaN(threshold)) {
            fields.push({
                field: "threshold",
                message: "threshold must be a number between 0 and 1",
            })
        }

        if (Number.isNaN(deactivateThreshold)) {
            fields.push({
                field: "deactivateThreshold",
                message: "deactivateThreshold must be a number between 0 and 1",
            })
        }

        if (Number.isNaN(minSampleSize)) {
            fields.push({
                field: "minSampleSize",
                message: "minSampleSize must be a positive integer",
            })
        }

        if (Number.isNaN(minDeactivateSampleSize)) {
            fields.push({
                field: "minDeactivateSampleSize",
                message: "minDeactivateSampleSize must be a positive integer",
            })
        }

        if (threshold > deactivateThreshold) {
            fields.push({
                field: "deactivateThreshold",
                message: "deactivateThreshold must be greater than or equal to threshold",
            })
        }

        if (fields.length > 0) {
            return {
                result: Result.fail<IDetectFalsePositivesConfig & {ruleIds?: readonly string[]}, ValidationError>(
                    new ValidationError("Detect false positives validation failed", fields),
                ),
            }
        }

        const criteria: IDetectFalsePositivesConfig & {ruleIds?: readonly string[]} = {
            threshold,
            deactivateThreshold,
            minSampleSize,
            minDeactivateSampleSize,
            ...(ruleIds === undefined ? {} : {ruleIds}),
        }

        return {
            result: Result.ok<IDetectFalsePositivesConfig & {ruleIds?: readonly string[]}, ValidationError>(criteria),
            criteria,
        }
    }

    /**
     * Resolves recommendation by weighted false-positive metrics.
     *
     * @param metrics Rule effectiveness metrics.
     * @param config Config.
     * @returns Recommendation.
     */
    private resolveRecommendation(
        metrics: {
            readonly falsePositiveRate: number
            readonly totalSamples: number
        },
        config: IDetectFalsePositivesConfig,
    ): IFalsePositiveRecommendation {
        const canDeactivate = metrics.totalSamples >= config.minDeactivateSampleSize
            && metrics.falsePositiveRate >= config.deactivateThreshold

        return canDeactivate ? "DEACTIVATE_RULE" : "MONITOR"
    }

    /**
     * Normalizes required and optional rate values.
     *
     * @param raw Raw rate value.
     * @param field Field name for diagnostics.
     * @param defaultValue Fallback value.
     * @returns Number in [0,1].
     */
    private normalizeRate(raw: unknown, defaultValue: number): number {
        if (raw === undefined) {
            return defaultValue
        }

        if (typeof raw !== "number" || Number.isNaN(raw) || raw < 0 || raw > 1) {
            return Number.NaN
        }

        return raw
    }

    /**
     * Normalizes required and optional integer sample size values.
     *
     * @param raw Raw sample size.
     * @param field Field name for diagnostics.
     * @param defaultValue Fallback value.
     * @returns Positive integer.
     */
    private normalizeSampleSize(raw: unknown, defaultValue: number): number {
        if (raw === undefined) {
            return defaultValue
        }

        if (
            typeof raw !== "number" ||
            Number.isNaN(raw) ||
            raw < 1 ||
            Number.isInteger(raw) === false
        ) {
            return Number.NaN
        }

        return raw
    }

    /**
     * Normalizes rule filter.
     *
     * @param ruleIds Raw rule ids.
     * @param fields Validation result fields.
     * @returns Trimmed unique rule ids or undefined.
     */
    private normalizeRuleIds(
        ruleIds: readonly unknown[] | undefined,
        fields: IValidationErrorField[],
    ): readonly string[] | undefined {
        if (ruleIds === undefined) {
            return undefined
        }

        if (Array.isArray(ruleIds) === false) {
            fields.push({
                field: "ruleIds",
                message: "ruleIds must be an array of strings",
            })
            return undefined
        }

        const normalized = new Set<string>()
        for (const value of ruleIds) {
            if (typeof value !== "string" || value.trim().length === 0) {
                fields.push({
                    field: "ruleIds",
                    message: "ruleIds must be an array of non-empty strings",
                })
                return undefined
            }

            normalized.add(value.trim())
        }

        return [...normalized]
    }
}
