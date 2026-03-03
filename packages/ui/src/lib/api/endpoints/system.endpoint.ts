import type { TSystemHealthResponse } from "../types"
import type { IHttpClient } from "../http-client"

/**
 * Контракт endpoint-слоя системных API-вызовов.
 */
export interface ISystemApi {
    /**
     * Проверяет доступность runtime/api.
     *
     * @returns Состояние API сервера.
     */
    getHealth(): Promise<TSystemHealthResponse>
}

/**
 * Endpoint-слой для системных операций runtime/api.
 */
export class SystemApi implements ISystemApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getHealth(): Promise<TSystemHealthResponse> {
        return this.httpClient.request<TSystemHealthResponse>({
            method: "GET",
            path: "/api/v1/health",
        })
    }
}
