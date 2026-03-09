/**
 * Barrel exports for auth boundary, session, and OAuth flow.
 */
export { type IAuthAccessContextValue, AuthAccessProvider, useAuthAccess } from "./auth-access"
export {
    type IAuthBoundaryRenderContext,
    type IAuthBoundaryProps,
    AuthBoundary,
} from "./auth-boundary"
export { createHandleOAuthSignIn, createHandleLogout } from "./auth-handlers"
export {
    type IAuthBoundaryLabels,
    createAuthBoundaryLabels,
    resolveProviderLabel,
} from "./auth-labels"
export {
    type IAuthLoginPanelProps,
    AuthLoginPanel,
    renderAuthLoadingState,
} from "./auth-login-panel"
export {
    type IResolvedAuthAccess,
    resolveAuthAccess,
    resolveAuthRole,
    resolveAuthTenantId,
    readStoredTenantId,
    resolveAccessibleRouteFallbackPath,
} from "./auth-role-resolver"
export {
    AUTH_SESSION_STORAGE_KEY,
    type IAuthSessionSnapshot,
    isAuthSessionExpired,
    shouldRefreshAuthSession,
    persistAuthSession,
    loadPersistedAuthSession,
    clearPersistedAuthSession,
} from "./auth-session"
export {
    type IAuthenticatedShellProps,
    type IAuthAuthenticatedShellRenderProps,
    AuthenticatedShell,
    renderAuthLoginShell,
} from "./auth-shell"
export {
    type TAuthGuardStatusCode,
    resolveAuthStatusCode,
    resolveDefaultAuthStatusCode,
    resolveAuthStatusCodeFromError,
    shouldNavigateToLogin,
    createLoginRedirectPath,
    resolveAuthStatusMessage,
} from "./auth-status"
export {
    sanitizeAppDestinationPath,
    resolveAuthRedirectUri,
    resolveIntendedDestinationPath,
    getCurrentRelativeUrl,
    isCurrentPage,
    resolveBoundaryRoutePath,
    redirectToAuthorizationUrl,
    navigateToPath,
    getSessionStorageOrUndefined,
} from "./auth-url"
export {
    OAUTH_PROVIDERS,
    type TOAuthProvider,
    type IAuthUser,
    type IAuthSession,
    type IAuthSessionEnvelope,
    type IOAuthAuthorizationRequest,
    type IOAuthAuthorizationResponse,
    type IAuthLogoutResponse,
} from "./types"
export {
    type IUseAuthBoundaryStateArgs,
    type IAuthBoundaryState,
    useAuthBoundaryState,
} from "./use-auth-boundary-state"
