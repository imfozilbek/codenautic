import {afterEach, describe, expect, it, vi} from "vitest"

import {createApiConfig} from "@/lib/api/config"
import {SystemApi} from "@/lib/api/endpoints/system.endpoint"
import {
    ApiHttpError,
    ApiNetworkError,
    ApiRateLimitError,
    FetchHttpClient,
    isApiHttpError,
    isApiNetworkError,
    isApiRateLimitError,
} from "@/lib/api/http-client"

const ORIGINAL_FETCH: typeof fetch = globalThis.fetch

describe("UI API contract", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
        globalThis.fetch = ORIGINAL_FETCH
    })

    it("использует дефолтный API URL в dev режиме", (): void => {
        const config = createApiConfig({MODE: "development"})

        expect(config.baseUrl).toBe("http://localhost:3000")
        expect(config.defaultHeaders["Content-Type"]).toBe("application/json")
    })

    it("добавляет bearer token в default headers", (): void => {
        const config = createApiConfig({
            MODE: "development",
            VITE_API_BEARER_TOKEN: "  secret-token  ",
        })

        expect(config.defaultHeaders.Authorization).toBe("Bearer secret-token")
    })

    it("бросает ошибку при пустом VITE_API_BEARER_TOKEN", (): void => {
        expect((): void => {
            createApiConfig({
                MODE: "development",
                VITE_API_BEARER_TOKEN: "  ",
            })
        }).toThrowError("VITE_API_BEARER_TOKEN не должен быть пустым")
    })

    it("бросает ошибку при пустом VITE_API_URL", (): void => {
        expect((): void => {
            createApiConfig({VITE_API_URL: "   "})
        }).toThrowError("VITE_API_URL не должен быть пустым")
    })

    it("бросает ошибку при отсутствии VITE_API_URL в production", (): void => {
        expect((): void => {
            createApiConfig({MODE: "production"})
        }).toThrowError("VITE_API_URL обязателен в production режиме")
    })

    it("бросает ошибку при PROD=true и отсутствии VITE_API_URL", (): void => {
        expect((): void => {
            createApiConfig({MODE: "development", PROD: true})
        }).toThrowError("VITE_API_URL обязателен в production режиме")
    })

    it("бросает ошибку при невалидном абсолютном URL", (): void => {
        expect((): void => {
            createApiConfig({VITE_API_URL: "localhost:3000"})
        }).toThrowError("VITE_API_URL должен использовать http или https")
    })

    it("бросает ошибку при синтаксически невалидном URL", (): void => {
        expect((): void => {
            createApiConfig({VITE_API_URL: "http://[::1"})
        }).toThrowError("VITE_API_URL должен быть абсолютным URL")
    })

    it("нормализует VITE_API_URL без завершающего слеша", (): void => {
        const config = createApiConfig({VITE_API_URL: "http://localhost:3000/"})

        expect(config.baseUrl).toBe("http://localhost:3000")
    })

    it("сохраняет VITE_API_URL без завершающего слеша без изменений", (): void => {
        const config = createApiConfig({VITE_API_URL: "http://localhost:3001"})

        expect(config.baseUrl).toBe("http://localhost:3001")
    })

    it("делает GET /api/v1/health и возвращает типизированный ответ", async (): Promise<void> => {
        globalThis.fetch = vi.fn((input: RequestInfo | URL): Promise<Response> => {
            const requestedUrl =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url

            expect(requestedUrl).toBe("http://localhost:3000/api/v1/health")

            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        status: "ok",
                        service: "api",
                        timestamp: "2026-03-01T00:00:00.000Z",
                    }),
                    {
                        status: 200,
                    },
                ),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))
        const api = new SystemApi(httpClient)

        const response = await api.getHealth()
        expect(response.status).toBe("ok")
        expect(response.service).toBe("api")
    })

    it("передает auth и кастомные заголовки в запрос", async (): Promise<void> => {
        globalThis.fetch = vi.fn(
            (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                const headers = init?.headers
                if (
                    headers === undefined ||
                    headers instanceof Headers ||
                    Array.isArray(headers)
                ) {
                    throw new Error("Headers должны быть plain object")
                }

                expect(headers.Authorization).toBe("Bearer token-value")
                expect(headers["X-Trace-Id"]).toBe("trace-1")
                expect(headers["Content-Type"]).toBe("application/json")

                return Promise.resolve(
                    new Response(JSON.stringify({status: "ok"}), {
                        status: 200,
                    }),
                )
            },
        ) as unknown as typeof fetch

        const config = createApiConfig({
            MODE: "development",
            VITE_API_BEARER_TOKEN: "token-value",
        })

        const httpClient = new FetchHttpClient(config)
        await httpClient.request({
            method: "GET",
            path: "/api/v1/health",
            headers: {
                "X-Trace-Id": "trace-1",
            },
        })
    })

    it("ретраит 503 с экспоненциальным backoff и возвращает успешный ответ", async (): Promise<void> => {
        let callIndex = 0
        globalThis.fetch = vi.fn((): Promise<Response> => {
            callIndex += 1

            if (callIndex === 1) {
                return Promise.resolve(
                    new Response(JSON.stringify({message: "unavailable"}), {
                        status: 503,
                    }),
                )
            }

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
        })

        const response = await httpClient.request<{status: string}>({
            method: "GET",
            path: "/api/v1/health",
        })

        expect(response.status).toBe("ok")
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
        expect(delay).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenNthCalledWith(1, 200, undefined)
    })

    it("ретраит network-ошибку и завершает запрос после восстановления сети", async (): Promise<void> => {
        let callIndex = 0
        globalThis.fetch = vi.fn((): Promise<Response> => {
            callIndex += 1

            if (callIndex === 1) {
                return Promise.reject(new TypeError("Failed to fetch"))
            }

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
        })

        const response = await httpClient.request<{status: string}>({
            method: "GET",
            path: "/api/v1/health",
        })

        expect(response.status).toBe("ok")
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
        expect(delay).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenNthCalledWith(1, 200, undefined)
    })

    it("обрабатывает 429 с Retry-After и повторяет запрос после указанной задержки", async (): Promise<void> => {
        let callIndex = 0
        globalThis.fetch = vi.fn((): Promise<Response> => {
            callIndex += 1

            if (callIndex === 1) {
                return Promise.resolve(
                    new Response(JSON.stringify({message: "too many requests"}), {
                        status: 429,
                        headers: {
                            "Retry-After": "1",
                        },
                    }),
                )
            }

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
        })

        const response = await httpClient.request<{status: string}>({
            method: "GET",
            path: "/api/v1/health",
        })

        expect(response.status).toBe("ok")
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
        expect(delay).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenNthCalledWith(1, 1000, undefined)
    })

    it("поддерживает Retry-After в формате HTTP-date", async (): Promise<void> => {
        const retryDate = new Date(Date.now() + 2_000).toUTCString()
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "too many requests"}), {
                    status: 429,
                    headers: {
                        "Retry-After": retryDate,
                    },
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiRateLimitError")
        } catch (error: unknown) {
            expect(isApiRateLimitError(error)).toBe(true)
            if (isApiRateLimitError(error)) {
                expect(error.retryAfterMs).toBeGreaterThan(0)
            }
        }
    })

    it("игнорирует невалидный Retry-After заголовок", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "too many requests"}), {
                    status: 429,
                    headers: {
                        "Retry-After": "not-a-date",
                    },
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiRateLimitError")
        } catch (error: unknown) {
            expect(isApiRateLimitError(error)).toBe(true)
            if (isApiRateLimitError(error)) {
                expect(error.retryAfterMs).toBeUndefined()
            }
        }
    })

    it("игнорирует пустой Retry-After заголовок", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "too many requests"}), {
                    status: 429,
                    headers: {
                        "Retry-After": "   ",
                    },
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiRateLimitError")
        } catch (error: unknown) {
            expect(isApiRateLimitError(error)).toBe(true)
            if (isApiRateLimitError(error)) {
                expect(error.retryAfterMs).toBeUndefined()
            }
        }
    })

    it("игнорирует Retry-After дату в прошлом", async (): Promise<void> => {
        const pastDate = new Date(Date.now() - 5_000).toUTCString()
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "too many requests"}), {
                    status: 429,
                    headers: {
                        "Retry-After": pastDate,
                    },
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiRateLimitError")
        } catch (error: unknown) {
            expect(isApiRateLimitError(error)).toBe(true)
            if (isApiRateLimitError(error)) {
                expect(error.retryAfterMs).toBeUndefined()
            }
        }
    })

    it("прокидывает ApiRateLimitError после исчерпания попыток", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "too many requests"}), {
                    status: 429,
                    headers: {
                        "Retry-After": "3",
                    },
                }),
            )
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
            retryPolicy: {
                maxAttempts: 2,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiRateLimitError")
        } catch (error: unknown) {
            expect(isApiRateLimitError(error)).toBe(true)
            if (isApiRateLimitError(error)) {
                expect(error.retryAfterMs).toBe(3000)
            }
        }

        expect(delay).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenNthCalledWith(1, 3000, undefined)
    })

    it("отменяет ожидание backoff по AbortSignal во время retry", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(new TypeError("Failed to fetch"))
        }) as unknown as typeof fetch

        const controller = new AbortController()
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 2,
                baseDelayMs: 500,
                maxDelayMs: 500,
            },
        })

        const requestPromise = httpClient.request({
            method: "GET",
            path: "/api/v1/health",
            signal: controller.signal,
        })

        setTimeout((): void => {
            controller.abort()
        }, 10)

        await expect(requestPromise).rejects.toMatchObject({
            name: "AbortError",
        })
    })

    it("прерывает retry при заранее отмененном сигнале", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(new TypeError("Failed to fetch"))
        }) as unknown as typeof fetch

        const controller = new AbortController()
        controller.abort()

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 2,
            },
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
                signal: controller.signal,
            }),
        ).rejects.toMatchObject({
            name: "AbortError",
        })
    })

    it("использует fallback AbortError без DOMException", async (): Promise<void> => {
        const originalDomException = globalThis.DOMException
        Object.defineProperty(globalThis, "DOMException", {
            value: undefined,
            writable: true,
            configurable: true,
        })

        try {
            globalThis.fetch = vi.fn((): Promise<Response> => {
                return Promise.reject(new TypeError("Failed to fetch"))
            }) as unknown as typeof fetch

            const controller = new AbortController()
            controller.abort()

            const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
                retryPolicy: {
                    maxAttempts: 2,
                },
            })

            await expect(
                httpClient.request({
                    method: "GET",
                    path: "/api/v1/health",
                    signal: controller.signal,
                }),
            ).rejects.toMatchObject({
                name: "AbortError",
                message: "The operation was aborted",
            })
        } finally {
            Object.defineProperty(globalThis, "DOMException", {
                value: originalDomException,
                writable: true,
                configurable: true,
            })
        }
    })

    it("не ретраит отмененный запрос и пробрасывает AbortError", async (): Promise<void> => {
        const abortError = new DOMException("The operation was aborted", "AbortError")
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(abortError)
        }) as unknown as typeof fetch

        const controller = new AbortController()
        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
                signal: controller.signal,
            }),
        ).rejects.toMatchObject({
            name: "AbortError",
        })

        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenCalledTimes(0)
    })

    it("прокидывает ApiHttpError для неуспешного ответа", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "bad request"}), {
                    status: 400,
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).rejects.toBeInstanceOf(ApiHttpError)
    })

    it("не ретраит 503 для non-retryable POST запроса", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.resolve(
                new Response(JSON.stringify({message: "unavailable"}), {
                    status: 503,
                }),
            )
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
            retryPolicy: {
                maxAttempts: 3,
            },
        })

        await expect(
            httpClient.request({
                method: "POST",
                path: "/api/v1/rules",
                body: {
                    name: "rule",
                },
            }),
        ).rejects.toBeInstanceOf(ApiHttpError)

        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenCalledTimes(0)
    })

    it("не ретраит network-ошибку для non-retryable POST запроса", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(new TypeError("Failed to fetch"))
        }) as unknown as typeof fetch

        const delay = vi.fn(async (): Promise<void> => Promise.resolve())
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            delay,
            retryPolicy: {
                maxAttempts: 3,
            },
        })

        await expect(
            httpClient.request({
                method: "POST",
                path: "/api/v1/rules",
                body: {
                    name: "rule",
                },
            }),
        ).rejects.toBeInstanceOf(ApiNetworkError)

        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(delay).toHaveBeenCalledTimes(0)
    })

    it("пропускает через fetch-ошибку типа ApiHttpError без обертки", async (): Promise<void> => {
        const originalError = new ApiHttpError(418, "/api/v1/health", "teapot")
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(originalError)
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).rejects.toBe(originalError)
    })

    it("прокидывает ApiNetworkError для non-retryable network-сбоя", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            const unknownError = new Error("socket closed")
            unknownError.name = "SocketClosedError"
            return Promise.reject(unknownError)
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).rejects.toBeInstanceOf(ApiNetworkError)
    })

    it("возвращает исходный ApiNetworkError без дополнительной обертки", async (): Promise<void> => {
        const originalError = new ApiNetworkError(
            "/api/v1/health",
            "prebuilt network error",
            new Error("cause"),
        )
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return Promise.reject(originalError)
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).rejects.toBe(originalError)
    })

    it("оборачивает non-error причину в ApiNetworkError", async (): Promise<void> => {
        globalThis.fetch = vi.fn((): Promise<Response> => {
            return new Promise<Response>((_resolve, reject): void => {
                reject("network-failure" as unknown as Error)
            })
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 1,
            },
        })

        try {
            await httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            })
            throw new Error("Ожидалась ошибка ApiNetworkError")
        } catch (error: unknown) {
            expect(isApiNetworkError(error)).toBe(true)
            if (isApiNetworkError(error)) {
                expect(error.message).toBe("Network request failed")
                expect(error.cause).toBe("network-failure")
            }
        }
    })

    it("корректно обрабатывает retry c нулевым backoff", async (): Promise<void> => {
        let callIndex = 0
        globalThis.fetch = vi.fn((): Promise<Response> => {
            callIndex += 1

            if (callIndex === 1) {
                return Promise.resolve(
                    new Response(JSON.stringify({message: "unavailable"}), {
                        status: 503,
                    }),
                )
            }

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 2,
                baseDelayMs: 0,
                maxDelayMs: 0,
            },
        })

        const response = await httpClient.request<{status: string}>({
            method: "GET",
            path: "/api/v1/health",
        })

        expect(response.status).toBe("ok")
    })

    it("поддерживает retry с signal без abort и снимает abort listener после ожидания", async (): Promise<void> => {
        let callIndex = 0
        globalThis.fetch = vi.fn((): Promise<Response> => {
            callIndex += 1

            if (callIndex === 1) {
                return Promise.reject(new TypeError("Failed to fetch"))
            }

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const controller = new AbortController()
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 2,
                baseDelayMs: 1,
                maxDelayMs: 1,
            },
        })

        const response = await httpClient.request<{status: string}>({
            method: "GET",
            path: "/api/v1/health",
            signal: controller.signal,
        })

        expect(response.status).toBe("ok")
        expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it("бросает защитную ошибку при некорректной retry политике maxAttempts=0", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}), {
            retryPolicy: {
                maxAttempts: 0,
            },
        })

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api/v1/health",
            }),
        ).rejects.toThrowError("Unreachable: retry loop exited unexpectedly")
    })

    it("формирует query string и пропускает undefined query значения", async (): Promise<void> => {
        globalThis.fetch = vi.fn((input: RequestInfo | URL): Promise<Response> => {
            const requestedUrl =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url

            const parsed = new URL(requestedUrl)
            expect(parsed.searchParams.get("page")).toBe("2")
            expect(parsed.searchParams.get("withDetails")).toBe("true")
            expect(parsed.searchParams.has("ignored")).toBe(false)

            return Promise.resolve(
                new Response(JSON.stringify({status: "ok"}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))
        await httpClient.request({
            method: "GET",
            path: "/api/v1/health",
            query: {
                page: 2,
                withDetails: true,
                ignored: undefined,
            },
        })
    })

    it("сериализует body в JSON для non-GET запроса", async (): Promise<void> => {
        globalThis.fetch = vi.fn(
            (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                expect(init?.body).toBe(JSON.stringify({name: "rule"}))

                return Promise.resolve(
                    new Response(JSON.stringify({status: "ok"}), {
                        status: 200,
                    }),
                )
            },
        ) as unknown as typeof fetch

        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))
        await httpClient.request({
            method: "POST",
            path: "/api/v1/rules",
            body: {
                name: "rule",
            },
        })
    })

    it("предоставляет корректные type guards для ошибок API-клиента", (): void => {
        const httpError = new ApiHttpError(500, "/api/v1/health", "HTTP 500")
        const rateLimitError = new ApiRateLimitError("/api/v1/health", 1000)
        const networkError = new ApiNetworkError("/api/v1/health", "Failed to fetch", new Error("cause"))

        expect(isApiHttpError(httpError)).toBe(true)
        expect(isApiHttpError(rateLimitError)).toBe(true)
        expect(isApiHttpError(networkError)).toBe(false)
        expect(isApiRateLimitError(rateLimitError)).toBe(true)
        expect(isApiRateLimitError(httpError)).toBe(false)
        expect(isApiNetworkError(networkError)).toBe(true)
        expect(isApiNetworkError(new Error("unknown"))).toBe(false)
        expect(isApiRateLimitError("429")).toBe(false)
    })

    it("блокирует абсолютный URL в path", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "https://evil.example/steal",
            }),
        ).rejects.toThrowError("Request path не должен быть абсолютным URL")
    })

    it("блокирует traversal сегменты в path", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "../api/v1/health",
            }),
        ).rejects.toThrowError("Request path не должен содержать '..'")
    })

    it("блокирует пустой path", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "   ",
            }),
        ).rejects.toThrowError("Request path не должен быть пустым")
    })

    it("блокирует path, начинающийся с //", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "//evil.local/path",
            }),
        ).rejects.toThrowError("Request path не должен начинаться с //")
    })

    it("блокирует path с пробелами", async (): Promise<void> => {
        const httpClient = new FetchHttpClient(createApiConfig({MODE: "development"}))

        await expect(
            httpClient.request({
                method: "GET",
                path: "/api v1/health",
            }),
        ).rejects.toThrowError("Request path не должен содержать пробелы")
    })
})
