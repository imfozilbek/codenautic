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
})
