import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    DryRunApi,
    type IDryRunResult,
    type ITriggerDryRunRequest,
    type ITriggerDryRunResponse,
} from "@/lib/api/endpoints/dry-run.endpoint"

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

describe("DryRunApi", (): void => {
    it("триггерит dry-run по repositoryId и передает payload", async (): Promise<void> => {
        const payload: ITriggerDryRunRequest = {
            repositoryId: "repo-1",
            reviewMode: "AUTO_PAUSE",
            ignorePatterns: ["/dist", "**/*.snap"],
        }
        const result: IDryRunResult = {
            mode: "AUTO_PAUSE",
            reviewedFiles: 9,
            suggestions: 4,
            issues: [
                {
                    filePath: "src/review/stage.ts",
                    severity: "high",
                    title: "Missing fallback",
                },
            ],
        }
        const response: ITriggerDryRunResponse = {
            result,
        }

        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new DryRunApi(httpClient)
        const actual = await api.triggerDryRun(payload)

        expect(actual).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/repositories/repo-1/dry-run",
            body: {
                reviewMode: "AUTO_PAUSE",
                ignorePatterns: ["/dist", "**/*.snap"],
            },
            credentials: "include",
        })
    })

    it("when repositoryId пустой, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new DryRunApi(httpClient)

        await expect(
            api.triggerDryRun({
                repositoryId: "",
                reviewMode: "AUTO",
                ignorePatterns: [],
            }),
        ).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when repositoryId из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new DryRunApi(httpClient)

        await expect(
            api.triggerDryRun({
                repositoryId: "   ",
                reviewMode: "MANUAL",
                ignorePatterns: [],
            }),
        ).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when repositoryId содержит спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: ITriggerDryRunResponse = {
            result: {
                mode: "AUTO",
                reviewedFiles: 3,
                suggestions: 1,
                issues: [],
            },
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new DryRunApi(httpClient)
        await api.triggerDryRun({
            repositoryId: "org/repo name",
            reviewMode: "AUTO",
            ignorePatterns: ["dist/"],
        })

        expect(requestMock).toHaveBeenCalledWith({
            method: "POST",
            path: "/api/v1/repositories/org%2Frepo%20name/dry-run",
            body: {
                reviewMode: "AUTO",
                ignorePatterns: ["dist/"],
            },
            credentials: "include",
        })
    })
})
