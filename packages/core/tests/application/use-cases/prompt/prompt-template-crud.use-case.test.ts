import {describe, expect, test} from "bun:test"

import {CreatePromptTemplateUseCase} from "../../../../src/application/use-cases/prompt/create-prompt-template.use-case"
import {DeletePromptTemplateUseCase} from "../../../../src/application/use-cases/prompt/delete-prompt-template.use-case"
import {GetPromptTemplateByIdUseCase} from "../../../../src/application/use-cases/prompt/get-prompt-template-by-id.use-case"
import {ListPromptTemplatesUseCase} from "../../../../src/application/use-cases/prompt/list-prompt-templates.use-case"
import {UpdatePromptTemplateUseCase} from "../../../../src/application/use-cases/prompt/update-prompt-template.use-case"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {PromptTemplateFactory} from "../../../../src/domain/factories/prompt-template.factory"
import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplate,
    type PromptTemplateCategory,
    type PromptTemplateType,
} from "../../../../src/domain/entities/prompt-template.entity"
import {PromptEngineService} from "../../../../src/domain/services/prompt-engine.service"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import type {IPromptTemplateRepository} from "../../../../src/application/ports/outbound/prompt-template-repository.port"

class InMemoryPromptTemplateRepository implements IPromptTemplateRepository {
    private readonly byId = new Map<string, PromptTemplate>()

    public findById(id: UniqueId): Promise<PromptTemplate | null> {
        return Promise.resolve(this.byId.get(id.value) ?? null)
    }

    public findByName(name: string, organizationId?: OrganizationId): Promise<PromptTemplate | null> {
        const normalized = name.trim().toLowerCase()
        const templates = Array.from(this.byId.values())

        if (organizationId !== undefined) {
            const scoped = templates.find((template) => {
                if (template.name.toLowerCase() !== normalized) {
                    return false
                }

                if (template.isGlobal) {
                    return false
                }

                return template.organizationId?.value === organizationId.value
            })

            if (scoped !== undefined) {
                return Promise.resolve(scoped)
            }

            const global = templates.find((template) => {
                return template.name.toLowerCase() === normalized && template.isGlobal
            })

            return Promise.resolve(global ?? null)
        }

        const global = templates.find((template) => {
            return template.name.toLowerCase() === normalized && template.isGlobal
        })

        return Promise.resolve(global ?? null)
    }

    public findByCategory(category: PromptTemplateCategory): Promise<readonly PromptTemplate[]> {
        const templates = Array.from(this.byId.values()).filter((template) => template.category === category)
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
        this.byId.set(template.id.value, template)
        return Promise.resolve()
    }

    public async deleteById(id: UniqueId): Promise<void> {
        this.byId.delete(id.value)
        return Promise.resolve()
    }
}

interface IPromptTemplateOverrides {
    readonly name?: string
    readonly category?: PromptTemplateCategory
    readonly type?: PromptTemplateType
    readonly content?: string
    readonly variables?: readonly {readonly name: string}[]
    readonly version?: number
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

function buildTemplate(
    factory: PromptTemplateFactory,
    overrides: IPromptTemplateOverrides = {},
): PromptTemplate {
    return factory.create({
        name: overrides.name ?? "review-system",
        category: overrides.category ?? PROMPT_TEMPLATE_CATEGORY.RULES,
        type: overrides.type ?? PROMPT_TEMPLATE_TYPE.SYSTEM,
        content: overrides.content ?? "Hello {{name}}",
        variables: overrides.variables ?? [{name: "name"}],
        version: overrides.version,
        isGlobal: overrides.isGlobal,
        organizationId: overrides.organizationId,
    })
}

describe("CreatePromptTemplateUseCase", () => {
    test("creates global template and extracts variables", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new CreatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: new PromptTemplateFactory(),
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            name: "review-summary",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Hello {{name}}",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected create prompt template success")
        }

        expect(result.value.template.name).toBe("review-summary")
        expect(result.value.template.variables).toEqual([{name: "name"}])

        const stored = await repository.findAll()
        expect(stored).toHaveLength(1)
    })

    test("rejects duplicate name within scope", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        await repository.save(buildTemplate(factory, {name: "review-summary"}))

        const useCase = new CreatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: factory,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            name: "review-summary",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Hello {{name}}",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "name",
                message: "template with the same name already exists in scope",
            },
        ])
    })

    test("rejects invalid scope combinations", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new CreatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: new PromptTemplateFactory(),
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            name: "review-summary",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Hello {{name}}",
            isGlobal: true,
            organizationId: "org-1",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "organizationId",
                message: "global template cannot have organizationId",
            },
        ])
    })
})

