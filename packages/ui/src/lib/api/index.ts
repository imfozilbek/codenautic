import { createApiConfig, resolveUiEnv } from "./config"
import { AdminConfigApi } from "./endpoints/admin-config.endpoint"
import { AuthApi } from "./endpoints/auth.endpoint"
import { BillingApi } from "./endpoints/billing.endpoint"
import { CCRSummaryApi } from "./endpoints/ccr-summary.endpoint"
import { CcrWorkspaceApi } from "./endpoints/ccr-workspace.endpoint"
import { CodeReviewApi } from "./endpoints/code-review.endpoint"
import { ContractValidationApi } from "./endpoints/contract-validation.endpoint"
import { CustomRulesApi } from "./endpoints/custom-rules.endpoint"
import { DashboardApi } from "./endpoints/dashboard.endpoint"
import { ExternalContextApi } from "./endpoints/external-context.endpoint"
import { PermissionsApi } from "./endpoints/permissions.endpoint"
import { FeatureFlagsApi } from "./endpoints/feature-flags.endpoint"
import { SystemApi } from "./endpoints/system.endpoint"
import { RepoConfigApi } from "./endpoints/repo-config.endpoint"
import { DryRunApi } from "./endpoints/dry-run.endpoint"
import { GitProvidersApi } from "./endpoints/git-providers.endpoint"
import { JobsApi } from "./endpoints/jobs.endpoint"
import { NotificationsApi } from "./endpoints/notifications.endpoint"
import { RepositoryApi } from "./endpoints/repository.endpoint"
import { CodeCityApi } from "./endpoints/code-city.endpoint"
import { OrganizationApi } from "./endpoints/organization.endpoint"
import { TeamsApi } from "./endpoints/teams.endpoint"
import { IssuesApi } from "./endpoints/issues.endpoint"
import { ReportsApi } from "./endpoints/reports.endpoint"
import { TriageApi } from "./endpoints/triage.endpoint"
import { WebhooksApi } from "./endpoints/webhooks.endpoint"
import { ByokApi } from "./endpoints/byok.endpoint"
import { SsoApi } from "./endpoints/sso.endpoint"
import { TokenUsageApi } from "./endpoints/token-usage.endpoint"
import { AuditLogsApi } from "./endpoints/audit-logs.endpoint"
import { AdoptionAnalyticsApi } from "./endpoints/adoption-analytics.endpoint"
import { ProviderStatusApi } from "./endpoints/provider-status.endpoint"
import { ScanProgressApi } from "./endpoints/scan-progress.endpoint"
import { LlmProvidersApi } from "./endpoints/llm-providers.endpoint"
import { IntegrationsApi } from "./endpoints/integrations.endpoint"
import { FetchHttpClient } from "./http-client"

/**
 * Создаёт централизованный объект API-контрактов для UI.
 *
 * @returns Набор endpoint-клиентов для runtime/api.
 */
