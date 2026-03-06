import {describe, expect, test} from "bun:test"

import {GeneratePromptUseCase} from "../../../src/application/use-cases/generate-prompt.use-case"
import {PromptConfiguration} from "../../../src/domain/entities/prompt-configuration.entity"
import {
    PromptTemplate,
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
} from "../../../src/domain/entities/prompt-template.entity"
import {PromptEngineService} from "../../../src/domain/services/prompt-engine.service"
import type {IPromptConfigurationRepository} from "../../../src/application/ports/outbound/prompt-configuration-repository.port"
import type {IPromptTemplateRepository} from "../../../src/application/ports/outbound/prompt-template-repository.port"
import type {ISystemSettingsProvider} from "../../../src/application/ports/outbound/common/system-settings-provider.port"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

class InMemoryPromptTemplateRepository implements IPromptTemplateRepository {
    public readonly byName = new Map<string, PromptTemplate>()
    public readonly byId = new Map<string, PromptTemplate>()
    private static readonly GLOBAL_SCOPE = "global"
    private static readonly KEY_DELIMITER = "::"

    public findById(id: UniqueId): Promise<PromptTemplate | null> {
        return Promise.resolve(this.byId.get(id.value) ?? null)
    }

    public findByName(name: string, organizationId?: OrganizationId): Promise<PromptTemplate | null> {
        const scoped = this.makeKey(
            name,
            organizationId === undefined
                ? InMemoryPromptTemplateRepository.GLOBAL_SCOPE
                : organizationId.toString(),
        )
        const global = this.makeKey(name, InMemoryPromptTemplateRepository.GLOBAL_SCOPE)

        return Promise.resolve(this.byName.get(scoped) ?? this.byName.get(global) ?? null)
    }

    public findByCategory(_category: PromptTemplateCategory): Promise<readonly PromptTemplate[]> {
        const templates = Array.from(this.byId.values()).filter((template) => template.category === _category)
        return Promise.resolve(templates)
    }

    public findGlobal(): Promise<readonly PromptTemplate[]> {
        const templates = Array.from(this.byId.values()).filter((template) => template.isGlobal)
        return Promise.resolve(templates)
    }

    public findAll(): Promise<readonly PromptTemplate[]> {
        return Promise.resolve(Array.from(this.byId.values()))
    }

    public async save(template: PromptTemplate): Promise<void> {
        this.store(template, template.name, template.organizationId)
        return Promise.resolve()
    }

    public add(name: string, template: PromptTemplate, organizationId?: OrganizationId): void {
        this.store(template, name, organizationId)
    }

    public async deleteById(id: UniqueId): Promise<void> {
        const existing = this.byId.get(id.value)
        if (existing !== undefined) {
            const scope = existing.isGlobal
                ? InMemoryPromptTemplateRepository.GLOBAL_SCOPE
                : existing.organizationId?.toString() ?? InMemoryPromptTemplateRepository.GLOBAL_SCOPE
            this.byName.delete(this.makeKey(existing.name, scope))
            this.byId.delete(id.value)
        }

        return Promise.resolve()
    }

    private store(template: PromptTemplate, name: string, organizationId?: OrganizationId): void {
        const scope = organizationId === undefined
            ? InMemoryPromptTemplateRepository.GLOBAL_SCOPE
            : organizationId.toString()
        this.byName.set(this.makeKey(name, scope), template)
        this.byId.set(template.id.value, template)
    }

    private makeKey(name: string, organizationId: string): string {
        return `${organizationId}${InMemoryPromptTemplateRepository.KEY_DELIMITER}${name}`
    }
}

class InMemoryPromptConfigurationRepository implements IPromptConfigurationRepository {
    public readonly byName = new Map<string, PromptConfiguration>()
    public readonly byTemplateId = new Map<string, PromptConfiguration>()
    private static readonly GLOBAL_SCOPE = "global"
    private static readonly KEY_DELIMITER = "::"

