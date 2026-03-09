import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { TUiRole } from "@/lib/access/access-types"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { POLICY_DRIFT_EVENT_NAME, isPolicyDriftEventDetail } from "@/lib/permissions/policy-drift"
import { queryKeys } from "@/lib/query/query-keys"

/**
 * Результат хука отслеживания policy drift.
 */
export interface IPolicyDriftResult {
    /** Текущая роль с учётом runtime-переопределения. */
    readonly activeRoleId: TUiRole
    /** Уведомление о смене политики (undefined если нет). */
    readonly policyDriftNotice: string | undefined
}

/**
 * Отслеживает runtime policy drift events и применяет переопределение роли.
 * Инвалидирует кеш auth/permissions при смене политики.
 *
 * @returns Активная роль и уведомление о drift.
 */
export function usePolicyDrift(): IPolicyDriftResult {
    const persistedRoleId = useUiRole()
    const queryClient = useQueryClient()
    const [policyRoleOverride, setPolicyRoleOverride] = useState<TUiRole | undefined>(undefined)
    const [policyDriftNotice, setPolicyDriftNotice] = useState<string | undefined>(undefined)

    const activeRoleId = policyRoleOverride ?? persistedRoleId

    useEffect((): void => {
        if (policyRoleOverride === undefined) {
            return
        }

        if (policyRoleOverride !== persistedRoleId) {
            return
        }

        setPolicyRoleOverride(undefined)
    }, [persistedRoleId, policyRoleOverride])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handlePolicyDrift = (event: Event): void => {
            const customEvent = event as CustomEvent<unknown>
            const detail = customEvent.detail
            if (isPolicyDriftEventDetail(detail) !== true) {
                return
            }

            setPolicyRoleOverride(detail.nextRole)
            setPolicyDriftNotice(
                `Policy changed to ${detail.nextRole}: ${detail.reason}. UI permissions were refreshed.`,
            )
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
            void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all() })
        }

        window.addEventListener(POLICY_DRIFT_EVENT_NAME, handlePolicyDrift as EventListener)

        return (): void => {
            window.removeEventListener(POLICY_DRIFT_EVENT_NAME, handlePolicyDrift as EventListener)
        }
    }, [queryClient])

    return {
        activeRoleId,
        policyDriftNotice,
    }
}
