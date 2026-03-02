import {describe, expect, it, vi} from "vitest"
import * as Sentry from "@sentry/react"

import {
    createSentryBrowserConfig,
    initializeSentryBrowser,
    resolveSentryEnvironment,
    resolveSentrySampleRate,
    sanitizeHeaders,
    sanitizeRequestUrl,
    sanitizeSentryPayload,
    type ISentryBrowserEnv,
} from "@/lib/monitoring/sentry"

describe("sentry monitoring", (): void => {
    it("не создаёт runtime config без VITE_SENTRY_DSN", (): void => {
        const config = createSentryBrowserConfig(
            {
                MODE: "development",
            },
            "https://ui.example/dashboard",
        )

        expect(config).toBeUndefined()
    })

    it("создаёт runtime config с env fallback и trace targets", (): void => {
        const config = createSentryBrowserConfig(
            {
                MODE: "production",
                VITE_API_URL: "https://api.example/v1",
                VITE_SENTRY_DSN: "https://key@sentry.io/1",
                VITE_SENTRY_RELEASE: "ui@1.0.0",
            },
            "https://app.example/dashboard",
        )

        if (config === undefined) {
            throw new Error("Ожидался валидный Sentry config")
        }

        expect(config.environment).toBe("production")
        expect(config.release).toBe("ui@1.0.0")
        expect(config.tracesSampleRate).toBe(0.2)
        expect(config.profilesSampleRate).toBe(0)
        expect(config.tracePropagationTargets.includes("https://api.example")).toBe(true)
        expect(config.tracePropagationTargets.includes("https://app.example")).toBe(true)
        expect(config.tracePropagationTargets.includes("localhost")).toBe(true)
    })

    it("нормализует environment с приоритетом VITE_SENTRY_ENVIRONMENT", (): void => {
        expect(
            resolveSentryEnvironment({
                MODE: "development",
                VITE_SENTRY_ENVIRONMENT: "staging",
            }),
        ).toBe("staging")

        expect(
            resolveSentryEnvironment({
                MODE: "test",
                VITE_SENTRY_ENVIRONMENT: "  ",
            }),
        ).toBe("test")

        expect(resolveSentryEnvironment({})).toBe("development")
    })

    it("нормализует sample rate с fallback для невалидных значений", (): void => {
        expect(resolveSentrySampleRate("0.5", 0.1)).toBe(0.5)
        expect(resolveSentrySampleRate(undefined, 0.1)).toBe(0.1)
        expect(resolveSentrySampleRate("", 0.1)).toBe(0.1)
        expect(resolveSentrySampleRate("abc", 0.1)).toBe(0.1)
        expect(resolveSentrySampleRate("-1", 0.1)).toBe(0.1)
        expect(resolveSentrySampleRate("2", 0.1)).toBe(0.1)
    })

    it("редактирует чувствительные query-параметры в absolute и relative URL", (): void => {
        const absoluteUrl = sanitizeRequestUrl(
            "https://app.example/page?token=abc&project=ui&access_token=secret",
        )
        expect(absoluteUrl.includes("token=%5BREDACTED%5D")).toBe(true)
        expect(absoluteUrl.includes("access_token=%5BREDACTED%5D")).toBe(true)
        expect(absoluteUrl.includes("project=ui")).toBe(true)

        const relativeUrl = sanitizeRequestUrl("/review?refresh_token=secret&sort=desc")
        expect(relativeUrl.includes("refresh_token=%5BREDACTED%5D")).toBe(true)
        expect(relativeUrl.includes("sort=desc")).toBe(true)

        expect(sanitizeRequestUrl("not-a-valid-url")).toBe("not-a-valid-url")
    })

    it("редактирует чувствительные заголовки без изменения остальных", (): void => {
        const sanitized = sanitizeHeaders({
            Authorization: "Bearer secret",
            Cookie: "session=token",
            "X-Trace-Id": "trace-1",
        })

        expect(sanitized.Authorization).toBe("[REDACTED]")
        expect(sanitized.Cookie).toBe("[REDACTED]")
        expect(sanitized["X-Trace-Id"]).toBe("trace-1")
    })

    it("редактирует request и breadcrumbs в sentry payload", (): void => {
        const sanitizedPayload = sanitizeSentryPayload({
            request: {
                url: "https://api.example/review?api_key=secret&name=ui",
                headers: {
                    Authorization: "Bearer top-secret",
                    "X-Request-Id": "req-1",
                },
            },
            breadcrumbs: [
                {
                    data: {
                        url: "/internal?token=secret",
                        headers: {
                            cookie: "session=top-secret",
                            "x-trace-id": "trace-1",
                        },
                    },
                },
                "noop",
            ],
        }) as {
            readonly request: {
                readonly url: string
                readonly headers: Record<string, unknown>
            }
            readonly breadcrumbs: Array<{readonly data: {readonly url: string}} | string>
        }

        expect(sanitizedPayload.request.url.includes("api_key=%5BREDACTED%5D")).toBe(true)
        expect(sanitizedPayload.request.headers.Authorization).toBe("[REDACTED]")
        const firstBreadcrumb = sanitizedPayload.breadcrumbs[0]
        if (firstBreadcrumb === undefined) {
            throw new Error("Ожидался первый breadcrumb")
        }
        expect(firstBreadcrumb).not.toBe("noop")
        if (typeof firstBreadcrumb === "string") {
            throw new Error("Ожидался object breadcrumb")
        }
        expect(firstBreadcrumb.data.url.includes("token=%5BREDACTED%5D")).toBe(true)

        expect(sanitizeSentryPayload("plain-string")).toBe("plain-string")
        expect(
            sanitizeSentryPayload({
                request: "noop",
                breadcrumbs: "noop",
            }),
        ).toEqual({
            request: "noop",
            breadcrumbs: "noop",
        })
    })

    it("инициализирует Sentry SDK и применяет beforeSend sanitizer", (): void => {
        const init = vi.fn()
        const tracingIntegration = Sentry.browserTracingIntegration()
        const createTracingIntegration = vi.fn(
            (): ReturnType<typeof Sentry.browserTracingIntegration> => tracingIntegration,
        )
        const env: ISentryBrowserEnv = {
            MODE: "production",
            VITE_API_URL: "https://api.example",
            VITE_SENTRY_DSN: "https://key@sentry.io/1",
            VITE_SENTRY_TRACES_SAMPLE_RATE: "0.6",
            VITE_SENTRY_PROFILES_SAMPLE_RATE: "0.3",
            VITE_SENTRY_ENVIRONMENT: "prod-eu",
        }

        const initialized = initializeSentryBrowser(env, {
            init,
            createTracingIntegration,
        })

        expect(initialized).toBe(true)
        expect(init).toHaveBeenCalledTimes(1)
        expect(createTracingIntegration).toHaveBeenCalledTimes(1)

        const initOptions = init.mock.calls[0]?.[0] as {
            readonly dsn: string
            readonly environment: string
            readonly tracesSampleRate: number
            readonly profilesSampleRate: number
            readonly tracePropagationTargets: readonly string[]
            readonly integrations: readonly unknown[]
            readonly beforeSend: (event: unknown) => unknown
        }

        expect(initOptions.dsn).toBe("https://key@sentry.io/1")
        expect(initOptions.environment).toBe("prod-eu")
        expect(initOptions.tracesSampleRate).toBe(0.6)
        expect(initOptions.profilesSampleRate).toBe(0.3)
        expect(initOptions.tracePropagationTargets.includes("https://api.example")).toBe(true)
        expect(initOptions.integrations.length).toBe(1)

        const beforeSendResult = initOptions.beforeSend({
            request: {
                url: "https://app.example?token=secret",
                headers: {
                    authorization: "Bearer secret",
                },
            },
        }) as {
            readonly request: {
                readonly url: string
                readonly headers: Record<string, unknown>
            }
        }

        expect(beforeSendResult.request.url.includes("token=%5BREDACTED%5D")).toBe(true)
        expect(beforeSendResult.request.headers.authorization).toBe("[REDACTED]")
    })

    it("пропускает init, если DSN пустой", (): void => {
        const init = vi.fn()
        const tracingIntegration = Sentry.browserTracingIntegration()

        const initialized = initializeSentryBrowser(
            {
                MODE: "development",
                VITE_SENTRY_DSN: "   ",
            },
            {
                init,
                createTracingIntegration: vi.fn(
                    (): ReturnType<typeof Sentry.browserTracingIntegration> => {
                        return tracingIntegration
                    },
                ),
                locationHref: "https://app.example",
            },
        )

        expect(initialized).toBe(false)
        expect(init).not.toHaveBeenCalled()
    })
})
