import { describe, expect, it } from "vitest"

import {
    CODECITY_PALETTE,
    resolveCodeCityPalette,
} from "@/lib/constants/codecity-colors"

describe("CODECITY_PALETTE", (): void => {
    it("when accessed, then contains all domain groups", (): void => {
        expect(CODECITY_PALETTE.scene).toBeDefined()
        expect(CODECITY_PALETTE.coverage).toBeDefined()
        expect(CODECITY_PALETTE.causal).toBeDefined()
        expect(CODECITY_PALETTE.impact).toBeDefined()
        expect(CODECITY_PALETTE.bug).toBeDefined()
    })

    it("when scene group is accessed, then contains all scene colors", (): void => {
        const sceneKeys = [
            "background",
            "gridLine",
            "gridDivision",
            "districtFloor",
            "districtLabel",
            "navigationTrail",
            "breadcrumbSphere",
            "breadcrumbEmissive",
        ] as const

        for (const key of sceneKeys) {
            expect(CODECITY_PALETTE.scene[key]).toMatch(/^#[0-9a-f]{6}$/i)
        }
    })

    it("when coverage group is accessed, then contains all severity levels", (): void => {
        expect(CODECITY_PALETTE.coverage.high).toMatch(/^#/)
        expect(CODECITY_PALETTE.coverage.medium).toMatch(/^#/)
        expect(CODECITY_PALETTE.coverage.low).toMatch(/^#/)
        expect(CODECITY_PALETTE.coverage.critical).toMatch(/^#/)
        expect(CODECITY_PALETTE.coverage.undefined).toMatch(/^#/)
    })

    it("when resolveCodeCityPalette is called, then returns same palette", (): void => {
        const resolved = resolveCodeCityPalette()
        expect(resolved).toBe(CODECITY_PALETTE)
    })

    it("when palette values are accessed directly, then match expected hex colors", (): void => {
        expect(CODECITY_PALETTE.causal.dependency).toBe("#fb923c")
        expect(CODECITY_PALETTE.scene.background).toBe("#020617")
        expect(CODECITY_PALETTE.coverage.high).toBe("#22c55e")
    })
})
