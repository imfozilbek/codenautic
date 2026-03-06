import {describe, expect, test} from "bun:test"

import type {IUseCase} from "../../../src/application/ports/inbound/use-case.port"
import type {IGeneratePromptInput} from "../../../src/application/use-cases/generate-prompt.use-case"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../../../src/application/dto/rules/get-enabled-rules.dto"
import type {
    ILibraryRuleFilters,
    ILibraryRuleRepository,
} from "../../../src/application/ports/outbound/rule/library-rule-repository.port"
import type {IExpertPanelRepository} from "../../../src/application/ports/outbound/expert-panel-repository.port"
import {LibraryRuleFactory} from "../../../src/domain/factories/library-rule.factory"
import {LIBRARY_RULE_SCOPE} from "../../../src/domain/entities/library-rule.entity"
import type {LibraryRule} from "../../../src/domain/entities/library-rule.entity"
import {ExpertPanel} from "../../../src/domain/value-objects/prompt/expert-panel"
import {Expert} from "../../../src/domain/value-objects/prompt/expert"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {ValidationError} from "../../../src/domain/errors/validation.error"
import {Result} from "../../../src/shared/result"
import {
    appendRuleContext,
    resolveRuleContext,
    resolveSystemPrompt,
} from "../../../src/application/shared/prompt-resolution"

const DEFAULT_PROMPT_INPUT = {
    generatePromptUseCase: {
        execute(): Promise<Result<string, ValidationError>> {
            return Promise.resolve(Result.ok<string, ValidationError>("Prompt"))
        },
    },
    promptName: "test",
    organizationId: null,
    runtimeVariables: {},
} satisfies {
    generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    promptName: string
    organizationId: string | null
    runtimeVariables: Record<string, unknown>
}

