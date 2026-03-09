import type { ReactElement } from "react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { type IAuthApi, createApiContracts } from "@/lib/api"
import { isRouteAccessible } from "@/lib/navigation/route-guard-map"

import { AuthAccessProvider } from "./auth-access"
import { createAuthBoundaryLabels } from "./auth-labels"
import { AuthLoginPanel, renderAuthLoadingState } from "./auth-login-panel"
import { resolveAuthAccess, resolveAccessibleRouteFallbackPath } from "./auth-role-resolver"
import { renderAuthLoginShell } from "./auth-shell"
import {
    resolveAuthStatusCode,
    resolveDefaultAuthStatusCode,
    shouldNavigateToLogin,
    createLoginRedirectPath,
    resolveAuthStatusMessage,
} from "./auth-status"
import {
    getSessionStorageOrUndefined,
    navigateToPath,
    redirectToAuthorizationUrl,
    resolveBoundaryRoutePath,
    resolveIntendedDestinationPath,
} from "./auth-url"
import { useAuthBoundaryState } from "./use-auth-boundary-state"

export { sanitizeAppDestinationPath } from "./auth-url"
export type { TAuthGuardStatusCode } from "./auth-status"
export type { IAuthBoundaryLabels } from "./auth-labels"

const DEFAULT_AUTH_API = createApiContracts().auth

/**
 * Render-контекст для protected children (function-as-child pattern).
 */
export interface IAuthBoundaryRenderContext {
    /** Отображаемое имя пользователя. */
    readonly userName: string
    /** Email пользователя для отображения. */
    readonly userEmail: string
    /** Handler для выхода из текущей сессии. */
    readonly onSignOut: () => Promise<void>
}

/**
 * Конфигурация boundary-компонента для защищённых route.
 */
export interface IAuthBoundaryProps {
    readonly children: ReactElement | ((context: IAuthBoundaryRenderContext) => ReactElement)
    readonly authApi?: IAuthApi
    readonly storage?: Storage
    readonly onRedirect?: (authorizationUrl: string) => void
    readonly loginPath?: string
    readonly intendedDestination?: string
    readonly authStatusHint?: 401 | 403
    readonly onNavigateToLogin?: (loginPath: string) => void
    readonly routePath?: string
}

/**
 * Граница авторизации для защищённых route с refresh и logout flow.
 *
 * @param props Параметры auth boundary.
 * @returns UI для loading/login/authenticated состояний.
 */
export function AuthBoundary(props: IAuthBoundaryProps): ReactElement {
    const { t } = useTranslation(["auth", "common"])
    const labels = createAuthBoundaryLabels(t)
    const storage = props.storage ?? getSessionStorageOrUndefined()
    const authApi = props.authApi ?? DEFAULT_AUTH_API
    const redirect = props.onRedirect ?? redirectToAuthorizationUrl
    const intendedDestination = resolveIntendedDestinationPath(props.intendedDestination)
    const routePath = resolveBoundaryRoutePath(props.routePath)

    const state = useAuthBoundaryState({
        authApi,
        storage,
        redirect,
        labels,
        intendedDestination,
    })
    const authStatusCode = resolveAuthStatusCode(state.authStatusCode, props.authStatusHint)
    const effectiveAuthStatusCode = resolveDefaultAuthStatusCode(authStatusCode, state.session)
    const shouldRedirectToLogin = shouldNavigateToLogin(
        props.loginPath,
        state.isPending,
        state.session,
        effectiveAuthStatusCode,
    )
    const resolvedAccess =
        state.session !== undefined && state.session !== null
            ? resolveAuthAccess(state.session)
            : undefined
    const shouldRedirectForRouteAccess =
        resolvedAccess !== undefined &&
        isRouteAccessible(routePath, {
            isAuthenticated: true,
            role: resolvedAccess.role,
            tenantId: resolvedAccess.tenantId,
        }) !== true
    const loginRedirectPath = createLoginRedirectPath(
        props.loginPath,
        intendedDestination,
        effectiveAuthStatusCode,
    )
    const routeAccessRedirectPath =
        resolvedAccess === undefined
            ? undefined
            : resolveAccessibleRouteFallbackPath(resolvedAccess, routePath)
    const navigateToLogin = props.onNavigateToLogin ?? navigateToPath

    useEffect((): void => {
        if (shouldRedirectToLogin !== true) {
            return
        }

        if (loginRedirectPath === undefined) {
            return
        }

        navigateToLogin(loginRedirectPath)
    }, [loginRedirectPath, navigateToLogin, shouldRedirectToLogin])

    useEffect((): void => {
        if (shouldRedirectForRouteAccess !== true) {
            return
        }

        if (routeAccessRedirectPath === undefined) {
            return
        }

        navigateToPath(routeAccessRedirectPath)
    }, [routeAccessRedirectPath, shouldRedirectForRouteAccess])

    const isLoadingState =
        state.isPending === true ||
        shouldRedirectToLogin === true ||
        shouldRedirectForRouteAccess === true
    if (isLoadingState === true) {
        return renderAuthLoadingState(labels.appTitle, labels.checkingSession)
    }

    const authStatusMessage = resolveAuthStatusMessage(effectiveAuthStatusCode, labels)
    const isAuthenticatedSession = state.session !== undefined && state.session !== null

    if (isAuthenticatedSession === false) {
        return (
            <AuthLoginPanel
                appTitle={labels.appTitle}
                description={labels.loginTitle}
                interactionError={state.interactionError}
                onOAuthSignIn={state.handleOAuthSignIn}
                statusMessage={authStatusMessage}
            />
        )
    }

    const session = state.session
    const protectedTree =
        typeof props.children === "function"
            ? props.children({
                  userName: session.user.displayName,
                  userEmail: session.user.email,
                  onSignOut: state.handleLogout,
              })
            : renderAuthLoginShell({
                  appTitle: labels.appTitle,
                  userDisplayName: session.user.displayName,
                  userEmail: session.user.email,
                  logoutLabel: labels.logout,
                  onLogout: state.handleLogout,
                  interactionError: state.interactionError,
                  children: props.children,
              })

    if (resolvedAccess === undefined) {
        return protectedTree
    }

    return (
        <AuthAccessProvider
            value={{
                role: resolvedAccess.role,
                session,
                tenantId: resolvedAccess.tenantId,
            }}
        >
            {protectedTree}
        </AuthAccessProvider>
    )
}
