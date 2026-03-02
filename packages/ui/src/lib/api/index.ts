import {createApiConfig} from "./config"
import {SystemApi} from "./endpoints/system.endpoint"
import {FetchHttpClient} from "./http-client"

/**
 * Создаёт централизованный объект API-контрактов для UI.
 *
 * @returns Набор endpoint-клиентов для runtime/api.
 */
export function createApiContracts(): {readonly system: SystemApi} {
    const config = createApiConfig({})
    const httpClient = new FetchHttpClient(config)

    return {
        system: new SystemApi(httpClient),
    }
}

export {createApiConfig} from "./config"
export {
    ApiHttpError,
    ApiNetworkError,
    ApiRateLimitError,
    FetchHttpClient,
    isApiHttpError,
    isApiNetworkError,
    isApiRateLimitError,
} from "./http-client"
export type {IApiConfig, IUiEnv} from "./config"
export type {
    IDelayFunction,
    IFetchHttpClientDependencies,
    IHttpClient,
    IHttpRequest,
    HttpMethod,
    IRetryPolicy,
    QueryValue,
} from "./http-client"
export type {ISystemApi} from "./endpoints/system.endpoint"
export type {TSystemHealthResponse, THealthStatus} from "./types"
