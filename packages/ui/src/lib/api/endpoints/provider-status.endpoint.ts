import type { IHttpClient } from "../http-client"
import type { TDegradationLevel, TDegradedProvider } from "@/lib/providers/degradation-mode"

/**
 * Состояние провайдера.
 */
export interface IProviderState {
    /**
     * Провайдер.
     */
    readonly provider: TDegradedProvider
    /**
     * Уровень доступности.
     */
    readonly level: TDegradationLevel
    /**
     * Затронутые фичи.
     */
    readonly affectedFeatures: readonly string[]
    /**
     * ETA восстановления.
     */
    readonly eta: string
    /**
     * Ссылка на incident runbook.
     */
    readonly runbookUrl: string
}

/**
 * Действие в очереди.
 */
export interface IQueuedAction {
    /**
     * Уникальный id queued action.
     */
    readonly id: string
    /**
     * Описание критичного действия.
     */
    readonly description: string
    /**
     * Текущий статус в queue/retry режиме.
     */
    readonly status: "queued" | "retrying" | "sent"
}

/**
 * Ответ Provider Status API.
 */
export interface IProviderStatusResponse {
    /**
     * Текущее состояние провайдера.
     */
    readonly state: IProviderState
    /**
     * Список действий в очереди.
     */
    readonly queuedActions: readonly IQueuedAction[]
}

/**
 * Запрос на добавление действия в очередь.
 */
export interface IQueueActionRequest {
    /**
     * Описание критичного действия.
     */
    readonly description: string
}

/**
 * Контракт Provider Status API.
 */
export interface IProviderStatusApi {
    /**
     * Возвращает текущий статус провайдеров.
     */
    getStatus(): Promise<IProviderStatusResponse>

    /**
     * Добавляет действие в очередь.
     *
     * @param request - Данные для создания действия.
     */
    queueAction(request: IQueueActionRequest): Promise<IQueuedAction>
}

/**
 * Endpoint-слой для Provider Status API.
 */
export class ProviderStatusApi implements IProviderStatusApi {
    /**
     * HTTP-клиент для выполнения запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр ProviderStatusApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает текущий статус провайдеров.
     *
     * @returns Состояние провайдера и очередь действий.
     */
    public async getStatus(): Promise<IProviderStatusResponse> {
        return this.httpClient.request<IProviderStatusResponse>({
            method: "GET",
            path: "/api/v1/providers/status",
            credentials: "include",
        })
    }

    /**
     * Добавляет действие в очередь.
     *
     * @param request - Данные для создания действия.
     * @returns Созданное действие.
     */
    public async queueAction(request: IQueueActionRequest): Promise<IQueuedAction> {
        return this.httpClient.request<IQueuedAction>({
            method: "POST",
            path: "/api/v1/providers/status/actions",
            body: request,
            credentials: "include",
        })
    }
}
