import type {IDiscardedSuggestionDTO} from "../../dto/review/discarded-suggestion.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {ReviewPipelineState} from "./review-pipeline-state"

/**
 * SafeGuard filter output payload.
 */
export interface ISafeGuardFilterResult {
    readonly passed: readonly ISuggestionDTO[]
    readonly discarded: readonly IDiscardedSuggestionDTO[]
}

/**
 * Sequential SafeGuard filter contract used by review suggestion validation stage.
 */
export interface ISafeGuardFilter {
    readonly name: string

    /**
     * Filters suggestions and returns accepted/discarded subsets.
     *
     * @param suggestions Input suggestions.
     * @param context Current pipeline state.
     * @returns Filtered result.
     */
    filter(
        suggestions: readonly ISuggestionDTO[],
        context: ReviewPipelineState,
    ): Promise<ISafeGuardFilterResult>
}
