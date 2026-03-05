import {describe, expect, test} from "bun:test"

import {
    Result,
    RuleContextFormatterService,
    ValidationError,
} from "../../../../src"
import type {
    IChatRequestDTO,
    IChatResponseDTO,
    IGeneratePromptInput,
    ILLMProvider,
    IStreamingChatResponseDTO,
    IUseCase,
} from "../../../../src"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../../../../src/application/dto/rules/get-enabled-rules.dto"
import type {
    ILibraryRuleFilters,
    ILibraryRuleRepository,
} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {ProcessCcrLevelReviewStageUseCase} from "../../../../src/application/use-cases/review/process-ccr-level-review-stage.use-case"
import type {LibraryRule} from "../../../../src/domain/entities/library-rule.entity"
import {LibraryRuleFactory} from "../../../../src/domain/factories/library-rule.factory"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

const ccrReviewDefaults = {
    model: "gpt-4o-mini",
    maxTokens: 1200,
    promptName: "ccr-level-review",
}

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
 * Asserts request capture.
 *
 * @param request Captured request.
 * @returns Non-null request.
 */
function assertRequest(request: IChatRequestDTO | null): IChatRequestDTO {
    expect(request).not.toBeNull()
    if (request === null) {
        throw new Error("LLM request was not captured")
    }

    return request
}

/**
 * Asserts runtime variables presence.
 *
 * @param runtimeVariables Runtime variables payload.
 * @returns Runtime variables map.
 */
function assertRuntimeVariables(
    runtimeVariables: Record<string, unknown> | undefined,
): Record<string, unknown> {
    expect(runtimeVariables).toBeDefined()
    if (runtimeVariables === undefined) {
        throw new Error("Runtime variables were not set")
    }

    return runtimeVariables
}

/**
 * In-memory prompt generator stub for CCR stage tests.
 */
class InMemoryGeneratePromptUseCase
    implements IUseCase<IGeneratePromptInput, string, ValidationError>
{
    public readonly calls: IGeneratePromptInput[] = []
    public nextResult: Result<string, ValidationError>

    /**
     * Creates prompt use case stub with success default.
     */
    public constructor() {
        this.nextResult = Result.ok("TEMPLATE_SYSTEM")
    }

    public execute(
        input: IGeneratePromptInput,
    ): Promise<Result<string, ValidationError>> {
        this.calls.push(input)
        return Promise.resolve(this.nextResult)
    }
}

/**
 * In-memory enabled-rules use case stub.
 */
class InMemoryGetEnabledRulesUseCase
    implements IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
{
    public readonly calls: IGetEnabledRulesInput[] = []
    public nextResult: Result<IGetEnabledRulesOutput, ValidationError>

    /**
     * Creates stub with empty rule list.
     */
    public constructor() {
        this.nextResult = Result.ok({
            ruleIds: [],
        })
    }

    public execute(
        input: IGetEnabledRulesInput,
    ): Promise<Result<IGetEnabledRulesOutput, ValidationError>> {
        this.calls.push(input)
        return Promise.resolve(this.nextResult)
    }
}

/**
 * In-memory library rule repository for tests.
 */
class InMemoryLibraryRuleRepository implements ILibraryRuleRepository {
    private readonly rulesByUuid: Map<string, LibraryRule>

    /**
     * Creates repository with optional seed rules.
     *
     * @param rules Seed rules.
     */
    public constructor(rules: readonly LibraryRule[] = []) {
        this.rulesByUuid = new Map(
            rules.map((rule): [string, LibraryRule] => {
                return [rule.uuid, rule]
            }),
        )
    }

    public findByUuid(ruleUuid: string): Promise<LibraryRule | null> {
        return Promise.resolve(this.rulesByUuid.get(ruleUuid) ?? null)
    }

    public findById(_id: UniqueId): Promise<LibraryRule | null> {
        return Promise.resolve(null)
    }

    public save(_entity: LibraryRule): Promise<void> {
        return Promise.resolve()
    }

    public findByLanguage(_language: string): Promise<readonly LibraryRule[]> {
        return Promise.resolve([])
    }

    public findByCategory(_category: string): Promise<readonly LibraryRule[]> {
        return Promise.resolve([])
    }

    public findGlobal(): Promise<readonly LibraryRule[]> {
        return Promise.resolve([])
    }

    public findByOrganization(_organizationId: OrganizationId): Promise<readonly LibraryRule[]> {
        return Promise.resolve([])
    }

    public count(_filters: ILibraryRuleFilters): Promise<number> {
        return Promise.resolve(0)
    }

    public saveMany(_rules: readonly LibraryRule[]): Promise<void> {
        return Promise.resolve()
    }

    public delete(_id: UniqueId): Promise<void> {
        return Promise.resolve()
    }
}

interface IUseCaseBundle {
    readonly useCase: ProcessCcrLevelReviewStageUseCase
    readonly generatePromptUseCase: InMemoryGeneratePromptUseCase
    readonly getEnabledRulesUseCase: InMemoryGetEnabledRulesUseCase
    readonly ruleContextFormatterService: RuleContextFormatterService
}

