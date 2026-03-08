import type { TTenantId, TUiRole } from "@/lib/access/access-types"

export const MULTI_TAB_SYNC_CHANNEL = "codenautic:multi-tab-sync"
export const TENANT_STORAGE_KEY = "codenautic:tenant:active"
export const UI_ROLE_STORAGE_KEY = "codenautic:rbac:role"
export const THEME_MODE_STORAGE_KEY = "codenautic:ui:theme-mode"
export const THEME_PRESET_STORAGE_KEY = "codenautic:ui:theme-preset"

export type TMultiTabSyncMessage =
    | {
          readonly type: "permissions"
          readonly role: TUiRole
      }
    | {
          readonly type: "tenant"
          readonly tenantId: TTenantId
      }
    | {
          readonly type: "theme"
      }

/**
 * Проверяет payload multi-tab sync сообщения.
 *
 * @param value Любое сообщение из BroadcastChannel.
 * @returns true если payload валиден.
 */
export function isMultiTabSyncMessage(value: unknown): value is TMultiTabSyncMessage {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const candidate = value as {
        readonly type?: unknown
        readonly role?: unknown
        readonly tenantId?: unknown
    }

    if (candidate.type === "tenant") {
        return (
            candidate.tenantId === "platform-team"
            || candidate.tenantId === "frontend-team"
            || candidate.tenantId === "runtime-team"
        )
    }

    if (candidate.type === "permissions") {
        return (
            candidate.role === "viewer"
            || candidate.role === "developer"
            || candidate.role === "lead"
            || candidate.role === "admin"
        )
    }

    return candidate.type === "theme"
}
