import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import { FeatureFlagsApi } from "@/lib/api/endpoints/feature-flags.endpoint"
import type { IFeatureFlagsResponse } from "@/lib/feature-flags/feature-flags"

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

describe("FeatureFlagsApi", (): void => {
    it("получает feature flags с credentials include", async (): Promise<void> => {
        const response: IFeatureFlagsResponse = {
            flags: {
                premium_dashboard: true,
            },
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new FeatureFlagsApi(httpClient)
        const result = await api.getFeatureFlags()

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/feature-flags",
            credentials: "include",
        })
    })
})
