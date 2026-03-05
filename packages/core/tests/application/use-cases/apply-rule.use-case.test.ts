import {describe, expect, test} from "bun:test"

import type {
    IChatRequestDTO,
    IChatResponseDTO,
} from "../../../src/application/dto/llm"
import type {IStreamingChatResponseDTO} from "../../../src/application/dto/llm/streaming-chat.dto"
import type {ILLMProvider} from "../../../src/application/ports/outbound/llm/llm-provider.port"
import type {
    ICustomRuleAstEvaluator,
    ICustomRuleAstTarget,
    ICustomRuleAstMatch,
} from "../../../src/application/ports/outbound/rule/custom-rule-ast-evaluator.port"
import type {CustomRule} from "../../../src/domain/entities/custom-rule.entity"
import {CUSTOM_RULE_SCOPE, CUSTOM_RULE_STATUS, CUSTOM_RULE_TYPE} from "../../../src/domain/entities/custom-rule.entity"
import {CustomRuleFactory} from "../../../src/domain/factories/custom-rule.factory"
import type {IDiscardedSuggestionDTO, ISuggestionDTO} from "../../../src/application/dto/review"
import {ApplyRuleUseCase} from "../../../src/application/use-cases/apply-rule.use-case"
import type {ISafeGuardFilter} from "../../../src/application/types/review/safeguard-filter.contract"
import {ReviewPipelineState} from "../../../src/application/types/review/review-pipeline-state"

const applyRuleDefaults = {
    promptModel: "gpt-4o-mini",
    promptMaxTokens: 1200,
    promptRankScore: 60,
    regexRankScore: 55,
    ruleSeverity: "MEDIUM" as const,
}

class InMemoryLLMProvider implements ILLMProvider {
    public lastRequest: IChatRequestDTO | null = null
    public readonly replies = new Map<string, string>()

    public chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        this.lastRequest = request
        const key = request.messages[1]?.content ?? ""
        const response = this.replies.get(key) ?? ""

        return Promise.resolve({
            content: response,
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

class StaticFilter implements ISafeGuardFilter {
    public readonly name = "static-filter"
    public readonly behavior: "pass" | "drop" | "throw"

    public constructor(behavior: "pass" | "drop" | "throw") {
        this.behavior = behavior
    }

    public async filter(
        suggestions: readonly ISuggestionDTO[],
        _context: ReviewPipelineState,
    ): Promise<{passed: readonly ISuggestionDTO[]; discarded: readonly IDiscardedSuggestionDTO[]}> {
        if (this.behavior === "throw") {
            return Promise.reject(new Error("filter failed"))
        }

        if (this.behavior === "drop") {
            const discarded = suggestions.map((suggestion): IDiscardedSuggestionDTO => {
                return {
                    ...suggestion,
                    discardReason: "filtered",
                    filterName: this.name,
                }
            })

            return {
                passed: [],
                discarded,
            }
        }

        return {
            passed: suggestions,
            discarded: [],
        }
    }
}

class InvalidDiscardFilter implements ISafeGuardFilter {
    public readonly name = "invalid-filter"

    public filter(
        _suggestions: readonly ISuggestionDTO[],
        _context: ReviewPipelineState,
    ): Promise<{passed: readonly ISuggestionDTO[]; discarded: readonly IDiscardedSuggestionDTO[]}> {
        return Promise.resolve({
            passed: [],
            discarded: [
                {} as IDiscardedSuggestionDTO,
            ],
        })
    }
}

class StaticAstEvaluator implements ICustomRuleAstEvaluator {
    public constructor(
        private readonly matches: readonly ICustomRuleAstMatch[],
    ) {}

    public async execute(
        _rule: CustomRule,
        _target: ICustomRuleAstTarget,
    ): Promise<readonly ICustomRuleAstMatch[]> {
        return Promise.resolve(this.matches)
    }
}

    function createActiveRule(
        options: {
            id?: string
            title?: string
            rule?: string
            type?: keyof typeof CUSTOM_RULE_TYPE
            scope?: keyof typeof CUSTOM_RULE_SCOPE
            severity?: string
        } = {},
    ): CustomRule {
        const factory = new CustomRuleFactory()
        const ruleType = options.type === undefined
            ? CUSTOM_RULE_TYPE.REGEX
            : CUSTOM_RULE_TYPE[options.type]
        const ruleScope = options.scope === undefined
            ? CUSTOM_RULE_SCOPE.FILE
            : CUSTOM_RULE_SCOPE[options.scope]
        return factory.reconstitute({
            id: options.id ?? "rule-1",
            title: options.title ?? "Rule",
            rule: options.rule ?? "TODO",
            type: ruleType,
            scope: ruleScope,
            severity: options.severity ?? "MEDIUM",
            status: CUSTOM_RULE_STATUS.ACTIVE,
        })
    }

function createState(): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-rule",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-1",
        },
        config: {
            applyFiltersToCustomRules: true,
        },
    })
}

