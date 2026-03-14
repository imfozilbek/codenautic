import { describe, expect, it } from "vitest"

import {
    resolveCodeCityBuildingColor,
    resolveCodeCityBugEmissionSettings,
    resolveCodeCityHealthAuraColor,
    createCodeCityDistrictHealthAuras,
    resolveCodeCityBuildingImpactProfile,
} from "@/components/graphs/codecity-3d/codecity-visual-resolvers"
import { CODECITY_PALETTE } from "@/lib/constants/codecity-colors"

const BUILDING_COLOR_UNDEFINED_COVERAGE = CODECITY_PALETTE.coverage.undefined
const BUILDING_COLOR_HIGH_COVERAGE = CODECITY_PALETTE.coverage.high
const BUILDING_COLOR_MEDIUM_COVERAGE = CODECITY_PALETTE.coverage.medium
const BUILDING_COLOR_LOW_COVERAGE = CODECITY_PALETTE.coverage.low
const BUILDING_COLOR_CRITICAL_COVERAGE = CODECITY_PALETTE.coverage.critical
const BUG_EMISSION_COLOR_HIGH = CODECITY_PALETTE.bug.high
const BUG_EMISSION_COLOR_MEDIUM = CODECITY_PALETTE.bug.medium
const BUG_EMISSION_COLOR_LOW = CODECITY_PALETTE.bug.low
const IMPACT_EMISSIVE_CHANGED = CODECITY_PALETTE.impact.changed
const IMPACT_EMISSIVE_IMPACTED = CODECITY_PALETTE.impact.impacted
const IMPACT_EMISSIVE_RIPPLE = CODECITY_PALETTE.impact.ripple
const IMPACT_EMISSIVE_NEUTRAL = CODECITY_PALETTE.impact.neutral
import type {
    ICodeCityBuildingMesh,
    ICodeCityDistrictMesh,
} from "@/components/graphs/codecity-3d/codecity-scene-types"

function createTestBuilding(overrides: Partial<ICodeCityBuildingMesh> = {}): ICodeCityBuildingMesh {
    return {
        districtId: "district-1",
        id: "file-1",
        x: 5,
        z: 10,
        width: 2,
        depth: 2,
        height: 4,
        color: "#22c55e",
        healthScore: 75,
        recentBugCount: 0,
        totalBugCount: 2,
        ...overrides,
    }
}

function createTestDistrict(overrides: Partial<ICodeCityDistrictMesh> = {}): ICodeCityDistrictMesh {
    return {
        id: "district-1",
        label: "src/api",
        x: 0,
        z: 0,
        width: 20,
        depth: 15,
        ...overrides,
    }
}

describe("resolveCodeCityBuildingColor", (): void => {
    it("when coverage is undefined, then returns undefined coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(undefined)).toBe(BUILDING_COLOR_UNDEFINED_COVERAGE)
    })

    it("when coverage is 100, then returns high coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(100)).toBe(BUILDING_COLOR_HIGH_COVERAGE)
    })

    it("when coverage is 85, then returns high coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(85)).toBe(BUILDING_COLOR_HIGH_COVERAGE)
    })

    it("when coverage is 84, then returns medium coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(84)).toBe(BUILDING_COLOR_MEDIUM_COVERAGE)
    })

    it("when coverage is 65, then returns medium coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(65)).toBe(BUILDING_COLOR_MEDIUM_COVERAGE)
    })

    it("when coverage is 64, then returns low coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(64)).toBe(BUILDING_COLOR_LOW_COVERAGE)
    })

    it("when coverage is 45, then returns low coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(45)).toBe(BUILDING_COLOR_LOW_COVERAGE)
    })

    it("when coverage is 44, then returns critical coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(44)).toBe(BUILDING_COLOR_CRITICAL_COVERAGE)
    })

    it("when coverage is 0, then returns critical coverage color", (): void => {
        expect(resolveCodeCityBuildingColor(0)).toBe(BUILDING_COLOR_CRITICAL_COVERAGE)
    })
})

