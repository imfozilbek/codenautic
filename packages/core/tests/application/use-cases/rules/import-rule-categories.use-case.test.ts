import {describe, expect, test} from "bun:test"

import {ImportRuleCategoriesUseCase} from "../../../../src/application/use-cases/rules/import-rule-categories.use-case"
import {RuleCategoryFactory} from "../../../../src/domain/factories/rule-category.factory"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import type {RuleCategory} from "../../../../src/domain/entities/rule-category.entity"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import type {IRuleCategoryRepository} from "../../../../src/application/ports/outbound/rule/rule-category-repository.port"
import type {IConfigRuleCategoryItem} from "../../../../src/application/dto/config/rule-category-config.dto"

class InMemoryRuleCategoryRepository implements IRuleCategoryRepository {
    private readonly byId = new Map<string, RuleCategory>()
    private readonly bySlug = new Map<string, RuleCategory>()

    public findById(id: UniqueId): Promise<RuleCategory | null> {
        return Promise.resolve(this.byId.get(id.value) ?? null)
    }

    public save(category: RuleCategory): Promise<void> {
        this.byId.set(category.id.value, category)
        this.bySlug.set(category.slug, category)
        return Promise.resolve()
    }

    public findBySlug(slug: string): Promise<RuleCategory | null> {
        return Promise.resolve(this.bySlug.get(slug) ?? null)
    }

    public findAll(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([...this.byId.values()])
    }

    public findActive(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([...this.byId.values()].filter((category) => category.isActive))
    }

    public findAllWithWeights(): Promise<readonly {slug: string; weight: number}[]> {
        return Promise.resolve(
            [...this.byId.values()].map((category) => {
                return {
                    slug: category.slug,
                    weight: category.weight,
                }
            }),
        )
    }

    public saveMany(categories: readonly RuleCategory[]): Promise<void> {
        for (const category of categories) {
            this.byId.set(category.id.value, category)
            this.bySlug.set(category.slug, category)
        }
        return Promise.resolve()
    }

    public deleteById(id: UniqueId): Promise<void> {
        const existing = this.byId.get(id.value)
        if (existing !== undefined) {
            this.byId.delete(id.value)
            this.bySlug.delete(existing.slug)
        }
        return Promise.resolve()
    }
}

describe("ImportRuleCategoriesUseCase", () => {
    test("импортирует новые категории", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [{
            slug: "security-hardening",
            name: "Security",
            description: "Security checks",
            weight: 2,
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 1,
            created: 1,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
        const stored = await repository.findBySlug("security-hardening")
        expect(stored?.name).toBe("Security")
    })

    test("обновляет существующие категории", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const factory = new RuleCategoryFactory()
        await repository.save(factory.create({
            slug: "security-hardening",
            name: "Old",
            description: "Old description",
            weight: 1,
            isActive: false,
        }))

        const useCase = new ImportRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [{
            slug: "security-hardening",
            name: "Security",
            description: "Updated description",
            weight: 3,
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.updated).toBe(1)
        const stored = await repository.findBySlug("security-hardening")
        expect(stored?.name).toBe("Security")
        expect(stored?.isActive).toBe(true)
    })

    test("пропускает неизмененные категории", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const factory = new RuleCategoryFactory()
        await repository.save(factory.create({
            slug: "security-hardening",
            name: "Security",
            description: "Security checks",
            weight: 2,
            isActive: true,
        }))

        const useCase = new ImportRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })
        const input: readonly IConfigRuleCategoryItem[] = [{
            slug: "security-hardening",
            name: "Security",
            description: "Security checks",
            weight: 2,
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.skipped).toBe(1)
    })

    test("возвращает ошибку при невалидном payload", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportRuleCategoriesUseCase({
            ruleCategoryRepository: repository,
        })

        const result = await useCase.execute({} as unknown as IConfigRuleCategoryItem[])

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })

    test("обрабатывает пустой список", async () => {
        const repository = new InMemoryRuleCategoryRepository()
        const useCase = new ImportRuleCategoriesUseCase({
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