/**
 * Creates process-ccr-level-review use case with prompt generator stub.
 *
 * @param llmProvider LLM provider stub.
 * @param promptUseCase Optional prompt use case override.
 * @returns Use case bundle with prompt stub for customization.
 */
function createUseCaseBundle(
    llmProvider: ILLMProvider,
    promptUseCase?: InMemoryGeneratePromptUseCase,
): IUseCaseBundle {
    const generatePromptUseCase = promptUseCase ?? new InMemoryGeneratePromptUseCase()
    const getEnabledRulesUseCase = new InMemoryGetEnabledRulesUseCase()
    const libraryRuleRepository = new InMemoryLibraryRuleRepository()
    const ruleContextFormatterService = new RuleContextFormatterService()

    return {
        useCase: new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
            generatePromptUseCase,
            getEnabledRulesUseCase,
            libraryRuleRepository,
            ruleContextFormatterService,
            defaults: ccrReviewDefaults,
        }),
        generatePromptUseCase,
        getEnabledRulesUseCase,
        ruleContextFormatterService,
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
    mergeRequestOverrides: Readonly<Record<string, unknown>> = {},
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-ccr",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-40",
            ...mergeRequestOverrides,
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
        const {useCase, generatePromptUseCase} = createUseCaseBundle(llmProvider)
        const state = createState(
            [
                {
                    path: "src/main.ts",
                    patch: "@@ -1,1 +1,2 @@",
                },
            ],
            {},
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

        const request = assertRequest(llmProvider.lastRequest)
        expect(generatePromptUseCase.calls).toHaveLength(1)
        const promptCall = generatePromptUseCase.calls[0]
        expect(promptCall?.name).toBe("ccr-level-review")
        const runtimeVariables = assertRuntimeVariables(promptCall?.runtimeVariables)
        expect(typeof runtimeVariables["files"]).toBe("string")
        expect(runtimeVariables["files"]).toContain("FILE: src/main.ts")
        expect(runtimeVariables["rules"]).toBeUndefined()
        expect(request.model).toBe("gpt-4o-mini")
        expect(request.messages[0]?.content).toBe("TEMPLATE_SYSTEM")
        expect(request.messages[1]?.content.includes("FILE: src/main.ts")).toBe(true)
    })

    test("injects enabled rules into template variables", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseContent = JSON.stringify({suggestions: []})
        const ruleFactory = new LibraryRuleFactory()
        const rule = ruleFactory.create({
            uuid: "rule-ccr-1",
            title: "Avoid eval",
            rule: "Never use eval",
            whyIsThisImportant: "Eval is unsafe",
            severity: "HIGH",
            examples: [{
                snippet: "eval(userInput)",
                isCorrect: false,
            }],
            language: "ts",
            buckets: ["security"],
            scope: "FILE",
            plugAndPlay: true,
        })
        const generatePromptUseCase = new InMemoryGeneratePromptUseCase()
        const getEnabledRulesUseCase = new InMemoryGetEnabledRulesUseCase()
        getEnabledRulesUseCase.nextResult = Result.ok({
            ruleIds: [rule.uuid],
        })
        const libraryRuleRepository = new InMemoryLibraryRuleRepository([rule])
        const ruleContextFormatterService = new RuleContextFormatterService()

        const stage = new ProcessCcrLevelReviewStageUseCase({
            llmProvider,
            generatePromptUseCase,
            getEnabledRulesUseCase,
            libraryRuleRepository,
            ruleContextFormatterService,
            defaults: ccrReviewDefaults,
        })

        const state = createState(
            [
                {
                    path: "src/main.ts",
                    patch: "@@ -1,1 +1,2 @@",
                },
            ],
            {
                globalRuleIds: [rule.uuid],
                organizationRuleIds: [],
            },
            {
                organizationId: "org-1",
                teamId: "team-1",
            },
        )

        const result = await stage.execute({state})

        expect(result.isOk).toBe(true)
        expect(getEnabledRulesUseCase.calls).toHaveLength(1)
        expect(getEnabledRulesUseCase.calls[0]?.organizationId).toBe("org-1")
        expect(getEnabledRulesUseCase.calls[0]?.globalRuleIds).toEqual([rule.uuid])
        const promptCall = generatePromptUseCase.calls[0]
        const runtimeVariables = assertRuntimeVariables(promptCall?.runtimeVariables)
        expect(runtimeVariables["rules"]).toBe(
            ruleContextFormatterService.formatForPrompt([rule]),
        )
    })

    test("fails stage when prompt template is missing", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const {useCase, generatePromptUseCase} = createUseCaseBundle(llmProvider)
        generatePromptUseCase.nextResult = Result.fail(
            new ValidationError("Generate prompt failed", [{
                field: "name",
                message: "Template not found",
            }]),
        )

        const state = createState(
            [
                {
                    path: "src/missing.ts",
                    patch: "@@ -1,1 +1,2 @@",
                },
            ],
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("Missing prompt template")
        expect(llmProvider.lastRequest).toBeNull()
    })

    test("falls back to single suggestion when response is non-json text", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseContent = "Consider adding integration tests for this flow."

        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
        const state = createState([], {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("CCR-level review")
    })
})