describe("resolveCodeCityBugEmissionSettings", (): void => {
    it("when totalBugCount >= 9 and recentBugCount > 0, then returns high emission with full pulse", (): void => {
        const result = resolveCodeCityBugEmissionSettings(12, 3)
        expect(result.color).toBe(BUG_EMISSION_COLOR_HIGH)
        expect(result.particleCount).toBe(6)
        expect(result.pulseStrength).toBe(1)
    })

    it("when totalBugCount >= 9 and recentBugCount is 0, then returns high emission with reduced pulse", (): void => {
        const result = resolveCodeCityBugEmissionSettings(9, 0)
        expect(result.color).toBe(BUG_EMISSION_COLOR_HIGH)
        expect(result.particleCount).toBe(6)
        expect(result.pulseStrength).toBe(0.4)
    })

    it("when totalBugCount is 5-8 and recentBugCount > 0, then returns medium emission", (): void => {
        const result = resolveCodeCityBugEmissionSettings(6, 1)
        expect(result.color).toBe(BUG_EMISSION_COLOR_MEDIUM)
        expect(result.particleCount).toBe(4)
        expect(result.pulseStrength).toBe(0.9)
    })

    it("when totalBugCount is 5-8 and recentBugCount is 0, then returns medium with reduced pulse", (): void => {
        const result = resolveCodeCityBugEmissionSettings(5, 0)
        expect(result.color).toBe(BUG_EMISSION_COLOR_MEDIUM)
        expect(result.particleCount).toBe(4)
        expect(result.pulseStrength).toBe(0.3)
    })

    it("when totalBugCount < 5 and recentBugCount > 0, then returns low emission", (): void => {
        const result = resolveCodeCityBugEmissionSettings(2, 1)
        expect(result.color).toBe(BUG_EMISSION_COLOR_LOW)
        expect(result.particleCount).toBe(2)
        expect(result.pulseStrength).toBe(0.75)
    })

    it("when totalBugCount < 5 and recentBugCount is 0, then returns low with reduced pulse", (): void => {
        const result = resolveCodeCityBugEmissionSettings(1, 0)
        expect(result.color).toBe(BUG_EMISSION_COLOR_LOW)
        expect(result.particleCount).toBe(2)
        expect(result.pulseStrength).toBe(0.2)
    })

    it("when totalBugCount is 0, then returns low emission", (): void => {
        const result = resolveCodeCityBugEmissionSettings(0, 0)
        expect(result.color).toBe(BUG_EMISSION_COLOR_LOW)
        expect(result.particleCount).toBe(2)
        expect(result.pulseStrength).toBe(0.2)
    })
})

describe("resolveCodeCityHealthAuraColor", (): void => {
    it("when healthScore is 100, then returns green hue (120)", (): void => {
        expect(resolveCodeCityHealthAuraColor(100)).toBe("hsl(120 86% 55%)")
    })

    it("when healthScore is 0, then returns red hue (0)", (): void => {
        expect(resolveCodeCityHealthAuraColor(0)).toBe("hsl(0 86% 55%)")
    })

    it("when healthScore is 50, then returns yellow-ish hue (60)", (): void => {
        expect(resolveCodeCityHealthAuraColor(50)).toBe("hsl(60 86% 55%)")
    })

    it("when healthScore exceeds 100, then clamps to 100", (): void => {
        expect(resolveCodeCityHealthAuraColor(150)).toBe("hsl(120 86% 55%)")
    })

    it("when healthScore is negative, then clamps to 0", (): void => {
        expect(resolveCodeCityHealthAuraColor(-50)).toBe("hsl(0 86% 55%)")
    })

    it("when healthScore is 75, then returns hue 90", (): void => {
        expect(resolveCodeCityHealthAuraColor(75)).toBe("hsl(90 86% 55%)")
    })
})

