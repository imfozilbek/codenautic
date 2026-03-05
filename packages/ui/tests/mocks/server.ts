function ensureBrowserStorageAvailability(): void {
    if (canReadStorage("localStorage") === true && canReadStorage("sessionStorage") === true) {
        return
    }

    const localStorage = createInMemoryStorage()
    const sessionStorage = createInMemoryStorage()

    Object.defineProperty(globalThis, "localStorage", {
        value: localStorage,
        configurable: true,
        writable: true,
    })
    Object.defineProperty(globalThis, "sessionStorage", {
        value: sessionStorage,
        configurable: true,
        writable: true,
    })
}

function canReadStorage(storageKey: "localStorage" | "sessionStorage"): boolean {
    try {
        const targetStorage = globalThis[storageKey]
        return targetStorage !== undefined
    } catch {
        return false
    }
}

function createInMemoryStorage(): Storage {
    const data = new Map<string, string>()

    return {
        get length(): number {
            return data.size
        },
        clear(): void {
            data.clear()
        },
        getItem(key: string): string | null {
            return data.get(key) ?? null
        },
        key(index: number): string | null {
            const keys = Array.from(data.keys())
            return keys[index] ?? null
        },
        removeItem(key: string): void {
            data.delete(key)
        },
        setItem(key: string, value: string): void {
            data.set(key, value)
        },
    }
}

ensureBrowserStorageAvailability()

const { http, HttpResponse } = await import("msw")
const { setupServer } = await import("msw/node")

/**
 * Дефолтный мок health endpoint для UI-интеграционных тестов.
 */
