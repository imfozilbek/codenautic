import {describe, expect, test} from "bun:test"

import type {
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
    IStreamingChatResponseDTO,
} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {ProcessCcrLevelReviewStageUseCase} from "../../../../src/application/use-cases/review/process-ccr-level-review-stage.use-case"

class InMemoryLLMProvider implements ILLMProvider {
    public shouldThrow = false
    public responseContent = ""
    public lastRequest: IChatRequestDTO | null = null

    public chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        if (this.shouldThrow) {
            return Promise.reject(new Error("llm unavailable"))
        }

        this.lastRequest = request
        return Promise.resolve({
            content: this.responseContent,
            usage: {
                input: 10,
                output: 5,
                total: 15,
            },
        })
    }

    public stream(_request: IChatRequestDTO): IStreamingChatResponseDTO {
        return {
            [Symbol.asyncIterator](): AsyncIterator<{delta: string}> {
                return {
                    next(): Promise<IteratorResult<{delta: string}>> {
                        return Promise.resolve({
                            done: true,
                            value: {
                                delta: "",
                            },
                        })
                    },
                }
            },
        }
    }

    public embed(_texts: readonly string[]): Promise<readonly number[][]> {
        return Promise.resolve([[0.1]])
    }
}

/**
 * Creates state for CCR-level review stage tests.
 *
 * @param files Files payload.
 * @param config Config payload.
 * @returns Pipeline state.
 */
function createState(
    files: readonly Readonly<Record<string, unknown>>[],
    config: Readonly<Record<string, unknown>>,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-ccr",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-40",
        },
        config,
        files,
    })
}

describe("ProcessCcrLevelReviewStageUseCase", () => {
    test("parses JSON suggestions and stores structured CCR output", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseContent = JSON.stringify({
            suggestions: [
                {
                    category: "architecture",
                    severity: "HIGH",
                    filePath: "src/main.ts",
                    lineStart: 5,
                    lineEnd: 8,
                    message: "Split this module to reduce coupling",
                    committable: false,
                    rankScore: 90,
                },
            ],
        })
        const useCase = new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
            model: "custom-model",
        })
        const state = createState(
            [
                {
                    path: "src/main.ts",
                    patch: "@@ -1,1 +1,2 @@",
                },
            ],
            {
                promptOverrides: {
                    systemPrompt: "  custom system  ",
                    reviewerPrompt: " custom reviewer ",
                },
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("ccr-level-review:processed")
        const ccrSuggestionsRaw = result.value.state.externalContext?.["ccrSuggestions"]
        expect(Array.isArray(ccrSuggestionsRaw)).toBe(true)
        if (!Array.isArray(ccrSuggestionsRaw)) {
            throw new Error("CCR suggestions payload is not an array")
        }

        const ccrSuggestions = ccrSuggestionsRaw as readonly Readonly<Record<string, unknown>>[]
        expect(ccrSuggestions).toHaveLength(1)
        expect(ccrSuggestions[0]?.["category"]).toBe("architecture")

        const request = llmProvider.lastRequest
        expect(request).not.toBeNull()
        if (request === null) {
            throw new Error("LLM request was not captured")
        }

        expect(request.model).toBe("custom-model")
        expect(request.messages[0]?.content).toBe("custom system")
        expect(request.messages[1]?.content.includes("custom reviewer")).toBe(true)
    })

    test("falls back to single suggestion when response is non-json text", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseContent = "Consider adding integration tests for this flow."

        const useCase = new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
        })
        const state = createState([], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const ccrSuggestions = result.value.state.externalContext?.["ccrSuggestions"] as
            | readonly Readonly<Record<string, unknown>>[]
            | undefined
        expect(ccrSuggestions?.length).toBe(1)
        expect(ccrSuggestions?.[0]?.["message"]).toBe(
            "Consider adding integration tests for this flow.",
        )
    })

    test("ignores invalid JSON suggestion entries and keeps valid ones", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseContent = JSON.stringify([
            {
                category: "",
                severity: "",
                filePath: "",
                lineStart: 0,
                lineEnd: 0,
                rankScore: 0,
                message: "  valid message  ",
                committable: true,
            },
            {
                category: "tests",
                severity: "MEDIUM",
                filePath: "GLOBAL",
                lineStart: 2,
                lineEnd: 2,
                rankScore: 20,
                message: " ",
                committable: true,
            },
        ])

        const useCase = new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
        })
        const state = createState([], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const ccrSuggestions = result.value.state.externalContext?.["ccrSuggestions"] as
            | readonly Readonly<Record<string, unknown>>[]
            | undefined
        expect(ccrSuggestions?.length).toBe(1)
        expect(ccrSuggestions?.[0]?.["category"]).toBe("architecture")
        expect(ccrSuggestions?.[0]?.["lineStart"]).toBe(1)
    })

    test("returns recoverable stage error when llm provider fails", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.shouldThrow = true

        const useCase = new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
        })
        const state = createState([], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("CCR-level review")
    })
})
