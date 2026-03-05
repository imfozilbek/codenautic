import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ICategoryWeightProvider} from "../../ports/outbound/rule/category-weight-provider.port"
import type {
    IGetCategoryWeightsInput,
    IGetCategoryWeightsOutput,
} from "../../dto/rules/get-category-weights.dto"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {Result} from "../../../shared/result"

/**
 * Зависимости use case получения весов категорий.
 */
export interface IGetCategoryWeightsUseCaseDependencies {
    /**
     * Поставщик весов категорий.
     */
    readonly categoryWeightProvider: ICategoryWeightProvider
}

/**
 * Use case для чтения весов категорий LLM.
 */
export class GetCategoryWeightsUseCase
    implements IUseCase<IGetCategoryWeightsInput, IGetCategoryWeightsOutput, ValidationError>
{
    private readonly categoryWeightProvider: ICategoryWeightProvider

    /**
     * Создаёт use case.
     *
     * @param dependencies Зависимости use case.
     */
    public constructor(dependencies: IGetCategoryWeightsUseCaseDependencies) {
        this.categoryWeightProvider = dependencies.categoryWeightProvider
    }

    /**
     * Возвращает веса категорий для ранжирования.
     *
     * @param input Параметры запроса.
     * @returns Результат с весами или ошибка валидации.
     */
    public async execute(
        input: IGetCategoryWeightsInput,
    ): Promise<Result<IGetCategoryWeightsOutput, ValidationError>> {
        const normalizedInput = this.validateInput(input)
        if (normalizedInput.isFail) {
            return Result.fail<IGetCategoryWeightsOutput, ValidationError>(normalizedInput.error)
        }

        const weightsPayload = await this.categoryWeightProvider.getCategoryWeights()
        const validatedWeights = this.validateWeights(weightsPayload)
        if (validatedWeights.isFail) {
            return Result.fail<IGetCategoryWeightsOutput, ValidationError>(validatedWeights.error)
        }

        return Result.ok<IGetCategoryWeightsOutput, ValidationError>({
            weights: Object.freeze({
                ...validatedWeights.value,
            }),
        })
    }

    /**
     * Валидирует входные параметры use case.
     *
     * @param input Сырой ввод.
     * @returns Нормализованный ввод или ошибка.
     */
    private validateInput(
        input: unknown,
    ): Result<IGetCategoryWeightsInput, ValidationError> {
        if (typeof input !== "object" || input === null || Array.isArray(input)) {
            return Result.fail<IGetCategoryWeightsInput, ValidationError>(
                new ValidationError("Get category weights validation failed", [{
                    field: "input",
                    message: "must be a non-null object",
                }]),
            )
        }

        return Result.ok<IGetCategoryWeightsInput, ValidationError>(input)
    }

    /**
     * Валидирует payload с весами категорий.
     *
     * @param payload Сырые веса.
     * @returns Валидированные веса или ошибка.
     */
    private validateWeights(
        payload: unknown,
    ): Result<Readonly<Record<string, number>>, ValidationError> {
        if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
            return Result.fail<Readonly<Record<string, number>>, ValidationError>(
                new ValidationError("Category weights validation failed", [{
                    field: "weights",
                    message: "must be a non-null object",
                }]),
            )
        }

        const entries = Object.entries(payload as Record<string, unknown>)
        const fields: IValidationErrorField[] = []

        for (const [key, value] of entries) {
            const normalizedKey = key.trim()
            if (normalizedKey.length === 0) {
                fields.push({
                    field: "weights",
                    message: "contains empty category key",
                })
                continue
            }

            if (typeof value !== "number" || Number.isFinite(value) === false || value < 0) {
                fields.push({
                    field: `weights.${normalizedKey}`,
                    message: "must be a non-negative number",
                })
            }
        }

        if (fields.length > 0) {
            return Result.fail<Readonly<Record<string, number>>, ValidationError>(
                new ValidationError("Category weights validation failed", fields),
            )
        }

        return Result.ok<Readonly<Record<string, number>>, ValidationError>(
            payload as Readonly<Record<string, number>>,
        )
    }
}
