import { beforeEach, describe, expect, it } from "vitest"

import {
    camelToKebab,
    getPresetById,
    resolveThemeMode,
    applyThemeTokens,
    applySurfaceTone,
} from "@/lib/theme/theme-css-applicator"
import { THEME_PRESETS } from "@/lib/theme/theme-presets"

describe("camelToKebab", (): void => {
    it("when given camelCase, then converts to kebab-case", (): void => {
        expect(camelToKebab("surfaceSecondary")).toBe("surface-secondary")
    })

    it("when given single word, then returns unchanged", (): void => {
        expect(camelToKebab("background")).toBe("background")
    })

    it("when given multiple capitals, then converts each", (): void => {
        expect(camelToKebab("accentForeground")).toBe("accent-foreground")
    })

    it("when given empty string, then returns empty string", (): void => {
        expect(camelToKebab("")).toBe("")
    })
})

describe("getPresetById", (): void => {
    it("when preset exists, then returns matching preset", (): void => {
        const preset = getPresetById("cobalt")

        expect(preset.id).toBe("cobalt")
        expect(preset.label).toBe("Cobalt")
    })

    it("when preset does not exist, then returns first preset as fallback", (): void => {
        const preset = getPresetById("nonexistent" as "moonstone")

        expect(preset.id).toBe(THEME_PRESETS[0].id)
    })

    it("when given 'moonstone', then returns moonstone preset", (): void => {
        const preset = getPresetById("moonstone")

        expect(preset.id).toBe("moonstone")
    })
})

describe("resolveThemeMode", (): void => {
    it("when mode is 'light', then returns 'light'", (): void => {
        expect(resolveThemeMode("light", "dark")).toBe("light")
    })

    it("when mode is 'dark', then returns 'dark'", (): void => {
        expect(resolveThemeMode("dark", "light")).toBe("dark")
    })

    it("when mode is 'system' and system is dark, then returns 'dark'", (): void => {
        expect(resolveThemeMode("system", "dark")).toBe("dark")
    })

    it("when mode is 'system' and system is light, then returns 'light'", (): void => {
        expect(resolveThemeMode("system", "light")).toBe("light")
    })
})

describe("applyThemeTokens", (): void => {
    beforeEach((): void => {
        document.documentElement.removeAttribute("data-theme")
        document.documentElement.removeAttribute("data-mode")
        document.documentElement.style.cssText = ""
        document.documentElement.classList.remove("dark")
    })

    it("when applying dark theme, then adds 'dark' class to root", (): void => {
        applyThemeTokens("dark", "moonstone")

        expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("when applying light theme, then removes 'dark' class from root", (): void => {
        document.documentElement.classList.add("dark")

        applyThemeTokens("light", "moonstone")

        expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("when applying theme, then sets data-theme attribute", (): void => {
        applyThemeTokens("light", "cobalt")

        expect(document.documentElement.dataset.theme).toBe("cobalt")
    })

    it("when applying theme, then sets data-mode attribute", (): void => {
        applyThemeTokens("dark", "moonstone")

        expect(document.documentElement.dataset.mode).toBe("dark")
    })

    it("when applying theme, then sets colorScheme style", (): void => {
        applyThemeTokens("dark", "moonstone")

        expect(document.documentElement.style.colorScheme).toBe("dark")
    })

    it("when applying theme, then sets CSS custom properties", (): void => {
        applyThemeTokens("light", "moonstone")

        const bgValue = document.documentElement.style.getPropertyValue("--background")
        expect(bgValue.length).toBeGreaterThan(0)
    })
})

describe("applySurfaceTone", (): void => {
    beforeEach((): void => {
        document.documentElement.style.cssText = ""
    })

    it("when applying neutral tone in light mode, then sets surface CSS variables", (): void => {
        applySurfaceTone("light", "neutral")

        const bgValue = document.documentElement.style.getPropertyValue("--background")
        expect(bgValue.length).toBeGreaterThan(0)
    })

    it("when applying warm tone in dark mode, then sets surface CSS variables", (): void => {
        applySurfaceTone("dark", "warm")

        const surfaceValue = document.documentElement.style.getPropertyValue("--surface")
        expect(surfaceValue.length).toBeGreaterThan(0)
    })

    it("when applying cool tone, then sets border variable", (): void => {
        applySurfaceTone("light", "cool")

        const borderValue = document.documentElement.style.getPropertyValue("--border")
        expect(borderValue.length).toBeGreaterThan(0)
    })
})