describe("ApplyRuleUseCase", () => {
    test("applies regex rules to file diff patches", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({llmProvider, defaults: applyRuleDefaults})
        const input = {
            rules: [
                createActiveRule({
                    id: "r1",
                    title: "TODO rule",
                    rule: "TODO",
                }),
                createActiveRule({
                    id: "r2",
                    title: "InActive",
                    rule: "FIXME",
                    scope: "FILE",
                    type: "REGEX",
                    severity: "LOW",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/app.ts",
                    patch: "console.log('x') // TODO\n// TODO again",
                },
            ],
        }

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(2)
        expect(result.value.discardedSuggestions).toHaveLength(0)
        expect(result.value.suggestions[0]?.filePath).toBe("src/app.ts")
    })

    test("rejects invalid regex rule pattern", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({llmProvider, defaults: applyRuleDefaults})
        const input = {
            rules: [
                createActiveRule({
                    id: "r-invalid",
                    title: "invalid",
                    rule: "[",
                    type: "REGEX",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
        }

        const result = await useCase.execute(input)

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "rule:r-invalid",
            message:
                "REGEX rule validation failed: Invalid regular expression: missing terminating ] " +
                "for character class",
        })
    })

    test("applies PROMPT rule and maps JSON suggestions", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "Apply custom rule \"prompt rule\" to src/a.ts:\nRule: no-unused\n\nconst a = 1",
            JSON.stringify([
                {
                    message: "Consider simpler implementation",
                    severity: "high",
                    filePath: "src/a.ts",
                    lineStart: 1,
                    lineEnd: 1,
                    committable: false,
                    rankScore: 90,
                    category: "quality",
                },
            ]),
        )
        const useCase = new ApplyRuleUseCase({llmProvider, defaults: applyRuleDefaults})

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r3",
                    title: "prompt rule",
                    type: "PROMPT",
                    rule: "no-unused",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/a.ts",
                    patch: "const a = 1",
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(1)
        expect(result.value.suggestions[0]?.message).toContain("prompt rule")
        expect(result.value.suggestions[0]?.category).toBe("quality")
        expect(result.value.suggestions[0]?.severity).toBe("HIGH")
        expect(result.value.suggestions[0]?.committable).toBe(false)
    })

    test("bypasses SafeGuard when flag is false", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            filters: [new StaticFilter("drop")],
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r4",
                    title: "regex rule",
                    rule: "TODO",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: false,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(1)
        expect(result.value.discardedSuggestions).toHaveLength(0)
    })

    test("applies SafeGuard filters and stores discarded suggestions", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            filters: [new StaticFilter("drop")],
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r5",
                    title: "regex rule",
                    rule: "TODO",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: true,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
            filterContext: createState(),
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(0)
        expect(result.value.discardedSuggestions).toHaveLength(1)
        expect(result.value.discardedSuggestions[0]?.filterName).toBe("static-filter")
        expect(result.value.discardedSuggestions[0]?.discardReason).toBe("filtered")
    })

    test("passes through SafeGuard when filters accept suggestions", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            filters: [new StaticFilter("pass")],
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r-pass",
                    title: "regex rule",
                    rule: "TODO",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: true,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
            filterContext: createState(),
        })

        expect(result.isOk).toBe(true)
        if (result.isOk) {
            expect(result.value.suggestions).toHaveLength(1)
            expect(result.value.discardedSuggestions).toHaveLength(0)
        }
    })

    test("requires filter context when SafeGuard is enabled", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            filters: [new StaticFilter("pass")],
            defaults: applyRuleDefaults,
        })
        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r6",
                    title: "regex rule",
                    rule: "TODO",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: true,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "filterContext",
            message: "must be provided when filter chain is enabled",
        })
    })

    test("returns validation error when filter throws", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            filters: [new StaticFilter("throw")],
            defaults: applyRuleDefaults,
        })
        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r-throw",
                    title: "regex rule",
                    rule: "TODO",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: true,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
            filterContext: createState(),
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "filters",
            message: "filter failed",
        })
    })

    test("uses hunks as source text when patch and content are missing", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({llmProvider, defaults: applyRuleDefaults})
        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r-hunk",
                    rule: "TODO",
                    type: "REGEX",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/app.ts",
                    hunks: [
                        {
                            patch: "+TODO: update handler",
                        },
                    ],
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isOk) {
            expect(result.value.suggestions).toHaveLength(1)
            expect(result.value.suggestions[0]?.filePath).toBe("src/app.ts")
        }
    })

    test("creates fallback discarded suggestion for malformed filter payload", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            defaults: applyRuleDefaults,
            filters: [new InvalidDiscardFilter()],
        })
        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r-filter",
                    rule: "TODO",
                    type: "REGEX",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {
                applyFiltersToCustomRules: true,
            },
            files: [
                {
                    path: "src/app.ts",
                    patch: "TODO",
                },
            ],
            filterContext: createState(),
        })

        expect(result.isOk).toBe(true)
        if (result.isOk) {
            expect(result.value.suggestions).toHaveLength(0)
            expect(result.value.discardedSuggestions).toHaveLength(1)
            expect(result.value.discardedSuggestions[0]?.filterName).toBe("invalid-filter")
        }
    })

    test("maps CCR scope for prompt rules", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "Apply custom rule \"ccr rule\" to GLOBAL:\nRule: no-empty-ccr\n\nA\nB",
            JSON.stringify({
                suggestions: [
                    {
                        message: "Reduce cyclomatic complexity",
                        lineStart: 1,
                        lineEnd: 1,
                        committable: true,
                        rankScore: 40,
                    },
                ],
            }),
        )

        const useCase = new ApplyRuleUseCase({
            llmProvider,
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r7",
                    title: "ccr rule",
                    type: "PROMPT",
                    scope: "CCR",
                    rule: "no-empty-ccr",
                    severity: "HIGH",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.CCR,
            config: {},
            ccrText: "A\nB",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(1)
        expect(result.value.suggestions[0]?.filePath).toBe("GLOBAL")
        expect(result.value.suggestions[0]?.message).toContain("ccr rule")
    })

    test("applies AST rule using external evaluator", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            astEvaluator: new StaticAstEvaluator([
                {
                    filePath: "src/a.ts",
                    lineStart: 1,
                    lineEnd: 2,
                    message: "Avoid nested complexity",
                    severity: "high",
                    committable: true,
                    rankScore: 88,
                },
            ]),
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r8",
                    title: "ast rule",
                    type: "AST",
                    rule: "{ \"kind\": \"Program\" }",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/a.ts",
                    patch: "const a = 1",
                },
            ],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected success result")
        }

        expect(result.value.suggestions).toHaveLength(1)
        expect(result.value.suggestions[0]?.message).toContain("ast rule")
        expect(result.value.suggestions[0]?.message).toContain("Avoid nested complexity")
        expect(result.value.suggestions[0]?.severity).toBe("HIGH")
    })

    test("fails AST rule when evaluator is missing", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({llmProvider, defaults: applyRuleDefaults})

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r9",
                    title: "ast no evaluator",
                    type: "AST",
                    rule: "{ \"kind\": \"Program\" }",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/a.ts",
                    patch: "const a = 1",
                },
            ],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "rule:r9",
            message: "AST rule evaluator is required for AST rule type",
        })
    })

    test("validates invalid AST rule payload before execution", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ApplyRuleUseCase({
            llmProvider,
            astEvaluator: new StaticAstEvaluator([]),
            defaults: applyRuleDefaults,
        })

        const result = await useCase.execute({
            rules: [
                createActiveRule({
                    id: "r10",
                    title: "ast invalid",
                    type: "AST",
                    rule: "{kind:Program",
                }),
            ],
            scope: CUSTOM_RULE_SCOPE.FILE,
            config: {},
            files: [
                {
                    path: "src/a.ts",
                    patch: "const a = 1",
                },
            ],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toHaveLength(1)
        expect(result.error.fields[0]?.field).toBe("rule:r10")
        expect(result.error.fields[0]?.message).toContain("AST rule validation failed")
    })
})