describe("createCodeCityDistrictHealthAuras", (): void => {
    it("when district has buildings, then computes average health", (): void => {
        const district = createTestDistrict({ id: "d1" })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d1", healthScore: 80 }),
            createTestBuilding({ id: "f2", districtId: "d1", healthScore: 60 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([district], buildings)
        expect(auras).toHaveLength(1)
        expect(auras[0]?.healthScore).toBe(70)
        expect(auras[0]?.districtId).toBe("d1")
    })

    it("when district has no buildings, then uses default health 50", (): void => {
        const district = createTestDistrict({ id: "d1" })
        const auras = createCodeCityDistrictHealthAuras([district], [])
        expect(auras[0]?.healthScore).toBe(50)
    })

    it("when district health is computed, then aura inherits district geometry", (): void => {
        const district = createTestDistrict({ id: "d1", x: 3, z: 7, width: 15, depth: 12 })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d1", healthScore: 90 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([district], buildings)
        expect(auras[0]?.x).toBe(3)
        expect(auras[0]?.z).toBe(7)
        expect(auras[0]?.width).toBe(15)
        expect(auras[0]?.depth).toBe(12)
    })

    it("when health is high, then pulseSpeed is lower", (): void => {
        const district = createTestDistrict({ id: "d1" })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d1", healthScore: 100 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([district], buildings)
        const expectedPulseSpeed = 1.4 + (100 - 100) / 120
        expect(auras[0]?.pulseSpeed).toBeCloseTo(expectedPulseSpeed)
    })

    it("when health is low, then pulseSpeed is higher", (): void => {
        const district = createTestDistrict({ id: "d1" })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d1", healthScore: 20 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([district], buildings)
        const expectedPulseSpeed = 1.4 + (100 - 20) / 120
        expect(auras[0]?.pulseSpeed).toBeCloseTo(expectedPulseSpeed)
    })

    it("when buildings belong to different districts, then groups correctly", (): void => {
        const districtA = createTestDistrict({ id: "d-a" })
        const districtB = createTestDistrict({ id: "d-b" })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d-a", healthScore: 90 }),
            createTestBuilding({ id: "f2", districtId: "d-b", healthScore: 30 }),
            createTestBuilding({ id: "f3", districtId: "d-a", healthScore: 70 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([districtA, districtB], buildings)
        expect(auras).toHaveLength(2)
        expect(auras[0]?.healthScore).toBe(80)
        expect(auras[1]?.healthScore).toBe(30)
    })

    it("when aura color is computed, then uses resolveCodeCityHealthAuraColor", (): void => {
        const district = createTestDistrict({ id: "d1" })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [
            createTestBuilding({ id: "f1", districtId: "d1", healthScore: 100 }),
        ]

        const auras = createCodeCityDistrictHealthAuras([district], buildings)
        expect(auras[0]?.color).toBe("hsl(120 86% 55%)")
    })
})

describe("resolveCodeCityBuildingImpactProfile", (): void => {
    it("when impactState is changed, then returns changed profile", (): void => {
        const profile = resolveCodeCityBuildingImpactProfile("changed")
        expect(profile.emissive).toBe(IMPACT_EMISSIVE_CHANGED)
        expect(profile.baseIntensity).toBe(0.3)
        expect(profile.pulseAmplitude).toBe(0.52)
        expect(profile.pulseSpeed).toBe(3.8)
        expect(profile.rippleLift).toBe(0)
    })

    it("when impactState is impacted, then returns impacted profile", (): void => {
        const profile = resolveCodeCityBuildingImpactProfile("impacted")
        expect(profile.emissive).toBe(IMPACT_EMISSIVE_IMPACTED)
        expect(profile.baseIntensity).toBe(0.25)
        expect(profile.pulseAmplitude).toBe(0.38)
        expect(profile.pulseSpeed).toBe(3.1)
        expect(profile.rippleLift).toBe(0)
    })

    it("when impactState is ripple, then returns ripple profile with lift", (): void => {
        const profile = resolveCodeCityBuildingImpactProfile("ripple")
        expect(profile.emissive).toBe(IMPACT_EMISSIVE_RIPPLE)
        expect(profile.baseIntensity).toBe(0.12)
        expect(profile.pulseAmplitude).toBe(0.22)
        expect(profile.pulseSpeed).toBe(2.4)
        expect(profile.rippleLift).toBe(0.16)
    })

    it("when impactState is none, then returns neutral zeroed profile", (): void => {
        const profile = resolveCodeCityBuildingImpactProfile("none")
        expect(profile.emissive).toBe(IMPACT_EMISSIVE_NEUTRAL)
        expect(profile.baseIntensity).toBe(0)
        expect(profile.pulseAmplitude).toBe(0)
        expect(profile.pulseSpeed).toBe(0)
        expect(profile.rippleLift).toBe(0)
    })
})
