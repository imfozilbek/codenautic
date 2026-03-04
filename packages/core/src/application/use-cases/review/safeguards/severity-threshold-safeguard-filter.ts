import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import type {ReviewPipelineState} from "../../../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../../../types/review/safeguard-filter.contract"
import {Severity, SEVERITY_LEVEL} from "../../../../domain/value-objects/severity.value-object"
import {createDiscardedSuggestion, resolveSeverityLevel} from "./safeguard-filter.utils"
import type {ISeveritySafeguardDefaults} from "../../../dto/config/system-defaults.dto"

const FILTER_NAME = "severity-threshold"
const BELOW_THRESHOLD_DISCARD_REASON = "below_threshold"

interface ISeverityLimits {
    [severity: string]: number
}

/**
 * SafeGuard filter by minimum severity and optional per-severity quotas.
 */
export class SeverityThresholdSafeguardFilter implements ISafeGuardFilter {
    public readonly name = FILTER_NAME
    private readonly defaults: ISeveritySafeguardDefaults

    /**
     * Creates severity safeguard filter.
     *
     * @param defaults Defaults resolved from config-service.
     */
    public constructor(defaults: ISeveritySafeguardDefaults) {
        this.defaults = defaults
    }

    /**
     * Filters suggestions with low severity or violating per-severity budget.
     *
     * @param suggestions Source suggestions.
     * @param context Pipeline context.
     * @returns Passed and discarded suggestion collections.
     */
    public filter(
        suggestions: readonly ISuggestionDTO[],
        context: ReviewPipelineState,
    ): Promise<{
        readonly passed: readonly ISuggestionDTO[]
        readonly discarded: readonly IDiscardedSuggestionDTO[]
    }> {
        const threshold = this.resolveSeverityThreshold(context.config)
        const severityLimits = this.resolveSeverityLimits(context.config)
        const seenBySeverity: ISeverityLimits = {}
        const discarded: IDiscardedSuggestionDTO[] = []
        const accepted: ISuggestionDTO[] = []
        const minimumSeverity = Severity.create(threshold)

        for (const suggestion of suggestions) {
            const severity = resolveSeverityLevel(suggestion.severity)
            const currentSeverity = Severity.create(severity)
            if (currentSeverity.compareTo(minimumSeverity) < 0) {
                discarded.push(createDiscardedSuggestion(
                    suggestion,
                    this.name,
                    BELOW_THRESHOLD_DISCARD_REASON,
                ))
                continue
            }

            const limit = this.resolveSeverityLimit(severityLimits, severity)
            if (limit !== undefined && (seenBySeverity[severity] ?? 0) >= limit) {
                discarded.push(createDiscardedSuggestion(
                    suggestion,
                    this.name,
                    BELOW_THRESHOLD_DISCARD_REASON,
                ))
                continue
            }

            if (limit !== undefined) {
                seenBySeverity[severity] = (seenBySeverity[severity] ?? 0) + 1
            }

            accepted.push(suggestion)
        }

        return Promise.resolve({
            passed: accepted,
            discarded,
        })
    }

    /**
     * Resolves configured severity threshold.
     *
     * @param config Pipeline config.
     * @returns Severity threshold.
     */
    private resolveSeverityThreshold(config: Readonly<Record<string, unknown>>): string {
        const rawThreshold = config["severityThreshold"]
        if (typeof rawThreshold === "string") {
            const normalized = rawThreshold.trim().toUpperCase()
            if (this.isKnownSeverity(normalized)) {
                return normalized
            }
        }

        return this.defaults.threshold
    }

    /**
     * Resolves per-severity max suggestion limit map.
     *
     * @param config Pipeline config.
     * @returns Severity limit map.
     */
    private resolveSeverityLimits(config: Readonly<Record<string, unknown>>): Readonly<ISeverityLimits> {
        const rawLimits = config["maxSuggestionsPerSeverity"]
        if (rawLimits === null || typeof rawLimits !== "object" || Array.isArray(rawLimits)) {
            return {}
        }

        const limits: ISeverityLimits = {}
        const entries = Object.entries(rawLimits as Readonly<Record<string, unknown>>)
        for (const [rawSeverity, rawLimit] of entries) {
            const normalizedSeverity = this.normalizeSeverity(rawSeverity)
            if (!this.isKnownSeverity(normalizedSeverity) || !this.isPositiveInteger(rawLimit)) {
                continue
            }

            limits[normalizedSeverity] = rawLimit
        }

        return limits
    }

    /**
     * Resolves max allowed suggestions for severity.
     *
     * @param limits Limits by severity.
     * @param severity Severity level.
     * @returns Limit or undefined.
     */
    private resolveSeverityLimit(
        limits: Readonly<ISeverityLimits>,
        severity: string,
    ): number | undefined {
        const limit = limits[severity]
        if (typeof limit !== "number" || Number.isInteger(limit) === false || limit < 1) {
            return undefined
        }

        return limit
    }

    /**
     * Checks whether a value belongs to known severity level.
     *
     * @param value Severity label.
     * @returns True when known.
     */
    private isKnownSeverity(value: string): boolean {
        return Object.values(SEVERITY_LEVEL).includes(
            value as (typeof SEVERITY_LEVEL)[keyof typeof SEVERITY_LEVEL],
        )
    }

    /**
     * Normalizes unknown severity keys.
     *
     * @param rawSeverity Raw key.
     * @returns Uppercased severity key.
     */
    private normalizeSeverity(rawSeverity: string): string {
        return rawSeverity.trim().toUpperCase()
    }

    /**
     * Checks positive integer value for limits.
     *
     * @param value Candidate value.
     * @returns True when valid positive integer.
     */
    private isPositiveInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value > 0
    }
}
