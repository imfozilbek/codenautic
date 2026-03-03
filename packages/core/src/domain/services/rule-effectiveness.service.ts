import {FEEDBACK_TYPE, type FeedbackType} from "../events/feedback-received"

/**
 * External feedback signal used by effectiveness calculations.
 */
export interface IRuleFeedbackSignal {
    /**
     * Time when feedback was created.
     */
    readonly createdAt: Date

    /**
     * Feedback kind.
     */
    readonly type: FeedbackType
}

/**
 * Configuration for effectivness decay model.
 */
export interface IRuleEffectivenessServiceConfig {
    /**
     * Half-life in hours for exponential decay.
     */
    readonly halfLifeHours?: number

    /**
     * Time source used in calculations.
     */
    readonly now?: Date
}

/**
 * Rule effectivness snapshot with rates from weighted feedback signals.
 */
export interface IRuleEffectivenessMetrics {
    /**
     * Rule identifier.
     */
    readonly ruleId: string

    /**
     * Helpful ratio after decay in range [0,1].
     */
    readonly helpfulRate: number

    /**
     * False-positive ratio after decay in range [0,1].
     */
    readonly falsePositiveRate: number

    /**
     * Implemented ratio after decay in range [0,1].
     */
    readonly implementedRate: number

    /**
     * Effective sample weight after decay.
     */
    readonly weightedSampleSize: number

    /**
     * Raw sample size tracked for this rule.
     */
    readonly totalSamples: number
}

interface IRuleFeedbackAccumulator {
    readonly signals: readonly IRuleFeedbackSignal[]
}

/**
 * Domain service for rule effectiveness calculations.
 */
export class RuleEffectivenessService {
    private static readonly MIN_HALF_LIFE_HOURS = 1
    private static readonly DEFAULT_HALF_LIFE_HOURS = 168

    private readonly halfLifeHours: number
    private readonly now: Date
    private readonly records: Map<string, IRuleFeedbackAccumulator> = new Map()

    /**
     * Creates service instance.
     *
     * @param config Service config.
     */
    public constructor(config?: IRuleEffectivenessServiceConfig) {
        this.halfLifeHours = Math.max(
            RuleEffectivenessService.MIN_HALF_LIFE_HOURS,
            config?.halfLifeHours ?? RuleEffectivenessService.DEFAULT_HALF_LIFE_HOURS,
        )
        this.now = config?.now ?? new Date()
    }

    /**
     * Tracks feedback signals for one rule.
     *
     * @param ruleId Rule identifier.
     * @param signals Feedback signals.
     */
    public track(ruleId: string, signals: readonly IRuleFeedbackSignal[]): void {
        const normalizedRuleId = ruleId.trim()
        if (normalizedRuleId.length === 0 || signals.length === 0) {
            return
        }

        const current = this.records.get(normalizedRuleId)
        const merged = this.mergeSignals(current?.signals ?? [], signals)
        this.records.set(normalizedRuleId, {signals: merged})
    }

    /**
     * Calculates effectiveness metrics for rule id.
     *
     * @param ruleId Rule identifier.
     * @returns Current metrics.
     */
    public getEffectiveness(ruleId: string): IRuleEffectivenessMetrics {
        const normalizedRuleId = ruleId.trim()
        if (normalizedRuleId.length === 0) {
            return this.createEmptyMetrics("")
        }

        const record = this.records.get(normalizedRuleId)
        if (record === undefined || record.signals.length === 0) {
            return this.createEmptyMetrics(normalizedRuleId)
        }

        const accumulator = this.createAccumulator(normalizedRuleId, record.signals)
        const divisor = accumulator.totalWeight > 0 ? accumulator.totalWeight : 0
        const helpfulRate = divisor > 0 ? accumulator.helpfulWeight / divisor : 0
        const falsePositiveRate = divisor > 0
            ? accumulator.falsePositiveWeight / divisor
            : 0
        const implementedRate = divisor > 0 ? accumulator.implementedWeight / divisor : 0

        return {
            ruleId: normalizedRuleId,
            helpfulRate,
            falsePositiveRate,
            implementedRate,
            weightedSampleSize: divisor,
            totalSamples: record.signals.length,
        }
    }

    /**
     * Removes all tracked records.
     */
    public clear(): void {
        this.records.clear()
    }

    private createAccumulator(
        ruleId: string,
        signals: readonly IRuleFeedbackSignal[],
    ): {
        helpfulWeight: number
        falsePositiveWeight: number
        implementedWeight: number
        totalWeight: number
    } {
        let helpfulWeight = 0
        let falsePositiveWeight = 0
        let implementedWeight = 0
        let totalWeight = 0

        for (const signal of signals) {
            const weight = this.resolveDecayWeight(signal.createdAt)
            totalWeight += weight

            if (signal.type === FEEDBACK_TYPE.ACCEPTED) {
                helpfulWeight += weight
                implementedWeight += weight
                continue
            }

            if (signal.type === FEEDBACK_TYPE.FALSE_POSITIVE) {
                falsePositiveWeight += weight
            }
        }

        return {
            helpfulWeight,
            falsePositiveWeight,
            implementedWeight,
            totalWeight,
        }
    }

    private resolveDecayWeight(createdAt: Date): number {
        const delta = this.now.getTime() - createdAt.getTime()
        if (delta <= 0) {
            return 1
        }

        const ageHours = delta / (60 * 60 * 1000)
        const exponent = ageHours / this.halfLifeHours
        return Math.pow(0.5, exponent)
    }

    private createEmptyMetrics(ruleId: string): IRuleEffectivenessMetrics {
        return {
            ruleId,
            helpfulRate: 0,
            falsePositiveRate: 0,
            implementedRate: 0,
            weightedSampleSize: 0,
            totalSamples: 0,
        }
    }

    private mergeSignals(
        left: readonly IRuleFeedbackSignal[],
        right: readonly IRuleFeedbackSignal[],
    ): readonly IRuleFeedbackSignal[] {
        if (right.length === 0) {
            return [...left]
        }

        if (left.length === 0) {
            return [...right]
        }

        return [...left, ...right]
    }
}
