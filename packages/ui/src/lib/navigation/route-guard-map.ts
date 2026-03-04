import type { TUiRole } from "@/lib/permissions/ui-policy"

export type TTenantId = "frontend-team" | "platform-team" | "runtime-team"

export interface IRouteGuardContext {
    /** Аутентифицирован ли пользователь. */
    readonly isAuthenticated: boolean
    /** Активная роль пользователя в UI. */
    readonly role: TUiRole
    /** Активный tenant/workspace. */
    readonly tenantId: TTenantId
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
