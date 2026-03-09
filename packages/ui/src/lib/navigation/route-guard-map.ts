import type { TFunction } from "i18next"

import type { TTenantId, TUiRole } from "@/lib/access/access-types"

export type { TTenantId } from "@/lib/access/access-types"

export interface IRouteGuardContext {
    /** Аутентифицирован ли пользователь. */
    readonly isAuthenticated: boolean
    /** Активная роль пользователя в UI. */
    readonly role: TUiRole
    /** Активный tenant/workspace. */
    readonly tenantId: TTenantId
}

/**
 * Сегмент breadcrumb с опциональным путём для навигации.
 */
export interface IBreadcrumbSegment {
    /** Отображаемая метка сегмента. */
    readonly label: string
    /** Путь навигации. Undefined для текущего (последнего) сегмента. */
    readonly path?: string
}

export interface INavigationRouteEntry {
    /** Ключи breadcrumb-сегментов (части ключей `navigation:breadcrumb.*`). */
    readonly breadcrumbKeys: ReadonlyArray<string>
    /** Ключ метки маршрута (часть ключа `navigation:routeLabel.*`). */
    readonly labelKey: string
    /** Путь маршрута. */
    readonly path: string
    /** Дополнительные поисковые ключи. */
    readonly searchKeywords: ReadonlyArray<string>
    /** Секция route tree. */
    readonly section: "analytics" | "dashboard" | "settings" | "workflows"
    /** Ограничения доступа. */
    readonly guards: {
        readonly requiresAuth: boolean
        readonly roles: ReadonlyArray<TUiRole>
        readonly tenants: ReadonlyArray<TTenantId>
    }
}

const BASE_ROLES: ReadonlyArray<TUiRole> = ["viewer", "developer", "lead", "admin"]
const BASE_TENANTS: ReadonlyArray<TTenantId> = ["platform-team", "frontend-team", "runtime-team"]

/**
 * Формализованный route tree с guard matrix для desktop/mobile навигации.
 * Breadcrumb и label хранятся как i18n-ключи (`navigation:breadcrumb.*`, `navigation:routeLabel.*`).
 */
