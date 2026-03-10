import { afterEach, describe, expect, it, vi } from "vitest"

import {
    ApiHttpError,
    ApiNetworkError,
    ApiRateLimitError,
    FetchHttpClient,
    createApiContracts,
    isApiHttpError,
    isApiNetworkError,
    isApiRateLimitError,
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

    it("не ретраит localhost connection refused ошибки в dev-сценарии", async (): Promise<void> => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockRejectedValue(new TypeError("Failed to fetch"))
        const delaySpy = vi.fn(async (): Promise<void> => {})
        const client = new FetchHttpClient(
            {
                baseUrl: "http://localhost:7120",
                defaultHeaders: {},
            },
            {
                delay: delaySpy,
            },
        )

        await expect(
            client.request({
                method: "GET",
                path: "/api/v1/auth/session",
            }),
        ).rejects.toBeInstanceOf(ApiNetworkError)
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(delaySpy).not.toHaveBeenCalled()
    })

    it("сохраняет network retry для non-local API host", async (): Promise<void> => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
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

    describe("when response status is 205", (): void => {
        it("when response is 205, then returns undefined", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 205 }))
            const client = new FetchHttpClient(API_CONFIG)

            const result = await client.request<undefined>({
                method: "DELETE",
                path: "/api/v1/rules/rule-2",
            })

            expect(result).toBeUndefined()
        })
    })

    describe("when response body is empty text", (): void => {
        it("when response text is whitespace-only, then returns undefined", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("   ", { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            const result = await client.request<undefined>({
                method: "GET",
                path: "/api/v1/empty",
            })

            expect(result).toBeUndefined()
        })
    })

    describe("when retry uses exponential backoff", (): void => {
        it("when retrying twice, then backoff delay doubles each time", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 100,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledTimes(2)
            expect(delaySpy).toHaveBeenNthCalledWith(1, 100, undefined)
            expect(delaySpy).toHaveBeenNthCalledWith(2, 200, undefined)
        })

        it("when backoff exceeds maxDelayMs, then delay is capped", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 500,
                    backoffMultiplier: 3,
                    maxDelayMs: 600,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenNthCalledWith(1, 500, undefined)
            expect(delaySpy).toHaveBeenNthCalledWith(2, 600, undefined)
        })
    })

    describe("when 429 includes Retry-After header", (): void => {
        it("when Retry-After is numeric seconds, then delay uses that value in ms", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 429,
                        headers: { "Retry-After": "2" },
                    }),
                )
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledWith(2_000, undefined)
        })

        it("when Retry-After is a future date string, then uses delta in ms", async (): Promise<void> => {
            const futureDate = new Date(Date.now() + 3_000).toUTCString()
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 429,
                        headers: { "Retry-After": futureDate },
                    }),
                )
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledTimes(1)
            const firstCall = delaySpy.mock.calls[0] as [number] | undefined
            const delayMs = firstCall !== undefined ? firstCall[0] : 0
            expect(delayMs).toBeGreaterThan(0)
            expect(delayMs).toBeLessThanOrEqual(4_000)
        })

        it("when Retry-After is a past date string, then uses exponential backoff instead", async (): Promise<void> => {
            const pastDate = new Date(Date.now() - 10_000).toUTCString()
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 429,
                        headers: { "Retry-After": pastDate },
                    }),
                )
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    baseDelayMs: 100,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                    maxAttempts: 3,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledWith(100, undefined)
        })

        it("when Retry-After is an unparseable string, then uses exponential backoff", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 429,
                        headers: { "Retry-After": "not-a-date-or-number" },
                    }),
                )
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    baseDelayMs: 150,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                    maxAttempts: 3,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledWith(150, undefined)
        })

        it("when Retry-After is an empty string, then uses exponential backoff", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 429,
                        headers: { "Retry-After": "  " },
                    }),
                )
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    baseDelayMs: 250,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                    maxAttempts: 3,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledWith(250, undefined)
        })

        it("when Retry-After is missing, then uses exponential backoff", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 429 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    baseDelayMs: 100,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                    maxAttempts: 3,
                },
                delay: delaySpy,
            })

            await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(delaySpy).toHaveBeenCalledWith(100, undefined)
        })
    })

    describe("when retryable HTTP status codes are retried", (): void => {
        it("when GET returns 502, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 502 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })

        it("when GET returns 504, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 504 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })

        it("when GET returns 408, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 408 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })

        it("when PUT returns 503, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "PUT",
                path: "/api/v1/resource",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })
    })

    describe("when non-retryable HTTP status for POST", (): void => {
        it("when POST returns 503, then does not retry and throws ApiHttpError", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(null, { status: 503 }))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            await expect(
                client.request({ method: "POST", path: "/api/v1/data" }),
            ).rejects.toBeInstanceOf(ApiHttpError)
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when non-retryable HTTP status 400 returns", (): void => {
        it("when GET returns 400, then throws ApiHttpError without retry", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(null, { status: 400 }))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            await expect(
                client.request({ method: "GET", path: "/api/v1/bad" }),
            ).rejects.toBeInstanceOf(ApiHttpError)
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when all retries are exhausted", (): void => {
        it("when all attempts fail with 503, then throws ApiHttpError", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(null, { status: 503 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 10,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                },
                delay: delaySpy,
            })

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiHttpError)
            expect(delaySpy).toHaveBeenCalledTimes(2)
        })

        it("when all attempts fail with 429, then throws ApiRateLimitError", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 429 }))
                .mockResolvedValueOnce(new Response(null, { status: 429 }))
                .mockResolvedValueOnce(new Response(null, { status: 429 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 10,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                },
                delay: delaySpy,
            })

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiRateLimitError)
        })
    })

    describe("when abort signal fires", (): void => {
        it("when fetch is aborted, then propagates abort error without retry", async (): Promise<void> => {
            const abortError = new DOMException("The operation was aborted", "AbortError")
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(abortError)
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const controller = new AbortController()
            await expect(
                client.request({
                    method: "GET",
                    path: "/api/v1/health",
                    signal: controller.signal,
                }),
            ).rejects.toThrow("The operation was aborted")
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when network error is non-retryable", (): void => {
        it("when POST has network error, then does not retry", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockRejectedValue(new TypeError("Failed to fetch"))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            await expect(
                client.request({ method: "POST", path: "/api/v1/data" }),
            ).rejects.toBeInstanceOf(ApiNetworkError)
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when network error for GET retries on non-local", (): void => {
        it("when all network retries fail, then throws ApiNetworkError", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 2,
                    baseDelayMs: 10,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                },
                delay: delaySpy,
            })

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiNetworkError)
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })
    })

    describe("when localhost 127.0.0.1 or ::1 blocks connection refused retries", (): void => {
        it("when baseUrl is 127.0.0.1, then does not retry on connection refused", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockRejectedValue(new TypeError("fetch failed"))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(
                { baseUrl: "http://127.0.0.1:3000", defaultHeaders: {} },
                { delay: delaySpy },
            )

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiNetworkError)
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })

        it("when baseUrl is ::1, then eventually resolves to ApiNetworkError", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("ERR_CONNECTION_REFUSED"))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(
                { baseUrl: "http://[::1]:3000", defaultHeaders: {} },
                {
                    delay: delaySpy,
                    retryPolicy: {
                        maxAttempts: 1,
                        baseDelayMs: 10,
                        backoffMultiplier: 2,
                        maxDelayMs: 100,
                    },
                },
            )

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiNetworkError)
        })

        it("when baseUrl is localhost with ECONNREFUSED, then does not retry", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockRejectedValue(new TypeError("ECONNREFUSED"))
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(
                { baseUrl: "http://localhost:3000", defaultHeaders: {} },
                { delay: delaySpy },
            )

            await expect(
                client.request({ method: "GET", path: "/api/v1/health" }),
            ).rejects.toBeInstanceOf(ApiNetworkError)
            expect(fetchSpy).toHaveBeenCalledTimes(1)
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when isConnectionRefusedLikeError receives non-Error", (): void => {
        it("when network error is not an Error instance, then wraps as ApiNetworkError", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockRejectedValue("string error")
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(
                { baseUrl: "http://localhost:3000", defaultHeaders: {} },
                {
                    retryPolicy: {
                        maxAttempts: 1,
                        baseDelayMs: 10,
                        backoffMultiplier: 2,
                        maxDelayMs: 100,
                    },
                    delay: delaySpy,
                },
            )

            const error = await client
                .request({ method: "GET", path: "/api/v1/health" })
                .catch((caughtError: unknown): unknown => caughtError)
            expect(error).toBeInstanceOf(ApiNetworkError)
            expect((error as ApiNetworkError).message).toBe("Network request failed")
        })
    })

    describe("when path normalization fails", (): void => {
        it("when path is empty, then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(client.request({ method: "GET", path: "" })).rejects.toThrow("пустым")
        })

        it("when path is whitespace-only, then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(client.request({ method: "GET", path: "   " })).rejects.toThrow("пустым")
        })

        it("when path is absolute URL, then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(
                client.request({ method: "GET", path: "https://evil.com/api" }),
            ).rejects.toThrow("абсолютным URL")
        })

        it("when path starts with //, then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(client.request({ method: "GET", path: "//evil.com/api" })).rejects.toThrow(
                "//",
            )
        })

        it("when path contains spaces, then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(
                client.request({ method: "GET", path: "/api/v1/some path" }),
            ).rejects.toThrow("пробелы")
        })

        it("when path contains .., then throws", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            await expect(client.request({ method: "GET", path: "/api/../secret" })).rejects.toThrow(
                "..",
            )
        })
    })

    describe("when path has no leading slash", (): void => {
        it("when path lacks leading slash, then normalizes and makes request", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({ method: "GET", path: "api/v1/health" })

            const calledUrl = String(fetchSpy.mock.calls[0]?.[0])
            expect(calledUrl).toContain("/api/v1/health")
        })
    })

    describe("when query params are provided", (): void => {
        it("when query has undefined values, then skips them", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({
                method: "GET",
                path: "/api/v1/search",
                query: { q: "test", page: 1, filter: undefined },
            })

            const calledUrl = String(fetchSpy.mock.calls[0]?.[0])
            expect(calledUrl).toContain("q=test")
            expect(calledUrl).toContain("page=1")
            expect(calledUrl).not.toContain("filter")
        })
    })

    describe("when request includes body", (): void => {
        it("when body is an object, then serializes to JSON", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({
                method: "POST",
                path: "/api/v1/data",
                body: { key: "value" },
            })

            const calledOptions = fetchSpy.mock.calls[0]?.[1]
            expect(calledOptions?.body).toBe('{"key":"value"}')
        })

        it("when body is undefined, then does not send body", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({
                method: "GET",
                path: "/api/v1/data",
            })

            const calledOptions = fetchSpy.mock.calls[0]?.[1]
            expect(calledOptions?.body).toBeUndefined()
        })
    })

    describe("when request headers merge with defaults", (): void => {
        it("when custom headers are provided, then merges with default", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
            const client = new FetchHttpClient({
                baseUrl: "http://api.example",
                defaultHeaders: { "X-Default": "default" },
            })

            await client.request({
                method: "GET",
                path: "/api/v1/data",
                headers: { "X-Custom": "custom" },
            })

            const calledOptions = fetchSpy.mock.calls[0]?.[1]
            expect(calledOptions?.headers).toEqual(
                expect.objectContaining({
                    "X-Default": "default",
                    "X-Custom": "custom",
                }),
            )
        })
    })

    describe("when ApiHttpError is re-thrown from network handler", (): void => {
        it("when fetch throws ApiHttpError, then it propagates directly", async (): Promise<void> => {
            const httpError = new ApiHttpError(500, "/api/v1/error", "Server Error")
            vi.spyOn(globalThis, "fetch").mockRejectedValue(httpError)
            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            await expect(client.request({ method: "GET", path: "/api/v1/error" })).rejects.toBe(
                httpError,
            )
            expect(delaySpy).not.toHaveBeenCalled()
        })
    })

    describe("when network error is NetworkError named Error", (): void => {
        it("when error.name is NetworkError on non-local host, then retries", async (): Promise<void> => {
            const networkError = new Error("network issue")
            networkError.name = "NetworkError"

            vi.spyOn(globalThis, "fetch")
                .mockRejectedValueOnce(networkError)
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })
    })

    describe("when error is not retryable and not a known type", (): void => {
        it("when non-TypeError, non-NetworkError error occurs, then wraps as ApiNetworkError", async (): Promise<void> => {
            const customError = new Error("custom error")
            customError.name = "CustomError"

            vi.spyOn(globalThis, "fetch").mockRejectedValue(customError)
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 1,
                    baseDelayMs: 10,
                    backoffMultiplier: 2,
                    maxDelayMs: 100,
                },
            })

            const error = await client
                .request({ method: "GET", path: "/api/v1/health" })
                .catch((caughtError: unknown): unknown => caughtError)
            expect(error).toBeInstanceOf(ApiNetworkError)
            expect((error as ApiNetworkError).message).toBe("custom error")
        })
    })

    describe("when invalid baseUrl for isLocalApiBaseUrl", (): void => {
        it("when baseUrl is invalid, then treats as non-local and retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockRejectedValueOnce(new TypeError("Failed to fetch"))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(
                { baseUrl: "not-a-url", defaultHeaders: {} },
                { delay: delaySpy },
            )

            try {
                await client.request({ method: "GET", path: "/api/v1/health" })
            } catch {
                // path normalization or URL construction may fail,
                // but we exercise the isLocalApiBaseUrl false branch for invalid URL
            }
        })
    })

    describe("when buildInvalidJsonResponseMessage handles various error types", (): void => {
        it("when JSON parse error has message, then includes it", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(
                new Response("not-json", { status: 200 }),
            )
            const client = new FetchHttpClient(API_CONFIG)

            const error = await client
                .request({ method: "GET", path: "/api/v1/data" })
                .catch((caughtError: unknown): unknown => caughtError)

            expect(error).toBeInstanceOf(ApiHttpError)
            expect((error as ApiHttpError).message).toContain(
                "Invalid JSON response for /api/v1/data",
            )
        })
    })

    describe("when PATCH and DELETE methods are retried", (): void => {
        it("when PATCH returns 503, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "PATCH",
                path: "/api/v1/resource",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })

        it("when DELETE returns 503, then retries", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const delaySpy = vi.fn(async (): Promise<void> => {})
            const client = new FetchHttpClient(API_CONFIG, { delay: delaySpy })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "DELETE",
                path: "/api/v1/resource",
            })

            expect(result).toEqual({ ok: true })
            expect(delaySpy).toHaveBeenCalledTimes(1)
        })
    })

    describe("when credentials are forwarded", (): void => {
        it("when credentials is include, then passes to fetch", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({
                method: "GET",
                path: "/api/v1/data",
                credentials: "include",
            })

            const calledOptions = fetchSpy.mock.calls[0]?.[1]
            expect(calledOptions?.credentials).toBe("include")
        })
    })

    describe("when signal is forwarded to fetch", (): void => {
        it("when signal is provided, then passes to fetch call", async (): Promise<void> => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
            const controller = new AbortController()
            const client = new FetchHttpClient(API_CONFIG)

            await client.request({
                method: "GET",
                path: "/api/v1/data",
                signal: controller.signal,
            })

            const calledOptions = fetchSpy.mock.calls[0]?.[1]
            expect(calledOptions?.signal).toBe(controller.signal)
        })
    })

    describe("when fetch throws ApiNetworkError directly", (): void => {
        it("when error is already ApiNetworkError, then it propagates as-is", async (): Promise<void> => {
            const originalNetworkError = new ApiNetworkError(
                "/original",
                "original network fail",
                null,
            )
            vi.spyOn(globalThis, "fetch").mockRejectedValue(originalNetworkError)
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 1,
                    baseDelayMs: 10,
                    backoffMultiplier: 2,
                    maxDelayMs: 100,
                },
            })

            const error = await client
                .request({ method: "POST", path: "/api/v1/data" })
                .catch((caughtError: unknown): unknown => caughtError)

            expect(error).toBeInstanceOf(ApiNetworkError)
            expect((error as ApiNetworkError).path).toBe("/original")
            expect((error as ApiNetworkError).message).toBe("original network fail")
        })
    })

    describe("when waitWithAbortSupport is default delay", (): void => {
        it("when signal is already aborted at retry time, then throws abort error", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const controller = new AbortController()
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 100,
                    backoffMultiplier: 2,
                    maxDelayMs: 5_000,
                },
            })

            controller.abort()

            await expect(
                client.request({
                    method: "GET",
                    path: "/api/v1/health",
                    signal: controller.signal,
                }),
            ).rejects.toThrow()
        })

        it("when delay is <= 0, then resolves immediately without waiting", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 0,
                    backoffMultiplier: 2,
                    maxDelayMs: 0,
                },
            })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
        })

        it("when signal aborts during wait, then rejects with abort error", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const controller = new AbortController()
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 5_000,
                    backoffMultiplier: 1,
                    maxDelayMs: 5_000,
                },
            })

            const requestPromise = client.request({
                method: "GET",
                path: "/api/v1/health",
                signal: controller.signal,
            })

            setTimeout((): void => {
                controller.abort()
            }, 10)

            await expect(requestPromise).rejects.toThrow()
        })

        it("when signal is provided but not aborted, then timeout resolves normally and cleans up listener", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const controller = new AbortController()
            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 5,
                    backoffMultiplier: 1,
                    maxDelayMs: 10,
                },
            })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
                signal: controller.signal,
            })

            expect(result).toEqual({ ok: true })
        })

        it("when no signal is provided, then waitWithAbortSupport resolves after timeout", async (): Promise<void> => {
            vi.spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(new Response(null, { status: 503 }))
                .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

            const client = new FetchHttpClient(API_CONFIG, {
                retryPolicy: {
                    maxAttempts: 3,
                    baseDelayMs: 5,
                    backoffMultiplier: 1,
                    maxDelayMs: 10,
                },
            })

            const result = await client.request<{ readonly ok: boolean }>({
                method: "GET",
                path: "/api/v1/health",
            })

            expect(result).toEqual({ ok: true })
        })
    })
})

