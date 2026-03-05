import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IRuleCategoryRepository} from "../../ports/outbound/rule/rule-category-repository.port"
import type {ISystemSettingsProvider} from "../../ports/outbound/common/system-settings-provider.port"
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
     * Репозиторий категорий правил.
     */
    readonly ruleCategoryRepository: IRuleCategoryRepository

    /**
     * Поставщик системных настроек.
     */
    readonly systemSettingsProvider: ISystemSettingsProvider
}

/**
 * Use case для чтения весов категорий LLM.
 */
export class GetCategoryWeightsUseCase
    implements IUseCase<IGetCategoryWeightsInput, IGetCategoryWeightsOutput, ValidationError>
{
    private readonly ruleCategoryRepository: IRuleCategoryRepository
    private readonly systemSettingsProvider: ISystemSettingsProvider

    /**
     * Создаёт use case.
     *
     * @param dependencies Зависимости use case.
     */
    public constructor(dependencies: IGetCategoryWeightsUseCaseDependencies) {
        this.ruleCategoryRepository = dependencies.ruleCategoryRepository
        this.systemSettingsProvider = dependencies.systemSettingsProvider
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

        const llmWeightsResult = await this.loadLlmWeights()
        if (llmWeightsResult.isFail) {
            return Result.fail<IGetCategoryWeightsOutput, ValidationError>(llmWeightsResult.error)
        }

        const categoryWeightsResult = await this.loadCategoryWeights()
        if (categoryWeightsResult.isFail) {
            return Result.fail<IGetCategoryWeightsOutput, ValidationError>(categoryWeightsResult.error)
        }

        return Result.ok<IGetCategoryWeightsOutput, ValidationError>({
            weights: Object.freeze({
                ...llmWeightsResult.value,
                ...categoryWeightsResult.value,
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

    /**
     * Загружает веса категорий LLM из системных настроек.
     *
     * @returns Валидированные веса LLM.
     */
    private async loadLlmWeights(): Promise<Result<Readonly<Record<string, number>>, ValidationError>> {
        try {
            const payload = await this.systemSettingsProvider.get<unknown>(
                GetCategoryWeightsUseCase.LLM_CATEGORY_WEIGHTS_KEY,
            )

            const validated = this.validateWeights(payload ?? {})
            if (validated.isFail) {
                return Result.fail<Readonly<Record<string, number>>, ValidationError>(validated.error)
            }

            return Result.ok<Readonly<Record<string, number>>, ValidationError>(validated.value)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "failed to read llm category weights"
            return Result.fail<Readonly<Record<string, number>>, ValidationError>(
                new ValidationError("Category weights lookup failed", [{
                    field: GetCategoryWeightsUseCase.LLM_CATEGORY_WEIGHTS_KEY,
                    message,
                }]),
            )
        }
    }

    /**
     * Загружает веса категорий из репозитория.
     *
     * @returns Валидированные веса категорий.
     */
    private async loadCategoryWeights(): Promise<Result<Readonly<Record<string, number>>, ValidationError>> {
        try {
            const weights = await this.ruleCategoryRepository.findAllWithWeights()
            const normalized: Record<string, number> = {}

            for (const item of weights) {
                normalized[item.slug.trim()] = item.weight
            }

            const validated = this.validateWeights(normalized)
            if (validated.isFail) {
                return Result.fail<Readonly<Record<string, number>>, ValidationError>(validated.error)
            }

            return Result.ok<Readonly<Record<string, number>>, ValidationError>(validated.value)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "failed to read category weights"
            return Result.fail<Readonly<Record<string, number>>, ValidationError>(
                new ValidationError("Category weights lookup failed", [{
                    field: "categoryWeights",
                    message,
                }]),
            )
        }
    }

    /**
     * Ключ настроек для весов категорий LLM.
     */
    private static readonly LLM_CATEGORY_WEIGHTS_KEY = "llm_category_weights"
}
