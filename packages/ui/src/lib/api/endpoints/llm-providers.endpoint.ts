import type { IHttpClient } from "../http-client"

/**
 * Допустимые LLM провайдеры.
 */
export const LLM_PROVIDER_NAMES = [
    "OpenAI",
    "Anthropic",
    "Azure OpenAI",
    "Mistral",
] as const

/**
 * Тип LLM провайдера.
 */
export type TLlmProviderName = (typeof LLM_PROVIDER_NAMES)[number]

/**
 * Статус подключения LLM провайдера.
 */
export const LLM_PROVIDER_STATUS = {
    connected: "CONNECTED",
    disconnected: "DISCONNECTED",
    degraded: "DEGRADED",
} as const

/**
 * Статус LLM провайдера.
 */
export type TLlmProviderStatus =
    (typeof LLM_PROVIDER_STATUS)[keyof typeof LLM_PROVIDER_STATUS]

/**
 * Конфигурация одного LLM провайдера.
 */
export interface ILlmProviderConfig {
    /**
     * Идентификатор конфигурации.
     */
    readonly id: string
    /**
     * Имя провайдера.
     */
    readonly provider: TLlmProviderName
    /**
     * Активная модель.
     */
    readonly model: string
    /**
     * Маскированный API key (сервер не возвращает полный ключ).
     */
    readonly maskedApiKey: string
    /**
     * Custom endpoint URL.
     */
    readonly endpoint: string
    /**
     * Статус подключения.
     */
    readonly status: TLlmProviderStatus
    /**
     * Подключен ли провайдер.
     */
    readonly connected: boolean
    /**
     * Время последней проверки.
     */
    readonly lastTestedAt?: string
}

/**
 * Ответ со списком конфигураций LLM провайдеров.
 */
export interface ILlmProvidersListResponse {
    /**
     * Массив конфигураций.
     */
    readonly providers: ReadonlyArray<ILlmProviderConfig>
    /**
     * Общее количество провайдеров.
     */
    readonly total: number
}

/**
 * Запрос обновления конфигурации LLM провайдера.
 */
export interface IUpdateLlmProviderRequest {
    /**
     * Идентификатор конфигурации.
     */
    readonly id: string
    /**
     * Модель для использования.
     */
    readonly model?: string
    /**
     * API key (передаётся в открытом виде, сервер маскирует).
     */
    readonly apiKey?: string
    /**
     * Custom endpoint URL.
     */
    readonly endpoint?: string
}

/**
 * Ответ обновления конфигурации LLM провайдера.
 */
export interface IUpdateLlmProviderResponse {
    /**
     * Обновлённая конфигурация.
     */
    readonly provider: ILlmProviderConfig
}

/**
 * Запрос тестирования соединения с LLM провайдером.
 */
export interface ITestLlmProviderRequest {
    /**
     * Идентификатор конфигурации.
     */
    readonly id: string
}

/**
 * Ответ тестирования соединения с LLM провайдером.
 */
export interface ITestLlmProviderResponse {
    /**
     * Идентификатор провайдера.
     */
    readonly id: string
    /**
     * Результат теста.
     */
    readonly ok: boolean
    /**
     * Сообщение о результате.
     */
    readonly message: string
    /**
     * Задержка ответа в мс.
     */
    readonly latencyMs?: number
}

/**
 * API-контракт управления LLM провайдерами.
 */
export interface ILlmProvidersApi {
    /**
     * Возвращает список конфигураций всех LLM провайдеров.
     */
    getConfig(): Promise<ILlmProvidersListResponse>

    /**
     * Обновляет конфигурацию LLM провайдера.
     *
     * @param request - Данные для обновления.
     */
    updateConfig(request: IUpdateLlmProviderRequest): Promise<IUpdateLlmProviderResponse>

    /**
     * Тестирует соединение с LLM провайдером.
     *
     * @param request - Данные для теста.
     */
    testConnection(request: ITestLlmProviderRequest): Promise<ITestLlmProviderResponse>
}

/**
 * Endpoint-клиент LLM Providers API.
 */
export class LlmProvidersApi implements ILlmProvidersApi {
    /**
     * HTTP-клиент для запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр LlmProvidersApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает список конфигураций всех LLM провайдеров.
     *
     * @returns Ответ со списком провайдеров.
     */
    public async getConfig(): Promise<ILlmProvidersListResponse> {
        return this.httpClient.request<ILlmProvidersListResponse>({
            method: "GET",
            path: "/api/v1/llm-providers",
            credentials: "include",
        })
    }

    /**
     * Обновляет конфигурацию LLM провайдера.
     *
     * @param request - Данные для обновления.
     * @returns Ответ с обновлённой конфигурацией.
     */
    public async updateConfig(
        request: IUpdateLlmProviderRequest,
    ): Promise<IUpdateLlmProviderResponse> {
        const normalizedId = request.id.trim()
        if (normalizedId.length === 0) {
            throw new Error("id провайдера не должен быть пустым")
        }

        const { id: _id, ...payload } = request
        return this.httpClient.request<IUpdateLlmProviderResponse>({
            method: "PUT",
            path: `/api/v1/llm-providers/${encodeURIComponent(normalizedId)}`,
            body: payload,
            credentials: "include",
        })
    }

    /**
     * Тестирует соединение с LLM провайдером.
     *
     * @param request - Данные для теста.
     * @returns Ответ с результатом теста.
     */
    public async testConnection(
        request: ITestLlmProviderRequest,
    ): Promise<ITestLlmProviderResponse> {
        const normalizedId = request.id.trim()
        if (normalizedId.length === 0) {
            throw new Error("id провайдера не должен быть пустым")
        }

        return this.httpClient.request<ITestLlmProviderResponse>({
            method: "POST",
            path: `/api/v1/llm-providers/${encodeURIComponent(normalizedId)}/test`,
            credentials: "include",
        })
    }
}
