import { MockStore } from "./mock-store"
import {
    seedAdminConfig,
    seedAuth,
    seedBilling,
    seedByok,
    seedCodeCity,
    seedContractValidation,
    seedDashboard,
    seedIssues,
    seedJobs,
    seedNotifications,
    seedOrganization,
    seedProviders,
    seedReports,
    seedRepositories,
    seedReviews,
    seedRules,
    seedSettings,
    seedSso,
    seedTeams,
    seedTriage,
    seedWebhooks,
    seedTokenUsage,
    seedAuditLogs,
    seedAdoptionAnalytics,
    seedProviderStatus,
    seedScanProgress,
    seedLlmProviders,
    seedIntegrations,
} from "./seed"

/**
 * Singleton-экземпляр MockStore.
 */
let instance: MockStore | undefined

/**
 * Создаёт новый MockStore и заполняет его seed-данными.
 *
 * Каждый вызов создаёт свежий экземпляр (не singleton).
 * Для singleton-доступа используй getMockStore().
 *
 * @returns Новый заполненный MockStore.
 */
export function createMockStore(): MockStore {
    const store = new MockStore()
    seedAdminConfig(store.adminConfig)
    seedAuth(store.auth)
    seedContractValidation(store.contractValidation)
    seedDashboard(store.dashboard)
    seedSettings(store.settings)
    seedRules(store.rules)
    seedProviders(store.providers)
    seedReviews(store.reviews)
    seedRepositories(store.repositories)
    seedCodeCity(store.codeCity)
    seedIssues(store.issues)
    seedNotifications(store.notifications)
    seedReports(store.reports)
    seedTeams(store.teams)
    seedOrganization(store.organization)
    seedTriage(store.triage)
    seedByok(store.byok)
    seedSso(store.sso)
    seedJobs(store.jobs)
    seedWebhooks(store.webhooks)
    seedBilling(store.billing)
    seedTokenUsage(store.tokenUsage)
    seedAuditLogs(store.auditLogs)
    seedAdoptionAnalytics(store.adoptionAnalytics)
    seedProviderStatus(store.providerStatus)
    seedScanProgress(store.scanProgress)
    seedLlmProviders(store.llmProviders)
    seedIntegrations(store.integrations)
    return store
}

/**
 * Возвращает singleton-экземпляр MockStore.
 *
 * При первом вызове создаёт и заполняет store seed-данными.
 * Последующие вызовы возвращают тот же экземпляр.
 *
 * @returns Singleton MockStore.
 */
export function getMockStore(): MockStore {
    if (instance === undefined) {
        instance = createMockStore()
    }
    return instance
}

/**
 * Сбрасывает singleton MockStore в начальное состояние с seed-данными.
 *
 * Полезно для изоляции тестов: вызывается в beforeEach/afterEach.
 * Если singleton ещё не создан, ничего не делает.
 */
export function resetMockStore(): void {
    if (instance !== undefined) {
        instance.reset()
        seedAdminConfig(instance.adminConfig)
        seedAuth(instance.auth)
        seedContractValidation(instance.contractValidation)
        seedDashboard(instance.dashboard)
        seedSettings(instance.settings)
        seedRules(instance.rules)
        seedProviders(instance.providers)
        seedReviews(instance.reviews)
        seedRepositories(instance.repositories)
        seedCodeCity(instance.codeCity)
        seedIssues(instance.issues)
        seedNotifications(instance.notifications)
        seedReports(instance.reports)
        seedTeams(instance.teams)
        seedOrganization(instance.organization)
        seedTriage(instance.triage)
        seedByok(instance.byok)
        seedSso(instance.sso)
        seedJobs(instance.jobs)
        seedWebhooks(instance.webhooks)
        seedBilling(instance.billing)
        seedTokenUsage(instance.tokenUsage)
        seedAuditLogs(instance.auditLogs)
        seedAdoptionAnalytics(instance.adoptionAnalytics)
        seedProviderStatus(instance.providerStatus)
        seedScanProgress(instance.scanProgress)
        seedLlmProviders(instance.llmProviders)
        seedIntegrations(instance.integrations)
    }
}
