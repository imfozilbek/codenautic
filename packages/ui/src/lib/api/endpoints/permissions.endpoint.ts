import type { IHttpClient } from "../http-client"
import type { IPermissionsResponse } from "@/lib/permissions/permissions"

/** Query-параметры для permissions endpoint. */
export interface IGetPermissionsQuery {
    /** Хэш роли/ролей пользователя, используемый для кэширования и трассировки прав. */
    readonly role?: string
}

/**
 * Контракт endpoint-слоя permissions API.
 */
export interface IPermissionsApi {
    /**
     * Возвращает набор разрешений для текущей сессии/ролевого контекста.
     *
     * @param role Роль или хэш ролей пользователя.
     * @returns Набор разрешений.
     */
    getPermissions(role?: string): Promise<IPermissionsResponse>
}

/**
 * Endpoint-слой для permissions API.
 */
export class PermissionsApi implements IPermissionsApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async getPermissions(role: string = "anonymous"): Promise<IPermissionsResponse> {
        const query: IGetPermissionsQuery | undefined =
            role.length > 0 ? { role } : undefined
        const requestQuery =
            query as Readonly<Record<string, string | undefined>> | undefined

        return this.httpClient.request<IPermissionsResponse>({
            method: "GET",
            path: "/api/v1/permissions",
            query: requestQuery,
            credentials: "include",
        })
    }
}
