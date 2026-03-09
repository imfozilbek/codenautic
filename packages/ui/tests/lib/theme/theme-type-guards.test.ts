import { describe, expect, it } from "vitest"

import {
    isRecord,
    isThemeMode,
    isThemePreset,
    parseUpdatedAtValue,
    toThemeProfile,
    readThemeSettingsPayload,
    THEME_PROFILE_DEFAULT_UPDATED_AT_MS,
    type IThemeProfile,
} from "@/lib/theme/theme-type-guards"

describe("isRecord", (): void => {
    it("when value is a plain object, then returns true", (): void => {
        expect(isRecord({ key: "value" })).toBe(true)
    })

    it("when value is null, then returns false", (): void => {
        expect(isRecord(null)).toBe(false)
    })

    it("when value is an array, then returns false", (): void => {
        expect(isRecord([1, 2, 3])).toBe(false)
    })

    it("when value is a string, then returns false", (): void => {
        expect(isRecord("string")).toBe(false)
    })

    it("when value is a number, then returns false", (): void => {
        expect(isRecord(42)).toBe(false)
    })
})

describe("isThemeMode", (): void => {
    it("when value is 'light', then returns true", (): void => {
        expect(isThemeMode("light")).toBe(true)
    })

    it("when value is 'dark', then returns true", (): void => {
        expect(isThemeMode("dark")).toBe(true)
    })

    it("when value is 'system', then returns true", (): void => {
        expect(isThemeMode("system")).toBe(true)
    })

    it("when value is unknown string, then returns false", (): void => {
        expect(isThemeMode("auto")).toBe(false)
    })

    it("when value is not a string, then returns false", (): void => {
        expect(isThemeMode(123)).toBe(false)
    })
})

describe("isThemePreset", (): void => {
    it("when value is 'moonstone', then returns true", (): void => {
        expect(isThemePreset("moonstone")).toBe(true)
    })

    it("when value is 'cobalt', then returns true", (): void => {
        expect(isThemePreset("cobalt")).toBe(true)
    })

    it("when value is unknown preset, then returns false", (): void => {
        expect(isThemePreset("nonexistent")).toBe(false)
    })

    it("when value is not a string, then returns false", (): void => {
        expect(isThemePreset(42)).toBe(false)
    })
})

describe("parseUpdatedAtValue", (): void => {
    it("when value is a finite number, then returns it", (): void => {
        expect(parseUpdatedAtValue(1700000000)).toBe(1700000000)
    })

    it("when value is a valid date string, then returns parsed timestamp", (): void => {
        const result = parseUpdatedAtValue("2024-01-01T00:00:00.000Z")

        expect(typeof result).toBe("number")
        expect(result).toBeGreaterThan(0)
    })

    it("when value is NaN, then returns default", (): void => {
        expect(parseUpdatedAtValue(NaN)).toBe(THEME_PROFILE_DEFAULT_UPDATED_AT_MS)
    })

    it("when value is Infinity, then returns default", (): void => {
        expect(parseUpdatedAtValue(Infinity)).toBe(THEME_PROFILE_DEFAULT_UPDATED_AT_MS)
    })

    it("when value is invalid string, then returns default", (): void => {
        expect(parseUpdatedAtValue("not-a-date")).toBe(THEME_PROFILE_DEFAULT_UPDATED_AT_MS)
    })

    it("when value is null, then returns default", (): void => {
        expect(parseUpdatedAtValue(null)).toBe(THEME_PROFILE_DEFAULT_UPDATED_AT_MS)
    })
})

describe("toThemeProfile", (): void => {
    const fallback: IThemeProfile = {
        mode: "system",
        preset: "moonstone",
        updatedAtMs: 0,
    }

    it("when value is a valid profile, then returns parsed profile", (): void => {
        const result = toThemeProfile(
            { mode: "dark", preset: "cobalt", updatedAtMs: 1000 },
            fallback,
        )

        expect(result.mode).toBe("dark")
        expect(result.preset).toBe("cobalt")
        expect(result.updatedAtMs).toBe(1000)
    })

    it("when value is not a record, then returns fallback", (): void => {
        expect(toThemeProfile("not-object", fallback)).toEqual(fallback)
    })

    it("when mode is invalid, then uses fallback mode", (): void => {
        const result = toThemeProfile({ mode: "auto", preset: "cobalt", updatedAtMs: 0 }, fallback)

        expect(result.mode).toBe("system")
    })

    it("when preset is invalid, then uses fallback preset", (): void => {
        const result = toThemeProfile(
            { mode: "dark", preset: "nonexistent", updatedAtMs: 0 },
            fallback,
        )

        expect(result.preset).toBe("moonstone")
    })
})

describe("readThemeSettingsPayload", (): void => {
    it("when raw is not a record, then returns empty payload", (): void => {
        expect(readThemeSettingsPayload(null)).toEqual({})
    })

    it("when raw has direct mode, then returns mode", (): void => {
        const result = readThemeSettingsPayload({ mode: "dark" })

        expect(result.mode).toBe("dark")
    })

    it("when raw has direct preset, then returns preset", (): void => {
        const result = readThemeSettingsPayload({ preset: "cobalt" })

        expect(result.preset).toBe("cobalt")
    })

    it("when raw has nested theme with mode, then returns nested mode", (): void => {
        const result = readThemeSettingsPayload({ theme: { mode: "light" } })

        expect(result.mode).toBe("light")
    })

    it("when raw has no recognizable values, then returns empty payload", (): void => {
        expect(readThemeSettingsPayload({ unrelated: "data" })).toEqual({})
    })

    it("when raw has themeMode alias, then returns mode", (): void => {
        const result = readThemeSettingsPayload({ themeMode: "dark" })

        expect(result.mode).toBe("dark")
    })

    it("when raw has themePreset alias, then returns preset", (): void => {
        const result = readThemeSettingsPayload({ themePreset: "forest" })

        expect(result.preset).toBe("forest")
    })
})
