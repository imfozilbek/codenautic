import {describe, expect, test} from "bun:test"

import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
    type PromptTemplate,
} from "../../../../src/domain/entities/prompt-template.entity"
import {PromptTemplateFactory} from "../../../../src/domain/factories/prompt-template.factory"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import type {IPromptTemplateRepository} from "../../../../src/application/ports/outbound/prompt-template-repository.port"
import {ImportDefaultPromptTemplatesUseCase} from "../../../../src/application/use-cases/prompt/import-default-prompt-templates.use-case"
import type {IConfigPromptTemplateItem} from "../../../../src/application/dto/config/prompt-template-config.dto"
import {ValidationError} from "../../../../src/domain/errors/validation.error"

class InMemoryPromptTemplateRepository implements IPromptTemplateRepository {
    private readonly storage: PromptTemplate[]

    public constructor() {
        this.storage = []
    }

    public findById(id: UniqueId): Promise<PromptTemplate | null> {
        const found = this.storage.find((template) => template.id.value === id.value)
        return Promise.resolve(found ?? null)
    }

    public findByName(name: string, organizationId?: OrganizationId): Promise<PromptTemplate | null> {
        const orgValue = organizationId?.value ?? null

        const scoped = this.storage.find((template) => {
            if (template.name !== name) {
                return false
            }

            const templateOrg = template.organizationId?.value ?? null
            if (orgValue === null) {
                return template.isGlobal
            }

            return templateOrg === orgValue
        })
        if (scoped !== undefined) {
            return Promise.resolve(scoped)
        }

        if (organizationId !== undefined) {
            const global = this.storage.find((template) => template.name === name && template.isGlobal)
            return Promise.resolve(global ?? null)
        }

        return Promise.resolve(null)
    }

    public findByCategory(category: PromptTemplateCategory): Promise<readonly PromptTemplate[]> {
        const templates = this.storage.filter((template) => template.category === category)
        return Promise.resolve(templates)
    }

    public findGlobal(): Promise<readonly PromptTemplate[]> {
        const templates = this.storage.filter((template) => template.isGlobal)
        return Promise.resolve(templates)
    }

    public findAll(): Promise<readonly PromptTemplate[]> {
        return Promise.resolve(this.storage)
    }

    public save(template: PromptTemplate): Promise<void> {
        const organizationId = template.organizationId?.value ?? null
        const existingIndex = this.storage.findIndex((candidate) => {
            return candidate.name === template.name && candidate.organizationId?.value === organizationId
        })

        if (existingIndex >= 0) {
            this.storage[existingIndex] = template
            return Promise.resolve()
        }

        this.storage.push(template)
        return Promise.resolve()
    }

    public async deleteById(id: UniqueId): Promise<void> {
        const index = this.storage.findIndex((template) => template.id.value === id.value)
        if (index >= 0) {
            this.storage.splice(index, 1)
        }

        return Promise.resolve()
    }
}

describe("ImportDefaultPromptTemplatesUseCase", () => {
    test("импортирует новые prompt templates", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new ImportDefaultPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })
        const input: readonly IConfigPromptTemplateItem[] = [
            createItem("code-review-system", PROMPT_TEMPLATE_CATEGORY.RULES, PROMPT_TEMPLATE_TYPE.SYSTEM),
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 1,
            created: 1,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
        const stored = await repository.findByName("code-review-system")
        expect(stored).not.toBeNull()
    })

    test("пропускает существующие шаблоны", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const factory = new PromptTemplateFactory()
        await repository.save(factory.create({
            name: "code-review-system",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: "Review {{file}}",
            variables: [{name: "file"}],
            isGlobal: true,
        }))

        const useCase = new ImportDefaultPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })
        const input: readonly IConfigPromptTemplateItem[] = [
            createItem("code-review-system", PROMPT_TEMPLATE_CATEGORY.RULES, PROMPT_TEMPLATE_TYPE.SYSTEM),
            createItem("severity-analysis-system", PROMPT_TEMPLATE_CATEGORY.OUTPUT, PROMPT_TEMPLATE_TYPE.SYSTEM),
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.created).toBe(1)
        expect(result.value.skipped).toBe(1)
    })

    test("возвращает ошибку при невалидном payload", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new ImportDefaultPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute({} as unknown as IConfigPromptTemplateItem[])

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })

    test("валидирует длину контента через PromptEngineService", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new ImportDefaultPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })
        const longContent = "a".repeat(20001)
        const input: readonly IConfigPromptTemplateItem[] = [{
            name: "long-template",
            category: PROMPT_TEMPLATE_CATEGORY.RULES,
            type: PROMPT_TEMPLATE_TYPE.SYSTEM,
            content: longContent,
            variables: [],
        }]

        const result = await useCase.execute(input)

        expect(result.isFail).toBe(true)
        expect(result.error.fields.some((field) => field.field === "items[0].content")).toBe(true)
    })

    test("обрабатывает пустой список", async () => {
        const repository = new InMemoryPromptTemplateRepository()
        const useCase = new ImportDefaultPromptTemplatesUseCase({
            promptTemplateRepository: repository,
        })

        const result = await useCase.execute([])

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
    })
})

function createItem(
    name: string,
    category: PromptTemplateCategory,
    type: PromptTemplateType,
): IConfigPromptTemplateItem {
    return {
        name,
        category,
        type,
        content: "Review {{file}}",
        variables: ["file"],
    }
}
