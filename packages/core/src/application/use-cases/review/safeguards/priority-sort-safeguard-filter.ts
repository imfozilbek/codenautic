import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {ReviewPipelineState} from "../../../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../../../types/review/safeguard-filter.contract"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import {createDiscardedSuggestion, resolveCategoryWeight, resolveSeverityWeight} from "./safeguard-filter.utils"

const FILTER_NAME = "priority-sort"
const DEFAULT_LIMIT = Infinity

interface ISuggestionWithScore {
    readonly suggestion: ISuggestionDTO
    readonly score: number
    readonly index: number
}

/**
 * SafeGuard filter, сортирует по priority score и режет до лимита CCR.
 */
export class PrioritySortSafeguardFilter implements ISafeGuardFilter {
    public readonly name = FILTER_NAME

    /**
     * Sorts by rank score and truncates to config maxSuggestionsPerCCR.
     *
     * @param suggestions Suggestion collection.
     * @param context Pipeline state.
     * @returns Sorted and truncated suggestions + discarded lower-priority items.
     */
    public filter(
        suggestions: readonly ISuggestionDTO[],
        context: ReviewPipelineState,
    ): Promise<{
        readonly passed: readonly ISuggestionDTO[]
        readonly discarded: readonly IDiscardedSuggestionDTO[]
    }> {
        const ranked = suggestions.map((suggestion, index): ISuggestionWithScore => {
            return {
                suggestion,
                score: this.resolvePriorityScore(suggestion),
                index,
            }
        })

        ranked.sort((left, right): number => {
            if (left.score !== right.score) {
                return right.score - left.score
            }

            return left.index - right.index
        })

        const limit = this.resolveLimit(context.config)
        const passedItems = ranked.slice(0, limit)
        const discardedItems = ranked.slice(limit)

        return Promise.resolve({
            passed: passedItems.map((entry) => {
                return entry.suggestion
            }),
            discarded: discardedItems.map((entry) => {
                return createDiscardedSuggestion(
                    entry.suggestion,
                    this.name,
                    "low_priority",
                )
            }),
        })
    }

    /**
     * Resolves configured truncation limit.
     *
     * @param config Config payload.
     * @returns Max suggestions.
     */
    private resolveLimit(config: Readonly<Record<string, unknown>>): number {
        const rawLimit = config["maxSuggestionsPerCCR"]
        if (
            typeof rawLimit !== "number" ||
            Number.isInteger(rawLimit) === false ||
            rawLimit < 1
        ) {
            return DEFAULT_LIMIT
        }

        return rawLimit
    }

    /**
     * Resolves deterministic priority score.
     *
     * @param suggestion Suggestion DTO.
     * @returns Computed score.
     */
    private resolvePriorityScore(suggestion: ISuggestionDTO): number {
        return resolveCategoryWeight(suggestion.category) + resolveSeverityWeight(suggestion.severity)
    }
}
