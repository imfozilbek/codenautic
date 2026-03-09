import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { type TTenantId, isTenantId } from "@/lib/access/access-types"
import {
    MULTI_TAB_SYNC_CHANNEL,
    TENANT_STORAGE_KEY,
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    isMultiTabSyncMessage,
} from "@/lib/sync/multi-tab-consistency"
import { queryKeys } from "@/lib/query/query-keys"

/**
 * Результат хука синхронизации между вкладками.
 */
export interface IMultiTabSyncResult {
    /** Уведомление о синхронизации из другой вкладки (undefined если нет). */
    readonly multiTabNotice: string | undefined
}

/**
 * Синхронизирует состояние tenant, permissions и theme между вкладками
 * через BroadcastChannel и StorageEvent.
 *
 * @param activeOrganizationId Текущий активный tenant ID.
 * @param setActiveOrganizationId Сеттер для обновления tenant ID из другой вкладки.
 * @returns Уведомление о синхронизации.
 */
export function useMultiTabSync(
    activeOrganizationId: TTenantId,
    setActiveOrganizationId: (id: TTenantId) => void,
): IMultiTabSyncResult {
    const queryClient = useQueryClient()
    const [multiTabNotice, setMultiTabNotice] = useState<string | undefined>(undefined)

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") {
            return
        }

        const channel = new window.BroadcastChannel(MULTI_TAB_SYNC_CHANNEL)
        const handleMessage = (event: MessageEvent<unknown>): void => {
            const data = event.data
            if (isMultiTabSyncMessage(data) !== true) {
                return
            }

            if (
                data.type === "tenant" &&
                data.tenantId !== activeOrganizationId &&
                isTenantId(data.tenantId)
            ) {
                setActiveOrganizationId(data.tenantId)
                setMultiTabNotice(`Tenant switched in another tab: ${data.tenantId}.`)
                return
            }

            if (data.type === "permissions") {
                setMultiTabNotice(`Permissions updated in another tab: ${data.role}.`)
                void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
                void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() })
                return
            }

            if (data.type === "theme") {
                setMultiTabNotice("Theme updated in another tab and synchronized.")
            }
        }

        channel.addEventListener("message", handleMessage)

        return (): void => {
            channel.removeEventListener("message", handleMessage)
            channel.close()
        }
    }, [activeOrganizationId, queryClient, setActiveOrganizationId])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleStorageSync = (event: StorageEvent): void => {
            if (event.key === TENANT_STORAGE_KEY && event.newValue !== null) {
                if (isTenantId(event.newValue) && event.newValue !== activeOrganizationId) {
                    setActiveOrganizationId(event.newValue)
                    setMultiTabNotice(`Tenant synchronized from another tab: ${event.newValue}.`)
                }
                return
            }

            if (event.key === THEME_MODE_STORAGE_KEY || event.key === THEME_PRESET_STORAGE_KEY) {
                setMultiTabNotice("Theme synchronized from another tab.")
            }
        }

        window.addEventListener("storage", handleStorageSync)
        return (): void => {
            window.removeEventListener("storage", handleStorageSync)
        }
    }, [activeOrganizationId, setActiveOrganizationId])

    return { multiTabNotice }
}