describe("prompt resolution", () => {
    test("resolveSystemPrompt returns normalized prompt", async () => {
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(): Promise<Result<string, ValidationError>> {
                return Promise.resolve(Result.ok<string, ValidationError>("  Hello Prompt  "))
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBe("Hello Prompt")
    })

    test("resolveSystemPrompt injects expert panel into runtime variables", async () => {
        let capturedVariables: Record<string, unknown> | undefined
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(input: IGeneratePromptInput): Promise<Result<string, ValidationError>> {
                capturedVariables = input.runtimeVariables
                return Promise.resolve(Result.ok<string, ValidationError>("Prompt"))
            },
        }
        const panel = ExpertPanel.create([
            Expert.create({
                name: "Neo",
                role: "Lead reviewer",
                responsibilities: ["Reject unsafe suggestions"],
                priority: 1,
            }),
        ])
        const repository: IExpertPanelRepository = {
            findByName(name: string): Promise<ExpertPanel | null> {
                return Promise.resolve(name === "safeguard" ? panel : null)
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
            expertPanelRepository: repository,
            expertPanelName: "safeguard",
        })

        expect(result.isOk).toBe(true)
        expect(capturedVariables?.expertPanel).toBe(panel.formatForPrompt())
    })

    test("resolveSystemPrompt reports missing prompt template", async () => {
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(): Promise<Result<string, ValidationError>> {
                return Promise.resolve(Result.fail<string, ValidationError>(
                    new ValidationError("Missing", [{
                        field: "name",
                        message: "Template not found",
                    }]),
                ))
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.reason).toBe("missing")
    })

    test("resolveSystemPrompt uses default prompt when template is missing", async () => {
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(): Promise<Result<string, ValidationError>> {
                return Promise.resolve(Result.fail<string, ValidationError>(
                    new ValidationError("Missing", [{
                        field: "name",
                        message: "Template not found",
                    }]),
                ))
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
            defaultPrompt: "  Default prompt  ",
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBe("Default prompt")
    })

    test("resolveSystemPrompt reports empty prompt", async () => {
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(): Promise<Result<string, ValidationError>> {
                return Promise.resolve(Result.ok<string, ValidationError>("   "))
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.reason).toBe("empty")
    })

    test("resolveSystemPrompt reports exceptions", async () => {
        const generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError> = {
            execute(): Promise<Result<string, ValidationError>> {
                throw new Error("Boom")
            },
        }

        const result = await resolveSystemPrompt({
            ...DEFAULT_PROMPT_INPUT,
            generatePromptUseCase,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.reason).toBe("exception")
    })

    test("appendRuleContext keeps variables when rules are missing", () => {
        const result = appendRuleContext({files: "payload"}, undefined)

        expect(result).toEqual({files: "payload"})
    })

    test("appendRuleContext appends rules payload", () => {
        const result = appendRuleContext({files: "payload"}, "[{\"rule\":1}]")

        expect(result).toEqual({files: "payload", rules: "[{\"rule\":1}]"})
    })

    test("resolveRuleContext returns undefined when organizationId is missing", async () => {
        const result = await resolveRuleContext({
            organizationId: undefined,
            getEnabledRulesUseCase: createGetEnabledRulesUseCase(Result.ok({ruleIds: []})),
            libraryRuleRepository: createLibraryRuleRepository(new Map()),
            ruleContextFormatterService: createFormatter(),
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBeUndefined()
    })

    test("resolveRuleContext fails when enabled rules use case fails", async () => {
        const result = await resolveRuleContext({
            organizationId: "org-1",
            getEnabledRulesUseCase: createGetEnabledRulesUseCase(Result.fail(new ValidationError("bad", []))),
            libraryRuleRepository: createLibraryRuleRepository(new Map()),
            ruleContextFormatterService: createFormatter(),
        })

        expect(result.isFail).toBe(true)
        expect(result.error.reason).toBe("enabled-rules")
    })

    test("resolveRuleContext returns undefined when no rule ids provided", async () => {
        const result = await resolveRuleContext({
            organizationId: "org-1",
            getEnabledRulesUseCase: createGetEnabledRulesUseCase(Result.ok({ruleIds: []})),
            libraryRuleRepository: createLibraryRuleRepository(new Map()),
            ruleContextFormatterService: createFormatter(),
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBeUndefined()
    })

    test("resolveRuleContext returns undefined when rules are missing in repository", async () => {
        const result = await resolveRuleContext({
            organizationId: "org-1",
            getEnabledRulesUseCase: createGetEnabledRulesUseCase(Result.ok({ruleIds: ["rule-1"]})),
            libraryRuleRepository: createLibraryRuleRepository(new Map()),
            ruleContextFormatterService: createFormatter(),
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBeUndefined()
    })

    test("resolveRuleContext formats rule payload when rules exist", async () => {
        const factory = new LibraryRuleFactory()
        const rule = factory.create({
            uuid: "rule-1",
            title: "Use const",
            rule: "Prefer const",
            whyIsThisImportant: "Consistency",
            severity: "MEDIUM",
            scope: LIBRARY_RULE_SCOPE.FILE,
            buckets: ["style"],
        })
        const formatter = createFormatter()
        const repository = createLibraryRuleRepository(new Map([["rule-1", rule]]))

        const result = await resolveRuleContext({
            organizationId: "org-1",
            getEnabledRulesUseCase: createGetEnabledRulesUseCase(Result.ok({ruleIds: ["rule-1"]})),
            libraryRuleRepository: repository,
            ruleContextFormatterService: formatter,
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toBe("formatted:1")
        expect(formatter.captured?.length).toBe(1)
    })
})

function createGetEnabledRulesUseCase(
    result: Result<IGetEnabledRulesOutput, ValidationError>,
): IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError> {
    return {
        execute(): Promise<Result<IGetEnabledRulesOutput, ValidationError>> {
            return Promise.resolve(result)
        },
    }
}

function createLibraryRuleRepository(
    rulesByUuid: Map<string, LibraryRule>,
): ILibraryRuleRepository {
    return {
        findById(_id: UniqueId): Promise<LibraryRule | null> {
            return Promise.resolve(null)
        },
        save(_entity: LibraryRule): Promise<void> {
            return Promise.resolve()
        },
        findByUuid(ruleUuid: string): Promise<LibraryRule | null> {
            return Promise.resolve(rulesByUuid.get(ruleUuid) ?? null)
        },
        findByLanguage(_language: string): Promise<readonly LibraryRule[]> {
            return Promise.resolve([])
        },
        findByCategory(_category: string): Promise<readonly LibraryRule[]> {
            return Promise.resolve([])
        },
        findGlobal(): Promise<readonly LibraryRule[]> {
            return Promise.resolve([])
        },
        findByOrganization(_organizationId: OrganizationId): Promise<readonly LibraryRule[]> {
            return Promise.resolve([])
        },
        count(_filters: ILibraryRuleFilters): Promise<number> {
            return Promise.resolve(0)
        },
        saveMany(_rules: readonly LibraryRule[]): Promise<void> {
            return Promise.resolve()
        },
        delete(_id: UniqueId): Promise<void> {
            return Promise.resolve()
        },
    }
}

function createFormatter(): {captured?: readonly LibraryRule[]; formatForPrompt: (rules: readonly LibraryRule[]) => string} {
    const formatter: {captured?: readonly LibraryRule[]; formatForPrompt: (rules: readonly LibraryRule[]) => string} = {
        captured: undefined,
        formatForPrompt: (rules: readonly LibraryRule[]): string => {
            formatter.captured = rules
            return `formatted:${rules.length}`
        },
    }

    return formatter
}
