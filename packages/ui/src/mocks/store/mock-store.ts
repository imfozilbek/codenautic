import { AdminConfigCollection } from "./collections/admin-config-collection"
import { AuthCollection } from "./collections/auth-collection"
import { BillingCollection } from "./collections/billing-collection"
import { ByokCollection } from "./collections/byok-collection"
import { CodeCityCollection } from "./collections/code-city-collection"
import { ContractValidationCollection } from "./collections/contract-validation-collection"
import { DashboardCollection } from "./collections/dashboard-collection"
import { IssuesCollection } from "./collections/issues-collection"
import { JobsCollection } from "./collections/jobs-collection"
import { NotificationsCollection } from "./collections/notifications-collection"
import { OrganizationCollection } from "./collections/organization-collection"
import { ProvidersCollection } from "./collections/providers-collection"
import { ReportsCollection } from "./collections/reports-collection"
import { RepositoriesCollection } from "./collections/repositories-collection"
import { ReviewsCollection } from "./collections/reviews-collection"
import { RulesCollection } from "./collections/rules-collection"
import { SettingsCollection } from "./collections/settings-collection"
import { SsoCollection } from "./collections/sso-collection"
import { TeamsCollection } from "./collections/teams-collection"
import { TriageCollection } from "./collections/triage-collection"
import { TokenUsageCollection } from "./collections/token-usage-collection"
import { AuditLogsCollection } from "./collections/audit-logs-collection"
import { WebhooksCollection } from "./collections/webhooks-collection"
import { AdoptionAnalyticsCollection } from "./collections/adoption-analytics-collection"
import { ProviderStatusCollection } from "./collections/provider-status-collection"
import { ScanProgressCollection } from "./collections/scan-progress-collection"
import { LlmProvidersCollection } from "./collections/llm-providers-collection"
import { IntegrationsCollection } from "./collections/integrations-collection"

/**
 * Централизованное in-memory хранилище для mock API слоя MSW.
 *
 * Агрегирует все коллекции данных (auth, settings, rules, providers, reviews).
 * Предоставляет единую точку сброса состояния через метод reset().
 */
export class MockStore {
    /**
     * Коллекция admin config: optimistic concurrency с ETag.
     */
    public readonly adminConfig: AdminConfigCollection

    /**
     * Коллекция авторизации: пользователи и сессии.
     */
    public readonly auth: AuthCollection

    /**
     * Коллекция contract validation: blueprint, guardrails, drift, граф архитектуры.
     */
    public readonly contractValidation: ContractValidationCollection

    /**
     * Коллекция dashboard: метрики, распределения, активность, flow, токены, очередь, таймлайн.
     */
    public readonly dashboard: DashboardCollection

    /**
     * Коллекция настроек: пользовательские настройки, предпочтения, конфигурации репозиториев.
     */
    public readonly settings: SettingsCollection

    /**
     * Коллекция custom-правил пайплайна.
     */
    public readonly rules: RulesCollection

    /**
     * Коллекция Git providers и context sources.
     */
    public readonly providers: ProvidersCollection

    /**
     * Коллекция reviews: CCR, диффы, треды, результаты code review.
     */
    public readonly reviews: ReviewsCollection

    /**
     * Коллекция репозиториев и их overview-профилей.
     */
    public readonly repositories: RepositoriesCollection

    /**
     * Коллекция CodeCity: профили, граф зависимостей.
     */
    public readonly codeCity: CodeCityCollection

    /**
     * Коллекция issues: проблемы, обнаруженные при анализе кода.
     */
    public readonly issues: IssuesCollection

    /**
     * Коллекция уведомлений: inbox, каналы, правила приглушения.
     */
    public readonly notifications: NotificationsCollection

    /**
     * Коллекция отчётов: CRUD, тренды, распределение.
     */
    public readonly reports: ReportsCollection

    /**
     * Коллекция команд: участники, назначенные репозитории.
     */
    public readonly teams: TeamsCollection

    /**
     * Коллекция организации: профиль, биллинг, участники.
     */
    public readonly organization: OrganizationCollection

