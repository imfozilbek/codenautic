import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import { SystemApi } from "@/lib/api/endpoints/system.endpoint"

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

describe("SystemApi", (): void => {
    it("when getHealth вызван, then отправляет GET на /api/v1/health", async (): Promise<void> => {
        const response = {
            status: "ok" as const,
            service: "api",
            timestamp: "2026-03-10T10:00:00.000Z",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new SystemApi(httpClient)
        const result = await api.getHealth()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/health",
        })
    })

    it("when getHealth возвращает degraded статус, then возвращает корректный ответ", async (): Promise<void> => {
        const response = {
            status: "degraded" as const,
            service: "api",
            timestamp: "2026-03-10T10:05:00.000Z",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new SystemApi(httpClient)
        const result = await api.getHealth()

        expect(result).toEqual(response)
        expect(result.status).toBe("degraded")
    })

    it("when httpClient.request выбрасывает ошибку, then getHealth пробрасывает её", async (): Promise<void> => {
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockRejectedValueOnce(new Error("Network error"))

        const api = new SystemApi(httpClient)

        await expect(api.getHealth()).rejects.toThrow("Network error")
    })
})