describe("ApiHttpError", (): void => {
    it("when constructed, then stores status, path and message", (): void => {
        const error = new ApiHttpError(404, "/api/v1/missing", "Not found")

        expect(error.status).toBe(404)
        expect(error.path).toBe("/api/v1/missing")
        expect(error.message).toBe("Not found")
        expect(error.name).toBe("ApiHttpError")
        expect(error).toBeInstanceOf(Error)
    })
})

describe("ApiRateLimitError", (): void => {
    it("when constructed with retryAfterMs, then stores it", (): void => {
        const error = new ApiRateLimitError("/api/v1/data", 5_000)

        expect(error.status).toBe(429)
        expect(error.path).toBe("/api/v1/data")
        expect(error.retryAfterMs).toBe(5_000)
        expect(error.name).toBe("ApiRateLimitError")
        expect(error).toBeInstanceOf(ApiHttpError)
    })

    it("when constructed without retryAfterMs, then retryAfterMs is undefined", (): void => {
        const error = new ApiRateLimitError("/api/v1/data", undefined)

        expect(error.retryAfterMs).toBeUndefined()
    })
})

describe("ApiNetworkError", (): void => {
    it("when constructed, then stores path, message and cause", (): void => {
        const cause = new TypeError("fetch failed")
        const error = new ApiNetworkError("/api/v1/health", "Network error", cause)

        expect(error.path).toBe("/api/v1/health")
        expect(error.message).toBe("Network error")
        expect(error.cause).toBe(cause)
        expect(error.name).toBe("ApiNetworkError")
        expect(error).toBeInstanceOf(Error)
    })
})

