import { AdminConfigCollection } from "./collections/admin-config-collection"
import { AuthCollection } from "./collections/auth-collection"
import { ByokCollection } from "./collections/byok-collection"
import { CodeCityCollection } from "./collections/code-city-collection"
import { ContractValidationCollection } from "./collections/contract-validation-collection"
import { DashboardCollection } from "./collections/dashboard-collection"
import { IssuesCollection } from "./collections/issues-collection"
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
    }
}
