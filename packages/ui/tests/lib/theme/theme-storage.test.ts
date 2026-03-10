import { beforeEach, describe, expect, it } from "vitest"

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

    it("when localStorage.getItem throws, then returns undefined", (): void => {
        const original = window.localStorage
        const throwingStorage = {
            ...original,
            getItem: (): never => {
                throw new Error("Storage error")
            },
            setItem: original.setItem.bind(original),
            removeItem: original.removeItem.bind(original),
            clear: original.clear.bind(original),
            key: original.key.bind(original),
            get length(): number {
                return original.length
            },
        }
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: throwingStorage,
        })

        expect(readLocalStorageItem("key")).toBeUndefined()

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: original,
        })
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

    it("when localStorage.setItem throws, then does not throw", (): void => {
        const original = window.localStorage
        const throwingStorage = {
            ...original,
            getItem: original.getItem.bind(original),
            setItem: (): never => {
                throw new Error("Storage full")
            },
            removeItem: original.removeItem.bind(original),
            clear: original.clear.bind(original),
            key: original.key.bind(original),
            get length(): number {
                return original.length
            },
        }
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: throwingStorage,
        })

        expect((): void => {
            writeLocalStorageItem("key", "value")
        }).not.toThrow()

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: original,
        })
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

    it("when preset is invalid in stored state, then returns undefined", (): void => {
        const state = { mode: "dark", preset: "nonexistent-preset", updatedAtMs: 0 }
        localStorage.setItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(state))

        expect(readThemeProfileSyncState()).toBeUndefined()
    })

    it("when stored state has string updatedAtMs, then parses date", (): void => {
        const state = {
            mode: "light",
            preset: "moonstone",
            updatedAtMs: "2024-01-01T00:00:00.000Z",
        }
        localStorage.setItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(state))

        const result = readThemeProfileSyncState()

        expect(result).toBeDefined()
        expect(result?.mode).toBe("light")
        expect(result?.updatedAtMs).toBeGreaterThan(0)
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

    it("when no mediaQuery argument passed, then uses window.matchMedia", (): void => {
        const result = resolveSystemTheme()

        expect(result === "light" || result === "dark").toBe(true)
    })

    it("when matchMedia throws, then returns light", (): void => {
        const originalMatchMedia = window.matchMedia
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: (): never => {
                throw new Error("matchMedia unavailable")
            },
        })

        expect(resolveSystemTheme()).toBe("light")

        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: originalMatchMedia,
        })
    })
})

describe("writeLocalStorageItem edge cases", (): void => {
    beforeEach((): void => {
        localStorage.clear()
    })

    it("when called with valid key and value, then value is retrievable", (): void => {
        writeLocalStorageItem("theme-test", "dark")

        expect(readLocalStorageItem("theme-test")).toBe("dark")
    })
})
