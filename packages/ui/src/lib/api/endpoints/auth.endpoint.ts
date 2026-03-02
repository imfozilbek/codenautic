import type {IHttpClient} from "../http-client"
import type {
    IAuthLogoutResponse,
    IAuthSessionEnvelope,
    IOAuthAuthorizationRequest,
    IOAuthAuthorizationResponse,
} from "../../auth/types"

/**
 * Контракт endpoint-слоя auth API.
 */
export interface IAuthApi {
    /**
     * Возвращает текущую auth session пользователя.
     *
     * @returns Envelope с активной сессией или null.
     */
    getSession(): Promise<IAuthSessionEnvelope>

    /**
     * Инициирует OAuth/OIDC flow для выбранного provider.
     *
     * @param request Параметры старта OAuth.
     * @returns URL авторизации и state.
     */
    startOAuth(request: IOAuthAuthorizationRequest): Promise<IOAuthAuthorizationResponse>

    /**
     * Обновляет auth session по refresh cookie/token.
     *
     * @returns Envelope с обновлённой сессией.
     */
    refreshSession(): Promise<IAuthSessionEnvelope>

    /**
     * Завершает текущую auth session.
     *
     * @returns Признак успешного logout.
     */
    logout(): Promise<IAuthLogoutResponse>
}

/**
 * Endpoint-слой для auth-интеграции UI с runtime/api.
 */
export class AuthApi implements IAuthApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getSession(): Promise<IAuthSessionEnvelope> {
        return this.httpClient.request<IAuthSessionEnvelope>({
            method: "GET",
            path: "/api/v1/auth/session",
            credentials: "include",
        })
    }

    public async startOAuth(
        request: IOAuthAuthorizationRequest,
    ): Promise<IOAuthAuthorizationResponse> {
        return this.httpClient.request<IOAuthAuthorizationResponse>({
            method: "POST",
            path: "/api/v1/auth/oauth/start",
            body: request,
            credentials: "include",
        })
    }

    public async refreshSession(): Promise<IAuthSessionEnvelope> {
        return this.httpClient.request<IAuthSessionEnvelope>({
            method: "POST",
            path: "/api/v1/auth/session/refresh",
            credentials: "include",
        })
    }

    public async logout(): Promise<IAuthLogoutResponse> {
        return this.httpClient.request<IAuthLogoutResponse>({
            method: "POST",
            path: "/api/v1/auth/logout",
            credentials: "include",
        })
    }
}
