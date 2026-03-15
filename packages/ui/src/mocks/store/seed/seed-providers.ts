import type { IGitProviderConnection } from "@/lib/api/endpoints/git-providers.endpoint"
import type {
    IExternalContextPreviewItem,
    IExternalContextSource,
} from "@/lib/api/endpoints/external-context.endpoint"

import type { ProvidersCollection } from "../collections/providers-collection"

/**
 * Начальный набор Git provider соединений.
 *
 * GitHub и GitLab подключены, Azure DevOps и Bitbucket отключены.
 */
const SEED_GIT_PROVIDERS: ReadonlyArray<IGitProviderConnection> = [
    {
        id: "gp-github",
        provider: "GitHub",
        account: "codenautic",
        connected: true,
        status: "CONNECTED",
        isKeySet: true,
        lastSyncAt: "2026-03-14T18:30:00.000Z",
    },
    {
        id: "gp-gitlab",
        provider: "GitLab",
        account: "codenautic-team",
        connected: true,
        status: "CONNECTED",
        isKeySet: true,
        lastSyncAt: "2026-03-14T16:00:00.000Z",
    },
    {
        id: "gp-azure",
        provider: "Azure DevOps",
        connected: false,
        status: "DISCONNECTED",
        isKeySet: false,
    },
    {
        id: "gp-bitbucket",
        provider: "Bitbucket",
        connected: false,
        status: "DISCONNECTED",
        isKeySet: false,
    },
]

/**
 * Начальный набор context sources.
 *
 * JIRA подключена с 38 элементами, Sentry в состоянии degraded с 12 элементами.
 */
const SEED_CONTEXT_SOURCES: ReadonlyArray<IExternalContextSource> = [
    {
        id: "ctx-jira",
        name: "JIRA",
        type: "JIRA",
        status: "CONNECTED",
        enabled: true,
        itemCount: 38,
        lastSyncedAt: "2026-03-14T20:00:00.000Z",
    },
    {
        id: "ctx-sentry",
        name: "Sentry",
        type: "SENTRY",
        status: "DEGRADED",
        enabled: true,
        itemCount: 12,
        lastSyncedAt: "2026-03-13T10:00:00.000Z",
    },
]

/**
 * Preview-данные для JIRA context source.
 */
const JIRA_PREVIEW_ITEMS: ReadonlyArray<IExternalContextPreviewItem> = [
    {
        id: "jira-001",
        title: "CN-142: Implement review pipeline retry logic",
        excerpt: "Add retry mechanism for failed pipeline stages with exponential backoff...",
        url: "https://codenautic.atlassian.net/browse/CN-142",
        updatedAt: "2026-03-14T15:30:00.000Z",
    },
    {
        id: "jira-002",
        title: "CN-158: SafeGuard hallucination filter tuning",
        excerpt: "Reduce false positive rate for hallucination detection from 8% to under 3%...",
        url: "https://codenautic.atlassian.net/browse/CN-158",
        updatedAt: "2026-03-14T12:00:00.000Z",
    },
    {
        id: "jira-003",
        title: "CN-171: Add Azure DevOps Git provider",
        excerpt: "Implement ACL adapter for Azure DevOps REST API including PR webhooks...",
        url: "https://codenautic.atlassian.net/browse/CN-171",
        updatedAt: "2026-03-13T09:45:00.000Z",
    },
]

/**
 * Preview-данные для Sentry context source.
 */
const SENTRY_PREVIEW_ITEMS: ReadonlyArray<IExternalContextPreviewItem> = [
    {
        id: "sentry-001",
        title: "TypeError: Cannot read property 'score' of undefined",
        excerpt: "Occurs in RiskScoreCalculator.calculate() when review has no suggestions...",
        url: "https://sentry.io/organizations/codenautic/issues/48291/",
        updatedAt: "2026-03-14T08:00:00.000Z",
    },
    {
        id: "sentry-002",
        title: "TimeoutError: LLM request exceeded 30s limit",
        excerpt: "Anthropic API calls timing out during peak hours, affecting review pipeline...",
        url: "https://sentry.io/organizations/codenautic/issues/48305/",
        updatedAt: "2026-03-13T22:15:00.000Z",
    },
]

/**
 * Заполняет providers-коллекцию начальным набором данных.
 *
 * Загружает Git providers, context sources и preview-элементы.
 *
 * @param providers - Коллекция провайдеров для заполнения.
 */
export function seedProviders(providers: ProvidersCollection): void {
    providers.seed({
        gitProviders: SEED_GIT_PROVIDERS,
        contextSources: SEED_CONTEXT_SOURCES,
        contextPreviews: {
            "ctx-jira": JIRA_PREVIEW_ITEMS,
            "ctx-sentry": SENTRY_PREVIEW_ITEMS,
        },
    })
}