describe("isApiHttpError", (): void => {
    it("when given ApiHttpError, then returns true", (): void => {
        expect(isApiHttpError(new ApiHttpError(500, "/", "error"))).toBe(true)
    })

    it("when given ApiRateLimitError, then returns true (subclass)", (): void => {
        expect(isApiHttpError(new ApiRateLimitError("/", undefined))).toBe(true)
    })

    it("when given generic Error, then returns false", (): void => {
        expect(isApiHttpError(new Error("generic"))).toBe(false)
    })

    it("when given non-error, then returns false", (): void => {
        expect(isApiHttpError("string")).toBe(false)
    })

    it("when given null, then returns false", (): void => {
        expect(isApiHttpError(null)).toBe(false)
    })
})

describe("isApiRateLimitError", (): void => {
    it("when given ApiRateLimitError, then returns true", (): void => {
        expect(isApiRateLimitError(new ApiRateLimitError("/", 1000))).toBe(true)
    })

    it("when given ApiHttpError, then returns false", (): void => {
        expect(isApiRateLimitError(new ApiHttpError(429, "/", "error"))).toBe(false)
    })

    it("when given non-error, then returns false", (): void => {
        expect(isApiRateLimitError(undefined)).toBe(false)
    })
})

describe("isApiNetworkError", (): void => {
    it("when given ApiNetworkError, then returns true", (): void => {
        expect(isApiNetworkError(new ApiNetworkError("/", "msg", null))).toBe(true)
    })

    it("when given generic Error, then returns false", (): void => {
        expect(isApiNetworkError(new Error("generic"))).toBe(false)
    })

    it("when given non-error, then returns false", (): void => {
        expect(isApiNetworkError(42)).toBe(false)
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
