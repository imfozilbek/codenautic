import { createApiConfig } from "./config"
import { AuthApi } from "./endpoints/auth.endpoint"
import { CCRSummaryApi } from "./endpoints/ccr-summary.endpoint"
import { CcrWorkspaceApi } from "./endpoints/ccr-workspace.endpoint"
import { CodeReviewApi } from "./endpoints/code-review.endpoint"
import { CustomRulesApi } from "./endpoints/custom-rules.endpoint"
import { ExternalContextApi } from "./endpoints/external-context.endpoint"
import { PermissionsApi } from "./endpoints/permissions.endpoint"
import { FeatureFlagsApi } from "./endpoints/feature-flags.endpoint"
import { SystemApi } from "./endpoints/system.endpoint"
import { RepoConfigApi } from "./endpoints/repo-config.endpoint"
import { DryRunApi } from "./endpoints/dry-run.endpoint"
import { GitProvidersApi } from "./endpoints/git-providers.endpoint"
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
    readonly ccrSummary: CCRSummaryApi
    readonly ccrWorkspace: CcrWorkspaceApi
    readonly customRules: CustomRulesApi
    readonly externalContext: ExternalContextApi
    readonly featureFlags: FeatureFlagsApi
    readonly permissions: PermissionsApi
    readonly repoConfig: RepoConfigApi
    readonly dryRun: DryRunApi
    readonly gitProviders: GitProvidersApi
} {
    const config = createApiConfig({})
    const httpClient = new FetchHttpClient(config)

    return {
        system: new SystemApi(httpClient),
        auth: new AuthApi(httpClient),
        codeReview: new CodeReviewApi(httpClient),
        ccrSummary: new CCRSummaryApi(httpClient),
        ccrWorkspace: new CcrWorkspaceApi(httpClient),
        customRules: new CustomRulesApi(httpClient),
        externalContext: new ExternalContextApi(httpClient),
        permissions: new PermissionsApi(httpClient),
        featureFlags: new FeatureFlagsApi(httpClient),
        repoConfig: new RepoConfigApi(httpClient),
        dryRun: new DryRunApi(httpClient),
        gitProviders: new GitProvidersApi(httpClient),
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
export type { ICCRSummaryApi } from "./endpoints/ccr-summary.endpoint"
export type { ICcrWorkspaceApi } from "./endpoints/ccr-workspace.endpoint"
export type { ICodeReviewApi } from "./endpoints/code-review.endpoint"
export type { ICustomRulesApi } from "./endpoints/custom-rules.endpoint"
export type { IExternalContextApi } from "./endpoints/external-context.endpoint"
export type { IRepoConfigApi } from "./endpoints/repo-config.endpoint"
export type { IDryRunApi } from "./endpoints/dry-run.endpoint"
export type { IGitProvidersApi } from "./endpoints/git-providers.endpoint"
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
