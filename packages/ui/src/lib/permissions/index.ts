/**
 * Barrel exports for RBAC permissions and UI policy.
 */
export { PERMISSION_KEYS, type TPermissionKey, type IPermissionsResponse } from "./permissions"
export {
    POLICY_DRIFT_EVENT_NAME,
    type IPolicyDriftEventDetail,
    isPolicyDriftEventDetail,
} from "./policy-drift"
export {
    type TUiActionId,
    type TUiActionVisibility,
    type IUiActionPolicy,
    isRolePreviewEnabled,
    readUiRoleFromStorage,
    writeUiRoleToStorage,
    getUiActionPolicy,
    useUiRole,
    type TUiRole,
} from "./ui-policy"
