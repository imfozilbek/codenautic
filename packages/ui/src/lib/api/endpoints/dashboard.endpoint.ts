import type { IHttpClient } from "../http-client"

/**
 * Варианты диапазона дат для dashboard-запросов.
 */
export type TDashboardDateRange = "1d" | "7d" | "30d" | "90d"

/**
 * Направление динамики метрики.
 */
export type TDashboardTrendDirection = "up" | "down" | "neutral"

/**
 * KPI-метрика на dashboard.
 */
export interface IDashboardMetric {
    /** Уникальный идентификатор метрики. */
    readonly id: string
    /** Подпись метрики. */
    readonly label: string
    /** Основное значение. */
    readonly value: string
    /** Комментарий под значением. */
    readonly caption?: string
    /** Направление изменения. */
    readonly trendDirection?: TDashboardTrendDirection
    /** Значение изменения с меткой (например +8%). */
    readonly trendLabel?: string
}

/**
 * Точка распределения статусов.
 */
export interface IDashboardStatusPoint {
    /** Имя статуса. */
    readonly status: string
    /** Количество элементов. */
    readonly count: number
    /** Цвет сегмента. */
    readonly color: string
}

/**
 * Точка активности разработчика.
 */
export interface IDashboardTeamActivityPoint {
    /** Имя разработчика. */
    readonly developer: string
    /** Количество merge CCR. */
    readonly ccrMerged: number
}

/**
 * Точка flow-метрик за период.
 */
export interface IDashboardFlowMetricsPoint {
    /** Метка периода. */
    readonly window: string
    /** Эффективность потока (0-100). */
    readonly flowEfficiency: number
    /** Delivery capacity. */
    readonly deliveryCapacity: number
}

/**
 * Использование токенов по модели.
 */
export interface IDashboardTokenUsageModel {
    /** Название модели. */
    readonly model: string
    /** Токены в выбранном диапазоне. */
    readonly tokens: number
}

/**
 * Точка тренда стоимости токенов.
 */
export interface IDashboardTokenUsageTrend {
    /** Период точки тренда. */
    readonly period: string
    /** Стоимость в USD. */
    readonly costUsd: number
}

/**
 * Запись рабочей очереди.
 */
export interface IDashboardWorkQueueEntry {
    /** Уникальный идентификатор записи. */
    readonly id: string
    /** Заголовок. */
    readonly title: string
    /** Описание. */
    readonly description: string
    /** Маршрут навигации. */
    readonly route: string
}

/**
 * Запись временной шкалы.
 */
export interface IDashboardTimelineEntry {
    /** Уникальный идентификатор записи. */
    readonly id: string
    /** Время события. */
    readonly time: string
    /** Заголовок. */
    readonly title: string
    /** Краткое описание. */
    readonly description: string
    /** Детальное описание. */
    readonly details: string
    /** Группировка (например "Today"). */
    readonly group: string
}

/**
 * Ответ метрик dashboard.
 */
export interface IDashboardMetricsResponse {
    /** Массив KPI-метрик. */
    readonly metrics: ReadonlyArray<IDashboardMetric>
}

/**
 * Ответ распределения статусов.
 */
export interface IDashboardStatusDistributionResponse {
    /** Массив точек распределения. */
    readonly points: ReadonlyArray<IDashboardStatusPoint>
}

/**
 * Ответ активности команды.
 */
export interface IDashboardTeamActivityResponse {
    /** Массив точек активности. */
    readonly points: ReadonlyArray<IDashboardTeamActivityPoint>
}

/**
 * Ответ flow-метрик.
 */
export interface IDashboardFlowMetricsResponse {
    /** Массив точек flow-метрик. */
    readonly points: ReadonlyArray<IDashboardFlowMetricsPoint>
}

/**
 * Ответ использования токенов.
 */
export interface IDashboardTokenUsageResponse {
    /** Использование по моделям. */
    readonly byModel: ReadonlyArray<IDashboardTokenUsageModel>
    /** Тренд стоимости. */
    readonly costTrend: ReadonlyArray<IDashboardTokenUsageTrend>
}

/**
 * Ответ рабочей очереди.
 */
export interface IDashboardWorkQueueResponse {
    /** Записи рабочей очереди. */
    readonly entries: ReadonlyArray<IDashboardWorkQueueEntry>
}

/**
 * Ответ временной шкалы.
 */
export interface IDashboardTimelineResponse {
    /** Записи временной шкалы. */
    readonly entries: ReadonlyArray<IDashboardTimelineEntry>
}

/**
 * Контракт endpoint-слоя dashboard API.
 */
export interface IDashboardApi {
    /**
     * Возвращает KPI-метрики за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Метрики dashboard.
     */
    getMetrics(range: TDashboardDateRange): Promise<IDashboardMetricsResponse>

