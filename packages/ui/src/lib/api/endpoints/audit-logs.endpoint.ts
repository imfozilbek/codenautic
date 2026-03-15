import type { IHttpClient } from "../http-client"

/** Тип действия в аудит-логе. */
export type TAuditAction =
    | "integration.connected"
    | "member.invited"
    | "policy.updated"
    | "role.changed"
    | "schedule.updated"

/** Запись аудит-лога. */
export interface IAuditLogEntry {
    /**
     * Уникальный идентификатор записи.
     */
    readonly id: string
    /**
     * Дата-время события в ISO формате.
     */
    readonly occurredAt: string
    /**
     * Инициатор действия.
     */
    readonly actor: string
    /**
     * Тип изменения.
     */
    readonly action: TAuditAction
    /**
     * Сущность, на которую повлияло изменение.
     */
    readonly target: string
    /**
     * Расшифровка изменения.
     */
    readonly details: string
}

/** Фильтры для аудит-логов. */
export interface IAuditFilters {
    /**
     * Фильтр по актору.
     */
    readonly actor?: string
    /**
     * Фильтр по типу действия.
     */
    readonly action?: string
    /**
     * Нижняя граница даты YYYY-MM-DD.
     */
    readonly dateFrom?: string
    /**
     * Верхняя граница даты YYYY-MM-DD.
     */
    readonly dateTo?: string
    /**
     * Номер страницы.
     */
    readonly page?: number
    /**
     * Лимит записей на страницу.
     */
    readonly limit?: number
}

/** Пагинированный ответ аудит-логов. */
export interface IAuditLogsPaginatedResponse {
    /**
     * Массив записей аудит-лога на текущей странице.
     */
    readonly items: readonly IAuditLogEntry[]
    /**
     * Общее количество записей.
     */
    readonly total: number
    /**
     * Текущая страница.
     */
    readonly page: number
    /**
     * Лимит записей на странице.
     */
    readonly limit: number
    /**
     * Общее количество страниц.
     */
    readonly totalPages: number
}

/** Контракт Audit Logs API. */
export interface IAuditLogsApi {
    /**
     * Возвращает пагинированный и фильтрованный список аудит-логов.
     *
     * @param filters - Фильтры для запроса.
     */
    listLogs(filters: IAuditFilters): Promise<IAuditLogsPaginatedResponse>
}

/**
 * Endpoint-слой для Audit Logs API.
 */
export class AuditLogsApi implements IAuditLogsApi {
    /**
     * HTTP-клиент для выполнения запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр AuditLogsApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает пагинированный и фильтрованный список аудит-логов.
     *
     * @param filters - Фильтры для запроса.
     * @returns Пагинированный результат с записями аудит-лога.
     */
    public async listLogs(
        filters: IAuditFilters,
    ): Promise<IAuditLogsPaginatedResponse> {
        return this.httpClient.request<IAuditLogsPaginatedResponse>({
            method: "GET",
            path: "/api/v1/audit-logs",
            query: {
                ...(filters.actor !== undefined ? { actor: filters.actor } : {}),
                ...(filters.action !== undefined ? { action: filters.action } : {}),
                ...(filters.dateFrom !== undefined
                    ? { dateFrom: filters.dateFrom }
                    : {}),
                ...(filters.dateTo !== undefined ? { dateTo: filters.dateTo } : {}),
                page: String(filters.page ?? 1),
                limit: String(filters.limit ?? 20),
            },
            credentials: "include",
        })
    }
}
