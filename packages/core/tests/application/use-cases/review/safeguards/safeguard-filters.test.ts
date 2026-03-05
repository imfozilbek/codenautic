import {describe, expect, test} from "bun:test"

import {Result, ValidationError} from "../../../../../src"
import type {IChatRequestDTO} from "../../../../../src/application/dto/llm/chat.dto"
import type {IChatResponseDTO} from "../../../../../src/application/dto/llm/chat.dto"
import type {IGeneratePromptInput} from "../../../../../src/application/use-cases/generate-prompt.use-case"
import type {ILLMProvider} from "../../../../../src/application/ports/outbound/llm/llm-provider.port"
import type {IUseCase} from "../../../../../src/application/ports/inbound/use-case.port"
import type {ISuggestionDTO} from "../../../../../src/application/dto/review/suggestion.dto"
import {ReviewPipelineState} from "../../../../../src/application/types/review/review-pipeline-state"
import type {IStreamingChatResponseDTO} from "../../../../../src/application/dto/llm/streaming-chat.dto"
import {DeduplicationSafeguardFilter} from "../../../../../src/application/use-cases/review/safeguards/deduplication-safeguard-filter"
import {HallucinationSafeguardFilter} from "../../../../../src/application/use-cases/review/safeguards/hallucination-safeguard-filter"
import {ImplementationCheckSafeguardFilter} from "../../../../../src/application/use-cases/review/safeguards/implementation-check-safeguard-filter"
import {PrioritySortSafeguardFilter} from "../../../../../src/application/use-cases/review/safeguards/priority-sort-safeguard-filter"
import {SeverityThresholdSafeguardFilter} from "../../../../../src/application/use-cases/review/safeguards/severity-threshold-safeguard-filter"

const priorityDefaults = {
    limit: Number.MAX_SAFE_INTEGER,
}

const severityDefaults = {
    threshold: "MEDIUM",
}

const hallucinationDefaults = {
    model: "gpt-4o-mini",
    maxTokens: 300,
}

interface ILLMResponseQueueItem {
    readonly content: string
}

class InMemoryLLMProvider implements ILLMProvider {
    public readonly requests: IChatRequestDTO[] = []
    public readonly responses: ILLMResponseQueueItem[] = []

    public chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        this.requests.push(request)
        const response = this.responses.shift()
        const content = response === undefined ? "" : response.content

        return Promise.resolve({
            content,
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
        return Promise.resolve([])
    }
}

/**
 * In-memory prompt generator stub for safeguard tests.
 */
class InMemoryGeneratePromptUseCase
    implements IUseCase<IGeneratePromptInput, string, ValidationError>
{
    public nextResult: Result<string, ValidationError>

    /**
     * Creates prompt use case stub with success default.
     */
    public constructor() {
        this.nextResult = Result.ok<string, ValidationError>("HALLUCINATION_TEMPLATE")
    }

    public execute(
        _input: IGeneratePromptInput,
    ): Promise<Result<string, ValidationError>> {
        return Promise.resolve(this.nextResult)
    }
}

function createSuggestion(overrides: Partial<ISuggestionDTO> = {}): ISuggestionDTO {
    return {
        id: "s-1",
        filePath: "src/app.ts",
        lineStart: 10,
        lineEnd: 12,
        severity: "MEDIUM",
        category: "quality",
        message: "Issue in code",
        committable: true,
        rankScore: 50,
        ...overrides,
    }
}

function createState(config: Readonly<Record<string, unknown>> = {}): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-safeguard",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-1",
        },
        config,
        files: [],
    })
}

function createStateWithFiles(
    config: Readonly<Record<string, unknown>>,
    files: readonly Readonly<Record<string, unknown>>[],
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-safeguard",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-1",
        },
        config,
        files,
    })
}

