import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getWindowLocalStorage,
    readLocalStorageItem,
    writeLocalStorageItem,
    readStoredThemeMode,
    readStoredThemePreset,
    readThemeProfileSyncState,
    writeThemeProfileSyncState,
    resolveSystemTheme,
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
    THEME_PROFILE_STORAGE_SYNC_KEY,
    THEME_DEFAULT_MODE,
} from "@/lib/theme/theme-storage"

describe("getWindowLocalStorage", (): void => {
    it("when window is available, then returns localStorage", (): void => {
        const result = getWindowLocalStorage()

        expect(result).toBeDefined()
    })
})

describe("readLocalStorageItem", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when key exists in storage, then returns value", (): void => {
        localStorage.setItem("test-key", "test-value")

        expect(readLocalStorageItem("test-key")).toBe("test-value")
    })

    it("when key does not exist, then returns undefined", (): void => {
        expect(readLocalStorageItem("missing-key")).toBeUndefined()
    })
})

describe("writeLocalStorageItem", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when writing a value, then stores it in localStorage", (): void => {
        writeLocalStorageItem("write-key", "write-value")

        expect(localStorage.getItem("write-key")).toBe("write-value")
    })
})

describe("readStoredThemeMode", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when no mode stored, then returns default mode", (): void => {
        expect(readStoredThemeMode()).toBe(THEME_DEFAULT_MODE)
    })

    it("when valid mode stored, then returns stored mode", (): void => {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, "dark")

        expect(readStoredThemeMode()).toBe("dark")
    })

    it("when invalid mode stored, then returns default mode", (): void => {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, "invalid")

        expect(readStoredThemeMode()).toBe(THEME_DEFAULT_MODE)
    })
})

describe("readStoredThemePreset", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when no preset stored, then returns default preset", (): void => {
        expect(readStoredThemePreset()).toBe("moonstone")
    })

    it("when valid preset stored, then returns stored preset", (): void => {
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, "cobalt")

        expect(readStoredThemePreset()).toBe("cobalt")
    })

    it("when invalid preset stored, then returns default preset", (): void => {
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, "nonexistent")

        expect(readStoredThemePreset()).toBe("moonstone")
    })
})

describe("readThemeProfileSyncState", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when no sync state stored, then returns undefined", (): void => {
        expect(readThemeProfileSyncState()).toBeUndefined()
    })

    it("when valid sync state stored, then returns parsed state", (): void => {
        const state = { mode: "dark", preset: "cobalt", updatedAtMs: 1000 }
        localStorage.setItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(state))

        const result = readThemeProfileSyncState()

        expect(result).toEqual(state)
    })

    it("when invalid JSON stored, then returns undefined", (): void => {
        localStorage.setItem(THEME_PROFILE_STORAGE_SYNC_KEY, "not-json")

        expect(readThemeProfileSyncState()).toBeUndefined()
    })

    it("when mode is invalid in stored state, then returns undefined", (): void => {
        const state = { mode: "invalid", preset: "cobalt", updatedAtMs: 0 }
        localStorage.setItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(state))

        expect(readThemeProfileSyncState()).toBeUndefined()
    })
})

describe("writeThemeProfileSyncState", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when writing a profile, then persists serialized state", (): void => {
        const profile = { mode: "dark" as const, preset: "cobalt" as const, updatedAtMs: 500 }

        writeThemeProfileSyncState(profile)

        const raw = localStorage.getItem(THEME_PROFILE_STORAGE_SYNC_KEY)
        expect(raw).not.toBeNull()
        const parsed = JSON.parse(raw as string) as Record<string, unknown>
        expect(parsed.mode).toBe("dark")
        expect(parsed.preset).toBe("cobalt")
        expect(parsed.updatedAtMs).toBe(500)
    })
})

describe("resolveSystemTheme", (): void => {
    it("when matchMedia matches dark, then returns 'dark'", (): void => {
        const mockQuery = { matches: true } as MediaQueryList

        expect(resolveSystemTheme(mockQuery)).toBe("dark")
    })

    it("when matchMedia does not match dark, then returns 'light'", (): void => {
        const mockQuery = { matches: false } as MediaQueryList

        expect(resolveSystemTheme(mockQuery)).toBe("light")
    })
})
