import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {ReviewPipelineState} from "../../../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../../../types/review/safeguard-filter.contract"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import {
    buildDeduplicationKey,
    createDiscardedSuggestion,
    resolveSeverityWeight,
} from "./safeguard-filter.utils"

const FILTER_NAME = "deduplication"
const DUPLICATE_DISCARD_REASON = "duplicate"

/**
 * SafeGuard фильтр, убирает дубликаты по filePath/lineRange/message.
 * При одинаковом ключе оставляет запись с максимальной severity.
 */
export class DeduplicationSafeguardFilter implements ISafeGuardFilter {
    public readonly name = FILTER_NAME

    /**
     * Creates deduplication filter.
     *
     * @returns Filter instance.
     */
    public constructor() {}

    /**
     * Filters duplicated suggestions and keeps one highest severity entry per dedup key.
     *
     * @param suggestions Source suggestion collection.
     * @param _context Pipeline context.
     * @returns Passed suggestions and discarded duplicates.
     */
    public filter(
        suggestions: readonly ISuggestionDTO[],
        _context: ReviewPipelineState,
    ): Promise<{
        readonly passed: readonly ISuggestionDTO[]
        readonly discarded: readonly IDiscardedSuggestionDTO[]
    }> {
        const unique = new Map<string, ISuggestionDTO>()
        const discarded: IDiscardedSuggestionDTO[] = []

        for (const suggestion of suggestions) {
            const key = buildDeduplicationKey(suggestion)
            const existing = unique.get(key)
            if (existing === undefined) {
                unique.set(key, suggestion)
                continue
            }

            const candidateSeverity = resolveSeverityWeight(suggestion.severity)
            const existingSeverity = resolveSeverityWeight(existing.severity)

            if (candidateSeverity > existingSeverity) {
                discarded.push(createDiscardedSuggestion(existing, this.name, DUPLICATE_DISCARD_REASON))
                unique.set(key, suggestion)
                continue
            }

            discarded.push(createDiscardedSuggestion(suggestion, this.name, DUPLICATE_DISCARD_REASON))
        }

        return Promise.resolve({
            passed: [...unique.values()],
            discarded,
        })
    }
}
