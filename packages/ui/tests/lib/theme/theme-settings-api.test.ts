import { describe, expect, it, vi } from "vitest"

import {
    THEME_SETTINGS_TIMEOUT_MS,
    THEME_SETTINGS_SAVE_DEBOUNCE_MS,
    THEME_SETTINGS_ENDPOINTS,
    fetchThemeProfileFromApi,
    saveThemeProfileToApi,
} from "@/lib/theme/theme-settings-api"
import { ApiHttpError, type IHttpClient } from "@/lib/api/http-client"
import type { IThemeProfile } from "@/lib/theme/theme-type-guards"

function createMockHttpClient(requestImpl: IHttpClient["request"] = vi.fn()): IHttpClient {
    return {
        request: requestImpl,
    }
}

function createAbortSignal(): AbortSignal {
    return new AbortController().signal
}

describe("theme settings api constants", (): void => {
    it("when THEME_SETTINGS_TIMEOUT_MS is accessed, then returns 2000", (): void => {
        expect(THEME_SETTINGS_TIMEOUT_MS).toBe(2_000)
    })

    it("when THEME_SETTINGS_SAVE_DEBOUNCE_MS is accessed, then returns 200", (): void => {
        expect(THEME_SETTINGS_SAVE_DEBOUNCE_MS).toBe(200)
    })

    it("when THEME_SETTINGS_ENDPOINTS is accessed, then has expected endpoints", (): void => {
        expect(THEME_SETTINGS_ENDPOINTS).toContain("/api/v1/user/settings")
        expect(THEME_SETTINGS_ENDPOINTS).toContain("/api/v1/user/preferences")
        expect(THEME_SETTINGS_ENDPOINTS).toHaveLength(2)
    })
})

describe("fetchThemeProfileFromApi", (): void => {
    it("when API returns valid mode and preset, then returns profile response", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                mode: "dark",
                preset: "cobalt",
                updatedAt: 1700000000,
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeDefined()
        expect(result?.profile.mode).toBe("dark")
        expect(result?.profile.preset).toBe("cobalt")
    })

    it("when API returns only valid mode, then returns profile response", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                mode: "light",
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeDefined()
        expect(result?.profile.mode).toBe("light")
    })

    it("when API returns only valid preset, then returns profile response", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                preset: "forest",
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeDefined()
        expect(result?.profile.preset).toBe("forest")
    })

    it("when API returns neither valid mode nor preset, then returns undefined", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                unrelated: "data",
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeUndefined()
    })

    it("when API request throws, then returns undefined", async (): Promise<void> => {
        const client = createMockHttpClient(vi.fn().mockRejectedValue(new Error("Network error")))

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeUndefined()
    })

    it("when API returns response with updatedAt as string date, then parses updatedAtMs", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                mode: "system",
                preset: "moonstone",
                updatedAt: "2024-01-01T00:00:00.000Z",
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeDefined()
        expect(result?.updatedAtMs).toBeGreaterThan(0)
    })

    it("when API returns response without updatedAt, then updatedAtMs is 0", async (): Promise<void> => {
        const client = createMockHttpClient(
            vi.fn().mockResolvedValue({
                mode: "dark",
                preset: "cobalt",
            }),
        )

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeDefined()
        expect(result?.updatedAtMs).toBe(0)
    })

    it("when API returns non-object response, then returns undefined", async (): Promise<void> => {
        const client = createMockHttpClient(vi.fn().mockResolvedValue("string-response"))

        const result = await fetchThemeProfileFromApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
        )

        expect(result).toBeUndefined()
    })
})

describe("saveThemeProfileToApi", (): void => {
    const profile: IThemeProfile = {
        mode: "dark",
        preset: "cobalt",
        updatedAtMs: 1000,
    }

    it("when first method succeeds, then returns true", async (): Promise<void> => {
        const client = createMockHttpClient(vi.fn().mockResolvedValue(undefined))

        const result = await saveThemeProfileToApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
            profile,
        )

        expect(result).toBe(true)
    })

    it("when request body contains mode and preset, then sends correct payload", async (): Promise<void> => {
        const requestFn = vi.fn().mockResolvedValue(undefined)
        const client = createMockHttpClient(requestFn)

        await saveThemeProfileToApi(client, createAbortSignal(), "/api/v1/user/settings", profile)

        expect(requestFn).toHaveBeenCalledWith(
            expect.objectContaining({
                body: { mode: "dark", preset: "cobalt" },
            }),
        )
    })

    it("when first method returns 405 and second succeeds, then returns true", async (): Promise<void> => {
        let callCount = 0
        const requestFn = vi.fn().mockImplementation(async (): Promise<unknown> => {
            callCount += 1
            if (callCount === 1) {
                const error = new ApiHttpError(405, "/api/v1/user/settings", "Method not allowed")
                throw error
            }
            return undefined
        })
        const client = createMockHttpClient(requestFn)

        const result = await saveThemeProfileToApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
            profile,
        )

        expect(result).toBe(true)
    })

    it("when method returns 404, then returns false immediately", async (): Promise<void> => {
        const requestFn = vi.fn().mockImplementation(async (): Promise<never> => {
            throw new ApiHttpError(404, "/api/v1/user/settings", "Not found")
        })
        const client = createMockHttpClient(requestFn)

        const result = await saveThemeProfileToApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
            profile,
        )

        expect(result).toBe(false)
    })

    it("when all methods fail with 405, then returns false", async (): Promise<void> => {
        const requestFn = vi.fn().mockImplementation(async (): Promise<never> => {
            throw new ApiHttpError(405, "/api/v1/user/settings", "Method not allowed")
        })
        const client = createMockHttpClient(requestFn)

        const result = await saveThemeProfileToApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
            profile,
        )

        expect(result).toBe(false)
        expect(requestFn).toHaveBeenCalledTimes(3)
    })

    it("when non-ApiHttpError is thrown, then continues to next method", async (): Promise<void> => {
        let callCount = 0
        const requestFn = vi.fn().mockImplementation(async (): Promise<unknown> => {
            callCount += 1
            if (callCount === 1) {
                throw new Error("Generic error")
            }
            return undefined
        })
        const client = createMockHttpClient(requestFn)

        const result = await saveThemeProfileToApi(
            client,
            createAbortSignal(),
            "/api/v1/user/settings",
            profile,
        )

        expect(result).toBe(true)
    })
})
