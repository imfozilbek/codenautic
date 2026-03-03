import {describe, expect, test} from "bun:test"

import type {IChatResponseDTO, IChatRequestDTO} from "../../../../src/application/dto/llm"
import type {ILLMProvider} from "../../../../src/application/ports/outbound/llm/llm-provider.port"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {
    CCR_SUMMARY_EXISTING_DESCRIPTION_MODES,
    CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES,
} from "../../../../src/application/dto/review/ccr-summary.dto"
import type {
    CCROldSummaryMode,
    CCRNewCommitsSummaryMode,
} from "../../../../src/application/dto/review/ccr-summary.dto"
import {
    GenerateCCRSummaryUseCase,
    type IGenerateCCRSummaryUseCaseDependencies,
} from "../../../../src/application/use-cases/review/generate-ccr-summary.use-case"

const DEFAULT_TOKEN_USAGE = {
    input: 0,
    output: 0,
    total: 0,
}

class TestLLMProvider implements ILLMProvider {
    private readonly responses: IChatResponseDTO[]
    private index = 0

    public readonly requests: IChatRequestDTO[] = []

    public constructor(responses: readonly string[]) {
        this.responses = responses.map((content) => ({
            content,
            usage: DEFAULT_TOKEN_USAGE,
        }))
    }

    public chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        this.requests.push(request)
        const response = this.responses[this.index]
        this.index += 1
        if (response === undefined) {
            throw new Error("Mocked LLM has no response")
        }

        return Promise.resolve(response)
    }

    public stream(): ReturnType<ILLMProvider["stream"]> {
        throw new Error("Stream not implemented")
    }

    public embed(_texts: readonly string[]): Promise<readonly number[][]> {
        return Promise.resolve([])
    }
}

function findErrorFields(code: ValidationError): string[] {
    return code.fields.map((field) => `${field.field}:${field.message}`)
}

function hasModeInPrompt(
    request: IChatRequestDTO,
    expectedMode: string,
): boolean {
    return request.messages.some((message) => message.content.includes(expectedMode))
}

describe("GenerateCCRSummaryUseCase", () => {
    test("generates summary with fallback modes and sends deterministic prompt", async () => {
        const provider = new TestLLMProvider(["Generated CCR summary"])
        const useCase = new GenerateCCRSummaryUseCase({
            llmProvider: provider,
            model: "gpt-4.1",
            maxTokens: 600,
        } as IGenerateCCRSummaryUseCaseDependencies)

        const result = await useCase.execute({
            existingSummary: "Existing review summary.",
            newCommitsSummary: "New commit changes summary.",
            existingDescriptionMode: "COMPLEMENT" as CCROldSummaryMode,
            newCommitsDescriptionMode: "CONCATENATE" as CCRNewCommitsSummaryMode,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.summary).toBe("Generated CCR summary")
        expect(provider.requests).toHaveLength(1)
        const request = provider.requests.at(0)
        expect(request).not.toBeUndefined()
        if (request === undefined) {
            throw new Error("LLM request missing")
        }
        expect(hasModeInPrompt(request, "COMPLEMENT")).toBe(true)
        expect(hasModeInPrompt(request, "CONCATENATE")).toBe(true)
        expect(request.model).toBe("gpt-4.1")
        expect(request.maxTokens).toBe(600)
    })

    test("uses fallback summary when provider returns blank content", async () => {
        const provider = new TestLLMProvider(["   "])
        const useCase = new GenerateCCRSummaryUseCase({
            llmProvider: provider,
        })

        const result = await useCase.execute({
            existingSummary: "Existing review summary.",
            newCommitsSummary: "New commit summary.",
            existingDescriptionMode: "REPLACE" as CCROldSummaryMode,
            newCommitsDescriptionMode: "REPLACE" as CCRNewCommitsSummaryMode,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.summary).toBe("New commit summary.")
    })

    test("returns validation error for invalid modes", async () => {
        const provider = new TestLLMProvider(["irrelevant"])
        const useCase = new GenerateCCRSummaryUseCase({llmProvider: provider})

        const result = await useCase.execute({
            existingDescriptionMode: "UNKNOWN" as CCROldSummaryMode,
            newCommitsDescriptionMode: "SOME" as CCRNewCommitsSummaryMode,
            existingSummary: "Existing summary.",
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(findErrorFields(result.error)).toEqual([
            "existingDescriptionMode:must be one of REPLACE, COMPLEMENT, CONCATENATE",
            "newCommitsDescriptionMode:must be one of NONE, REPLACE, CONCATENATE",
        ])
    })

    test("returns validation error when new commits summary required", async () => {
        const provider = new TestLLMProvider(["irrelevant"])
        const useCase = new GenerateCCRSummaryUseCase({llmProvider: provider})

        const result = await useCase.execute({
            newCommitsDescriptionMode: "REPLACE",
            existingDescriptionMode: "REPLACE",
            existingSummary: "Existing summary.",
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(findErrorFields(result.error)).toContain("newCommitsSummary:newCommitsSummary is required")
    })

    test("returns provider error as failure when llm chat throws", async () => {
        const provider = {
            chat(): Promise<IChatResponseDTO> {
                return Promise.reject(new Error("provider unavailable"))
            },
            stream(): ReturnType<ILLMProvider["stream"]> {
                throw new Error("not implemented")
            },
            embed: (_texts: readonly string[]): Promise<readonly number[][]> => Promise.resolve([]),
        } as ILLMProvider
        const useCase = new GenerateCCRSummaryUseCase({llmProvider: provider})

        const result = await useCase.execute({
            existingDescriptionMode: "REPLACE",
            newCommitsDescriptionMode: "NONE",
            existingSummary: "Existing summary.",
        })

        if (result.isOk) {
            throw new Error("Expected failure")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields.at(0)?.field).toBe("llmProvider")
    })

    test("supports new commits mode NONE without new summary", async () => {
        const provider = new TestLLMProvider(["Generated without changes"])
        const useCase = new GenerateCCRSummaryUseCase({llmProvider: provider})

        const result = await useCase.execute({
            existingSummary: "Existing summary.",
            newCommitsDescriptionMode: CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES[0],
            existingDescriptionMode: CCR_SUMMARY_EXISTING_DESCRIPTION_MODES[2],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.summary).toBe("Generated without changes")
        const request = provider.requests.at(0)
        expect(request).not.toBeUndefined()
        if (request === undefined) {
            throw new Error("LLM request missing")
        }
        expect(request.messages.at(1)?.content).toContain("Seed summary to transform:")
    })
})
