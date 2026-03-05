import type { IHttpClient } from "../http-client"

/** Доступные статусы Git provider интеграции. */
export const GIT_PROVIDER_CONNECTION_STATUS = {
    connected: "CONNECTED",
    degraded: "DEGRADED",
    disconnected: "DISCONNECTED",
    syncing: "SYNCING",
} as const

/** Статус Git provider соединения. */
export type TGitProviderConnectionStatus =
    (typeof GIT_PROVIDER_CONNECTION_STATUS)[keyof typeof GIT_PROVIDER_CONNECTION_STATUS]

/** Модель Git provider подключения. */
export interface IGitProviderConnection {
    /** Технический идентификатор интеграции. */
    readonly id: string
    /** Имя провайдера для UI. */
    readonly provider: string
    /** Имя аккаунта/workspace. */
    readonly account?: string
    /** Признак подключенного статуса. */
    readonly connected: boolean
    /** Статус health/sync. */
    readonly status: TGitProviderConnectionStatus
    /** Признак настроенного ключа. */
    readonly isKeySet: boolean
    /** Время последнего успешного sync. */
    readonly lastSyncAt?: string
}

/** Ответ списка Git provider соединений. */
export interface IListGitProvidersResponse {
    /** Набор подключений. */
    readonly providers: ReadonlyArray<IGitProviderConnection>
}

/** Запрос обновления connected-state. */
export interface IUpdateGitProviderConnectionRequest {
    /** Идентификатор провайдера. */
    readonly providerId: string
    /** Целевое состояние подключения. */
    readonly connected: boolean
}

/** Ответ обновления provider соединения. */
export interface IUpdateGitProviderConnectionResponse {
    /** Обновлённая запись провайдера. */
    readonly provider: IGitProviderConnection
}

/** Ответ проверки connectivity провайдера. */
export interface ITestGitProviderConnectionResponse {
    /** Идентификатор провайдера. */
    readonly providerId: string
    /** Результат теста доступности. */
    readonly ok: boolean
    /** Диагностическая подсказка. */
    readonly message?: string
}

/** API-контракт Git providers. */
export interface IGitProvidersApi {
    /** Возвращает список Git provider соединений. */
    listProviders(): Promise<IListGitProvidersResponse>
    /** Обновляет connected/disconnected состояние provider. */
    updateConnection(
        request: IUpdateGitProviderConnectionRequest,
    ): Promise<IUpdateGitProviderConnectionResponse>
    /** Выполняет connectivity-check по выбранному provider. */
    testConnection(providerId: string): Promise<ITestGitProviderConnectionResponse>
}

/** Endpoint-клиент Git providers API. */
export class GitProvidersApi implements IGitProvidersApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async listProviders(): Promise<IListGitProvidersResponse> {
        return this.httpClient.request<IListGitProvidersResponse>({
            method: "GET",
            path: "/api/v1/git/providers",
            credentials: "include",
        })
    }

    public async updateConnection(
        request: IUpdateGitProviderConnectionRequest,
    ): Promise<IUpdateGitProviderConnectionResponse> {
        const normalizedProviderId = request.providerId.trim()
        if (normalizedProviderId.length === 0) {
            throw new Error("providerId не должен быть пустым")
        }

        return this.httpClient.request<IUpdateGitProviderConnectionResponse>({
            method: "PUT",
            path: `/api/v1/git/providers/${encodeURIComponent(normalizedProviderId)}/connection`,
            body: {
                connected: request.connected,
            },
            credentials: "include",
        })
    }

    public async testConnection(providerId: string): Promise<ITestGitProviderConnectionResponse> {
        const normalizedProviderId = providerId.trim()
        if (normalizedProviderId.length === 0) {
            throw new Error("providerId не должен быть пустым")
        }

        return this.httpClient.request<ITestGitProviderConnectionResponse>({
            method: "POST",
            path: `/api/v1/git/providers/${encodeURIComponent(normalizedProviderId)}/test`,
            credentials: "include",
        })
    }
}
