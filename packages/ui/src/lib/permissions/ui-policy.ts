import { useEffect, useState } from "react"

import { isUiRole, type TUiRole } from "@/lib/access/access-types"
import { useAuthAccess } from "@/lib/auth/auth-access"

export type TUiActionId =
    | "review.decision"
    | "review.finish"
    | "team.create"
    | "team.invite"
    | "team.repo.assign"
    | "team.role.manage"

export type TUiActionVisibility = "disabled" | "enabled" | "hidden"

export interface IUiActionPolicy {
    /** Человекочитаемая причина ограничения. */
    readonly reason?: string
    /** Стратегия отображения action в UI. */
    readonly visibility: TUiActionVisibility
}

const UI_ROLE_STORAGE_KEY = "codenautic:rbac:role"

const DEFAULT_POLICY: Readonly<IUiActionPolicy> = {
    reason: "Action is unavailable for the current role policy.",
    visibility: "disabled",
}

const UI_POLICY_MATRIX: Readonly<Record<TUiRole, Readonly<Record<TUiActionId, IUiActionPolicy>>>> = {
    admin: {
        "review.decision": {
            visibility: "enabled",
        },
        "review.finish": {
            visibility: "enabled",
        },
        "team.create": {
            visibility: "enabled",
        },
        "team.invite": {
            visibility: "enabled",
        },
        "team.repo.assign": {
            visibility: "enabled",
        },
        "team.role.manage": {
            visibility: "enabled",
        },
    },
    developer: {
        "review.decision": {
            visibility: "enabled",
        },
        "review.finish": {
            visibility: "enabled",
        },
        "team.create": {
            reason: "Only admin can create or delete teams.",
            visibility: "disabled",
        },
        "team.invite": {
            reason: "Only lead or admin can invite team members.",
            visibility: "disabled",
        },
        "team.repo.assign": {
            reason: "Repository assignment requires lead or admin role.",
            visibility: "disabled",
        },
        "team.role.manage": {
            reason: "Role updates are restricted to lead and admin.",
            visibility: "hidden",
        },
    },
    lead: {
        "review.decision": {
            visibility: "enabled",
        },
        "review.finish": {
            visibility: "enabled",
        },
        "team.create": {
            reason: "Only admin can create or delete teams.",
            visibility: "disabled",
        },
        "team.invite": {
            visibility: "enabled",
        },
        "team.repo.assign": {
            visibility: "enabled",
        },
        "team.role.manage": {
            visibility: "enabled",
        },
    },
    viewer: {
        "review.decision": {
            reason: "Viewer can inspect review, but cannot approve or request changes.",
            visibility: "disabled",
        },
        "review.finish": {
            reason: "Viewer cannot finalize review actions.",
            visibility: "disabled",
        },
        "team.create": {
            reason: "Viewer has read-only access to team management.",
            visibility: "hidden",
        },
        "team.invite": {
            reason: "Viewer cannot invite members.",
            visibility: "disabled",
        },
        "team.repo.assign": {
            reason: "Viewer cannot change repository assignments.",
            visibility: "disabled",
        },
        "team.role.manage": {
            reason: "Viewer cannot update member roles.",
            visibility: "hidden",
        },
    },
}

/**
 * Возвращает безопасную fallback-роль вне защищённого дерева.
 *
 * @returns Базовая роль для текущего окружения.
 */
function resolveDefaultUiRole(): TUiRole {
    if (import.meta.env.MODE === "test") {
        return "admin"
    }

    return "viewer"
}

/**
 * Определяет, разрешён ли локальный role preview.
 *
 * @returns true только в dev/test или при явном env-флаге.
 */
export function isRolePreviewEnabled(): boolean {
    return (
        import.meta.env.DEV === true
        || import.meta.env.MODE === "test"
        || import.meta.env.VITE_ENABLE_ROLE_PREVIEW === "true"
    )
}

/**
 * Возвращает роль из localStorage для UI RBAC.
 *
 * @returns Текущая preview-роль или безопасный fallback.
 */
export function readUiRoleFromStorage(): TUiRole {
    const defaultRole = resolveDefaultUiRole()
    if (typeof window === "undefined" || isRolePreviewEnabled() !== true) {
        return defaultRole
    }

    let storedRole: string | null
    try {
        storedRole = window.localStorage.getItem(UI_ROLE_STORAGE_KEY)
    } catch {
        return defaultRole
    }

    if (isUiRole(storedRole)) {
        return storedRole
    }

    return defaultRole
}

/**
 * Сохраняет роль в localStorage и уведомляет подписчиков о смене policy.
 *
 * @param nextRole Следующая роль.
 */
export function writeUiRoleToStorage(nextRole: TUiRole): void {
    if (typeof window === "undefined" || isRolePreviewEnabled() !== true) {
        return
    }

    try {
        window.localStorage.setItem(UI_ROLE_STORAGE_KEY, nextRole)
    } catch {
        return
    }

    window.dispatchEvent(
        new CustomEvent("codenautic:rbac-role-changed", {
            detail: {
                role: nextRole,
            },
        }),
    )
}

/**
 * Возвращает policy для action в заданной роли.
 *
 * @param role Текущая роль.
 * @param actionId Идентификатор action.
 * @returns Решение RBAC для UI.
 */
export function getUiActionPolicy(role: TUiRole, actionId: TUiActionId): IUiActionPolicy {
    const rolePolicy = UI_POLICY_MATRIX[role]
    if (rolePolicy === undefined) {
        return DEFAULT_POLICY
    }

    return rolePolicy[actionId] ?? DEFAULT_POLICY
}

/**
 * Хук текущей UI-роли с синхронизацией через window events.
 *
 * @returns Активная роль для UI policy.
 */
export function useUiRole(): TUiRole {
    const authAccess = useAuthAccess()
    const [role, setRole] = useState<TUiRole>(() => {
        return authAccess?.role ?? readUiRoleFromStorage()
    })

    useEffect((): (() => void) | void => {
        if (authAccess !== undefined) {
            setRole(authAccess.role)
            return
        }

        if (typeof window === "undefined") {
            return
        }

        const handleRoleChanged = (): void => {
            setRole(readUiRoleFromStorage())
        }

        window.addEventListener("storage", handleRoleChanged)
        window.addEventListener("codenautic:rbac-role-changed", handleRoleChanged as EventListener)

        return (): void => {
            window.removeEventListener("storage", handleRoleChanged)
            window.removeEventListener(
                "codenautic:rbac-role-changed",
                handleRoleChanged as EventListener,
            )
        }
    }, [authAccess])

    return role
}

export type { TUiRole } from "@/lib/access/access-types"
