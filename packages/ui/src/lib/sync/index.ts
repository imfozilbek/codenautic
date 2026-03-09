/**
 * Multi-tab consistency via BroadcastChannel for permissions, tenant,
 * and theme synchronization.
 */
export {
    MULTI_TAB_SYNC_CHANNEL,
    TENANT_STORAGE_KEY,
    UI_ROLE_STORAGE_KEY,
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    type TMultiTabSyncMessage,
    isMultiTabSyncMessage,
} from "./multi-tab-consistency"
