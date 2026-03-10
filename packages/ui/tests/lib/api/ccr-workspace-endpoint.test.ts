import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    CcrWorkspaceApi,
    type ICcrWorkspaceListResponse,
    type ICcrWorkspaceContextResponse,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"

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

describe("CcrWorkspaceApi", (): void => {
    it("when listCcrs вызван, then отправляет GET на /api/v1/reviews/workspace", async (): Promise<void> => {
        const response: ICcrWorkspaceListResponse = {
            ccrs: [
                {
                    id: "ccr-1",
                    title: "Add auth module",
                    repository: "codenautic/core",
                    assignee: "alice",
                    status: "in_progress",
                    comments: 5,
                    updatedAt: "2026-03-10T08:00:00.000Z",
                    team: "platform",
                    severity: "high",
                    attachedFiles: ["src/auth.ts"],
                },
            ],
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CcrWorkspaceApi(httpClient)
        const result = await api.listCcrs()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/reviews/workspace",
            credentials: "include",
        })
    })

    it("when listCcrs возвращает пустой список, then ccrs массив пустой", async (): Promise<void> => {
        const response: ICcrWorkspaceListResponse = { ccrs: [] }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CcrWorkspaceApi(httpClient)
        const result = await api.listCcrs()

        expect(result.ccrs).toHaveLength(0)
    })

    it("when getWorkspaceContext вызван с валидным reviewId, then отправляет GET с encoded path", async (): Promise<void> => {
        const response: ICcrWorkspaceContextResponse = {
            reviewId: "review-200",
            ccr: {
                id: "ccr-1",
                title: "Refactor pipeline",
                repository: "codenautic/core",
                assignee: "bob",
                status: "approved",
                comments: 3,
                updatedAt: "2026-03-10T09:00:00.000Z",
                team: "backend",
                severity: "medium",
                attachedFiles: ["src/pipeline.ts"],
            },
            diffFiles: [
                {
                    filePath: "src/pipeline.ts",
                    language: "typescript",
                    lines: [
                        {
                            leftLine: 10,
                            rightLine: 10,
                            leftText: "old code",
                            rightText: "new code",
                            type: "context",
                        },
                    ],
                },
            ],
            threads: [],
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CcrWorkspaceApi(httpClient)
        const result = await api.getWorkspaceContext("review-200")

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/reviews/review-200/workspace",
            credentials: "include",
        })
    })

    it("when getWorkspaceContext вызван с id содержащим спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: ICcrWorkspaceContextResponse = {
            reviewId: "rev/special id",
            ccr: {
                id: "ccr-2",
                title: "Fix",
                repository: "repo",
                assignee: "alice",
                status: "new",
                comments: 0,
                updatedAt: "2026-03-10T10:00:00.000Z",
                team: "frontend",
                severity: "low",
                attachedFiles: [],
            },
            diffFiles: [],
            threads: [],
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CcrWorkspaceApi(httpClient)
        await api.getWorkspaceContext("rev/special id")

        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/reviews/rev%2Fspecial%20id/workspace",
            credentials: "include",
        })
    })

    it("when getWorkspaceContext вызван с пустым reviewId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CcrWorkspaceApi(httpClient)

        await expect(api.getWorkspaceContext("")).rejects.toThrow("reviewId не должен быть пустым")
    })

    it("when getWorkspaceContext вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CcrWorkspaceApi(httpClient)

        await expect(api.getWorkspaceContext("   ")).rejects.toThrow(
            "reviewId не должен быть пустым",
        )
    })
})
