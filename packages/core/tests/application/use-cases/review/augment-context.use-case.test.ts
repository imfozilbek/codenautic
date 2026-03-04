import {describe, expect, test} from "bun:test"

import type {
    IVectorChunkDTO,
    IVectorRepository,
    IVectorSearchResultDTO,
} from "../../../../src/application/ports/outbound/vector/vector-repository.port"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {AugmentContextUseCase} from "../../../../src/application/use-cases/review/augment-context.use-case"

const augmentContextDefaults = {
    relatedFilesLimit: 20,
}

class InMemoryVectorRepository implements IVectorRepository {
    public searchCalls = 0
    public lastQuery: readonly number[] | null = null
    public lastFilters: Readonly<Record<string, unknown>> | undefined = undefined
    public lastLimit: number | undefined
    public shouldThrow = false
    public searchResults: readonly IVectorSearchResultDTO[] = []

    public upsert(_chunks: readonly IVectorChunkDTO[]): Promise<void> {
        return Promise.resolve()
    }

    public search(
        query: readonly number[],
        filters?: Readonly<Record<string, unknown>>,
        limit?: number,
    ): Promise<readonly IVectorSearchResultDTO[]> {
        this.searchCalls += 1
        this.lastQuery = [...query]
        this.lastFilters = filters
        this.lastLimit = limit

        if (this.shouldThrow) {
            return Promise.reject(new Error("vector store unavailable"))
        }

        return Promise.resolve(this.searchResults)
    }

    public delete(_ids: readonly string[]): Promise<void> {
        return Promise.resolve()
    }
}

function createState(mergeRequest: Readonly<Record<string, unknown>>): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-augment-context",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
        externalContext: {
            existingFlag: true,
        },
    })
}

describe("AugmentContextUseCase", () => {
    test("skips when embedding is missing and returns default limit", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        const useCase = new AugmentContextUseCase({
            vectorRepository,
            defaults: augmentContextDefaults,
        })
        const state = createState({
            repositoryId: "repo-1",
            externalContext: {
                limit: 12,
            },
        })

        const result = await useCase.execute({state})

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("augment-context:skipped-no-query")
        expect(result.value.state.externalContext?.["augmentContext"]).toEqual({
            stageId: "augment-context",
            definitionVersion: "v1",
            status: "missing-context",
            relatedCount: 0,
            relatedFiles: [],
            limit: 12,
        })
        expect(vectorRepository.searchCalls).toBe(0)
    })

    test("loads related files from nested context embedding and dedupes/sorts by score", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        vectorRepository.searchResults = [
            {
                id: "same",
                score: 0.84,
                metadata: {
                    filePath: "src/b.ts",
                },
            },
            {
                id: "high",
                score: 0.91,
                metadata: {
                    path: "src/a.ts",
                },
            },
            {
                id: "dup",
                score: 0.76,
                metadata: {
                    path: "src/a.ts",
                },
            },
            {
                id: "invalid",
                score: Number.NaN,
                metadata: {
                    path: "src/c.ts",
                },
            },
        ]
        const useCase = new AugmentContextUseCase({
            vectorRepository,
            defaults: augmentContextDefaults,
        })
        const state = createState({
            repository: {
                id: "repo-2",
            },
            context: {
                contextEmbedding: [0.11, 0.22, 0.33],
            },
            externalContext: {
                limit: 2,
            },
        })

        const result = await useCase.execute({state})

        expect(result.isOk).toBe(true)
        expect(vectorRepository.searchCalls).toBe(1)
        expect(vectorRepository.lastFilters).toEqual({
            repositoryId: "repo-2",
        })
        expect(vectorRepository.lastLimit).toBe(2)
        expect(result.value.metadata?.checkpointHint).toBe("augment-context:loaded")
        expect(result.value.state.externalContext?.["augmentContext"]).toMatchObject({
            stageId: "augment-context",
            definitionVersion: "v1",
            status: "resolved",
            relatedCount: 2,
            relatedFiles: [
                {
                    path: "src/a.ts",
                    score: 0.91,
                    sourceId: "high",
                },
                {
                    path: "src/b.ts",
                    score: 0.84,
                    sourceId: "same",
                },
            ],
        })
        expect(result.value.state.externalContext?.["existingFlag"]).toBe(true)
    })

    test("uses top-level contextEmbedding when context nesting is absent", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        const useCase = new AugmentContextUseCase({
            vectorRepository,
            defaults: augmentContextDefaults,
        })
        vectorRepository.searchResults = [
            {
                id: "external",
                score: 0.5,
                metadata: {
                    filePath: "src/x.ts",
                },
            },
        ]
        const state = createState({
            projectId: "repo-3",
            contextEmbedding: [0.5, 0.4, 0.3],
        })

        const result = await useCase.execute({state})

        expect(result.isOk).toBe(true)
        expect(vectorRepository.lastFilters).toEqual({
            repositoryId: "repo-3",
        })
        expect(result.value.state.externalContext?.["augmentContext"]).toMatchObject({
            status: "resolved",
            relatedCount: 1,
        })
    })

    test("marks unavailable when vector search throws", async () => {
        const vectorRepository = new InMemoryVectorRepository()
        vectorRepository.shouldThrow = true
        const useCase = new AugmentContextUseCase({
            vectorRepository,
            defaults: augmentContextDefaults,
        })
        const state = createState({
            projectId: "repo-4",
            contextEmbedding: [0.8, 0.9],
        })

        const result = await useCase.execute({state})

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("augment-context:skipped-unavailable")
        expect(result.value.state.externalContext?.["augmentContext"]).toMatchObject({
            stageId: "augment-context",
            definitionVersion: "v1",
            status: "unavailable",
            relatedCount: 0,
            relatedFiles: [],
            limit: 20,
        })
        expect(result.value.state.externalContext?.["existingFlag"]).toBe(true)
        expect(vectorRepository.lastFilters).toEqual({
            repositoryId: "repo-4",
        })
    })
})
