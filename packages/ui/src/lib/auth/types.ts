/**
 * Поддерживаемые OAuth/OIDC провайдеры авторизации.
 */
export const OAUTH_PROVIDERS = ["github", "gitlab", "google", "oidc"] as const

/**
 * Дискриминированный union провайдеров для auth-интеграции.
 */
export type TOAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/**
 * Данные пользователя из auth session.
 */
export interface IAuthUser {
    readonly id: string
    readonly email: string
    readonly displayName: string
    readonly avatarUrl?: string
}

/**
 * Клиентская auth session.
 */
export interface IAuthSession {
    readonly provider: TOAuthProvider
    readonly accessToken?: string
    readonly refreshToken?: string
    readonly expiresAt: string
    readonly user: IAuthUser
}

/**
 * Envelope-ответ API с текущим состоянием auth session.
 */
export interface IAuthSessionEnvelope {
    readonly session: IAuthSession | null
}

/**
 * Запрос на старт OAuth/OIDC авторизации.
 */
export interface IOAuthAuthorizationRequest {
    readonly provider: TOAuthProvider
    readonly redirectUri: string
}

/**
 * Ответ API с URL для старта OAuth/OIDC авторизации.
 */
export interface IOAuthAuthorizationResponse {
    readonly provider: TOAuthProvider
    readonly authorizationUrl: string
    readonly state: string
}

/**
 * Ответ API на logout.
 */
export interface IAuthLogoutResponse {
    readonly loggedOut: boolean
}
