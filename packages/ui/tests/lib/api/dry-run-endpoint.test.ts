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
})
