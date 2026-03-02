import {describe, expect, test} from "bun:test"

import type {
    IDiscardedSuggestionDTO,
    ISafeGuardFilter,
    ISafeGuardFilterResult,
    ISuggestionDTO,
} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {ValidateSuggestionsStageUseCase} from "../../../../src/application/use-cases/review/validate-suggestions-stage.use-case"

class StaticFilter implements ISafeGuardFilter {
    public readonly name: string
    private readonly transformer: (suggestions: readonly ISuggestionDTO[]) => ISafeGuardFilterResult

    public constructor(
        name: string,
        transformer: (suggestions: readonly ISuggestionDTO[]) => ISafeGuardFilterResult,
    ) {
        this.name = name
        this.transformer = transformer
    }

    public filter(
        suggestions: readonly ISuggestionDTO[],
        _context: ReviewPipelineState,
    ): Promise<ISafeGuardFilterResult> {
        return Promise.resolve(this.transformer(suggestions))
    }
}

class ThrowingFilter implements ISafeGuardFilter {
    public readonly name = "throwing-filter"

    public filter(
        _suggestions: readonly ISuggestionDTO[],
        _context: ReviewPipelineState,
    ): Promise<ISafeGuardFilterResult> {
        return Promise.reject(new Error("filter failed"))
    }
}

/**
 * Creates suggestion payload for tests.
 *
 * @param id Suggestion id.
 * @param filePath File path.
 * @param message Suggestion message.
 * @returns Suggestion dto.
 */
function createSuggestion(id: string, filePath: string, message: string): ISuggestionDTO {
    return {
        id,
        filePath,
        lineStart: 10,
        lineEnd: 10,
        severity: "MEDIUM",
        category: "code_quality",
        message,
        committable: true,
        rankScore: 50,
    }
}

/**
 * Converts arbitrary payload array to pipeline collection items.
 *
 * @param source Raw payload collection.
 * @returns Normalized collection items.
 */
function toCollectionItems(
    source: readonly unknown[],
): readonly Readonly<Record<string, unknown>>[] {
    return source.flatMap((item): readonly Readonly<Record<string, unknown>>[] => {
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
            return []
        }

        return [
            {
                ...(item as Readonly<Record<string, unknown>>),
            },
        ]
    })
}

/**
 * Creates state for validate-suggestions stage tests.
 *
 * @param suggestions Suggestions payload.
 * @param discardedSuggestions Discarded suggestions payload.
 * @param config Config payload.
 * @returns Pipeline state.
 */
function createState(
    suggestions: readonly unknown[],
    discardedSuggestions: readonly unknown[],
    config: Readonly<Record<string, unknown>>,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-validate-suggestions",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-53",
        },
        config,
        suggestions: toCollectionItems(suggestions),
        discardedSuggestions: toCollectionItems(discardedSuggestions),
    })
}

describe("ValidateSuggestionsStageUseCase", () => {
    test("applies sequential filters and preserves discarded trace", async () => {
        const sourceSuggestions = [createSuggestion("s1", "src/a.ts", "Issue A")]
        const filter1 = new StaticFilter("filter-1", (suggestions) => {
            const discarded: IDiscardedSuggestionDTO[] = suggestions.map((suggestion) => {
                return {
                    ...suggestion,
                    discardReason: "duplicate",
                    filterName: "filter-1",
                }
            })

            return {
                passed: [],
                discarded,
            }
        })
        const filter2 = new StaticFilter("filter-2", (suggestions) => {
            return {
                passed: [
                    ...suggestions,
                    createSuggestion("s2", "src/b.ts", "Issue B"),
                ],
                discarded: [],
            }
        })

        const useCase = new ValidateSuggestionsStageUseCase({
            filters: [filter1, filter2],
        })
        const state = createState(sourceSuggestions, [], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("suggestions:validated")
        expect(result.value.state.suggestions).toHaveLength(1)
        expect(result.value.state.suggestions[0]?.["id"]).toBe("s2")
        expect(result.value.state.discardedSuggestions).toHaveLength(1)
        expect(result.value.state.discardedSuggestions[0]?.["discardReason"]).toBe("duplicate")
    })

    test("enforces false-positive budget and restores overflow discarded suggestions", async () => {
        const sourceSuggestions = [
            createSuggestion("s1", "src/a.ts", "Issue A"),
            createSuggestion("s2", "src/b.ts", "Issue B"),
        ]
        const budgetFilter = new StaticFilter("budget-filter", (suggestions) => {
            return {
                passed: [],
                discarded: suggestions.map((suggestion) => {
                    return {
                        ...suggestion,
                        discardReason: "below_threshold",
                        filterName: "budget-filter",
                    }
                }),
            }
        })
        const useCase = new ValidateSuggestionsStageUseCase({
            filters: [budgetFilter],
        })
        const state = createState(sourceSuggestions, [], {falsePositiveBudget: 1})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.discardedSuggestions).toHaveLength(1)
        expect(result.value.state.suggestions).toHaveLength(1)
        expect(result.value.metadata?.notes).toBe("False-positive discard budget reached")
    })

    test("drops malformed suggestions during normalization", async () => {
        const passThroughFilter = new StaticFilter("pass-through", (suggestions) => {
            return {
                passed: suggestions,
                discarded: [],
            }
        })
        const useCase = new ValidateSuggestionsStageUseCase({
            filters: [passThroughFilter],
        })
        const state = createState(
            [
                createSuggestion("s1", "src/a.ts", "Issue A"),
                {
                    id: "broken",
                    filePath: "src/b.ts",
                },
            ],
            [],
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.suggestions).toHaveLength(1)
    })

    test("returns recoverable stage error when filter chain throws", async () => {
        const useCase = new ValidateSuggestionsStageUseCase({
            filters: [new ThrowingFilter()],
        })
        const state = createState([createSuggestion("s1", "src/a.ts", "Issue A")], [], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("SafeGuard filter chain failed")
    })
})