    /**
     * Коллекция triage: unified triage hub items.
     */
    public readonly triage: TriageCollection

    /**
     * Коллекция BYOK: ключи провайдеров.
     */
    public readonly byok: ByokCollection

    /**
     * Коллекция SSO: SAML и OIDC конфигурации.
     */
    public readonly sso: SsoCollection

    /**
     * Коллекция operations jobs: jobs, audit trail, расписания.
     */
    public readonly jobs: JobsCollection

    /**
     * Коллекция webhook endpoints и delivery logs.
     */
    public readonly webhooks: WebhooksCollection

    /**
     * Коллекция billing: snapshot, история изменений плана.
     */
    public readonly billing: BillingCollection

    /**
     * Коллекция token usage: записи расхода токенов, агрегация.
     */
    public readonly tokenUsage: TokenUsageCollection

    /**
     * Коллекция audit logs: записи аудит-лога, фильтрация.
     */
    public readonly auditLogs: AuditLogsCollection

    /**
     * Коллекция adoption analytics: funnel, workflow health, KPI.
     */
    public readonly adoptionAnalytics: AdoptionAnalyticsCollection

    /**
     * Коллекция provider status: состояние провайдера, очередь действий.
     */
    public readonly providerStatus: ProviderStatusCollection

    /**
     * Коллекция scan progress: события прогресса сканирования.
     */
    public readonly scanProgress: ScanProgressCollection

    /**
     * Коллекция LLM providers: конфигурации провайдеров.
     */
    public readonly llmProviders: LlmProvidersCollection

    /**
     * Коллекция интеграций: Jira, Linear, Sentry, Slack.
     */
    public readonly integrations: IntegrationsCollection

    /**
     * Создаёт новый экземпляр MockStore с пустыми коллекциями.
     */
    public constructor() {
        this.adminConfig = new AdminConfigCollection()
        this.auth = new AuthCollection()
        this.contractValidation = new ContractValidationCollection()
        this.dashboard = new DashboardCollection()
        this.settings = new SettingsCollection()
        this.rules = new RulesCollection()
        this.providers = new ProvidersCollection()
        this.reviews = new ReviewsCollection()
        this.repositories = new RepositoriesCollection()
        this.codeCity = new CodeCityCollection()
        this.issues = new IssuesCollection()
        this.notifications = new NotificationsCollection()
        this.reports = new ReportsCollection()
        this.teams = new TeamsCollection()
        this.organization = new OrganizationCollection()
        this.triage = new TriageCollection()
        this.byok = new ByokCollection()
        this.sso = new SsoCollection()
        this.jobs = new JobsCollection()
        this.webhooks = new WebhooksCollection()
        this.billing = new BillingCollection()
        this.tokenUsage = new TokenUsageCollection()
        this.auditLogs = new AuditLogsCollection()
        this.adoptionAnalytics = new AdoptionAnalyticsCollection()
        this.providerStatus = new ProviderStatusCollection()
        this.scanProgress = new ScanProgressCollection()
        this.llmProviders = new LlmProvidersCollection()
        this.integrations = new IntegrationsCollection()
    }

    /**
     * Сбрасывает все коллекции в начальное пустое состояние.
     */
    public reset(): void {
        this.adminConfig.clear()
        this.auth.clear()
        this.contractValidation.clear()
        this.dashboard.clear()
        this.settings.clear()
        this.rules.clear()
        this.providers.clear()
        this.reviews.clear()
        this.repositories.clear()
        this.codeCity.clear()
        this.issues.clear()
        this.notifications.clear()
        this.reports.clear()
        this.teams.clear()
        this.organization.clear()
        this.triage.clear()
        this.byok.clear()
        this.sso.clear()
        this.jobs.clear()
        this.webhooks.clear()
        this.billing.clear()
        this.tokenUsage.clear()
        this.auditLogs.clear()
        this.adoptionAnalytics.clear()
        this.providerStatus.clear()
        this.scanProgress.clear()
        this.llmProviders.clear()
        this.integrations.clear()
    }
}
