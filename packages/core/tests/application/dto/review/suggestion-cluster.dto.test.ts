import {describe, expect, test} from "bun:test"

import type {ISuggestionClusterDTO, SuggestionClusterType} from "../../../../src/application/dto/review/suggestion-cluster.dto"

describe("SuggestionCluster DTO", () => {
    test("supports parent cluster payload", () => {
        const clusterType: SuggestionClusterType = "parent"
        const cluster: ISuggestionClusterDTO = {
            type: clusterType,
            relatedSuggestionIds: ["s-1", "s-2", "s-3"],
            problemDescription: "Нарушение безопасных практик обработки ввода",
            actionStatement: "Объединить правки в единый рефакторинг",
        }

        expect(cluster.type).toBe("parent")
        expect(cluster.parentSuggestionId).toBeUndefined()
        expect(cluster.relatedSuggestionIds).toHaveLength(3)
    })

    test("supports related cluster payload with parent reference", () => {
        const cluster: ISuggestionClusterDTO = {
            type: "related",
            relatedSuggestionIds: ["s-7", "s-8"],
            parentSuggestionId: "s-1",
            problemDescription: "Дополнительные следствия дочернего инцидента",
            actionStatement: "Исправить вторичные замечания по соседним местам",
        }

        expect(cluster.type).toBe("related")
        expect(cluster.parentSuggestionId).toBe("s-1")
        expect(cluster.relatedSuggestionIds.join(",")).toBe("s-7,s-8")
    })
})
