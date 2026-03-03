import type { IFeatureFlagsResponse } from "@/lib/feature-flags/feature-flags"
import type { IHttpClient } from "../http-client"

/**
 * Контракт endpoint-слоя feature flags API.
 */
export interface IFeatureFlagsApi {
    /**
     * Возвращает доступные для текущего пользователя feature flags.
     *
     * @returns Карта feature flags.
     */
    getFeatureFlags(): Promise<IFeatureFlagsResponse>
}

/**
 * Endpoint-слой для feature flags integration с runtime/api.
 */
export class FeatureFlagsApi implements IFeatureFlagsApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getFeatureFlags(): Promise<IFeatureFlagsResponse> {
        return this.httpClient.request<IFeatureFlagsResponse>({
            method: "GET",
            path: "/api/v1/feature-flags",
            credentials: "include",
        })
    }
}
