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

const {http, HttpResponse} = await import("msw")
const {setupServer} = await import("msw/node")

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
    http.post("http://localhost:3000/api/v1/auth/oauth/start", async ({request}) => {
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
)
