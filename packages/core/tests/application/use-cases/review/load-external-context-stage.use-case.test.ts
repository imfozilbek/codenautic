import {describe, expect, test} from "bun:test"

import type {
    IVectorChunkDTO,
    IVectorRepository,
    IVectorSearchResultDTO,
} from "../../../../src/application/ports/outbound/vector/vector-repository.port"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {LoadExternalContextStageUseCase} from "../../../../src/application/use-cases/review/load-external-context-stage.use-case"

const externalContextDefaults = {
    limit: 20,
}

class InMemoryVectorRepository implements IVectorRepository {
    public shouldThrow = false
    public searchResults: readonly IVectorSearchResultDTO[] = []
    public lastQuery: readonly number[] | null = null
    public lastFilters: Readonly<Record<string, unknown>> | undefined = undefined
    public lastLimit: number | undefined = undefined

    public upsert(_chunks: readonly IVectorChunkDTO[]): Promise<void> {
        return Promise.resolve()
    }

    public search(
        query: readonly number[],
        filters?: Readonly<Record<string, unknown>>,
        limit?: number,
    ): Promise<readonly IVectorSearchResultDTO[]> {
        if (this.shouldThrow) {
            return Promise.reject(new Error("vector unavailable"))
        }

        this.lastQuery = [...query]
        this.lastFilters = filters
        this.lastLimit = limit
        return Promise.resolve(this.searchResults)
    }

    public delete(_ids: readonly string[]): Promise<void> {
        return Promise.resolve()
    }
}

/**
 * Creates state for load-external-context stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @returns Pipeline state.
 */
function createState(mergeRequest: Readonly<Record<string, unknown>>): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-load-context",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
    })
}

describe("LoadExternalContextStageUseCase", () => {
    test("skips when embedding is missing", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        const useCase = new LoadExternalContextStageUseCase({
            vectorRepository,
            defaults: externalContextDefaults,
        })
        const state = createState({
            repositoryId: "repo-1",
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("external-context:skipped-no-query")
        expect(vectorRepository.lastQuery).toBeNull()
    })

    test("loads vector context and stores it in external context", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        vectorRepository.searchResults = [
            {
                id: "ctx-1",
                score: 0.92,
                metadata: {
                    filePath: "src/main.ts",
                },
            },
        ]

        const useCase = new LoadExternalContextStageUseCase({
            vectorRepository,
            defaults: externalContextDefaults,
        })
        const state = createState({
            repositoryId: "repo-1",
            contextEmbedding: [0.11, 0.22, 0.33],
            externalContext: {
                limit: 15,
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("external-context:loaded")
        expect(vectorRepository.lastQuery).toEqual([0.11, 0.22, 0.33])
        expect(vectorRepository.lastFilters).toEqual({
            repositoryId: "repo-1",
        })
        expect(vectorRepository.lastLimit).toBe(15)
        expect(result.value.state.externalContext?.["vectorContextStatus"]).toBe("loaded")
    })

    test("skips with unavailable status when vector repository is down", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        vectorRepository.shouldThrow = true

        const useCase = new LoadExternalContextStageUseCase({
            vectorRepository,
            defaults: externalContextDefaults,
        })
        const state = createState({
            projectId: "repo-2",
            contextEmbedding: [0.1, 0.2],
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe(
            "external-context:skipped-unavailable",
        )
        expect(result.value.state.externalContext?.["vectorContextStatus"]).toBe("unavailable")
    })

    test("treats non-numeric embedding values as missing query", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        const useCase = new LoadExternalContextStageUseCase({
            vectorRepository,
            defaults: externalContextDefaults,
        })
        const state = createState({
            contextEmbedding: [0.1, "0.2"],
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("external-context:skipped-no-query")
        expect(vectorRepository.lastQuery).toBeNull()
    })
})