describe("UpdatePromptTemplateUseCase", () => {
    test("updates content and variables", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const template = buildTemplate(factory, {name: "review-summary"})
        await repository.save(template)

        const useCase = new UpdatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: factory,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            templateId: template.id.value,
            content: "Updated {{file}}",
            variables: ["file"],
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected update prompt template success")
        }

        expect(result.value.template.content).toBe("Updated {{file}}")
        expect(result.value.template.variables).toEqual([{name: "file"}])
    })

    test("moves template into organization scope", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const template = buildTemplate(factory, {name: "review-summary"})
        await repository.save(template)

        const useCase = new UpdatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: factory,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            templateId: template.id.value,
            isGlobal: false,
            organizationId: "org-99",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected update prompt template success")
        }

        expect(result.value.template.isGlobal).toBe(false)
        expect(result.value.template.organizationId).toBe("org-99")
    })

    test("rejects update with no fields", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const template = buildTemplate(factory, {name: "review-summary"})
        await repository.save(template)

        const useCase = new UpdatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: factory,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            templateId: template.id.value,
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.fields).toEqual([
            {
                field: "template",
                message: "at least one field must be provided",
            },
        ])
    })

    test("rejects rename conflict within scope", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const first = buildTemplate(factory, {name: "template-a"})
        const second = buildTemplate(factory, {name: "template-b"})
        await repository.save(first)
        await repository.save(second)

        const useCase = new UpdatePromptTemplateUseCase({
            promptTemplateRepository: repository,
            promptTemplateFactory: factory,
            promptEngineService: new PromptEngineService(),
        })

        const result = await useCase.execute({
            templateId: second.id.value,
            name: "template-a",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "name",
                message: "template with the same name already exists in scope",
            },
        ])
    })
})

describe("GetPromptTemplateByIdUseCase", () => {
    test("returns prompt template by id", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const template = buildTemplate(factory, {name: "get-template"})
        await repository.save(template)

        const useCase = new GetPromptTemplateByIdUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute({
            templateId: template.id.value,
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected get prompt template success")
        }

        expect(result.value.template.id).toBe(template.id.value)
    })

    test("returns validation error for invalid id", async () => {
        const useCase = new GetPromptTemplateByIdUseCase({
            promptTemplateRepository: new InMemoryPromptTemplateRepository(),
        })

        const result = await useCase.execute({
            templateId: " ",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "templateId",
                message: "must be a non-empty string",
            },
        ])
    })
})

describe("ListPromptTemplatesUseCase", () => {
    test("returns templates list and total", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        await repository.save(buildTemplate(factory, {name: "list-a"}))
        await repository.save(buildTemplate(factory, {name: "list-b"}))

        const useCase = new ListPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute({})

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected list prompt templates success")
        }

        expect(result.value.total).toBe(2)
        expect(result.value.templates).toHaveLength(2)
    })
})

describe("DeletePromptTemplateUseCase", () => {
    test("deletes existing template", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        const template = buildTemplate(factory, {name: "delete-template"})
        await repository.save(template)

        const useCase = new DeletePromptTemplateUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute({
            templateId: template.id.value,
        })

        expect(result.isOk).toBe(true)
        expect(await repository.findById(UniqueId.create(template.id.value))).toBeNull()
        expect(result.value.templateId).toBe(template.id.value)
    })

    test("returns error when template not found", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new DeletePromptTemplateUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute({
            templateId: "missing-id",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "templateId",
                message: "template not found",
            },
        ])
    })
})
