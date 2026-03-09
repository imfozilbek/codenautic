import { useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"

import { createApiContracts } from "@/lib/api"
import {
    PERMISSION_KEYS,
    type IPermissionsResponse,
    type TPermissionKey,
} from "@/lib/permissions/permissions"
import { queryKeys } from "@/lib/query/query-keys"

const api = createApiContracts()

/** Опции хука для получения permissions. */
export interface IUsePermissionsQueryArgs {
    /** Роли текущего пользователя (будет нормализовано в key). */
    readonly roles?: ReadonlyArray<string>
    /** Явный ключ роли для кэша и трассировки запроса. */
    readonly roleKey?: string
    /** Принудительно отключить запрос. */
    readonly enabled?: boolean
}

/** Нормализованный state для проверки разрешений. */
export type IPermissionsQueryState = Pick<
    UseQueryResult<IPermissionsResponse, Error>,
    "data" | "error" | "isPending"
>

/**
 * Результат `usePermissionsQuery` hook.
 */
export interface IUsePermissionsQueryResult {
    /** Query-результат с permissions. */
    readonly permissionsQuery: UseQueryResult<IPermissionsResponse, Error>
}

/**
 * Проверяет, выдаётся ли конкретное разрешение.
 *
 * @param state State из usePermissionsQuery.
 * @param permissionName Ключ разрешения.
 * @returns true если permission есть в списке и запрос успешно завершён.
 */
export function isPermissionEnabled(
    state: IPermissionsQueryState,
    permissionName: TPermissionKey,
): boolean {
    if (state.isPending === true) {
        return false
    }

    if (state.error !== null) {
        return false
    }

    return state.data?.permissions.includes(permissionName) === true
}

/**
 * Нормализует массив ролей в стабильный cache key.
 *
 * @param roles Массив ролей пользователя.
 * @returns Нормализованная строка для query key.
 */
function normalizeRoleKey(roles: ReadonlyArray<string>): string {
    if (roles.length === 0) {
        return "anonymous"
    }

    const normalized = Array.from(
        new Set(
            roles
                .map((role): string => role.trim().toLowerCase())
                .filter((role): boolean => role.length > 0),
        ),
    ).sort()

    if (normalized.length === 0) {
        return "anonymous"
    }

    return normalized.join("|")
}

/**
 * Возвращает permissions для текущего ролевого контекста.
 *
 * @param args Настройки запроса.
 * @returns React Query результат permissions.
 */
export function usePermissionsQuery(
    args: IUsePermissionsQueryArgs = {},
): IUsePermissionsQueryResult {
    const { roles = [], enabled = true, roleKey } = args
    const queryClient = useQueryClient()
    const resolvedRoleKey = useMemo((): string => {
        if (roleKey !== undefined) {
            return roleKey
        }
        return normalizeRoleKey(roles)
    }, [roleKey, roles])
    const previousRoleKeyRef = useRef<string>(resolvedRoleKey)

    useEffect((): void => {
        if (previousRoleKeyRef.current === resolvedRoleKey) {
            return
        }

        void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() })
        previousRoleKeyRef.current = resolvedRoleKey
    }, [queryClient, resolvedRoleKey])

    const permissionsQuery = useQuery({
        queryKey: queryKeys.permissions.byRole(resolvedRoleKey),
        queryFn: async (): Promise<IPermissionsResponse> => {
            return api.permissions.getPermissions(resolvedRoleKey)
        },
        enabled,
        refetchOnMount: false,
    })

    return {
        permissionsQuery,
    }
}

/**
 * Набор часто используемых базовых прав для удобства.
 */
export const DEFAULT_ADMIN_PERMISSIONS = [
    PERMISSION_KEYS.reviewRead,
    PERMISSION_KEYS.reviewWrite,
    PERMISSION_KEYS.settingsRead,
    PERMISSION_KEYS.settingsWrite,
] as const
