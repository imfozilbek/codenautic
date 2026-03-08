import { afterEach, describe, expect, it, vi } from "vitest"

import {
    ApiHttpError,
    ApiNetworkError,
    ApiRateLimitError,
    FetchHttpClient,
    createApiContracts,
} from "@/lib/api"

const API_CONFIG = {
    baseUrl: "http://api.example",
    defaultHeaders: {},
} as const

describe("FetchHttpClient", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
    })

    it("не ретраит POST-запрос при 429", async (): Promise<void> => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ error: "rate_limited" }), {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": "1",
                },
            }),
        )
        const delaySpy = vi.fn(async (): Promise<void> => {})
        const client = new FetchHttpClient(API_CONFIG, {
            delay: delaySpy,
        })

        await expect(
            client.request({
                method: "POST",
                path: "/api/v1/rules",
            }),
        ).rejects.toBeInstanceOf(ApiRateLimitError)
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(delaySpy).not.toHaveBeenCalled()
    })

    it("ретраит GET-запрос при 429 и затем возвращает успешный ответ", async (): Promise<void> => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "rate_limited" }), {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": "1",
                    },
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }),
            )
        const delaySpy = vi.fn(async (): Promise<void> => {})
        const client = new FetchHttpClient(API_CONFIG, {
            delay: delaySpy,
        })

        await expect(
            client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).resolves.toEqual({ ok: true })
        expect(fetchSpy).toHaveBeenCalledTimes(2)
        expect(delaySpy).toHaveBeenCalledTimes(1)
    })

    it("возвращает undefined для успешного ответа без тела", async (): Promise<void> => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(null, {
                status: 204,
            }),
        )
        const client = new FetchHttpClient(API_CONFIG)

        await expect(
            client.request<undefined>({
                method: "DELETE",
                path: "/api/v1/rules/rule-1",
            }),
        ).resolves.toBeUndefined()
    })

    it("сигнализирует об invalid JSON как об HTTP-ошибке, а не network error", async (): Promise<void> => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response("{invalid", {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }),
        )
        const client = new FetchHttpClient(API_CONFIG)

        try {
            await client.request({
                method: "GET",
                path: "/api/v1/health",
            })
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(ApiHttpError)
            expect(error).not.toBeInstanceOf(ApiNetworkError)
            return
        }

        throw new Error("Ожидалась ошибка парсинга JSON")
    })
})

describe("createApiContracts", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
    })

    it("использует runtime env для base URL и bearer token", async (): Promise<void> => {
        vi.stubEnv("VITE_API_URL", "https://runtime.example")
        vi.stubEnv("VITE_API_BEARER_TOKEN", "secret-token")
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ status: "ok" }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }),
        )

        await createApiContracts().system.getHealth()

        const firstCall = fetchSpy.mock.calls.at(0)
        expect(firstCall?.[0]).toBe("https://runtime.example/api/v1/health")
        expect(firstCall?.[1]?.headers).toEqual(
            expect.objectContaining({
                Authorization: "Bearer secret-token",
            }),
        )
    })
})
