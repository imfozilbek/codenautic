import {describe, expect, test} from "bun:test"

import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {FileContextGateStageUseCase} from "../../../../src/application/use-cases/review/file-context-gate-stage.use-case"

const fileContextDefaults = {
    batchSize: 30,
}

/**
 * Creates state for file-context-gate stage tests.
 *
 * @param files Files payload.
 * @param externalContext External context payload.
 * @param config Config payload.
 * @returns Pipeline state.
 */
function createState(
    files: readonly Readonly<Record<string, unknown>>[],
    externalContext: Readonly<Record<string, unknown>> | null,
    config: Readonly<Record<string, unknown>>,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-file-gate",
        definitionVersion: "v1",
        mergeRequest: {},
        config,
        files,
        externalContext,
    })
}

describe("FileContextGateStageUseCase", () => {
    test("filters files by vector context paths and groups them into batches", async () => {
        const useCase = new FileContextGateStageUseCase(fileContextDefaults)
        const state = createState(
            [{path: "src/a.ts"}, {path: "src/b.ts"}, {path: "src/c.ts"}],
            {
                vectorContext: [
                    {
                        metadata: {
                            filePath: "src/a.ts",
                        },
                    },
                    {
                        metadata: {
                            path: "src/c.ts",
                        },
                    },
                ],
            },
            {
                batchSize: 1,
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("file-context-gate:completed")
        expect(result.value.state.files).toEqual([{path: "src/a.ts"}, {path: "src/c.ts"}])
        const batches = result.value.state.externalContext?.["batches"] as readonly unknown[]
        expect(batches).toHaveLength(2)
        const gateMetrics = result.value.state.externalContext?.[
            "fileContextGate"
        ] as Readonly<Record<string, unknown>>
        expect(gateMetrics["batchSize"]).toBe(1)
        expect(gateMetrics["eligibleFileCount"]).toBe(2)
        expect(gateMetrics["filteredOutCount"]).toBe(1)
    })

    test("keeps all files when context coverage is absent and uses default batch size", async () => {
        const useCase = new FileContextGateStageUseCase(fileContextDefaults)
        const state = createState([{path: "src/a.ts"}, {path: "src/b.ts"}], null, {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.files).toEqual([{path: "src/a.ts"}, {path: "src/b.ts"}])
        const gateMetrics = result.value.state.externalContext?.[
            "fileContextGate"
        ] as Readonly<Record<string, unknown>>
        expect(gateMetrics["batchSize"]).toBe(fileContextDefaults.batchSize)
        expect(gateMetrics["batchCount"]).toBe(1)
    })

    test("drops malformed file entries without valid path", async () => {
        const useCase = new FileContextGateStageUseCase(fileContextDefaults)
        const state = createState([{path: "src/a.ts"}, {invalid: "x"}, {path: " "}], null, {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.files).toEqual([{path: "src/a.ts"}])
    })
})
