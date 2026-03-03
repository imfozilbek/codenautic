import { createApiConfig } from "./config"
import { AuthApi } from "./endpoints/auth.endpoint"
import { CodeReviewApi } from "./endpoints/code-review.endpoint"
import { PermissionsApi } from "./endpoints/permissions.endpoint"
import { FeatureFlagsApi } from "./endpoints/feature-flags.endpoint"
import { SystemApi } from "./endpoints/system.endpoint"
import { FetchHttpClient } from "./http-client"

/**
 * Создаёт централизованный объект API-контрактов для UI.
 *
 * @returns Набор endpoint-клиентов для runtime/api.
 */
export function createApiContracts(): {
    readonly system: SystemApi
    readonly auth: AuthApi
    readonly codeReview: CodeReviewApi
    readonly featureFlags: FeatureFlagsApi
    readonly permissions: PermissionsApi
} {
    const config = createApiConfig({})
    const httpClient = new FetchHttpClient(config)

    return {
        system: new SystemApi(httpClient),
        auth: new AuthApi(httpClient),
        codeReview: new CodeReviewApi(httpClient),
        permissions: new PermissionsApi(httpClient),
        featureFlags: new FeatureFlagsApi(httpClient),
    }
}

export { createApiConfig } from "./config"
export {
    ApiHttpError,
    ApiNetworkError,
    ApiRateLimitError,
    FetchHttpClient,
    isApiHttpError,
    isApiNetworkError,
    isApiRateLimitError,
} from "./http-client"
export type { IApiConfig, IUiEnv } from "./config"
export type { IAuthApi } from "./endpoints/auth.endpoint"
export type { IPermissionsApi } from "./endpoints/permissions.endpoint"
export type { ICodeReviewApi } from "./endpoints/code-review.endpoint"
export type {
    IDelayFunction,
    IFetchHttpClientDependencies,
    IHttpClient,
    IHttpRequest,
    HttpMethod,
    IRetryPolicy,
    QueryValue,
} from "./http-client"
export type { IFeatureFlagsApi } from "./endpoints/feature-flags.endpoint"
export type { ISystemApi } from "./endpoints/system.endpoint"
export type { TSystemHealthResponse, THealthStatus } from "./types"