    public findByTemplateId(_templateId: string): Promise<PromptConfiguration | null> {
        return Promise.resolve(this.byTemplateId.get(_templateId) ?? null)
    }

    public async findByName(name: string, organizationId?: OrganizationId): Promise<PromptConfiguration | null> {
        const scoped = this.makeKey(
            name,
            organizationId === undefined
                ? InMemoryPromptConfigurationRepository.GLOBAL_SCOPE
                : organizationId.toString(),
        )
        const global = this.makeKey(name, InMemoryPromptConfigurationRepository.GLOBAL_SCOPE)

        return Promise.resolve(this.byName.get(scoped) ?? this.byName.get(global) ?? null)
    }

    public async save(_configuration: PromptConfiguration): Promise<void> {
        return Promise.resolve()
    }

    public async delete(_id: string): Promise<void> {
        return Promise.resolve()
    }

    public add(name: string, configuration: PromptConfiguration, organizationId?: OrganizationId): void {
        const scope = organizationId === undefined
            ? InMemoryPromptConfigurationRepository.GLOBAL_SCOPE
            : organizationId.toString()
        this.byName.set(this.makeKey(name, scope), configuration)
        this.byTemplateId.set(configuration.templateId.value, configuration)
    }

    private makeKey(name: string, organizationId: string): string {
        return `${organizationId}${InMemoryPromptConfigurationRepository.KEY_DELIMITER}${name}`
    }
}

