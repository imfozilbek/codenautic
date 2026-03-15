import type { IHttpClient } from "../http-client"

/**
 * Тип отчёта: архитектура, доставка или качество.
 */
export type TReportType = "architecture" | "delivery" | "quality"

/**
 * Формат вывода отчёта.
 */
export type TReportFormat = "pdf" | "png" | "html"

/**
 * Статус отчёта в пайплайне генерации.
 */
export type TReportStatus = "completed" | "queued" | "failed"

/**
 * Сгенерированный отчёт.
 */
export interface IReport {
    /**
     * Уникальный идентификатор отчёта.
     */
    readonly id: string
    /**
     * Заголовок отчёта.
     */
    readonly title: string
    /**
     * Тип отчёта.
     */
    readonly type: TReportType
    /**
     * Формат вывода.
     */
    readonly format: TReportFormat
    /**
     * Текущий статус генерации.
     */
    readonly status: TReportStatus
    /**
     * Дата создания (ISO строка).
     */
    readonly createdAt: string
    /**
     * Секции, включённые в отчёт.
     */
    readonly sections: ReadonlyArray<string>
}

/**
 * Точка тренда для графика отчёта.
 */
export interface IReportTrendPoint {
    /**
     * Временной период (например, "Week 1").
     */
    readonly period: string
    /**
     * Оценка риска (0–100).
     */
    readonly riskScore: number
    /**
     * Скорость доставки.
     */
    readonly deliveryVelocity: number
}

/**
 * Точка распределения секций в отчёте.
 */
export interface IReportSectionDistribution {
    /**
     * Название секции.
     */
    readonly section: string
    /**
     * Числовое значение вклада секции.
     */
    readonly value: number
}

/**
 * Полные данные отчёта для viewer-страницы.
 */
export interface IReportData {
    /**
     * Основная информация об отчёте.
     */
    readonly report: IReport
    /**
     * Точки тренда для линейного графика.
     */
    readonly trends: ReadonlyArray<IReportTrendPoint>
    /**
     * Распределение по секциям для bar chart.
     */
    readonly distribution: ReadonlyArray<IReportSectionDistribution>
}

/**
 * Ответ списка отчётов.
 */
export interface IReportsListResponse {
    /**
     * Массив отчётов.
     */
    readonly reports: ReadonlyArray<IReport>
    /**
     * Общее количество отчётов.
     */
    readonly total: number
}

/**
 * Запрос на создание отчёта.
 */
export interface ICreateReportRequest {
    /**
     * Заголовок нового отчёта.
     */
    readonly title: string
    /**
     * Тип отчёта.
     */
    readonly type: TReportType
    /**
     * Формат вывода.
     */
    readonly format: TReportFormat
    /**
     * Секции для включения в отчёт.
     */
    readonly sections: ReadonlyArray<string>
}

/**
 * Ответ на удаление отчёта.
 */
export interface IDeleteReportResponse {
    /**
     * Флаг успешного удаления.
     */
    readonly deleted: boolean
}

/**
 * Фильтры для списка отчётов.
 */
export interface IReportsListFilters {
    /**
     * Фильтр по типу отчёта.
     */
    readonly type?: TReportType
    /**
     * Фильтр по статусу.
     */
    readonly status?: TReportStatus
}

/**
 * API-контракт домена отчётов.
 */
export interface IReportsApi {
    /**
     * Возвращает список отчётов с опциональными фильтрами.
     *
     * @param filters - Фильтры по типу и статусу.
     */
    listReports(filters?: IReportsListFilters): Promise<IReportsListResponse>
    /**
     * Возвращает полные данные отчёта по ID (включая тренды и распределение).
     *
     * @param id - Идентификатор отчёта.
     */
    getReport(id: string): Promise<IReportData>
    /**
     * Создаёт новый отчёт.
     *
     * @param request - Данные для создания отчёта.
     */
    createReport(request: ICreateReportRequest): Promise<IReport>
    /**
     * Удаляет отчёт по ID.
     *
     * @param id - Идентификатор отчёта.
     */
    deleteReport(id: string): Promise<IDeleteReportResponse>
}

/**
 * Endpoint-клиент Reports API.
 */
export class ReportsApi implements IReportsApi {
    /**
     * HTTP-клиент для запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр ReportsApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает список отчётов с опциональными фильтрами.
     *
     * @param filters - Фильтры по типу и статусу.
     * @returns Ответ со списком отчётов.
     */
    public async listReports(
        filters?: IReportsListFilters,
    ): Promise<IReportsListResponse> {
        const query: Record<string, string> = {}
        if (filters?.type !== undefined) {
            query["type"] = filters.type
        }
        if (filters?.status !== undefined) {
            query["status"] = filters.status
        }

        return this.httpClient.request<IReportsListResponse>({
            method: "GET",
            path: "/api/v1/reports",
            query,
            credentials: "include",
        })
    }

    /**
     * Возвращает полные данные отчёта по ID.
     *
     * @param id - Идентификатор отчёта.
     * @returns Полные данные отчёта с трендами и распределением.
     */
    public async getReport(id: string): Promise<IReportData> {
        const normalizedId = id.trim()
        if (normalizedId.length === 0) {
            throw new Error("report id не должен быть пустым")
        }

        return this.httpClient.request<IReportData>({
            method: "GET",
            path: `/api/v1/reports/${encodeURIComponent(normalizedId)}`,
            credentials: "include",
        })
    }

    /**
     * Создаёт новый отчёт.
     *
     * @param request - Данные для создания.
     * @returns Созданный отчёт.
     */
    public async createReport(request: ICreateReportRequest): Promise<IReport> {
        return this.httpClient.request<IReport>({
            method: "POST",
            path: "/api/v1/reports",
            body: request,
            credentials: "include",
        })
    }

    /**
     * Удаляет отчёт по ID.
     *
     * @param id - Идентификатор отчёта.
     * @returns Результат удаления.
     */
    public async deleteReport(id: string): Promise<IDeleteReportResponse> {
        const normalizedId = id.trim()
        if (normalizedId.length === 0) {
            throw new Error("report id не должен быть пустым")
        }

        return this.httpClient.request<IDeleteReportResponse>({
            method: "DELETE",
            path: `/api/v1/reports/${encodeURIComponent(normalizedId)}`,
            credentials: "include",
        })
    }
}
