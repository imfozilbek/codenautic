import {describe, expect, test} from "bun:test"

import type {RuleCategory} from "../../../../src/domain/entities/rule-category.entity"
import {RuleCategoryFactory} from "../../../../src/domain/factories/rule-category.factory"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import type {IRuleCategoryRepository} from "../../../../src/application/ports/outbound/rule/rule-category-repository.port"
import {ImportDefaultRuleCategoriesUseCase} from "../../../../src/application/use-cases/rules/import-default-rule-categories.use-case"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import type {IConfigRuleCategoryItem} from "../../../../src/application/dto/config/rule-category-config.dto"

class InMemoryRuleCategoryRepository implements IRuleCategoryRepository {
    private readonly storage: Map<string, RuleCategory>

    public constructor() {
        this.storage = new Map<string, RuleCategory>()
    }

    public findById(id: UniqueId): Promise<RuleCategory | null> {
        for (const category of this.storage.values()) {
            if (category.id.value === id.value) {
                return Promise.resolve(category)
            }
        }

        return Promise.resolve(null)
    }

    public save(category: RuleCategory): Promise<void> {
        this.storage.set(category.slug, category)
        return Promise.resolve()
    }

    public findBySlug(slug: string): Promise<RuleCategory | null> {
        return Promise.resolve(this.storage.get(slug) ?? null)
    }

    public findAll(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([...this.storage.values()])
    }

    public findActive(): Promise<readonly RuleCategory[]> {
        const categories = [...this.storage.values()].filter((category) => category.isActive)
        return Promise.resolve(categories)
    }

    public saveMany(categories: readonly RuleCategory[]): Promise<void> {
        for (const category of categories) {
            this.storage.set(category.slug, category)
        }
        return Promise.resolve()
    }
}

describe("ImportDefaultRuleCategoriesUseCase", () => {
    test("импортирует новые категории", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportDefaultRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [
            createItem("security-hardening"),
            createItem("performance-efficiency"),
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 2,
            created: 2,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
        const stored = await repository.findAll()
        expect(stored).toHaveLength(2)
    })

    test("пропускает уже существующие категории", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const factory = new RuleCategoryFactory()
        await repository.save(factory.create(createItem("security-hardening")))

        const useCase = new ImportDefaultRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [
            createItem("security-hardening"),
            createItem("observability-logging"),
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.created).toBe(1)
        expect(result.value.skipped).toBe(1)
        const stored = await repository.findAll()
        expect(stored).toHaveLength(2)
    })

    test("возвращает ошибку при невалидном slug", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportDefaultRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [{
            slug: "Not Kebab",
            name: "Invalid",
            description: "Invalid slug",
        }]

        const result = await useCase.execute(input)

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.fields.some((field) => field.field === "items[0].slug")).toBe(true)
    })

    test("обрабатывает пустой список", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportDefaultRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
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

function createItem(slug: string): IConfigRuleCategoryItem {
    return {
        slug,
        name: slug.replace(/-/g, " ").trim(),
        description: `Category for ${slug}`,
    }
}