describe("GeneratePromptUseCase", () => {
    test("renders prompt using template and config merge precedence", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })

        const template = new PromptTemplate(UniqueId.create("template-1"), {
            name: "review-summary",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "User:{{user.name}}|Level:{{level}}|Tags:{{extra.tags}}|Nested:{{extra.nested.value}}|Missing:{{extra.missing}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })
        const configuration = new PromptConfiguration(UniqueId.create("configuration-1"), {
            templateId: template.id,
            name: "review-summary",
            defaults: {
                user: {
                    name: "global-user",
                },
                level: 1,
                extra: {
                    nested: {
                        value: "base-nested",
                    },
                    tags: ["base"],
                    missing: "default-missing",
                },
            },
            overrides: {
                user: {
                    name: "override-user",
                },
                extra: {
                    nested: {
                        value: "override-nested",
                    },
                },
            },
            isGlobal: true,
        })

        templateRepository.add(template.name, template)
        configurationRepository.add(configuration.name, configuration)

        const result = await useCase.execute({
            name: "review-summary",
            runtimeVariables: {
                level: 3,
                extra: {
                    tags: ["runtime"],
                    nested: {
                        value: "runtime-nested",
                    },
                },
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe(
            "User:override-user|Level:3|Tags:[\"runtime\"]|Nested:runtime-nested|Missing:default-missing",
        )
    })

    test("renders without configuration when none found", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })
        const template = new PromptTemplate(UniqueId.create("template-2"), {
            name: "bare-template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Hello {{name}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })

        templateRepository.add(template.name, template)
        const result = await useCase.execute({
            name: "bare-template",
            runtimeVariables: {
                name: "Alice",
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe("Hello Alice")
    })

    test("renders nested arrays and objects in runtime variables", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })
        const template = new PromptTemplate(UniqueId.create("template-nested"), {
            name: "nested-template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Items: {{items}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })

        templateRepository.add(template.name, template)
        const result = await useCase.execute({
            name: "nested-template",
            runtimeVariables: {
                items: [
                    {
                        id: 1,
                        tags: ["a"],
                    },
                ],
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe("Items: [{\"id\":1,\"tags\":[\"a\"]}]")
    })

    test("returns validation error when template does not exist", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            name: "missing",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "name",
                message: "Template not found",
            },
        ])
    })

    test("returns validation error for invalid input", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })

        const nameError = await useCase.execute({
            name: "",
        })
        expect(nameError.isFail).toBe(true)
        expect(nameError.error.fields.some((field) => field.field === "name")).toBe(true)

        const runtimeError = await useCase.execute({
            name: "abc",
            runtimeVariables: [] as unknown as Record<string, unknown>,
        })
        expect(runtimeError.isFail).toBe(true)
        expect(runtimeError.error.fields.some((field) => field.field === "runtimeVariables")).toBe(true)
    })

    test("supports organization-specific lookup with fallback", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
        })

        const orgId = OrganizationId.create("acme")

        const globalTemplate = new PromptTemplate(UniqueId.create("template-3"), {
            name: "org-template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Global {{name}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })
        const scopedTemplate = new PromptTemplate(UniqueId.create("template-4"), {
            name: "org-template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Scoped {{name}}",
            variables: [],
            version: 1,
            isGlobal: false,
            organizationId: orgId,
        })

        templateRepository.add("org-template", globalTemplate)
        templateRepository.add("org-template", scopedTemplate, orgId)

        const result = await useCase.execute({
            name: "org-template",
            organizationId: "acme",
            runtimeVariables: {
                name: "acme",
            },
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe("Scoped acme")
    })

    test("uses review override defaults when configuration is missing", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
            systemSettingsProvider: createSystemSettingsProvider(),
        })

        const template = new PromptTemplate(UniqueId.create("template-5"), {
            name: "code-review-system",
            category: PROMPT_TEMPLATE_CATEGORY.ANALYSIS,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Bug:{{bugText}}|Critical:{{criticalText}}|Main:{{mainGenText}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })

        templateRepository.add(template.name, template)

        const result = await useCase.execute({
            name: "code-review-system",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe(
            "Bug:Bug description|Critical:Critical description|Main:Generation instructions",
        )
    })

    test("prefers configuration defaults over review overrides", async () => {
        const templateRepository = new InMemoryPromptTemplateRepository()
        const configurationRepository = new InMemoryPromptConfigurationRepository()
        const useCase = new GeneratePromptUseCase({
            promptTemplateRepository: templateRepository,
            promptConfigurationRepository: configurationRepository,
            promptEngineService: new PromptEngineService(),
            systemSettingsProvider: createSystemSettingsProvider(),
        })

        const template = new PromptTemplate(UniqueId.create("template-6"), {
            name: "code-review-system",
            category: PROMPT_TEMPLATE_CATEGORY.ANALYSIS,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Bug:{{bugText}}|Critical:{{criticalText}}",
            variables: [],
            version: 1,
            isGlobal: true,
        })
        const configuration = new PromptConfiguration(UniqueId.create("configuration-2"), {
            templateId: template.id,
            name: "code-review-system",
            defaults: {
                criticalText: "Config critical",
            },
            overrides: {},
            isGlobal: true,
        })

        templateRepository.add(template.name, template)
        configurationRepository.add(configuration.name, configuration)

        const result = await useCase.execute({
            name: "code-review-system",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected prompt generation success")
        }

        expect(result.value).toBe("Bug:Bug description|Critical:Config critical")
    })
})

function createSystemSettingsProvider(): ISystemSettingsProvider {
    return {
        get: <T>(key: string): Promise<T | undefined> => {
            if (key !== "review.overrides") {
                return Promise.resolve(undefined)
            }

            return Promise.resolve({
                name: "default-review-overrides",
                categories: {
                    descriptions: {
                        bug: "Bug description",
                        performance: "Performance description",
                        security: "Security description",
                    },
                },
                severity: {
                    flags: {
                        critical: "Critical description",
                        high: "High description",
                        medium: "Medium description",
                        low: "Low description",
                    },
                },
                generation: {
                    main: "Generation instructions",
                },
            } as T)
        },
        getMany: <T>(): Promise<ReadonlyMap<string, T>> => Promise.resolve(new Map<string, T>()),
    }
}
