import { describe, expect, it } from "vitest"

import { NATIVE_FORM, PAGE_LAYOUT, SPACING } from "@/lib/constants/spacing"

describe("SPACING", (): void => {
    it("when accessed, then contains all semantic spacing keys", (): void => {
        const requiredKeys = ["page", "section", "card", "list", "compact", "tight"] as const

        for (const key of requiredKeys) {
            expect(SPACING[key]).toBeDefined()
            expect(typeof SPACING[key]).toBe("string")
            expect(SPACING[key].length).toBeGreaterThan(0)
        }
    })

    it("when spacing values are used, then all use space-y utility", (): void => {
        for (const value of Object.values(SPACING)) {
            expect(value).toMatch(/^space-y-/)
        }
    })

    it("when page spacing is used, then has largest gap", (): void => {
        expect(SPACING.page).toBe("space-y-6")
    })

    it("when tight spacing is used, then has smallest gap", (): void => {
        expect(SPACING.tight).toBe("space-y-1")
    })
})

describe("PAGE_LAYOUT", (): void => {
    it("when accessed, then contains all layout variants", (): void => {
        const requiredKeys = ["standard", "spacious", "centered"] as const

        for (const key of requiredKeys) {
            expect(PAGE_LAYOUT[key]).toBeDefined()
            expect(typeof PAGE_LAYOUT[key]).toBe("string")
            expect(PAGE_LAYOUT[key].length).toBeGreaterThan(0)
        }
    })

    it("when centered layout is used, then includes centering utilities", (): void => {
        expect(PAGE_LAYOUT.centered).toContain("mx-auto")
        expect(PAGE_LAYOUT.centered).toContain("items-center")
        expect(PAGE_LAYOUT.centered).toContain("justify-center")
    })

    it("when standard layout is used, then uses section-level spacing", (): void => {
        expect(PAGE_LAYOUT.standard).toBe("space-y-4")
    })

    it("when spacious layout is used, then uses page-level spacing", (): void => {
        expect(PAGE_LAYOUT.spacious).toBe("space-y-6")
    })
})

describe("NATIVE_FORM", (): void => {
    it("when select style is accessed, then includes border and bg-surface", (): void => {
        expect(NATIVE_FORM.select).toContain("border-border")
        expect(NATIVE_FORM.select).toContain("bg-surface")
        expect(NATIVE_FORM.select).toContain("rounded-lg")
        expect(NATIVE_FORM.select).toContain("text-sm")
    })

    it("when input style is accessed, then includes placeholder styling", (): void => {
        expect(NATIVE_FORM.input).toContain("border-border")
        expect(NATIVE_FORM.input).toContain("bg-surface")
        expect(NATIVE_FORM.input).toContain("placeholder:")
    })
})
