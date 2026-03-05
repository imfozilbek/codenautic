/**
 * Входной DTO для получения весов категорий.
 */
export interface IGetCategoryWeightsInput {}

/**
 * Результат для получения весов категорий.
 */
export interface IGetCategoryWeightsOutput {
    /**
     * Весовые коэффициенты по категориям.
     */
    readonly weights: Readonly<Record<string, number>>
}
