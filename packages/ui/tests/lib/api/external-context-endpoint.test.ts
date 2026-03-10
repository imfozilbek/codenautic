import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    ExternalContextApi,
    type IExternalContextSourcesResponse,
    type IExternalContextPreviewResponse,
    type IUpdateExternalContextSourceRequest,
    type IUpdateExternalContextSourceResponse,
    type IRefreshExternalContextSourceResponse,
} from "@/lib/api/endpoints/external-context.endpoint"

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

describe("ExternalContextApi", (): void => {
    it("when listSources вызван, then отправляет GET на /api/v1/context/sources", async (): Promise<void> => {
        const response: IExternalContextSourcesResponse = {
            sources: [
                {
                    id: "jira-1",
                    name: "Jira Cloud",
                    type: "JIRA",
                    status: "CONNECTED",
                    enabled: true,
                    itemCount: 120,
                    lastSyncedAt: "2026-03-10T07:00:00.000Z",
                },
            ],
            total: 1,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        const result = await api.listSources()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/context/sources",
            credentials: "include",
        })
    })

    it("when getPreview вызван с валидным sourceId, then отправляет GET с encoded path", async (): Promise<void> => {
        const response: IExternalContextPreviewResponse = {
            sourceId: "jira-1",
            items: [
                {
                    id: "item-1",
                    title: "AUTH-123: Fix login flow",
                    excerpt: "Login flow broken after SSO migration",
                    url: "https://jira.example.com/browse/AUTH-123",
                    updatedAt: "2026-03-09T15:00:00.000Z",
                },
            ],
            total: 1,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        const result = await api.getPreview("jira-1")

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/context/sources/jira-1/preview",
            credentials: "include",
        })
    })

    it("when getPreview вызван с id содержащим спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: IExternalContextPreviewResponse = {
            sourceId: "src/special",
            items: [],
            total: 0,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        await api.getPreview("src/special")

        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/context/sources/src%2Fspecial/preview",
            credentials: "include",
        })
    })

    it("when getPreview вызван с пустым sourceId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.getPreview("")).rejects.toThrow("sourceId не должен быть пустым")
    })

    it("when getPreview вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.getPreview("   ")).rejects.toThrow("sourceId не должен быть пустым")
    })

    it("when updateSource вызван с валидным request, then отправляет PUT без sourceId в body", async (): Promise<void> => {
        const response: IUpdateExternalContextSourceResponse = {
            source: {
                id: "jira-1",
                name: "Jira Cloud",
                type: "JIRA",
                status: "CONNECTED",
                enabled: false,
                itemCount: 120,
            },
        }
        const request: IUpdateExternalContextSourceRequest = {
            sourceId: "jira-1",
            enabled: false,
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        const result = await api.updateSource(request)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/context/sources/jira-1",
            body: { enabled: false },
            credentials: "include",
        })
    })

    it("when updateSource вызван с пустым sourceId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.updateSource({ sourceId: "", enabled: true })).rejects.toThrow(
            "sourceId не должен быть пустым",
        )
    })

    it("when updateSource вызван с sourceId из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.updateSource({ sourceId: "  ", enabled: true })).rejects.toThrow(
            "sourceId не должен быть пустым",
        )
    })

    it("when refreshSource вызван с валидным id, then отправляет POST", async (): Promise<void> => {
        const response: IRefreshExternalContextSourceResponse = {
            sourceId: "linear-1",
            accepted: true,
            status: "SYNCING",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        const result = await api.refreshSource("linear-1")

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/context/sources/linear-1/refresh",
            credentials: "include",
        })
    })

    it("when refreshSource вызван с пустым sourceId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.refreshSource("")).rejects.toThrow("sourceId не должен быть пустым")
    })

    it("when refreshSource вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new ExternalContextApi(httpClient)

        await expect(api.refreshSource("  ")).rejects.toThrow("sourceId не должен быть пустым")
    })

    it("when refreshSource возвращает accepted: false, then result содержит отказ", async (): Promise<void> => {
        const response: IRefreshExternalContextSourceResponse = {
            sourceId: "sentry-1",
            accepted: false,
            status: "DEGRADED",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new ExternalContextApi(httpClient)
        const result = await api.refreshSource("sentry-1")

        expect(result.accepted).toBe(false)
        expect(result.status).toBe("DEGRADED")
    })
})
