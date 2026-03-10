import { describe, expect, it } from "vitest"

import {
    AUTH_SESSION_STORAGE_KEY,
    clearPersistedAuthSession,
    isAuthSessionExpired,
    loadPersistedAuthSession,
    persistAuthSession,
    shouldRefreshAuthSession,
} from "@/lib/auth/auth-session"
import type { IAuthSession } from "@/lib/auth/types"

function createSession(expiresAt: string): IAuthSession {
    return {
        provider: "github",
        expiresAt,
        user: {
            id: "u-1",
            email: "dev@example.com",
            displayName: "Dev User",
        },
    }
}

describe("auth-session helpers", (): void => {
    it("определяет истёкшую и активную сессию", (): void => {
        const nowMs = Date.parse("2026-03-03T10:00:00.000Z")
        const expiredSession = createSession("2026-03-03T09:59:00.000Z")
        const activeSession = createSession("2026-03-03T10:05:00.000Z")

        expect(isAuthSessionExpired(expiredSession, nowMs)).toBe(true)
        expect(isAuthSessionExpired(activeSession, nowMs)).toBe(false)
    })

    it("сигнализирует о необходимости refresh перед истечением", (): void => {
        const nowMs = Date.parse("2026-03-03T10:00:00.000Z")
        const expiringSoon = createSession("2026-03-03T10:00:30.000Z")
        const validForLong = createSession("2026-03-03T10:10:00.000Z")

        expect(shouldRefreshAuthSession(expiringSoon, nowMs, 60_000)).toBe(true)
        expect(shouldRefreshAuthSession(validForLong, nowMs, 60_000)).toBe(false)
    })

    it("сохраняет snapshot в sessionStorage", (): void => {
        const session = createSession("2030-03-03T10:10:00.000Z")

        persistAuthSession(sessionStorage, session)

        const restored = loadPersistedAuthSession(sessionStorage)
        expect(restored).toEqual({
            provider: "github",
            expiresAt: "2030-03-03T10:10:00.000Z",
            user: {
                id: "u-1",
                email: "dev@example.com",
                displayName: "Dev User",
            },
        })
    })

    it("возвращает undefined для отсутствующего или невалидного snapshot", (): void => {
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, "not-json")
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                user: {
                    id: "u-1",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("очищает истёкший snapshot во время загрузки", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2020-01-01T00:00:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                },
            }),
        )

        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
        expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull()
    })

    it("отклоняет snapshot с невалидными user полями", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: {
                    id: "",
                    email: "dev@example.com",
                    displayName: "Dev User",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "",
                    displayName: "Dev User",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    avatarUrl: 42,
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("очищает сохранённый snapshot", (): void => {
        const session = createSession("2026-03-03T10:10:00.000Z")
        persistAuthSession(sessionStorage, session)

        clearPersistedAuthSession(sessionStorage)

        expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull()
    })

    it("безопасно обрабатывает undefined storage и невалидный snapshot shape", (): void => {
        const session = createSession("2026-03-03T10:10:00.000Z")

        expect(loadPersistedAuthSession(undefined)).toBeUndefined()
        expect((): void => {
            persistAuthSession(undefined, session)
            clearPersistedAuthSession(undefined)
        }).not.toThrow()

        sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify("bad-shape"))
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "unknown",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()

        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2026-03-03T10:10:00.000Z",
                user: "invalid-user",
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when expiresAt is invalid date string, then isAuthSessionExpired returns true", (): void => {
        const session = { expiresAt: "not-a-date" }
        expect(isAuthSessionExpired(session)).toBe(true)
    })

    it("when expiresAt is invalid date string, then shouldRefreshAuthSession returns false", (): void => {
        const session = { expiresAt: "not-a-date" }
        expect(shouldRefreshAuthSession(session)).toBe(false)
    })

    it("when session is already expired, then shouldRefreshAuthSession returns false", (): void => {
        const nowMs = Date.parse("2026-03-03T10:00:00.000Z")
        const expiredSession = createSession("2026-03-03T09:00:00.000Z")
        expect(shouldRefreshAuthSession(expiredSession, nowMs, 60_000)).toBe(false)
    })

    it("when session has valid optional access metadata, then snapshot loads correctly", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "gitlab",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-2",
                    email: "admin@example.com",
                    displayName: "Admin User",
                    avatarUrl: "https://example.com/avatar.png",
                    role: "admin",
                    roles: ["admin", "developer"],
                    tenantId: "tenant-1",
                },
            }),
        )

        const snapshot = loadPersistedAuthSession(sessionStorage)
        expect(snapshot).not.toBeUndefined()
        expect(snapshot?.provider).toBe("gitlab")
        expect(snapshot?.user.role).toBe("admin")
        expect(snapshot?.user.roles).toEqual(["admin", "developer"])
        expect(snapshot?.user.tenantId).toBe("tenant-1")
    })

    it("when snapshot has empty expiresAt, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when snapshot user has non-string role, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    role: 42,
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when snapshot user has non-string tenantId, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    tenantId: 123,
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when snapshot user has non-array roles, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    roles: "admin",
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when snapshot user has roles with empty string, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    roles: ["admin", ""],
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when snapshot user has roles with non-string elements, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({
                provider: "github",
                expiresAt: "2030-03-03T10:10:00.000Z",
                user: {
                    id: "u-1",
                    email: "dev@example.com",
                    displayName: "Dev User",
                    roles: [42],
                },
            }),
        )
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })

    it("when persistAuthSession is called with all user fields, then stores complete snapshot", (): void => {
        const session: IAuthSession = {
            provider: "google",
            expiresAt: "2030-03-03T10:10:00.000Z",
            user: {
                id: "u-3",
                email: "user@example.com",
                displayName: "Full User",
                avatarUrl: "https://example.com/avatar.png",
                role: "developer",
                roles: ["developer"],
                tenantId: "team-1",
            },
        }

        persistAuthSession(sessionStorage, session)

        const snapshot = loadPersistedAuthSession(sessionStorage)
        expect(snapshot).not.toBeUndefined()
        expect(snapshot?.user.avatarUrl).toBe("https://example.com/avatar.png")
        expect(snapshot?.user.role).toBe("developer")
        expect(snapshot?.user.tenantId).toBe("team-1")
    })

    it("when snapshot provider is one of supported providers, then loads successfully", (): void => {
        const providers = ["github", "gitlab", "google", "oidc"] as const

        for (const provider of providers) {
            sessionStorage.setItem(
                AUTH_SESSION_STORAGE_KEY,
                JSON.stringify({
                    provider,
                    expiresAt: "2030-03-03T10:10:00.000Z",
                    user: {
                        id: "u-1",
                        email: "dev@example.com",
                        displayName: "Dev User",
                    },
                }),
            )
            const snapshot = loadPersistedAuthSession(sessionStorage)
            expect(snapshot).not.toBeUndefined()
            expect(snapshot?.provider).toBe(provider)
        }
    })

    it("when snapshot value is null in storage, then loadPersistedAuthSession returns undefined", (): void => {
        sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
        expect(loadPersistedAuthSession(sessionStorage)).toBeUndefined()
    })
})
