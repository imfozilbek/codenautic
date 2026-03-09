import { describe, expect, it } from "vitest"

import { TYPOGRAPHY } from "@/lib/constants/typography"

describe("TYPOGRAPHY", (): void => {
    it("when accessed, then contains all required semantic keys", (): void => {
        const requiredKeys = [
            "pageTitle",
            "pageSubtitle",
            "sectionTitle",
            "sectionSubtitle",
            "body",
            "bodyMuted",
            "caption",
            "label",
            "micro",
            "microHint",
            "microMuted",
            "display",
            "overline",
            "splash",
        ] as const

        for (const key of requiredKeys) {
            expect(TYPOGRAPHY[key]).toBeDefined()
            expect(typeof TYPOGRAPHY[key]).toBe("string")
            expect(TYPOGRAPHY[key].length).toBeGreaterThan(0)
        }
    })

    it("when pageTitle is used, then includes display font and foreground", (): void => {
        expect(TYPOGRAPHY.pageTitle).toContain("font-display")
        expect(TYPOGRAPHY.pageTitle).toContain("text-foreground")
    })

    it("when sectionTitle is used, then includes display font", (): void => {
        expect(TYPOGRAPHY.sectionTitle).toContain("font-display")
    })

    it("when micro scales are used, then include fixed pixel sizes", (): void => {
        expect(TYPOGRAPHY.micro).toContain("text-[10px]")
        expect(TYPOGRAPHY.microHint).toContain("text-[11px]")
        expect(TYPOGRAPHY.microMuted).toContain("text-[11px]")
    })

    it("when splash is used, then includes large tracking-tight text", (): void => {
        expect(TYPOGRAPHY.splash).toContain("text-3xl")
        expect(TYPOGRAPHY.splash).toContain("tracking-tight")
    })

    it("when overline is used, then includes uppercase tracking", (): void => {
        expect(TYPOGRAPHY.overline).toContain("uppercase")
        expect(TYPOGRAPHY.overline).toContain("tracking-")
    })

    it("when display is used, then includes large bold text", (): void => {
        expect(TYPOGRAPHY.display).toContain("text-4xl")
        expect(TYPOGRAPHY.display).toContain("font-bold")
    })

    it("when muted variants are used, then include muted color tokens", (): void => {
        expect(TYPOGRAPHY.bodyMuted).toContain("text-text-secondary")
        expect(TYPOGRAPHY.pageSubtitle).toContain("text-text-secondary")
        expect(TYPOGRAPHY.caption).toContain("text-text-subtle")
    })
})
