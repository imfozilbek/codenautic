import type {
    IDashboardFlowMetricsPoint,
    IDashboardMetric,
    IDashboardStatusPoint,
    IDashboardTeamActivityPoint,
    IDashboardTimelineEntry,
    IDashboardTokenUsageModel,
    IDashboardTokenUsageTrend,
    IDashboardWorkQueueEntry,
    TDashboardDateRange,
} from "@/lib/api/endpoints/dashboard.endpoint"

/**
 * Seed-данные для инициализации коллекции dashboard.
 */
export interface IDashboardSeedData {
    /** KPI-метрики по диапазонам. */
    readonly metrics: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardMetric>
    }>
    /** Распределение статусов по диапазонам. */
    readonly statusDistribution: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardStatusPoint>
    }>
    /** Активность команды по диапазонам. */
    readonly teamActivity: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardTeamActivityPoint>
    }>
    /** Flow-метрики по диапазонам. */
    readonly flowMetrics: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardFlowMetricsPoint>
    }>
    /** Использование токенов по моделям, по диапазонам. */
    readonly tokenUsageByModel: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardTokenUsageModel>
    }>
    /** Тренд стоимости токенов по диапазонам. */
    readonly tokenUsageTrend: ReadonlyArray<{
        readonly range: TDashboardDateRange
        readonly items: ReadonlyArray<IDashboardTokenUsageTrend>
    }>
    /** Записи рабочей очереди. */
    readonly workQueue: ReadonlyArray<IDashboardWorkQueueEntry>
    /** Записи временной шкалы. */
    readonly timeline: ReadonlyArray<IDashboardTimelineEntry>
}

/**
 * In-memory коллекция данных dashboard для mock API.
 *
 * Хранит метрики, распределения, активность, flow-данные,
 * использование токенов, рабочую очередь и временную шкалу.
 * Поддерживает seed/clear для тестов.
 */
export class DashboardCollection {
    /**
     * KPI-метрики по диапазону дат.
     */
    private metrics: Map<TDashboardDateRange, ReadonlyArray<IDashboardMetric>> =
        new Map()

    /**
     * Распределение статусов по диапазону дат.
     */
    private statusDistribution: Map<
        TDashboardDateRange,
        ReadonlyArray<IDashboardStatusPoint>
    > = new Map()

    /**
     * Активность команды по диапазону дат.
     */
    private teamActivity: Map<
        TDashboardDateRange,
        ReadonlyArray<IDashboardTeamActivityPoint>
    > = new Map()

    /**
     * Flow-метрики по диапазону дат.
     */
    private flowMetrics: Map<
        TDashboardDateRange,
        ReadonlyArray<IDashboardFlowMetricsPoint>
    > = new Map()

    /**
     * Использование токенов по моделям, по диапазону дат.
     */
    private tokenUsageByModel: Map<
        TDashboardDateRange,
        ReadonlyArray<IDashboardTokenUsageModel>
    > = new Map()

    /**
     * Тренд стоимости токенов по диапазону дат.
     */
    private tokenUsageTrend: Map<
        TDashboardDateRange,
        ReadonlyArray<IDashboardTokenUsageTrend>
    > = new Map()

    /**
     * Записи рабочей очереди.
     */
    private workQueue: ReadonlyArray<IDashboardWorkQueueEntry> = []

    /**
     * Записи временной шкалы.
     */
    private timeline: ReadonlyArray<IDashboardTimelineEntry> = []

    /**
     * Возвращает KPI-метрики для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив метрик (пустой если данные отсутствуют).
     */
    public getMetrics(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardMetric> {
        return this.metrics.get(range) ?? []
    }

    /**
     * Возвращает распределение статусов для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив точек распределения (пустой если данные отсутствуют).
     */
    public getStatusDistribution(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardStatusPoint> {
        return this.statusDistribution.get(range) ?? []
    }

    /**
     * Возвращает активность команды для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив точек активности (пустой если данные отсутствуют).
     */
    public getTeamActivity(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardTeamActivityPoint> {
        return this.teamActivity.get(range) ?? []
    }

    /**
     * Возвращает flow-метрики для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив точек flow-метрик (пустой если данные отсутствуют).
     */
    public getFlowMetrics(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardFlowMetricsPoint> {
        return this.flowMetrics.get(range) ?? []
    }

    /**
     * Возвращает использование токенов по моделям для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив моделей (пустой если данные отсутствуют).
     */
    public getTokenUsageByModel(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardTokenUsageModel> {
        return this.tokenUsageByModel.get(range) ?? []
    }

    /**
     * Возвращает тренд стоимости токенов для указанного диапазона.
     *
     * @param range Диапазон дат.
     * @returns Массив точек тренда (пустой если данные отсутствуют).
     */
    public getTokenUsageTrend(
        range: TDashboardDateRange,
    ): ReadonlyArray<IDashboardTokenUsageTrend> {
        return this.tokenUsageTrend.get(range) ?? []
    }

    /**
     * Возвращает записи рабочей очереди.
     *
     * @returns Массив записей рабочей очереди.
     */
    public getWorkQueue(): ReadonlyArray<IDashboardWorkQueueEntry> {
        return this.workQueue
    }

    /**
     * Возвращает записи временной шкалы.
     *
     * @returns Массив записей временной шкалы.
     */
    public getTimeline(): ReadonlyArray<IDashboardTimelineEntry> {
        return this.timeline
    }

    /**
     * Заполняет коллекцию seed-данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data Seed-данные для инициализации.
     */
    public seed(data: IDashboardSeedData): void {
        this.clear()

        for (const entry of data.metrics) {
            this.metrics.set(entry.range, entry.items)
        }

        for (const entry of data.statusDistribution) {
            this.statusDistribution.set(entry.range, entry.items)
        }

        for (const entry of data.teamActivity) {
            this.teamActivity.set(entry.range, entry.items)
        }

        for (const entry of data.flowMetrics) {
            this.flowMetrics.set(entry.range, entry.items)
        }

        for (const entry of data.tokenUsageByModel) {
            this.tokenUsageByModel.set(entry.range, entry.items)
        }

        for (const entry of data.tokenUsageTrend) {
            this.tokenUsageTrend.set(entry.range, entry.items)
        }

        this.workQueue = data.workQueue
        this.timeline = data.timeline
    }

    /**
     * Полностью очищает все данные коллекции.
     */
    public clear(): void {
        this.metrics.clear()
        this.statusDistribution.clear()
        this.teamActivity.clear()
        this.flowMetrics.clear()
        this.tokenUsageByModel.clear()
        this.tokenUsageTrend.clear()
        this.workQueue = []
        this.timeline = []
    }
}
