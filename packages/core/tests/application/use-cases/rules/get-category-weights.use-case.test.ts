import {describe, expect, test} from "bun:test"

import {GetCategoryWeightsUseCase} from "../../../../src/application/use-cases/rules/get-category-weights.use-case"
import type {ICategoryWeightProvider} from "../../../../src/application/ports/outbound/rule/category-weight-provider.port"
import type {IGetCategoryWeightsInput} from "../../../../src/application/dto/rules/get-category-weights.dto"

describe("GetCategoryWeightsUseCase", () => {
    test("returns category weights from provider", async () => {
        const provider = new InMemoryCategoryWeightProvider({
            security: 20,
            "breaking-change": 18,
        })
        const useCase = new GetCategoryWeightsUseCase({
            categoryWeightProvider: provider,
        })

        const result = await useCase.execute({})

        expect(result.isOk).toBe(true)
        expect(result.value.weights).toEqual({
            security: 20,
            "breaking-change": 18,
        })
    })

    test("returns validation error when input is invalid", async () => {
        const provider = new InMemoryCategoryWeightProvider({})
        const useCase = new GetCategoryWeightsUseCase({
            categoryWeightProvider: provider,
        })

        const result = await useCase.execute(null as unknown as IGetCategoryWeightsInput)

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([{
            field: "input",
            message: "must be a non-null object",
        }])
    })

    test("returns validation error when weights payload is invalid", async () => {
        const provider = new InMemoryCategoryWeightProvider({
            security: -1,
            "breaking-change": "bad" as unknown as number,
        })
        const useCase = new GetCategoryWeightsUseCase({
            categoryWeightProvider: provider,
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
})

class InMemoryCategoryWeightProvider implements ICategoryWeightProvider {
    private readonly weights: Readonly<Record<string, number>>

    public constructor(weights: Readonly<Record<string, number>>) {
        this.weights = weights
    }

    public getCategoryWeights(): Promise<Readonly<Record<string, number>>> {
        return Promise.resolve(this.weights)
    }
}
