import {
    type TTenantId,
    type TUiRole,
    UI_ROLE_PRIORITY,
    isTenantId,
    isUiRole,
} from "@/lib/access/access-types"
import { searchAccessibleRoutes } from "@/lib/navigation/route-guard-map"
import { TENANT_STORAGE_KEY } from "@/lib/sync/multi-tab-consistency"

import type { IAuthSession } from "./types"

/**
 * Нормализованный auth access для route guards.
 */
export interface IResolvedAuthAccess {
    readonly role: TUiRole
    readonly tenantId: TTenantId
}

/**
 * Приводит auth session к доверенному role/tenant контексту.
 *
 * @param session Активная auth session.
 * @returns Нормализованный доступ для route guards.
 */
export function resolveAuthAccess(session: IAuthSession): IResolvedAuthAccess {
    return {
        role: resolveAuthRole(session),
        tenantId: resolveAuthTenantId(session),
    }
}

/**
 * Возвращает роль пользователя из auth session.
 *
 * @param session Активная auth session.
 * @returns Нормализованная роль с безопасным fallback.
 */
export function resolveAuthRole(session: IAuthSession): TUiRole {
    if (isUiRole(session.user.role)) {
        return session.user.role
    }

    const roleCandidates = Array.isArray(session.user.roles) ? session.user.roles : []
    let highestRole: TUiRole = "viewer"
    for (const roleCandidate of roleCandidates) {
        if (isUiRole(roleCandidate) !== true) {
            continue
        }

        if (UI_ROLE_PRIORITY.indexOf(roleCandidate) > UI_ROLE_PRIORITY.indexOf(highestRole)) {
            highestRole = roleCandidate
        }
    }

    return highestRole
}

/**
 * Возвращает tenant пользователя из auth session или сохранённого workspace.
 *
 * @param session Активная auth session.
 * @returns Валидный tenant id.
 */
export function resolveAuthTenantId(session: IAuthSession): TTenantId {
    const storedTenantId = readStoredTenantId()
    if (storedTenantId !== undefined) {
        return storedTenantId
    }

    if (isTenantId(session.user.tenantId)) {
        return session.user.tenantId
    }

    return "platform-team"
}

/**
 * Читает сохранённый tenant id без выброса ошибок browser storage.
 *
 * @returns Tenant id из storage или undefined.
 */
export function readStoredTenantId(): TTenantId | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    try {
        const tenantId = window.localStorage.getItem(TENANT_STORAGE_KEY)
        if (isTenantId(tenantId)) {
            return tenantId
        }
    } catch {
        return undefined
    }

    return undefined
}

/**
 * Находит безопасный fallback route для авторизованного пользователя.
 *
 * @param access Нормализованный access context.
 * @param currentPath Текущий route path.
 * @returns Путь fallback route.
 */
export function resolveAccessibleRouteFallbackPath(
    access: IResolvedAuthAccess,
    currentPath: string,
): string | undefined {
    const accessibleRoute = searchAccessibleRoutes("", {
        isAuthenticated: true,
        role: access.role,
        tenantId: access.tenantId,
    }).find((route): boolean => route.path !== currentPath)

    if (accessibleRoute !== undefined) {
        return accessibleRoute.path
    }

    if (currentPath !== "/") {
        return "/"
    }

    return undefined
}