export const server = setupServer(
    http.get("http://localhost:3000/api/v1/auth/session", () => {
        return HttpResponse.json({
            session: {
                provider: "github",
                expiresAt: "2030-01-01T00:00:00.000Z",
                user: {
                    id: "u-default",
                    email: "default@example.com",
                    displayName: "Default User",
                },
            },
        })
    }),
    http.post("http://localhost:3000/api/v1/auth/session/refresh", () => {
        return HttpResponse.json({
            session: {
                provider: "github",
                expiresAt: "2030-01-01T00:00:00.000Z",
                user: {
                    id: "u-default",
                    email: "default@example.com",
                    displayName: "Default User",
                },
            },
        })
    }),
    http.post("http://localhost:3000/api/v1/auth/logout", () => {
        return HttpResponse.json({
            loggedOut: true,
        })
    }),
    http.post("http://localhost:3000/api/v1/auth/oauth/start", async ({ request }) => {
        const payload = (await request.json()) as {
            readonly provider?: string
        }

        return HttpResponse.json({
            provider: payload.provider ?? "github",
            authorizationUrl: "https://auth.example/default",
            state: "msw-state",
        })
    }),
    http.get("http://localhost:3000/api/v1/health", () => {
        return HttpResponse.json({
            status: "ok",
            service: "api",
            timestamp: "2026-03-02T00:00:00.000Z",
        })
    }),
    http.get("http://localhost:3000/api/v1/feature-flags", () => {
        return HttpResponse.json({
            flags: {
                premium_dashboard: true,
            },
        })
    }),
    http.get("http://localhost:3000/api/v1/permissions", () => {
        return HttpResponse.json({
            permissions: ["review:read", "settings:read"],
        })
    }),
    http.get("http://localhost:3000/api/v1/context/sources", () => {
        return HttpResponse.json({
            total: 2,
            sources: [
                {
                    id: "source-jira",
                    provider: "JIRA",
                    status: "CONNECTED",
                    enabled: true,
                    lastSyncedAt: "2026-03-01T09:30:00.000Z",
                    itemCount: 38,
                },
                {
                    id: "source-sentry",
                    provider: "SENTRY",
                    status: "DEGRADED",
                    enabled: true,
                    lastSyncedAt: "2026-03-01T08:00:00.000Z",
                    itemCount: 12,
                },
            ],
        })
    }),
    http.get("http://localhost:3000/api/v1/context/sources/:sourceId/preview", ({ params }) => {
        return HttpResponse.json({
            sourceId: String(params.sourceId),
            status: "ok",
            items: [],
        })
    }),
    http.put("http://localhost:3000/api/v1/context/sources/:sourceId", ({ params }) => {
        return HttpResponse.json({
            source: {
                id: String(params.sourceId),
                provider: "JIRA",
                status: "CONNECTED",
                enabled: true,
                lastSyncedAt: "2026-03-01T09:30:00.000Z",
                itemCount: 38,
            },
        })
    }),
    http.post("http://localhost:3000/api/v1/context/sources/:sourceId/refresh", ({ params }) => {
        return HttpResponse.json({
            sourceId: String(params.sourceId),
            status: "SYNCING",
        })
    }),
    http.get("http://localhost:3000/api/v1/user/settings", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.get("http://localhost:3000/api/v1/user/preferences", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.get("http://localhost:3000/api/v1/rules", () => {
        return HttpResponse.json({
            rules: [],
            total: 0,
        })
    }),
    http.post("http://localhost:3000/api/v1/rules", async ({ request }) => {
        const payload = (await request.json()) as {
            readonly title?: string
            readonly rule?: string
            readonly type?: string
            readonly scope?: string
            readonly severity?: string
            readonly status?: string
            readonly examples?: readonly unknown[]
        }

        return HttpResponse.json({
            id: "rule-default",
            title: payload.title ?? "Default rule",
            rule: payload.rule ?? "",
            type: payload.type ?? "REGEX",
            scope: payload.scope ?? "FILE",
            severity: payload.severity ?? "LOW",
            status: payload.status ?? "ACTIVE",
            examples: payload.examples ?? [],
        })
    }),
    http.get("http://localhost:3000/api/v1/rules/:ruleId", ({ params }) => {
        return HttpResponse.json({
            id: String(params.ruleId),
            title: "Default rule",
            rule: "title !== ''",
            type: "REGEX",
            scope: "FILE",
            severity: "LOW",
            status: "ACTIVE",
            examples: [],
        })
    }),
    http.put("http://localhost:3000/api/v1/rules/:ruleId", ({ params }) => {
        return HttpResponse.json({
            id: String(params.ruleId),
            title: "Updated rule",
            rule: "title !== ''",
            type: "REGEX",
            scope: "FILE",
            severity: "LOW",
            status: "ACTIVE",
            examples: [],
        })
    }),
    http.delete("http://localhost:3000/api/v1/rules/:ruleId", ({ params }) => {
        return HttpResponse.json({
            id: String(params.ruleId),
            removed: true,
        })
    }),
    http.post("http://localhost:3000/api/v1/user/settings", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.post("http://localhost:3000/api/v1/user/preferences", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.patch("http://localhost:3000/api/v1/user/settings", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.patch("http://localhost:3000/api/v1/user/preferences", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.put("http://localhost:3000/api/v1/user/settings", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.put("http://localhost:3000/api/v1/user/preferences", () => {
        return HttpResponse.json({}, { status: 404 })
    }),
    http.get("http://localhost:3000/api/v1/reviews/:reviewId", ({ params }) => {
        const reviewId = String(params.reviewId)

        return HttpResponse.json({
            reviewId,
            repositoryId: "repo-1",
            mergeRequestId: "mr-1",
            status: "completed",
            issues: [],
            metrics: {
                duration: 1000,
            },
        })
    }),
    http.post("http://localhost:3000/api/v1/reviews", () => {
        return HttpResponse.json({
            reviewId: "review-default",
            status: "queued",
        })
    }),
    http.post("http://localhost:3000/api/v1/reviews/:reviewId/feedback", ({ params }) => {
        return HttpResponse.json({
            reviewId: String(params.reviewId),
            acceptedCount: 0,
        })
    }),
)
