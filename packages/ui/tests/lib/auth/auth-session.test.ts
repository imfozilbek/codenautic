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
        accessToken: "access-token",
        refreshToken: "refresh-token",
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

    it("сохраняет snapshot без токенов в sessionStorage", (): void => {
        const session = createSession("2030-03-03T10:10:00.000Z")

        persistAuthSession(sessionStorage, session)

        const raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
        expect(raw).not.toBeNull()

        if (raw === null) {
            throw new Error("Ожидался сохранённый auth snapshot")
        }

        expect(raw.includes("accessToken")).toBe(false)
        expect(raw.includes("refreshToken")).toBe(false)

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
})