describe("Safeguard filters", () => {
    test("deduplicates by file/lines/message and keeps highest severity", async () => {
        const filter = new DeduplicationSafeguardFilter()
        const state = createState()
        const source = [
            createSuggestion({
                id: "low",
                severity: "LOW",
                message: "Duplicate",
            }),
            createSuggestion({
                id: "high",
                severity: "HIGH",
                message: "DUPLICATE",
            }),
            createSuggestion({
                id: "other",
                severity: "MEDIUM",
                message: "Another",
                filePath: "src/other.ts",
            }),
        ]

        const result = await filter.filter(source, state)

        expect(result.passed).toHaveLength(2)
        expect(result.passed.map((item) => item.id)).toEqual(["high", "other"])
        expect(result.discarded).toHaveLength(1)
        expect(result.discarded[0]?.id).toBe("low")
    })

    test("sorts by deterministic priority score and keeps stable order for ties", async () => {
        const filter = new PrioritySortSafeguardFilter(priorityDefaults)
        const state = createState({maxSuggestionsPerCCR: 2})
        const source = [
            createSuggestion({
                id: "first",
                category: "architecture",
                severity: "LOW",
                lineStart: 1,
                lineEnd: 1,
            }),
            createSuggestion({
                id: "second",
                category: "performance",
                severity: "CRITICAL",
                lineStart: 2,
                lineEnd: 2,
            }),
            createSuggestion({
                id: "third",
                category: "architecture",
                severity: "LOW",
                lineStart: 3,
                lineEnd: 3,
            }),
            createSuggestion({
                id: "fourth",
                category: "tests",
                severity: "MEDIUM",
                lineStart: 4,
                lineEnd: 4,
            }),
        ]

        const result = await filter.filter(source, state)

        expect(result.passed.map((item) => item.id)).toEqual(["second", "first"])
        expect(result.discarded.map((item) => item.id)).toEqual(["third", "fourth"])
    })

    test("drops below severity threshold and respects per-severity quota", async () => {
        const filter = new SeverityThresholdSafeguardFilter(severityDefaults)
        const state = createState({
            severityThreshold: "HIGH",
            maxSuggestionsPerSeverity: {
                HIGH: 1,
            },
        })

        const source = [
            createSuggestion({
                id: "first",
                severity: "MEDIUM",
            }),
            createSuggestion({
                id: "second",
                severity: "HIGH",
                lineStart: 20,
                lineEnd: 20,
            }),
            createSuggestion({
                id: "third",
                severity: "HIGH",
                lineStart: 30,
                lineEnd: 30,
            }),
        ]

        const result = await filter.filter(source, state)

        expect(result.passed.map((item) => item.id)).toEqual(["second"])
        expect(result.discarded.map((item) => item.id)).toEqual(["first", "third"])
        expect(result.discarded[0]?.discardReason).toBe("below_threshold")
    })

    test("passes through when file payload is missing", async () => {
        const provider = new InMemoryLLMProvider()
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        const filter = new HallucinationSafeguardFilter({
            llmProvider: provider,
            generatePromptUseCase,
            defaults: hallucinationDefaults,
        })
        const state = createState({
            maxSuggestionsPerSeverity: {},
        })
        const suggestion = createSuggestion({
            id: "no-file",
            codeBlock: "function x() {}",
        })

        const result = await filter.filter([suggestion], state)

        expect(result.passed).toHaveLength(1)
        expect(result.discarded).toHaveLength(0)
        expect(provider.requests).toHaveLength(0)
    })

    test("validates suggestion against file context before fallback to LLM", async () => {
        const provider = new InMemoryLLMProvider()
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        const filter = new HallucinationSafeguardFilter({
            llmProvider: provider,
            generatePromptUseCase,
            defaults: hallucinationDefaults,
        })
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function x() {}\\n",
            },
        ])
        const suggestion = createSuggestion({
            id: "with-block",
            codeBlock: "function x() {}",
        })

        const result = await filter.filter([suggestion], state)

        expect(result.passed).toHaveLength(1)
        expect(result.discarded).toHaveLength(0)
        expect(provider.requests).toHaveLength(0)
    })

    test("uses LLM result when block is not in patch and discards when unsupported", async () => {
        const provider = new InMemoryLLMProvider()
        provider.responses.push({content: '{"isSupported": false}'})
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        const filter = new HallucinationSafeguardFilter({
            llmProvider: provider,
            generatePromptUseCase,
            defaults: hallucinationDefaults,
        })
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function y() {}\\n",
            },
        ])
        const suggestion = createSuggestion({
            id: "llm",
            codeBlock: "function x() {}",
        })

        const result = await filter.filter([suggestion], state)

        expect(result.passed).toHaveLength(0)
        expect(result.discarded).toHaveLength(1)
        expect(result.discarded[0]?.discardReason).toBe("hallucination")
        expect(provider.requests).toHaveLength(1)
        expect(provider.requests[0]?.messages[0]?.content).toBe("HALLUCINATION_TEMPLATE")
    })

    test("falls back to default prompt when template resolution fails", async () => {
        const provider = new InMemoryLLMProvider()
        provider.responses.push({content: '{"isSupported": true}'})
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        generatePromptUseCase.nextResult = Result.fail<string, ValidationError>(
            new ValidationError("Generate prompt failed", [{
                field: "name",
                message: "Template not found",
            }]),
        )
        const filter = new HallucinationSafeguardFilter({
            llmProvider: provider,
            generatePromptUseCase,
            defaults: hallucinationDefaults,
        })
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function y() {}\\n",
            },
        ])
        const suggestion = createSuggestion({
            id: "fallback",
            codeBlock: "function x() {}",
        })

        const result = await filter.filter([suggestion], state)

        expect(result.passed).toHaveLength(1)
        expect(provider.requests).toHaveLength(1)
        expect(provider.requests[0]?.messages[0]?.content).toContain("strict static review validator")
    })

    test("includes hunk text when building hallucination prompt", async () => {
        const provider = new InMemoryLLMProvider()
        provider.responses.push({content: '{"isSupported": true}'})
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        const filter = new HallucinationSafeguardFilter({
            llmProvider: provider,
            generatePromptUseCase,
            defaults: hallucinationDefaults,
        })
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function y() {}\\n",
                hunks: [
                    "@@ -1,1 +1,1 @@",
                    42,
                ],
            },
        ])
        const suggestion = createSuggestion({
            id: "hunks",
            codeBlock: "function x() {}",
        })

        const result = await filter.filter([suggestion], state)

        expect(result.passed).toHaveLength(1)
        expect(provider.requests).toHaveLength(1)
        expect(provider.requests[0]?.messages[1]?.content).toContain("@@ -1,1 +1,1 @@")
    })

    test("discards suggestions already implemented in file patch", async () => {
        const filter = new ImplementationCheckSafeguardFilter()
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function existing() {}\\n",
            },
        ])
        const source = [
            createSuggestion({
                id: "implemented",
                codeBlock: "function existing() {}",
            }),
            createSuggestion({
                id: "new",
                codeBlock: "function new() {}",
                lineStart: 20,
                lineEnd: 20,
            }),
        ]

        const result = await filter.filter(source, state)

        expect(result.passed.map((item) => item.id)).toEqual(["new"])
        expect(result.discarded.map((item) => item.id)).toEqual(["implemented"])
        expect(result.discarded[0]?.discardReason).toBe("already_implemented")
    })

    test("keeps suggestions without code block or without matching file", async () => {
        const filter = new ImplementationCheckSafeguardFilter()
        const state = createStateWithFiles({}, [
            {
                path: "src/app.ts",
                patch: "+function existing() {}\\n",
            },
        ])
        const source = [
            createSuggestion({
                id: "no-code",
                codeBlock: "",
            }),
            createSuggestion({
                id: "no-file",
                filePath: "src/missing.ts",
                codeBlock: "function missing() {}",
            }),
        ]

        const result = await filter.filter(source, state)

        expect(result.passed.map((item) => item.id)).toEqual(["no-code", "no-file"])
        expect(result.discarded).toHaveLength(0)
    })
})
