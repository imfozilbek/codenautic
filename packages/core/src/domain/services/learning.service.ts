import {FEEDBACK_TYPE, type FeedbackType} from "../events/feedback-received"
import {RuleEffectivenessService, type IRuleEffectivenessMetrics} from "./rule-effectiveness.service"

/**
 * Normalized learning signal used by the adaptive pipeline.
 */
export interface ILearningSignal {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * Feedback type.
     */
    readonly type: FeedbackType

    /**
     * Creation timestamp for decay and recency math.
     */
    readonly createdAt: Date
}

/**
 * Rule pattern adjustment payload.
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
     * Confidence in the adjustment in [0, 1].
     */
    readonly confidence: number

    /**
     * Number of samples used to produce adjustment.
     */
    readonly samples: number

    /**
     * False-positive ratio in [0, 1].
     */
    readonly falsePositiveRate: number

    /**
     * Helpful ratio in [0, 1].
     */
    readonly helpfulRate: number
}

/**
 * Service that aggregates learning signals and persists team adjustments.
 */
export interface ILearningService {
    /**
     * Collects feedback signals for offline effectiveness calculations.
     *
     * @param signals Feedback signals from review stream.
     */
    collectFeedback(signals: readonly ILearningSignal[]): void

    /**
     * Stores latest team-level adjustments.
     *
     * @param teamId Team identifier.
     * @param adjustments Team adjustment payload.
     */
    adjustWeights(teamId: string, adjustments: readonly ITeamPatternAdjustment[]): void

    /**
     * Resolves current effectiveness by rule.
     *
     * @param ruleId Rule identifier.
     * @returns Rule effectiveness snapshot.
     */
    getEffectiveness(ruleId: string): IRuleEffectivenessMetrics

    /**
     * Resolves stored pattern adjustments for team.
     *
     * @param teamId Team identifier.
     * @returns Adjustments sorted by impact descending.
     */
    getTeamPatterns(teamId: string): readonly ITeamPatternAdjustment[]
}

/**
 * Domain service for learning signal processing and team-specific weights.
 */
export class LearningService implements ILearningService {
    private readonly effectivenessService: RuleEffectivenessService
    private readonly teamPatterns = new Map<string, Map<string, ITeamPatternAdjustment>>()

    /**
     * Creates learning service.
     */
    public constructor() {
        this.effectivenessService = new RuleEffectivenessService()
    }

    /**
     * Collects feedback signals and tracks effectiveness.
     *
     * @param signals Feedback signals.
     */
    public collectFeedback(signals: readonly ILearningSignal[]): void {
        const grouped = this.groupSignals(signals)
        for (const [ruleId, groupedSignals] of grouped) {
            const normalizedSignals = groupedSignals.map((signal): {
                type: FeedbackType
                createdAt: Date
            } => ({
                type: signal.type,
                createdAt: signal.createdAt,
            }))

            this.effectivenessService.track(ruleId, normalizedSignals)
        }
    }

    /**
     * Stores latest adjustments for a team.
     *
     * @param teamId Team identifier.
     * @param adjustments Adjustment collection.
     */
    public adjustWeights(teamId: string, adjustments: readonly ITeamPatternAdjustment[]): void {
        const normalizedTeamId = teamId.trim()
        if (normalizedTeamId.length === 0) {
            return
        }

        const normalizedAdjustments = adjustments
            .map((adjustment): ITeamPatternAdjustment | null => {
                return this.normalizeAdjustment(adjustment)
            })
            .filter((adjustment): adjustment is ITeamPatternAdjustment => adjustment !== null)

        const byRule = new Map<string, ITeamPatternAdjustment>()
        for (const item of normalizedAdjustments) {
            byRule.set(item.ruleId, item)
        }

        this.teamPatterns.set(normalizedTeamId, byRule)
    }

    /**
     * Returns rule effectiveness metrics.
     *
     * @param ruleId Rule identifier.
     * @returns Rule effectiveness snapshot.
     */
    public getEffectiveness(ruleId: string): IRuleEffectivenessMetrics {
        const normalizedRuleId = ruleId.trim()
        return this.effectivenessService.getEffectiveness(normalizedRuleId)
    }

    /**
     * Returns team pattern adjustments sorted by impact.
     *
     * @param teamId Team identifier.
     * @returns Pattern snapshot sorted by abs(weightDelta)*confidence.
     */
    public getTeamPatterns(teamId: string): readonly ITeamPatternAdjustment[] {
        const normalizedTeamId = teamId.trim()
        const patterns = this.teamPatterns.get(normalizedTeamId)
        if (patterns === undefined) {
            return []
        }

        return [...patterns.values()]
            .sort((first, second) => {
                const firstImpact = Math.abs(first.weightDelta) * first.confidence
                const secondImpact = Math.abs(second.weightDelta) * second.confidence

                if (firstImpact === secondImpact) {
                    return second.samples - first.samples
                }

                return secondImpact - firstImpact
            })
    }

    private normalizeAdjustment(adjustment: ITeamPatternAdjustment): ITeamPatternAdjustment | null {
        const normalizedRuleId = adjustment.ruleId.trim()
        if (normalizedRuleId.length === 0) {
            return null
        }

        const normalizedWeight = Math.max(-1, Math.min(1, adjustment.weightDelta))

        if (Number.isNaN(normalizedWeight) || Number.isNaN(adjustment.samples)) {
            return null
        }

        const normalizedConfidence = Math.max(0, Math.min(1, adjustment.confidence))
        const falsePositiveRate = Math.max(0, Math.min(1, adjustment.falsePositiveRate))
        const helpfulRate = Math.max(0, Math.min(1, adjustment.helpfulRate))
        const samples = Math.max(0, Math.trunc(adjustment.samples))

        return {
            ...adjustment,
            ruleId: normalizedRuleId,
            weightDelta: normalizedWeight,
            confidence: normalizedConfidence,
            falsePositiveRate,
            helpfulRate,
            samples,
        }
    }

    private groupSignals(
        signals: readonly ILearningSignal[],
    ): Map<string, ILearningSignal[]> {
        const grouped = new Map<string, ILearningSignal[]>()

        for (const signal of signals) {
            if (signal.type !== FEEDBACK_TYPE.ACCEPTED && signal.type !== FEEDBACK_TYPE.FALSE_POSITIVE) {
                continue
            }

            const ruleId = signal.ruleId.trim()
            if (ruleId.length === 0) {
                continue
            }

            const current = grouped.get(ruleId)
            if (current === undefined) {
                grouped.set(ruleId, [signal])
                continue
            }

            current.push(signal)
        }

        return grouped
    }
}