export function createApiContracts(): {
    readonly system: SystemApi
    readonly adminConfig: AdminConfigApi
    readonly auth: AuthApi
    readonly billing: BillingApi
    readonly notifications: NotificationsApi
    readonly codeReview: CodeReviewApi
    readonly ccrSummary: CCRSummaryApi
    readonly ccrWorkspace: CcrWorkspaceApi
    readonly contractValidation: ContractValidationApi
    readonly customRules: CustomRulesApi
    readonly dashboard: DashboardApi
    readonly externalContext: ExternalContextApi
    readonly featureFlags: FeatureFlagsApi
    readonly permissions: PermissionsApi
    readonly repoConfig: RepoConfigApi
    readonly dryRun: DryRunApi
    readonly gitProviders: GitProvidersApi
    readonly jobs: JobsApi
    readonly repositories: RepositoryApi
    readonly codeCity: CodeCityApi
    readonly organization: OrganizationApi
    readonly teams: TeamsApi
    readonly issues: IssuesApi
    readonly reports: ReportsApi
    readonly triage: TriageApi
    readonly webhooks: WebhooksApi
    readonly byok: ByokApi
    readonly sso: SsoApi
    readonly tokenUsage: TokenUsageApi
    readonly auditLogs: AuditLogsApi
    readonly adoptionAnalytics: AdoptionAnalyticsApi
    readonly providerStatus: ProviderStatusApi
    readonly scanProgress: ScanProgressApi
    readonly llmProviders: LlmProvidersApi
    readonly integrations: IntegrationsApi
} {
    const config = createApiConfig(resolveUiEnv(import.meta.env))
    const httpClient = new FetchHttpClient(config)

    return {
        system: new SystemApi(httpClient),
        adminConfig: new AdminConfigApi(httpClient),
        auth: new AuthApi(httpClient),
        billing: new BillingApi(httpClient),
        notifications: new NotificationsApi(httpClient),
        codeReview: new CodeReviewApi(httpClient),
        ccrSummary: new CCRSummaryApi(httpClient),
        ccrWorkspace: new CcrWorkspaceApi(httpClient),
        contractValidation: new ContractValidationApi(httpClient),
        customRules: new CustomRulesApi(httpClient),
        dashboard: new DashboardApi(httpClient),
        externalContext: new ExternalContextApi(httpClient),
        permissions: new PermissionsApi(httpClient),
        featureFlags: new FeatureFlagsApi(httpClient),
        repoConfig: new RepoConfigApi(httpClient),
        dryRun: new DryRunApi(httpClient),
        gitProviders: new GitProvidersApi(httpClient),
        jobs: new JobsApi(httpClient),
        repositories: new RepositoryApi(httpClient),
        codeCity: new CodeCityApi(httpClient),
        organization: new OrganizationApi(httpClient),
        teams: new TeamsApi(httpClient),
        issues: new IssuesApi(httpClient),
        reports: new ReportsApi(httpClient),
        triage: new TriageApi(httpClient),
        webhooks: new WebhooksApi(httpClient),
        byok: new ByokApi(httpClient),
        sso: new SsoApi(httpClient),
        tokenUsage: new TokenUsageApi(httpClient),
        auditLogs: new AuditLogsApi(httpClient),
        adoptionAnalytics: new AdoptionAnalyticsApi(httpClient),
        providerStatus: new ProviderStatusApi(httpClient),
        scanProgress: new ScanProgressApi(httpClient),
        llmProviders: new LlmProvidersApi(httpClient),
        integrations: new IntegrationsApi(httpClient),
    }
}

export { createApiConfig, resolveUiEnv } from "./config"
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
export type { IContractValidationApi } from "./endpoints/contract-validation.endpoint"
export type { ICustomRulesApi } from "./endpoints/custom-rules.endpoint"
export type { IExternalContextApi } from "./endpoints/external-context.endpoint"
export type { IRepoConfigApi } from "./endpoints/repo-config.endpoint"
export type { IDryRunApi } from "./endpoints/dry-run.endpoint"
export type { IDashboardApi } from "./endpoints/dashboard.endpoint"
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
export type { IRepositoryApi } from "./endpoints/repository.endpoint"
export type { ICodeCityApi } from "./endpoints/code-city.endpoint"
export type { IOrganizationApi } from "./endpoints/organization.endpoint"
export type { ITeamsApi } from "./endpoints/teams.endpoint"
export type { IIssuesApi } from "./endpoints/issues.endpoint"
export type { IReportsApi } from "./endpoints/reports.endpoint"
export type { ITriageApi } from "./endpoints/triage.endpoint"
export type { IJobsApi } from "./endpoints/jobs.endpoint"
export type { IWebhooksApi } from "./endpoints/webhooks.endpoint"
export type { IBillingApi } from "./endpoints/billing.endpoint"
export type { IByokApi } from "./endpoints/byok.endpoint"
export type { ISsoApi } from "./endpoints/sso.endpoint"
export type { ITokenUsageApi } from "./endpoints/token-usage.endpoint"
export type { IAuditLogsApi } from "./endpoints/audit-logs.endpoint"
export type { IAdminConfigApi } from "./endpoints/admin-config.endpoint"
export type { INotificationsApi } from "./endpoints/notifications.endpoint"
export type { IAdoptionAnalyticsApi } from "./endpoints/adoption-analytics.endpoint"
export type { IProviderStatusApi } from "./endpoints/provider-status.endpoint"
export type { IScanProgressApi } from "./endpoints/scan-progress.endpoint"
export type { ILlmProvidersApi } from "./endpoints/llm-providers.endpoint"
export type { IIntegrationsApi } from "./endpoints/integrations.endpoint"
export type { TSystemHealthResponse, THealthStatus } from "./types"
