/**
 * Поставщик весов категорий для ранжирования.
 */
export interface ICategoryWeightProvider {
    /**
     * Возвращает веса категорий, настроенные в системе.
     *
     * @returns Словарь "категория → вес".
     */
    getCategoryWeights(): Promise<Readonly<Record<string, number>>>
}
