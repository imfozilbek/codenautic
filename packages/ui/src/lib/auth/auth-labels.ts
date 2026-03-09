import type { TOAuthProvider } from "./types"

/**
 * Тексты UI для auth boundary.
 */
export interface IAuthBoundaryLabels {
    readonly appTitle: string
    readonly checkingSession: string
    readonly loginTitle: string
    readonly logout: string
    readonly oauthStartFailed: string
    readonly logoutFailed: string
    readonly unauthorizedState: string
    readonly forbiddenState: string
}

/**
 * Формирует переводимые метки auth boundary.
 *
 * @param t Функция i18n перевода.
 * @returns Набор локализованных текстов.
 */
export function createAuthBoundaryLabels(t: (key: string) => string): IAuthBoundaryLabels {
    return {
        appTitle: t("common:appTitle"),
        checkingSession: t("auth:checkingSession"),
        loginTitle: t("auth:loginTitle"),
        logout: t("auth:logout"),
        oauthStartFailed: t("auth:oauthStartFailed"),
        logoutFailed: t("auth:logoutFailed"),
        unauthorizedState: t("auth:unauthorizedState"),
        forbiddenState: t("auth:forbiddenState"),
    }
}

/**
 * Определяет label OAuth/OIDC provider для login UI.
 *
 * @param provider OAuth/OIDC provider.
 * @returns Пользовательский label кнопки входа.
 */
export function resolveProviderLabel(provider: TOAuthProvider): string {
    if (provider === "oidc") {
        return "OIDC"
    }

    if (provider === "gitlab") {
        return "GitLab"
    }

    if (provider === "github") {
        return "GitHub"
    }

    return "Google"
}
