import {describe, expect, it, vi} from "vitest"

import type {IHttpClient} from "@/lib/api"
import {AuthApi} from "@/lib/api/endpoints/auth.endpoint"
import type {
    IAuthLogoutResponse,
    IAuthSessionEnvelope,
    IOAuthAuthorizationResponse,
} from "@/lib/auth/types"

/**
 * Создаёт типизированный mock HTTP-клиента.
 *
 * @returns Пара клиента и mock-функции request.
 */
function createHttpClientMock(): {
    readonly httpClient: IHttpClient
    readonly requestMock: ReturnType<typeof vi.fn>
} {
    const requestMock = vi.fn()
    return {
        httpClient: {
            request: requestMock,
        },
        requestMock,
    }
}

describe("AuthApi", (): void => {
    it("получает текущую auth session с cookie credentials", async (): Promise<void> => {
        const response: IAuthSessionEnvelope = {
            session: null,
        }
        const {httpClient, requestMock} = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new AuthApi(httpClient)
        const result = await api.getSession()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/auth/session",
            credentials: "include",
        })
    })

    it("запускает OAuth авторизацию через start endpoint", async (): Promise<void> => {
        const response: IOAuthAuthorizationResponse = {
            provider: "github",
            authorizationUrl: "https://auth.example/github",
            state: "state-1",
        }
        const {httpClient, requestMock} = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new AuthApi(httpClient)
        const result = await api.startOAuth({
            provider: "github",
            redirectUri: "http://localhost:5173/",
        })

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/auth/oauth/start",
            body: {
                provider: "github",
                redirectUri: "http://localhost:5173/",
            },
            credentials: "include",
        })
    })

    it("обновляет auth session через refresh endpoint", async (): Promise<void> => {
        const response: IAuthSessionEnvelope = {
            session: {
                provider: "gitlab",
                expiresAt: "2026-03-03T15:00:00.000Z",
                user: {
                    id: "u-1",
                    email: "john@example.com",
                    displayName: "John",
                },
            },
        }
        const {httpClient, requestMock} = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new AuthApi(httpClient)
        const result = await api.refreshSession()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/auth/session/refresh",
            credentials: "include",
        })
    })

    it("завершает активную сессию через logout endpoint", async (): Promise<void> => {
        const response: IAuthLogoutResponse = {
            loggedOut: true,
        }
        const {httpClient, requestMock} = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new AuthApi(httpClient)
        const result = await api.logout()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/auth/logout",
            credentials: "include",
        })
    })
})
