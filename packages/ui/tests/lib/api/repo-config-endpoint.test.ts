import { describe, expect, it, vi } from "vitest"

import type { IHttpClient } from "@/lib/api"
import {
    RepoConfigApi,
    type IRepoConfig,
    type IRepoConfigResponse,
    type IUpdateRepoConfigRequest,
    type IUpdateRepoConfigResponse,
} from "@/lib/api/endpoints/repo-config.endpoint"

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

const sampleConfig: IRepoConfig = {
    repositoryId: "repo-42",
    configYaml: "rules:\n  - no-any\n",
    ignorePatterns: ["dist/", "node_modules/"],
    reviewMode: "AUTO",
    updatedAt: "2026-03-10T09:00:00.000Z",
}

describe("RepoConfigApi", (): void => {
    it("when getRepoConfig вызван с валидным id, then отправляет GET с encoded path", async (): Promise<void> => {
        const response: IRepoConfigResponse = { config: sampleConfig }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new RepoConfigApi(httpClient)
        const result = await api.getRepoConfig("repo-42")

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/repositories/repo-42/config",
            credentials: "include",
        })
    })

    it("when getRepoConfig вызван с id содержащим спецсимволы, then encodeURIComponent применяется", async (): Promise<void> => {
        const response: IRepoConfigResponse = {
            config: { ...sampleConfig, repositoryId: "org/repo name" },
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new RepoConfigApi(httpClient)
        await api.getRepoConfig("org/repo name")

        expect(requestMock).toHaveBeenCalledWith({
            method: "GET",
            path: "/api/v1/repositories/org%2Frepo%20name/config",
            credentials: "include",
        })
    })

    it("when getRepoConfig вызван с пустым id, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new RepoConfigApi(httpClient)

        await expect(api.getRepoConfig("")).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when getRepoConfig вызван с id из пробелов, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new RepoConfigApi(httpClient)

        await expect(api.getRepoConfig("   ")).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when updateRepoConfig вызван с валидным request, then отправляет PUT с payload без repositoryId", async (): Promise<void> => {
        const updatedConfig: IRepoConfig = {
            ...sampleConfig,
            reviewMode: "MANUAL",
        }
        const response: IUpdateRepoConfigResponse = { config: updatedConfig }
        const request: IUpdateRepoConfigRequest = {
            repositoryId: "repo-42",
            configYaml: "rules:\n  - strict\n",
            reviewMode: "MANUAL",
        }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new RepoConfigApi(httpClient)
        const result = await api.updateRepoConfig(request)

        expect(result).toEqual(response)
        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/repositories/repo-42/config",
            body: {
                configYaml: "rules:\n  - strict\n",
                reviewMode: "MANUAL",
            },
            credentials: "include",
        })
    })

    it("when updateRepoConfig вызван с пустым repositoryId, then выбрасывает ошибку", async (): Promise<void> => {
        const { httpClient } = createHttpClientMock()
        const api = new RepoConfigApi(httpClient)

        await expect(
            api.updateRepoConfig({
                repositoryId: "  ",
                configYaml: "rules: []",
            }),
        ).rejects.toThrow("repositoryId не должен быть пустым")
    })

    it("when updateRepoConfig вызван только с ignorePatterns, then body содержит только ignorePatterns", async (): Promise<void> => {
        const response: IUpdateRepoConfigResponse = { config: sampleConfig }
        const { httpClient, requestMock } = createHttpClientMock()
        requestMock.mockResolvedValueOnce(response)

        const api = new RepoConfigApi(httpClient)
        await api.updateRepoConfig({
            repositoryId: "repo-42",
            ignorePatterns: ["*.log"],
        })

        expect(requestMock).toHaveBeenCalledWith({
            method: "PUT",
            path: "/api/v1/repositories/repo-42/config",
            body: {
                ignorePatterns: ["*.log"],
            },
            credentials: "include",
        })
    })
})
