import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    CCRSummaryApi,
    type IGenerateCcrSummaryRequest,
    type IGenerateCcrSummaryResponse,
} from "@/lib/api/endpoints/ccr-summary.endpoint"

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

describe("CCRSummaryApi", (): void => {
    it("генерирует ccr summary и отправляет ожидаемый payload", async (): Promise<void> => {
        const payload: IGenerateCcrSummaryRequest = {
            repositoryId: "repo-1",
            reviewMode: "AUTO",
            detailLevel: "DEEP",
            includeRiskOverview: true,
            includeTimeline: true,
            maxSuggestions: 12,
            promptOverride: "Summarize with a risk-first layout.",
        }
        const response: IGenerateCcrSummaryResponse = {
            result: {
                mode: "AUTO",
                generatedAt: "2026-03-05T07:00:00.000Z",
                summary: "Main risk is flaky retries in worker pipeline.",
                highlights: ["Retry policy mismatch", "Queue congestion risk"],
            },
        }

        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CCRSummaryApi(httpClient)
        const actual = await api.generateSummary(payload)

        expect(actual).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/repositories/repo-1/ccr-summary/generate",
            body: {
                reviewMode: "AUTO",
                detailLevel: "DEEP",
                includeRiskOverview: true,
                includeTimeline: true,
                maxSuggestions: 12,
                promptOverride: "Summarize with a risk-first layout.",
            },
            credentials: "include",
        })
    })

    it("when repositoryId пустой, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CCRSummaryApi(httpClient)

        await expect(
            api.generateSummary({
                repositoryId: "",
                reviewMode: "AUTO",
                detailLevel: "CONCISE",
                includeRiskOverview: false,
                includeTimeline: false,
                maxSuggestions: 5,
                promptOverride: "",
            }),
        ).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when repositoryId из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new CCRSummaryApi(httpClient)

        await expect(
            api.generateSummary({
                repositoryId: "   ",
                reviewMode: "MANUAL",
                detailLevel: "STANDARD",
                includeRiskOverview: true,
                includeTimeline: false,
                maxSuggestions: 10,
                promptOverride: "",
            }),
        ).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when repositoryId содержит спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: IGenerateCcrSummaryResponse = {
            result: {
                mode: "MANUAL",
                generatedAt: "2026-03-10T12:00:00.000Z",
                summary: "No critical issues.",
                highlights: [],
            },
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new CCRSummaryApi(httpClient)
        await api.generateSummary({
            repositoryId: "org/repo name",
            reviewMode: "MANUAL",
            detailLevel: "CONCISE",
            includeRiskOverview: false,
            includeTimeline: false,
            maxSuggestions: 5,
            promptOverride: "",
        })

        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/repositories/org%2Frepo%20name/ccr-summary/generate",
            body: expect.objectContaining({
                reviewMode: "MANUAL",
            }) as Record<string, unknown>,
            credentials: "include",
        })
    })
})
