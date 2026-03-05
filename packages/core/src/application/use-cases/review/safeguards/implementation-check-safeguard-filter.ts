import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import type {ReviewPipelineState} from "../../../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../../../types/review/safeguard-filter.contract"
import {createDiscardedSuggestion, isCodeBlockInFile} from "./safeguard-filter.utils"

const FILTER_NAME = "implementation-check"
const ALREADY_IMPLEMENTED_DISCARD_REASON = "already_implemented"

/**
 * SafeGuard filter that drops suggestions already present in the current diff payload.
 */
export class ImplementationCheckSafeguardFilter implements ISafeGuardFilter {
    public readonly name = FILTER_NAME

    /**
     * Creates safeguard filter instance.
     */
    public constructor() {
    }

    /**
     * Filters suggestions that are already implemented in file payload.
     *
     * @param suggestions Input suggestions.
     * @param context Pipeline state.
     * @returns Passed and discarded suggestions.
     */
    public filter(
        suggestions: readonly ISuggestionDTO[],
        context: ReviewPipelineState,
    ): Promise<{
        readonly passed: readonly ISuggestionDTO[]
        readonly discarded: readonly IDiscardedSuggestionDTO[]
    }> {
        const discarded: IDiscardedSuggestionDTO[] = []
        const passed: ISuggestionDTO[] = []

        for (const suggestion of suggestions) {
            if (!this.isAlreadyImplemented(suggestion, context.files)) {
                passed.push(suggestion)
                continue
            }

            discarded.push(
                createDiscardedSuggestion(
                    suggestion,
                    this.name,
                    ALREADY_IMPLEMENTED_DISCARD_REASON,
                ),
            )
        }

        return Promise.resolve({
            passed,
            discarded,
        })
    }

    /**
     * Checks whether suggestion code block already exists in the file diff.
     *
     * @param suggestion Target suggestion.
     * @param files Pipeline files.
     * @returns True when code is already implemented.
     */
    private isAlreadyImplemented(
        suggestion: ISuggestionDTO,
        files: readonly Readonly<Record<string, unknown>>[],
    ): boolean {
        if (suggestion.codeBlock === undefined || suggestion.codeBlock.trim().length === 0) {
            return false
        }

        const file = this.resolveFile(files, suggestion.filePath)
        if (file === undefined) {
            return false
        }

        return isCodeBlockInFile(file, suggestion.codeBlock)
    }

    /**
     * Resolves file payload by path.
     *
     * @param files Pipeline files.
     * @param filePath Suggestion file path.
     * @returns File payload or undefined.
     */
    private resolveFile(
        files: readonly Readonly<Record<string, unknown>>[],
        filePath: string,
    ): Readonly<Record<string, unknown>> | undefined {
        const normalizedPath = filePath.trim()
        if (normalizedPath.length === 0) {
            return undefined
        }

        return files.find((file): file is Readonly<Record<string, unknown>> => {
            return typeof file["path"] === "string" && file["path"].trim() === normalizedPath
        })
    }
}