    /**
     * Возвращает распределение статусов за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки распределения статусов.
     */
    getStatusDistribution(
        range: TDashboardDateRange,
    ): Promise<IDashboardStatusDistributionResponse>

    /**
     * Возвращает активность команды за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки активности разработчиков.
     */
    getTeamActivity(
        range: TDashboardDateRange,
    ): Promise<IDashboardTeamActivityResponse>

    /**
     * Возвращает flow-метрики за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки flow-метрик.
     */
    getFlowMetrics(
        range: TDashboardDateRange,
    ): Promise<IDashboardFlowMetricsResponse>

    /**
     * Возвращает использование токенов за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Модели и тренд стоимости.
     */
    getTokenUsage(
        range: TDashboardDateRange,
    ): Promise<IDashboardTokenUsageResponse>

    /**
     * Возвращает записи рабочей очереди.
     *
     * @returns Рабочая очередь.
     */
    getWorkQueue(): Promise<IDashboardWorkQueueResponse>

    /**
     * Возвращает записи временной шкалы.
     *
     * @returns Временная шкала.
     */
    getTimeline(): Promise<IDashboardTimelineResponse>
}

/**
 * Допустимые значения диапазона дат.
 */
const VALID_DATE_RANGES = new Set<TDashboardDateRange>(["1d", "7d", "30d", "90d"])

/**
 * Валидирует и нормализует диапазон дат.
 *
 * @param range Входное значение диапазона.
 * @returns Валидный диапазон (по умолчанию "7d").
 */
function normalizeRange(range: TDashboardDateRange): TDashboardDateRange {
    if (VALID_DATE_RANGES.has(range)) {
        return range
    }
    return "7d"
}

/**
 * Endpoint-слой для dashboard API.
 */
export class DashboardApi implements IDashboardApi {
    /**
     * HTTP-клиент для выполнения запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр DashboardApi.
     *
     * @param httpClient HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает KPI-метрики за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Метрики dashboard.
     */
    public async getMetrics(
        range: TDashboardDateRange,
    ): Promise<IDashboardMetricsResponse> {
        return this.httpClient.request<IDashboardMetricsResponse>({
            method: "GET",
            path: "/api/v1/dashboard/metrics",
            query: { range: normalizeRange(range) },
            credentials: "include",
        })
    }

    /**
     * Возвращает распределение статусов за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки распределения статусов.
     */
    public async getStatusDistribution(
        range: TDashboardDateRange,
    ): Promise<IDashboardStatusDistributionResponse> {
        return this.httpClient.request<IDashboardStatusDistributionResponse>({
            method: "GET",
            path: "/api/v1/dashboard/status-distribution",
            query: { range: normalizeRange(range) },
            credentials: "include",
        })
    }

    /**
     * Возвращает активность команды за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки активности разработчиков.
     */
    public async getTeamActivity(
        range: TDashboardDateRange,
    ): Promise<IDashboardTeamActivityResponse> {
        return this.httpClient.request<IDashboardTeamActivityResponse>({
            method: "GET",
            path: "/api/v1/dashboard/team-activity",
            query: { range: normalizeRange(range) },
            credentials: "include",
        })
    }

    /**
     * Возвращает flow-метрики за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Точки flow-метрик.
     */
    public async getFlowMetrics(
        range: TDashboardDateRange,
    ): Promise<IDashboardFlowMetricsResponse> {
        return this.httpClient.request<IDashboardFlowMetricsResponse>({
            method: "GET",
            path: "/api/v1/dashboard/flow-metrics",
            query: { range: normalizeRange(range) },
            credentials: "include",
        })
    }

    /**
     * Возвращает использование токенов за указанный диапазон.
     *
     * @param range Диапазон дат.
     * @returns Модели и тренд стоимости.
     */
    public async getTokenUsage(
        range: TDashboardDateRange,
    ): Promise<IDashboardTokenUsageResponse> {
        return this.httpClient.request<IDashboardTokenUsageResponse>({
            method: "GET",
            path: "/api/v1/dashboard/token-usage",
            query: { range: normalizeRange(range) },
            credentials: "include",
        })
    }

    /**
     * Возвращает записи рабочей очереди.
     *
     * @returns Рабочая очередь.
     */
    public async getWorkQueue(): Promise<IDashboardWorkQueueResponse> {
        return this.httpClient.request<IDashboardWorkQueueResponse>({
            method: "GET",
            path: "/api/v1/dashboard/work-queue",
            credentials: "include",
        })
    }

    /**
     * Возвращает записи временной шкалы.
     *
     * @returns Временная шкала.
     */
    public async getTimeline(): Promise<IDashboardTimelineResponse> {
        return this.httpClient.request<IDashboardTimelineResponse>({
            method: "GET",
            path: "/api/v1/dashboard/timeline",
            credentials: "include",
        })
    }
}
