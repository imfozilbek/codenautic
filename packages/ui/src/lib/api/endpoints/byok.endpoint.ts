import type { IHttpClient } from "../http-client"

/**
 * Допустимые провайдеры BYOK ключей.
 */
export type TByokProvider = "anthropic" | "github" | "gitlab" | "openai"

/**
 * Запись BYOK ключа с метаданными использования.
 */
export interface IByokKeyEntry {
    /**
     * Уникальный идентификатор ключа.
     */
    readonly id: string
    /**
     * Провайдер, к которому относится ключ.
     */
    readonly provider: TByokProvider
    /**
     * Человекочитаемый ярлык ключа.
     */
    readonly label: string
    /**
     * Маскированное значение секрета.
     */
    readonly maskedSecret: string
    /**
     * Признак активности ключа.
     */
    readonly isActive: boolean
    /**
     * Число ротаций ключа.
     */
    readonly rotationCount: number
    /**
     * Количество запросов, выполненных этим ключом.
     */
    readonly usageRequests: number
    /**
     * Количество токенов, потребленных этим ключом.
     */
    readonly usageTokens: number
    /**
     * Время последнего использования (ISO 8601).
     */
    readonly lastUsedAt: string
}

/**
 * Ответ списка BYOK ключей.
 */
export interface IByokListResponse {
    /**
     * Массив ключей.
     */
    readonly keys: ReadonlyArray<IByokKeyEntry>
    /**
     * Общее количество ключей.
     */
    readonly total: number
}

/**
 * Ответ с одним BYOK ключом.
 */
export interface IByokKeyResponse {
    /**
     * Данные ключа.
     */
    readonly key: IByokKeyEntry
}

/**
 * Запрос на создание нового BYOK ключа.
 */
export interface ICreateByokKeyRequest {
    /**
     * Провайдер ключа.
     */
    readonly provider: TByokProvider
    /**
     * Ярлык ключа.
     */
    readonly label: string
    /**
     * Секрет ключа (передаётся в открытом виде, сервер маскирует).
     */
    readonly secret: string
}

/**
 * Запрос на переключение активности ключа.
 */
export interface IToggleByokKeyRequest {
    /**
     * Идентификатор ключа.
     */
    readonly id: string
    /**
     * Новое состояние активности.
     */
    readonly isActive: boolean
}

/**
 * API-контракт управления BYOK ключами.
 */
export interface IByokApi {
    /**
     * Возвращает список всех BYOK ключей.
     */
    listKeys(): Promise<IByokListResponse>

    /**
     * Создаёт новый BYOK ключ.
     *
     * @param data - Данные для создания ключа.
     */
    createKey(data: ICreateByokKeyRequest): Promise<IByokKeyResponse>

    /**
     * Удаляет BYOK ключ по идентификатору.
     *
     * @param keyId - Идентификатор удаляемого ключа.
     */
    deleteKey(keyId: string): Promise<{ readonly removed: boolean }>

    /**
     * Ротирует секрет BYOK ключа.
     *
     * @param keyId - Идентификатор ключа для ротации.
     */
    rotateKey(keyId: string): Promise<IByokKeyResponse>

    /**
     * Переключает активность BYOK ключа.
     *
     * @param data - Данные переключения.
     */
    toggleKey(data: IToggleByokKeyRequest): Promise<IByokKeyResponse>
}

/**
 * Endpoint-клиент BYOK API.
 */
export class ByokApi implements IByokApi {
    /**
     * HTTP-клиент для запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр ByokApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает список всех BYOK ключей.
     *
     * @returns Ответ со списком ключей и общим количеством.
     */
    public async listKeys(): Promise<IByokListResponse> {
        return this.httpClient.request<IByokListResponse>({
            method: "GET",
            path: "/api/v1/byok",
            credentials: "include",
        })
    }

    /**
     * Создаёт новый BYOK ключ.
     *
     * @param data - Данные для создания ключа.
     * @returns Ответ с созданным ключом.
     */
    public async createKey(data: ICreateByokKeyRequest): Promise<IByokKeyResponse> {
        return this.httpClient.request<IByokKeyResponse>({
            method: "POST",
            path: "/api/v1/byok",
            body: data,
            credentials: "include",
        })
    }

    /**
     * Удаляет BYOK ключ по идентификатору.
     *
     * @param keyId - Идентификатор удаляемого ключа.
     * @returns Ответ с флагом успешности.
     */
    public async deleteKey(keyId: string): Promise<{ readonly removed: boolean }> {
        return this.httpClient.request<{ readonly removed: boolean }>({
            method: "DELETE",
            path: `/api/v1/byok/${encodeURIComponent(keyId)}`,
            credentials: "include",
        })
    }

    /**
     * Ротирует секрет BYOK ключа.
     *
     * @param keyId - Идентификатор ключа для ротации.
     * @returns Ответ с обновлённым ключом.
     */
    public async rotateKey(keyId: string): Promise<IByokKeyResponse> {
        return this.httpClient.request<IByokKeyResponse>({
            method: "POST",
            path: `/api/v1/byok/${encodeURIComponent(keyId)}/rotate`,
            credentials: "include",
        })
    }

    /**
     * Переключает активность BYOK ключа.
     *
     * @param data - Данные переключения.
     * @returns Ответ с обновлённым ключом.
     */
    public async toggleKey(data: IToggleByokKeyRequest): Promise<IByokKeyResponse> {
        return this.httpClient.request<IByokKeyResponse>({
            method: "PATCH",
            path: `/api/v1/byok/${encodeURIComponent(data.id)}/toggle`,
            body: { isActive: data.isActive },
            credentials: "include",
        })
    }
}
