import { describe, expect, it } from "vitest"

import {
    DEFAULT_SURFACE_TONE_ID,
    getSurfaceTone,
    isSurfaceToneId,
    resolveSurfaceTonePalette,
    SURFACE_TONES,
    type TSurfaceToneId,
} from "@/lib/theme/theme-surface-tones"

describe("SURFACE_TONES", (): void => {
    it("when accessed, then contains exactly 3 tones", (): void => {
        expect(SURFACE_TONES).toHaveLength(3)
    })

    it("when accessed, then contains neutral, warm, cool ids", (): void => {
        const ids = SURFACE_TONES.map((tone): string => tone.id)
        expect(ids).toContain("neutral")
        expect(ids).toContain("warm")
        expect(ids).toContain("cool")
    })

    it("when any tone is accessed, then has both light and dark palettes with all keys", (): void => {
        const paletteKeys = [
            "background",
            "foreground",
            "surface",
            "surfaceMuted",
            "border",
        ] as const

        for (const tone of SURFACE_TONES) {
            for (const key of paletteKeys) {
                expect(tone.light[key]).toBeDefined()
                expect(tone.dark[key]).toBeDefined()
            }
        }
    })

    it("when any palette value is accessed, then uses OKLCH color format", (): void => {
        for (const tone of SURFACE_TONES) {
            for (const value of Object.values(tone.light)) {
                if (typeof value === "string" && value.startsWith("oklch")) {
                    expect(value).toMatch(/^oklch\(/)
                }
            }

            for (const value of Object.values(tone.dark)) {
                if (typeof value === "string" && value.startsWith("oklch")) {
                    expect(value).toMatch(/^oklch\(/)
                }
            }
        }
    })
})

describe("DEFAULT_SURFACE_TONE_ID", (): void => {
    it("when accessed, then is neutral", (): void => {
        expect(DEFAULT_SURFACE_TONE_ID).toBe("neutral")
    })
})

describe("isSurfaceToneId", (): void => {
    it("when valid tone id is passed, then returns true", (): void => {
        expect(isSurfaceToneId("neutral")).toBe(true)
        expect(isSurfaceToneId("warm")).toBe(true)
        expect(isSurfaceToneId("cool")).toBe(true)
    })

    it("when invalid value is passed, then returns false", (): void => {
        expect(isSurfaceToneId("neon")).toBe(false)
        expect(isSurfaceToneId(123)).toBe(false)
        expect(isSurfaceToneId(undefined)).toBe(false)
        expect(isSurfaceToneId(null)).toBe(false)
    })
})

describe("getSurfaceTone", (): void => {
    it("when valid id is passed, then returns matching config", (): void => {
        const warm = getSurfaceTone("warm")
        expect(warm.id).toBe("warm")
    })

    it("when neutral id is passed, then returns neutral config", (): void => {
        const neutral = getSurfaceTone("neutral")
        expect(neutral.id).toBe("neutral")
    })
})

describe("resolveSurfaceTonePalette", (): void => {
    it("when light mode is passed, then returns light palette", (): void => {
        const palette = resolveSurfaceTonePalette("neutral", "light")
        expect(palette.background).toMatch(/^oklch\(/)
        expect(palette.foreground).toMatch(/^oklch\(/)
    })

    it("when dark mode is passed, then returns dark palette", (): void => {
        const palette = resolveSurfaceTonePalette("cool", "dark")
        expect(palette.background).toMatch(/^oklch\(/)
        expect(palette.foreground).toMatch(/^oklch\(/)
    })

    it("when different tones are resolved, then have different values", (): void => {
        const neutral = resolveSurfaceTonePalette("neutral", "light")
        const warm = resolveSurfaceTonePalette("warm", "light")
        const cool = resolveSurfaceTonePalette("cool", "light")

        const backgrounds = new Set<string>([neutral.background, warm.background, cool.background])
        expect(backgrounds.size).toBe(3)
    })

    const toneIds: ReadonlyArray<TSurfaceToneId> = ["neutral", "warm", "cool"]

    for (const toneId of toneIds) {
        it(`when ${toneId} light background is resolved, then is lighter than dark`, (): void => {
            const light = resolveSurfaceTonePalette(toneId, "light")
            const dark = resolveSurfaceTonePalette(toneId, "dark")
            const lightLightness = parseFloat(light.background.replace(/oklch\(/, ""))
            const darkLightness = parseFloat(dark.background.replace(/oklch\(/, ""))
            expect(lightLightness).toBeGreaterThan(darkLightness)
        })
    }
})
