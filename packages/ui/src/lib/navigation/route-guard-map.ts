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
    /** Breadcrumb trail для route. */
    readonly breadcrumbs: ReadonlyArray<string>
    /** Метка для quick navigation. */
    readonly label: string
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
 */
export const ROUTE_GUARD_MAP: ReadonlyArray<INavigationRouteEntry> = [
    {
        breadcrumbs: ["Authentication", "Login"],
        guards: {
            requiresAuth: false,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Login",
        path: "/login",
        searchKeywords: ["login", "auth", "session"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Dashboard",
        path: "/",
        searchKeywords: ["home", "overview", "landing"],
        section: "dashboard",
    },
    {
        breadcrumbs: ["Dashboard", "System Health"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "System health",
        path: "/system-health",
        searchKeywords: ["system", "health", "status", "uptime"],
        section: "dashboard",
    },
    {
        breadcrumbs: ["Dashboard", "My Work"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "My Work",
        path: "/my-work",
        searchKeywords: ["triage", "inbox", "assigned", "work queue"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Onboarding"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Repository onboarding",
        path: "/onboarding",
        searchKeywords: ["connect repository", "wizard", "scan"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Scan progress"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Scan progress",
        path: "/scan-progress",
        searchKeywords: ["scan", "pipeline", "progress", "jobs"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Scan error recovery"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Scan error recovery",
        path: "/scan-error-recovery",
        searchKeywords: ["scan", "recovery", "retry", "failure"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Repositories"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Repositories",
        path: "/repositories",
        searchKeywords: ["repositories", "overview", "owner", "catalog"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Reviews"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "CCR Reviews",
        path: "/reviews",
        searchKeywords: ["ccr", "code review", "triage"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Issues"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Issues tracking",
        path: "/issues",
        searchKeywords: ["issues", "severity", "status", "triage"],
        section: "workflows",
    },
    {
        breadcrumbs: ["Dashboard", "Help & diagnostics"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Help and diagnostics",
        path: "/help-diagnostics",
        searchKeywords: ["help", "diagnostics", "support", "runbook"],
        section: "settings",
    },
    {
        breadcrumbs: ["Dashboard", "Session recovery"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Session recovery flow",
        path: "/session-recovery",
        searchKeywords: ["session", "recovery", "auth", "re-login"],
        section: "settings",
    },
    {
        breadcrumbs: ["Dashboard", "Code City"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Code City",
        path: "/dashboard/code-city",
        searchKeywords: ["code city", "architecture", "graph"],
        section: "dashboard",
    },
    {
        breadcrumbs: ["Dashboard", "Reports"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Reports workspace",
        path: "/reports",
        searchKeywords: ["reports", "analytics", "generated", "history"],
        section: "analytics",
    },
    {
        breadcrumbs: ["Dashboard", "Reports", "Generator"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Report generator",
        path: "/reports/generate",
        searchKeywords: ["reports", "generate", "schedule", "template"],
        section: "analytics",
    },
    {
        breadcrumbs: ["Dashboard", "Reports", "Viewer"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Report viewer",
        path: "/reports/viewer",
        searchKeywords: ["reports", "viewer", "export", "share"],
        section: "analytics",
    },
    {
        breadcrumbs: ["Settings"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Settings home",
        path: "/settings",
        searchKeywords: ["preferences", "configuration"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Appearance"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: ["frontend-team", "platform-team"],
        },
        label: "Appearance settings",
        path: "/settings-appearance",
        searchKeywords: ["theme", "palette", "ui"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Notifications"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Notification center",
        path: "/settings-notifications",
        searchKeywords: ["inbox", "delivery", "alerts"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Code Review"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["frontend-team", "platform-team"],
        },
        label: "Code review settings",
        path: "/settings-code-review",
        searchKeywords: ["policy", "rules", "severity"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "LLM Providers"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "LLM providers",
        path: "/settings-llm-providers",
        searchKeywords: ["llm", "models", "provider", "connection"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Git Providers"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Git providers",
        path: "/settings-git-providers",
        searchKeywords: ["git", "github", "gitlab", "bitbucket"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Integrations"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        label: "Integrations",
        path: "/settings-integrations",
        searchKeywords: ["jira", "linear", "sentry", "slack"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Webhooks"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        label: "Webhooks",
        path: "/settings-webhooks",
        searchKeywords: ["events", "delivery", "secret"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Rules Library"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Rules library",
        path: "/settings-rules-library",
        searchKeywords: ["rules", "library", "custom", "policy"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Audit Logs"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Audit logs",
        path: "/settings-audit-logs",
        searchKeywords: ["audit", "history", "actor", "events"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Contract Validation"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Contract validation",
        path: "/settings-contract-validation",
        searchKeywords: ["contracts", "drift", "validation", "import/export"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Privacy Export"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Privacy redaction",
        path: "/settings-privacy-redaction",
        searchKeywords: ["privacy", "redaction", "export", "pii"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Provider Degradation"],
        guards: {
            requiresAuth: true,
            roles: BASE_ROLES,
            tenants: BASE_TENANTS,
        },
        label: "Provider degradation",
        path: "/settings-provider-degradation",
        searchKeywords: ["degradation", "outage", "fallback", "provider"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Concurrency"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Concurrency resolver",
        path: "/settings-concurrency",
        searchKeywords: ["concurrency", "conflicts", "merge", "retry"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Jobs"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "Jobs monitor",
        path: "/settings-jobs",
        searchKeywords: ["jobs", "workers", "queues", "operations"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Billing"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        label: "Billing lifecycle",
        path: "/settings-billing",
        searchKeywords: ["billing", "plan", "entitlement", "trial"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Organization"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        label: "Organization settings",
        path: "/settings-organization",
        searchKeywords: ["billing", "members", "org"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "SSO"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["platform-team"],
        },
        label: "SSO management",
        path: "/settings-sso",
        searchKeywords: ["sso", "saml", "oidc", "identity"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "BYOK"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: BASE_TENANTS,
        },
        label: "BYOK settings",
        path: "/settings-byok",
        searchKeywords: ["byok", "keys", "api key", "credentials"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Team"],
        guards: {
            requiresAuth: true,
            roles: ["developer", "lead", "admin"],
            tenants: ["platform-team"],
        },
        label: "Team management",
        path: "/settings-team",
        searchKeywords: ["invite", "members", "roles"],
        section: "settings",
    },
    {
        breadcrumbs: ["Settings", "Token usage"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        label: "Token usage",
        path: "/settings-token-usage",
        searchKeywords: ["cost", "models", "usage"],
        section: "analytics",
    },
    {
        breadcrumbs: ["Settings", "Adoption analytics"],
        guards: {
            requiresAuth: true,
            roles: ["lead", "admin"],
            tenants: ["runtime-team", "platform-team"],
        },
        label: "Adoption analytics",
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
 * Возвращает breadcrumbs для текущего маршрута.
 *
 * @param pathname Текущий pathname.
 * @returns Хлебные крошки для route.
 */
export function getBreadcrumbs(pathname: string): ReadonlyArray<string> {
    const route = resolveRoute(pathname)
    if (route === undefined) {
        return ["Dashboard", "Unknown route"]
    }

    return route.breadcrumbs
}

/**
 * Маппинг корневых breadcrumb-меток на пути для первого уровня навигации.
 */
const BREADCRUMB_ROOT_PATH_MAP: Readonly<Record<string, string>> = {
    Dashboard: "/",
    Settings: "/settings",
}

/**
 * Возвращает breadcrumbs с навигационными путями для кликабельного рендеринга.
 * Последний сегмент не имеет пути (текущая страница).
 * Промежуточные сегменты резолвятся из route map.
 *
 * @param pathname Текущий pathname.
 * @returns Сегменты breadcrumb с опциональными путями.
 */
export function getBreadcrumbsWithPaths(
    pathname: string,
): ReadonlyArray<IBreadcrumbSegment> {
    const route = resolveRoute(pathname)
    if (route === undefined) {
        return [{ label: "Dashboard", path: "/" }, { label: "Unknown route" }]
    }

    return route.breadcrumbs.map(
        (label, index): IBreadcrumbSegment => {
            const isLast = index === route.breadcrumbs.length - 1
            if (isLast) {
                return { label }
            }

            const rootPath = BREADCRUMB_ROOT_PATH_MAP[label]
            if (rootPath !== undefined) {
                return { label, path: rootPath }
            }

            const partialBreadcrumbs = route.breadcrumbs.slice(0, index + 1)
            const parentRoute = ROUTE_GUARD_MAP.find((candidate): boolean => {
                return (
                    candidate.breadcrumbs.length === partialBreadcrumbs.length &&
                    candidate.breadcrumbs.every(
                        (crumb, crumbIndex): boolean =>
                            crumb === partialBreadcrumbs[crumbIndex],
                    )
                )
            })

            if (parentRoute !== undefined) {
                return { label, path: parentRoute.path }
            }

            return { label }
        },
    )
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

        const haystack = [route.label, route.path, ...route.searchKeywords].join(" ").toLowerCase()
        return haystack.includes(normalizedQuery)
    })
}
