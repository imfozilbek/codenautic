import {describe, expect, test} from "bun:test"

import type {ISuggestionForClustering} from "../../../src/application/use-cases/cluster-suggestions.use-case"
import {SuggestionClusteringService} from "../../../src/application/services/suggestion-clustering.service"

function createSuggestion(overrides: Record<string, unknown>): ISuggestionForClustering {
    return {
        suggestionId: "suggestion-1",
        problemDescription: "Domain model has duplicated code",
        actionStatement: "Extract shared behavior",
        ...overrides,
    } satisfies ISuggestionForClustering
}

describe("SuggestionClusteringService", () => {
    test("clusters in MINIMAL mode by default", async () => {
        const service = new SuggestionClusteringService()
        const suggestions: readonly ISuggestionForClustering[] = [
            createSuggestion({
                suggestionId: "s-1",
            }),
            createSuggestion({
                suggestionId: "s-2",
                problemDescription: "Domain model has duplicated validation",
            }),
        ]

        const clusters = await service.cluster(suggestions)

        expect(clusters).toHaveLength(2)
        expect(clusters[0]?.relatedSuggestionIds).toEqual(["s-1"])
        expect(clusters[1]?.relatedSuggestionIds).toEqual(["s-2"])
    })

    test("clusters with SMART mode and embeddings", async () => {
        const service = new SuggestionClusteringService()
        const suggestions: readonly ISuggestionForClustering[] = [
            createSuggestion({
                suggestionId: "s-1",
                embedding: {
                    vector: [1, 0],
                    dimensions: 2,
                    model: "default",
                },
            }),
            createSuggestion({
                suggestionId: "s-2",
                embedding: {
                    vector: [1, 0.02],
                    dimensions: 2,
                    model: "default",
                },
            }),
        ]

        const clusters = await service.cluster(suggestions, "SMART")

        expect(clusters).toHaveLength(1)
        expect(clusters[0]?.type).toBe("parent")
        expect(clusters[0]?.relatedSuggestionIds).toEqual(["s-1", "s-2"])
    })

    test("throws validation error when clustering input is invalid", () => {
        const service = new SuggestionClusteringService()
        const invalid = null as unknown as readonly ISuggestionForClustering[]

        expect(service.cluster(invalid)).rejects.toMatchObject({
            code: "VALIDATION_ERROR",
        })
    })
})