export const ROUTE_GUARD_MAP: ReadonlyArray<INavigationRouteEntry> = [
    {
        breadcrumbKeys: ["authentication", "login"],
        guards: {
            requiresAuth: false,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "login",
        path: "/login",
        searchKeywords: ["login", "auth", "session"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "dashboard",
        path: "/",
        searchKeywords: ["home", "overview", "landing"],
        section: "dashboard",
    },
    {
        breadcrumbKeys: ["dashboard", "systemHealth"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "systemHealth",
        path: "/system-health",
        searchKeywords: ["system", "health", "status", "uptime"],
        section: "dashboard",
    },
    {
        breadcrumbKeys: ["dashboard", "myWork"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "myWork",
        path: "/my-work",
        searchKeywords: ["triage", "inbox", "assigned", "work queue"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "onboarding"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "repositoryOnboarding",
        path: "/onboarding",
        searchKeywords: ["connect repository", "wizard", "scan"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "scanProgress"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "scanProgress",
        path: "/scan-progress",
        searchKeywords: ["scan", "pipeline", "progress", "jobs"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "scanErrorRecovery"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "scanErrorRecovery",
        path: "/scan-error-recovery",
        searchKeywords: ["scan", "recovery", "retry", "failure"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "repositories"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "repositories",
        path: "/repositories",
        searchKeywords: ["repositories", "overview", "owner", "catalog"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "ccrReviews"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "ccrReviews",
        path: "/reviews",
        searchKeywords: ["ccr", "code review", "triage"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "issuesTracking"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "issuesTracking",
        path: "/issues",
        searchKeywords: ["issues", "severity", "status", "triage"],
        section: "workflows",
    },
    {
        breadcrumbKeys: ["dashboard", "helpDiagnostics"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "helpAndDiagnostics",
        path: "/help-diagnostics",
        searchKeywords: ["help", "diagnostics", "support", "runbook"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["dashboard", "sessionRecovery"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "sessionRecoveryFlow",
        path: "/session-recovery",
        searchKeywords: ["session", "recovery", "auth", "re-login"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["dashboard", "codeCity"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "codeCity",
        path: "/dashboard/code-city",
        searchKeywords: ["code city", "architecture", "graph"],
        section: "dashboard",
    },
    {
        breadcrumbKeys: ["dashboard", "reports"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "reportsWorkspace",
        path: "/reports",
        searchKeywords: ["reports", "analytics", "generated", "history"],
        section: "analytics",
    },
    {
        breadcrumbKeys: ["dashboard", "reports", "generator"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "reportGenerator",
        path: "/reports/generate",
        searchKeywords: ["reports", "generate", "schedule", "template"],
        section: "analytics",
    },
    {
        breadcrumbKeys: ["dashboard", "reports", "viewer"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "reportViewer",
        path: "/reports/viewer",
        searchKeywords: ["reports", "viewer", "export", "share"],
        section: "analytics",
    },
    {
        breadcrumbKeys: ["settings"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "settingsHome",
        path: "/settings",
        searchKeywords: ["preferences", "configuration"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "appearance"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: ["frontend-team", "platform-team"],
        },
        labelKey: "appearanceSettings",
        path: "/settings-appearance",
        searchKeywords: ["theme", "palette", "ui"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "notifications"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "notificationCenter",
        path: "/settings-notifications",
        searchKeywords: ["inbox", "delivery", "alerts"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "codeReview"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["frontend-team", "platform-team"],
        },
        labelKey: "codeReviewSettings",
        path: "/settings-code-review",
        searchKeywords: ["policy", "rules", "severity"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "llmProviders"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "llmProviders",
        path: "/settings-llm-providers",
        searchKeywords: ["llm", "models", "provider", "connection"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "gitProviders"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "gitProviders",
        path: "/settings-git-providers",
        searchKeywords: ["git", "github", "gitlab", "bitbucket"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "integrations"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        labelKey: "integrations",
        path: "/settings-integrations",
        searchKeywords: ["jira", "linear", "sentry", "slack"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "webhooks"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        labelKey: "webhooks",
        path: "/settings-webhooks",
        searchKeywords: ["events", "delivery", "secret"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "rulesLibrary"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "rulesLibrary",
        path: "/settings-rules-library",
        searchKeywords: ["rules", "library", "custom", "policy"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "auditLogs"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "auditLogs",
        path: "/settings-audit-logs",
        searchKeywords: ["audit", "history", "actor", "events"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "contractValidation"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "contractValidation",
        path: "/settings-contract-validation",
        searchKeywords: ["contracts", "drift", "validation", "import/export"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "privacyExport"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "privacyRedaction",
        path: "/settings-privacy-redaction",
        searchKeywords: ["privacy", "redaction", "export", "pii"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "providerDegradation"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        labelKey: "providerDegradation",
        path: "/settings-provider-degradation",
        searchKeywords: ["degradation", "outage", "fallback", "provider"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "concurrency"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "concurrencyResolver",
        path: "/settings-concurrency",
        searchKeywords: ["concurrency", "conflicts", "merge", "retry"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "jobs"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "jobsMonitor",
        path: "/settings-jobs",
        searchKeywords: ["jobs", "workers", "queues", "operations"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "billing"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        labelKey: "billingLifecycle",
        path: "/settings-billing",
        searchKeywords: ["billing", "plan", "entitlement", "trial"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "organization"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        labelKey: "organizationSettings",
        path: "/settings-organization",
        searchKeywords: ["billing", "members", "org"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "sso"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        labelKey: "ssoManagement",
        path: "/settings-sso",
        searchKeywords: ["sso", "saml", "oidc", "identity"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "byok"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: BASE_TENANTS,
        },
        labelKey: "byokSettings",
        path: "/settings-byok",
        searchKeywords: ["byok", "keys", "api key", "credentials"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "team"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["platform-team"],
        },
        labelKey: "teamManagement",
        path: "/settings-team",
        searchKeywords: ["invite", "members", "roles"],
        section: "settings",
    },
    {
        breadcrumbKeys: ["settings", "tokenUsage"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        labelKey: "tokenUsage",
        path: "/settings-token-usage",
        searchKeywords: ["cost", "models", "usage"],
        section: "analytics",
    },
    {
        breadcrumbKeys: ["settings", "adoptionAnalytics"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        labelKey: "adoptionAnalytics",
        path: "/settings-adoption-analytics",
        searchKeywords: ["adoption", "funnel", "ttfv", "analytics"],
        section: "analytics",
    },
]

function normalizePathname(pathname: string): string {
    const withoutQuery = pathname.split("?")[0] ?? pathname
    const withoutHash = withoutQuery.split("#")[0] ?? withoutQuery
    if (withoutHash.length === 0) {
        return "/"
    }

    if (withoutHash !== "/" && withoutHash.endsWith("/")) {
        return withoutHash.slice(0, -1)
    }

    return withoutHash
}

function resolveRoute(pathname: string): INavigationRouteEntry | undefined {
    const normalizedPathname = normalizePathname(pathname)

    const exactRoute = ROUTE_GUARD_MAP.find((route): boolean => route.path === normalizedPathname)
    if (exactRoute !== undefined) {
        return exactRoute
    }

    return ROUTE_GUARD_MAP.find((route): boolean => {
        return normalizedPathname.startsWith(`${route.path}/`)
    })
}

/**
 * Вызывает t() с динамически построенным ключом.
 * Динамические ключи не резолвятся через CustomTypeOptions — приводим через unknown.
 *
 * @param fullKey Полный i18n-ключ (например `navigation:breadcrumb.dashboard`).
 * @param t Функция перевода.
 * @returns Переведённая строка.
 */
function translateDynamicKey(
    fullKey: string,
    t: TFunction<ReadonlyArray<"navigation">>,
): string {
     
    return (t as unknown as (key: string) => string)(fullKey)
}

/**
 * Резолвит ключ breadcrumb-сегмента через функцию перевода.
 *
 * @param key Ключ breadcrumb-сегмента.
 * @param t Функция перевода.
 * @returns Переведённая метка.
 */
function translateBreadcrumbKey(
    key: string,
    t: TFunction<ReadonlyArray<"navigation">>,
): string {
    return translateDynamicKey(`navigation:breadcrumb.${key}`, t)
}

/**
 * Резолвит ключ метки маршрута через функцию перевода.
 *
 * @param key Ключ метки маршрута.
 * @param t Функция перевода.
 * @returns Переведённая метка.
 */
export function translateRouteLabelKey(
    key: string,
    t: TFunction<ReadonlyArray<"navigation">>,
): string {
    return translateDynamicKey(`navigation:routeLabel.${key}`, t)
}

/**
 * Маппинг корневых breadcrumb-ключей на пути для первого уровня навигации.
 */
const BREADCRUMB_ROOT_PATH_MAP: Readonly<Record<string, string>> = {
    dashboard: "/",
    settings: "/settings",
}

/**
 * Возвращает breadcrumbs для текущего маршрута.
 *
 * @param pathname Текущий pathname.
 * @param t Функция перевода.
 * @returns Переведённые хлебные крошки для route.
 */
export function getBreadcrumbs(
    pathname: string,
    t: TFunction<ReadonlyArray<"navigation">>,
): ReadonlyArray<string> {
    const route = resolveRoute(pathname)
    if (route === undefined) {
        return [
            translateBreadcrumbKey("dashboard", t),
            translateBreadcrumbKey("unknownRoute", t),
        ]
    }

    return route.breadcrumbKeys.map((key): string => translateBreadcrumbKey(key, t))
}

/**
 * Возвращает breadcrumbs с навигационными путями для кликабельного рендеринга.
 * Последний сегмент не имеет пути (текущая страница).
 * Промежуточные сегменты резолвятся из route map.
 *
 * @param pathname Текущий pathname.
 * @param t Функция перевода.
 * @returns Сегменты breadcrumb с опциональными путями.
 */
export function getBreadcrumbsWithPaths(
    pathname: string,
    t: TFunction<ReadonlyArray<"navigation">>,
): ReadonlyArray<IBreadcrumbSegment> {
    const route = resolveRoute(pathname)
    if (route === undefined) {
        return [
            { label: translateBreadcrumbKey("dashboard", t), path: "/" },
            { label: translateBreadcrumbKey("unknownRoute", t) },
        ]
    }

    return route.breadcrumbKeys.map((key, index): IBreadcrumbSegment => {
        const label = translateBreadcrumbKey(key, t)
        const isLast = index === route.breadcrumbKeys.length - 1
        if (isLast) {
            return { label }
        }

        const rootPath = BREADCRUMB_ROOT_PATH_MAP[key]
        if (rootPath !== undefined) {
            return { label, path: rootPath }
        }

        const partialKeys = route.breadcrumbKeys.slice(0, index + 1)
        const parentRoute = ROUTE_GUARD_MAP.find((candidate): boolean => {
            return (
                candidate.breadcrumbKeys.length === partialKeys.length &&
                candidate.breadcrumbKeys.every(
                    (crumb, crumbIndex): boolean => crumb === partialKeys[crumbIndex],
                )
            )
        })

        if (parentRoute !== undefined) {
            return { label, path: parentRoute.path }
        }

        return { label }
    })
}

/**
 * Проверяет доступность route с учётом guard matrix.
 *
 * @param pathname Целевой pathname.
 * @param context Контекст пользователя.
 * @returns true если navigation разрешена.
 */
export function isRouteAccessible(pathname: string, context: IRouteGuardContext): boolean {
    const route = resolveRoute(pathname)
    if (route === undefined) {
        return false
    }

    if (route.guards.requiresAuth === true && context.isAuthenticated !== true) {
        return false
    }

    if (route.guards.roles.includes(context.role) !== true) {
        return false
    }

    if (route.guards.tenants.includes(context.tenantId) !== true) {
        return false
    }

    return true
}

/**
 * Возвращает список доступных маршрутов для global quick navigation.
 *
 * @param query Поисковая строка.
 * @param context Контекст пользователя.
 * @returns Список routes в пределах прав пользователя.
 */
export function searchAccessibleRoutes(
    query: string,
    context: IRouteGuardContext,
): ReadonlyArray<INavigationRouteEntry> {
    const normalizedQuery = query.trim().toLowerCase()

    return ROUTE_GUARD_MAP.filter((route): boolean => {
        if (context.isAuthenticated === true && route.path === "/login") {
            return false
        }

        if (isRouteAccessible(route.path, context) !== true) {
            return false
        }

        if (normalizedQuery.length === 0) {
            return true
        }

        const haystack = [route.labelKey, route.path, ...route.searchKeywords]
            .join(" ")
            .toLowerCase()
        return haystack.includes(normalizedQuery)
    })
}
