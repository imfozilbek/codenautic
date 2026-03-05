import {describe, expect, test} from "bun:test"

import {GetCategoryWeightsUseCase} from "../../../../src/application/use-cases/rules/get-category-weights.use-case"
import type {IGetCategoryWeightsInput} from "../../../../src/application/dto/rules/get-category-weights.dto"
import type {IRuleCategoryRepository} from "../../../../src/application/ports/outbound/rule/rule-category-repository.port"
import type {ISystemSettingsProvider} from "../../../../src/application/ports/outbound/common/system-settings-provider.port"
import type {RuleCategory} from "../../../../src/domain/entities/rule-category.entity"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

describe("GetCategoryWeightsUseCase", () => {
    test("merges llm weights with category weights", async () => {
        const provider = new InMemorySystemSettingsProvider({
            llm_category_weights: {
                security: 20,
                bug: 12,
            },
        })
        const repository = new InMemoryRuleCategoryRepository([
            {
                slug: "security",
                weight: 30,
            },
            {
                slug: "performance-efficiency",
                weight: 10,
            },
        ])
        const useCase = new GetCategoryWeightsUseCase({
            ruleCategoryRepository: repository,
            systemSettingsProvider: provider,
        })

        const result = await useCase.execute({})

        expect(result.isOk).toBe(true)
        expect(result.value.weights).toEqual({
            security: 30,
            bug: 12,
            "performance-efficiency": 10,
        })
    })

    test("returns validation error when input is invalid", async () => {
        const provider = new InMemorySystemSettingsProvider({})
        const repository = new InMemoryRuleCategoryRepository([])
        const useCase = new GetCategoryWeightsUseCase({
            ruleCategoryRepository: repository,
            systemSettingsProvider: provider,
        })

        const result = await useCase.execute(null as unknown as IGetCategoryWeightsInput)

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([{
            field: "input",
            message: "must be a non-null object",
        }])
    })

    test("returns validation error when llm weights payload is invalid", async () => {
        const provider = new InMemorySystemSettingsProvider({
            llm_category_weights: {
                security: -1,
                "breaking-change": "bad" as unknown as number,
            },
        })
        const repository = new InMemoryRuleCategoryRepository([])
        const useCase = new GetCategoryWeightsUseCase({
            ruleCategoryRepository: repository,
            systemSettingsProvider: provider,
        })

        const result = await useCase.execute({})

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "weights.security",
                message: "must be a non-negative number",
            },
            {
                field: "weights.breaking-change",
                message: "must be a non-negative number",
            },
        ])
    })

    test("returns validation error when category weights are invalid", async () => {
        const provider = new InMemorySystemSettingsProvider({})
        const repository = new InMemoryRuleCategoryRepository([
            {
                slug: "security",
                weight: -2,
            },
        ])
        const useCase = new GetCategoryWeightsUseCase({
            ruleCategoryRepository: repository,
            systemSettingsProvider: provider,
        })

        const result = await useCase.execute({})

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([{
            field: "weights.security",
            message: "must be a non-negative number",
        }])
    })
})

class InMemorySystemSettingsProvider implements ISystemSettingsProvider {
    private readonly values: Readonly<Record<string, unknown>>

    public constructor(values: Readonly<Record<string, unknown>>) {
        this.values = values
    }

    public get<T>(key: string): Promise<T | undefined> {
        return Promise.resolve(this.values[key] as T | undefined)
    }

    public getMany<T>(keys: readonly string[]): Promise<ReadonlyMap<string, T>> {
        const result = new Map<string, T>()
        for (const key of keys) {
            const value = this.values[key]
            if (value !== undefined) {
                result.set(key, value as T)
            }
        }

        return Promise.resolve(result)
    }
}

class InMemoryRuleCategoryRepository implements IRuleCategoryRepository {
    private readonly weights: readonly {slug: string; weight: number}[]

    public constructor(weights: readonly {slug: string; weight: number}[]) {
        this.weights = weights
    }

    public findById(_id: UniqueId): Promise<RuleCategory | null> {
        return Promise.resolve(null)
    }

    public save(_category: RuleCategory): Promise<void> {
        return Promise.resolve()
    }

    public findBySlug(_slug: string): Promise<RuleCategory | null> {
        return Promise.resolve(null)
    }

    public findAll(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([])
    }

    public findActive(): Promise<readonly RuleCategory[]> {
        return Promise.resolve([])
    }

    public findAllWithWeights(): Promise<readonly {slug: string; weight: number}[]> {
        return Promise.resolve(this.weights)
    }

    public saveMany(_categories: readonly RuleCategory[]): Promise<void> {
        return Promise.resolve()
    }
}
