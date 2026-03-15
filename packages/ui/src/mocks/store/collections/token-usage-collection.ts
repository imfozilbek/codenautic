import type {
    IAggregatedUsageRow,
    ITokenUsageRecord,
    TModelName,
    TTokenUsageGroupBy,
    TTokenUsageRange,
} from "@/lib/api/endpoints/token-usage.endpoint"

/**
 * Ценообразование за 1k токенов по модели.
 */
interface IModelPricing {
    /**
     * Цена за 1k input tokens.
     */
    readonly inputPer1kUsd: number
    /**
     * Цена за 1k output tokens.
     */
    readonly outputPer1kUsd: number
}

/**
 * Таблица цен по моделям.
 */
const MODEL_PRICING: Readonly<Record<TModelName, IModelPricing>> = {
    "claude-3-7-sonnet": { inputPer1kUsd: 0.003, outputPer1kUsd: 0.015 },
    "gpt-4.1-mini": { inputPer1kUsd: 0.0004, outputPer1kUsd: 0.0016 },
    "gpt-4o-mini": { inputPer1kUsd: 0.0003, outputPer1kUsd: 0.0012 },
    "mistral-small-latest": { inputPer1kUsd: 0.0006, outputPer1kUsd: 0.0018 },
}

/**
 * Коэффициент масштабирования для диапазона.
 *
 * @param range - Диапазон дат.
 * @returns Множитель для масштабирования токенов.
 */
function getRangeScale(range: TTokenUsageRange): number {
    if (range === "1d") {
        return 0.2
    }
    if (range === "30d") {
        return 3.8
    }
    if (range === "90d") {
        return 9.5
    }
    return 1
}

/**
 * Оценивает стоимость одной записи.
 *
 * @param record - Запись расхода токенов.
 * @returns Стоимость в USD.
 */
function estimateCostForRecord(record: ITokenUsageRecord): number {
    const pricing = MODEL_PRICING[record.model]
    const promptCost = (record.promptTokens / 1000) * pricing.inputPer1kUsd
    const completionCost = (record.completionTokens / 1000) * pricing.outputPer1kUsd
    return promptCost + completionCost
}

/**
 * Коллекция token usage для mock API.
 *
 * Хранит in-memory записи расхода токенов.
 * Поддерживает масштабирование по диапазону и агрегацию по группировке.
 */
export class TokenUsageCollection {
    /**
     * Базовые записи расхода токенов.
     */
    private records: ITokenUsageRecord[] = []

    /**
     * Возвращает все записи.
     *
     * @returns Массив записей.
     */
    public getRecords(): ReadonlyArray<ITokenUsageRecord> {
        return [...this.records]
    }

    /**
     * Возвращает масштабированные записи для диапазона.
     *
     * @param range - Диапазон дат.
     * @returns Масштабированные записи.
     */
    public getScaledRecords(range: TTokenUsageRange): ReadonlyArray<ITokenUsageRecord> {
        const scale = getRangeScale(range)
        return this.records.map(
            (record): ITokenUsageRecord => ({
                ...record,
                completionTokens: Math.round(record.completionTokens * scale),
                promptTokens: Math.round(record.promptTokens * scale),
            }),
        )
    }

    /**
     * Возвращает агрегированные строки по группировке.
     *
     * @param range - Диапазон дат.
     * @param groupBy - Режим группировки.
     * @returns Агрегированные строки отсортированные по totalTokens desc.
     */
    public getAggregated(
        range: TTokenUsageRange,
        groupBy: TTokenUsageGroupBy,
    ): ReadonlyArray<IAggregatedUsageRow> {
        const scaled = this.getScaledRecords(range)
        const keySelector = this.resolveKeySelector(groupBy)
        const map = new Map<string, IAggregatedUsageRow>()

        for (const record of scaled) {
            const key = keySelector(record)
            const current = map.get(key)
            const nextPrompt = (current?.promptTokens ?? 0) + record.promptTokens
            const nextCompletion =
                (current?.completionTokens ?? 0) + record.completionTokens
            const nextCost =
                (current?.estimatedCostUsd ?? 0) + estimateCostForRecord(record)

            map.set(key, {
                completionTokens: nextCompletion,
                estimatedCostUsd: nextCost,
                key,
                promptTokens: nextPrompt,
                totalTokens: nextPrompt + nextCompletion,
            })
        }

        return [...map.values()].sort(
            (left, right): number => right.totalTokens - left.totalTokens,
        )
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param records - Начальные записи.
     */
    public seed(records: ReadonlyArray<ITokenUsageRecord>): void {
        this.clear()
        this.records = [...records]
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.records = []
    }

    /**
     * Возвращает функцию-селектор ключа для группировки.
     *
     * @param groupBy - Режим группировки.
     * @returns Функция извлечения ключа из записи.
     */
    private resolveKeySelector(
        groupBy: TTokenUsageGroupBy,
    ): (record: ITokenUsageRecord) => string {
        if (groupBy === "developer") {
            return (record): string => record.developer
        }
        if (groupBy === "ccr") {
            return (record): string => record.ccr
        }
        return (record): string => record.model
    }
}
