import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    GitProvidersApi,
    type IListGitProvidersResponse,
    type IUpdateGitProviderConnectionRequest,
    type IUpdateGitProviderConnectionResponse,
    type ITestGitProviderConnectionResponse,
} from "@/lib/api/endpoints/git-providers.endpoint"

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

describe("GitProvidersApi", (): void => {
    it("when listProviders вызван, then отправляет GET на /api/v1/git/providers", async (): Promise<void> => {
        const response: IListGitProvidersResponse = {
            providers: [
                {
                    id: "gh-1",
                    provider: "GitHub",
                    account: "codenautic",
                    connected: true,
                    status: "CONNECTED",
                    isKeySet: true,
                    lastSyncAt: "2026-03-10T08:00:00.000Z",
                },
                {
                    id: "gl-1",
                    provider: "GitLab",
                    connected: false,
                    status: "DISCONNECTED",
                    isKeySet: false,
                },
            ],
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new GitProvidersApi(httpClient)
        const result = await api.listProviders()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/git/providers",
            credentials: "include",
        })
    })

    it("when updateConnection вызван с валидным request, then отправляет PUT с body", async (): Promise<void> => {
        const response: IUpdateGitProviderConnectionResponse = {
            provider: {
                id: "gh-1",
                provider: "GitHub",
                account: "codenautic",
                connected: false,
                status: "DISCONNECTED",
                isKeySet: true,
            },
        }
        const request: IUpdateGitProviderConnectionRequest = {
            providerId: "gh-1",
            connected: false,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new GitProvidersApi(httpClient)
        const result = await api.updateConnection(request)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/git/providers/gh-1/connection",
            body: { connected: false },
            credentials: "include",
        })
    })

    it("when updateConnection вызван с id содержащим спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: IUpdateGitProviderConnectionResponse = {
            provider: {
                id: "prov/special",
                provider: "Azure",
                connected: true,
                status: "CONNECTED",
                isKeySet: true,
            },
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new GitProvidersApi(httpClient)
        await api.updateConnection({
            providerId: "prov/special",
            connected: true,
        })

        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/git/providers/prov%2Fspecial/connection",
            body: { connected: true },
            credentials: "include",
        })
    })

    it("when updateConnection вызван с пустым providerId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new GitProvidersApi(httpClient)

        await expect(api.updateConnection({ providerId: "", connected: true })).rejects.toThrow(
            "providerId не должен быть пустым",
        )
    })

    it("when updateConnection вызван с providerId из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new GitProvidersApi(httpClient)

        await expect(api.updateConnection({ providerId: "   ", connected: false })).rejects.toThrow(
            "providerId не должен быть пустым",
        )
    })

    it("when testConnection вызван с валидным id, then отправляет POST", async (): Promise<void> => {
        const response: ITestGitProviderConnectionResponse = {
            providerId: "gh-1",
            ok: true,
            message: "Connection successful",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new GitProvidersApi(httpClient)
        const result = await api.testConnection("gh-1")

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/git/providers/gh-1/test",
            credentials: "include",
        })
    })

    it("when testConnection возвращает ok: false, then result содержит диагностическое сообщение", async (): Promise<void> => {
        const response: ITestGitProviderConnectionResponse = {
            providerId: "gl-1",
            ok: false,
            message: "Authentication failed: invalid token",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new GitProvidersApi(httpClient)
        const result = await api.testConnection("gl-1")

        expect(result.ok).toBe(false)
        expect(result.message).toBe("Authentication failed: invalid token")
    })

    it("when testConnection вызван с пустым providerId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new GitProvidersApi(httpClient)

        await expect(api.testConnection("")).rejects.toThrow("providerId не должен быть пустым")
    })

    it("when testConnection вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new GitProvidersApi(httpClient)

        await expect(api.testConnection("  ")).rejects.toThrow("providerId не должен быть пустым")
    })
})
