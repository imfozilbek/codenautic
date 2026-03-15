import { describe, expect, it } from "vitest"

import {
    resolveCodeCityCausalArcColor,
    interpolateQuadraticBezierPoint,
    sampleQuadraticBezierPath,
    createCodeCityCausalArcs,
    createCodeCityNavigationTrail,
} from "@/components/codecity/codecity-3d/codecity-arc-builders"
import { CODECITY_PALETTE } from "@/lib/constants/codecity-colors"

const CAUSAL_ARC_COLOR_DEFAULT = CODECITY_PALETTE.causal.default
const CAUSAL_ARC_COLOR_DEPENDENCY = CODECITY_PALETTE.causal.dependency
const CAUSAL_ARC_COLOR_OWNERSHIP = CODECITY_PALETTE.causal.ownership
import {
    CAUSAL_ARC_BASE_LIFT,
    CAUSAL_ARC_SEGMENTS,
} from "@/components/codecity/codecity-3d/codecity-scene-constants"
import type { ICodeCityBuildingMesh } from "@/components/codecity/codecity-3d/codecity-scene-types"
import type { ICodeCity3DCausalCouplingDescriptor } from "@/components/codecity/codecity-3d-scene"

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

describe("resolveCodeCityCausalArcColor", (): void => {
    it("when couplingType is dependency, then returns dependency color", (): void => {
        expect(resolveCodeCityCausalArcColor("dependency")).toBe(CAUSAL_ARC_COLOR_DEPENDENCY)
    })

    it("when couplingType is ownership, then returns ownership color", (): void => {
        expect(resolveCodeCityCausalArcColor("ownership")).toBe(CAUSAL_ARC_COLOR_OWNERSHIP)
    })

    it("when couplingType is temporal, then returns default color", (): void => {
        expect(resolveCodeCityCausalArcColor("temporal")).toBe(CAUSAL_ARC_COLOR_DEFAULT)
    })
})

describe("interpolateQuadraticBezierPoint", (): void => {
    it("when t is 0, then returns start point", (): void => {
        const result = interpolateQuadraticBezierPoint([0, 0, 0], [5, 10, 5], [10, 0, 10], 0)
        expect(result[0]).toBeCloseTo(0)
        expect(result[1]).toBeCloseTo(0)
        expect(result[2]).toBeCloseTo(0)
    })

    it("when t is 1, then returns end point", (): void => {
        const result = interpolateQuadraticBezierPoint([0, 0, 0], [5, 10, 5], [10, 0, 10], 1)
        expect(result[0]).toBeCloseTo(10)
        expect(result[1]).toBeCloseTo(0)
        expect(result[2]).toBeCloseTo(10)
    })

    it("when t is 0.5, then returns midpoint influenced by control", (): void => {
        const result = interpolateQuadraticBezierPoint([0, 0, 0], [5, 10, 5], [10, 0, 10], 0.5)
        expect(result[0]).toBeCloseTo(5)
        expect(result[1]).toBeCloseTo(5)
        expect(result[2]).toBeCloseTo(5)
    })

    it("when all points are identical, then returns that point for any t", (): void => {
        const result = interpolateQuadraticBezierPoint([3, 3, 3], [3, 3, 3], [3, 3, 3], 0.7)
        expect(result[0]).toBeCloseTo(3)
        expect(result[1]).toBeCloseTo(3)
        expect(result[2]).toBeCloseTo(3)
    })

    it("when t is 0.25, then returns point closer to start", (): void => {
        const result = interpolateQuadraticBezierPoint([0, 0, 0], [10, 20, 10], [20, 0, 20], 0.25)
        const inverse = 0.75
        const expectedX = inverse * inverse * 0 + 2 * inverse * 0.25 * 10 + 0.25 * 0.25 * 20
        const expectedY = inverse * inverse * 0 + 2 * inverse * 0.25 * 20 + 0.25 * 0.25 * 0
        const expectedZ = inverse * inverse * 0 + 2 * inverse * 0.25 * 10 + 0.25 * 0.25 * 20
        expect(result[0]).toBeCloseTo(expectedX)
        expect(result[1]).toBeCloseTo(expectedY)
        expect(result[2]).toBeCloseTo(expectedZ)
    })
})

describe("sampleQuadraticBezierPath", (): void => {
    it("when called, then returns CAUSAL_ARC_SEGMENTS + 1 points", (): void => {
        const result = sampleQuadraticBezierPath([0, 0, 0], [5, 10, 5], [10, 0, 10])
        expect(result).toHaveLength(CAUSAL_ARC_SEGMENTS + 1)
    })

    it("when called, then first point matches start", (): void => {
        const result = sampleQuadraticBezierPath([1, 2, 3], [5, 10, 5], [10, 0, 10])
        expect(result[0]?.[0]).toBeCloseTo(1)
        expect(result[0]?.[1]).toBeCloseTo(2)
        expect(result[0]?.[2]).toBeCloseTo(3)
    })

    it("when called, then last point matches end", (): void => {
        const result = sampleQuadraticBezierPath([0, 0, 0], [5, 10, 5], [7, 8, 9])
        const lastPoint = result[result.length - 1]
        expect(lastPoint?.[0]).toBeCloseTo(7)
        expect(lastPoint?.[1]).toBeCloseTo(8)
        expect(lastPoint?.[2]).toBeCloseTo(9)
    })

    it("when called with collinear points, then all points lie on line", (): void => {
        const result = sampleQuadraticBezierPath([0, 0, 0], [5, 5, 5], [10, 10, 10])
        for (const point of result) {
            expect(point[0]).toBeCloseTo(point[1])
            expect(point[1]).toBeCloseTo(point[2])
        }
    })
})

describe("createCodeCityCausalArcs", (): void => {
    it("when buildings and couplings match, then creates arc with correct properties", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0, height: 3 })
        const buildingB = createTestBuilding({ id: "file-b", x: 10, z: 10, height: 5 })
        const buildings: ReadonlyArray<ICodeCityBuildingMesh> = [buildingA, buildingB]
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "dependency",
                strength: 0.7,
            },
        ]

        const arcs = createCodeCityCausalArcs(buildings, couplings)
        expect(arcs).toHaveLength(1)
        const arc = arcs[0]
        expect(arc).toBeDefined()
        expect(arc?.sourceFileId).toBe("file-a")
        expect(arc?.targetFileId).toBe("file-b")
        expect(arc?.couplingType).toBe("dependency")
        expect(arc?.color).toBe(CAUSAL_ARC_COLOR_DEPENDENCY)
        expect(arc?.strength).toBe(0.7)
    })

    it("when source or target building is missing, then skips coupling", (): void => {
        const building = createTestBuilding({ id: "file-a" })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-missing",
                couplingType: "temporal",
                strength: 0.5,
            },
        ]

        const arcs = createCodeCityCausalArcs([building], couplings)
        expect(arcs).toHaveLength(0)
    })

    it("when source and target are the same building, then skips self-coupling", (): void => {
        const building = createTestBuilding({ id: "file-a" })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-a",
                couplingType: "temporal",
                strength: 0.5,
            },
        ]

        const arcs = createCodeCityCausalArcs([building], couplings)
        expect(arcs).toHaveLength(0)
    })

    it("when strength is below 0.15, then clamps to 0.15", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0, height: 2 })
        const buildingB = createTestBuilding({ id: "file-b", x: 5, z: 5, height: 3 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "ownership",
                strength: 0.05,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB], couplings)
        expect(arcs[0]?.strength).toBe(0.15)
    })

    it("when strength exceeds 1, then clamps to 1", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0, height: 2 })
        const buildingB = createTestBuilding({ id: "file-b", x: 5, z: 5, height: 3 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "temporal",
                strength: 1.5,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB], couplings)
        expect(arcs[0]?.strength).toBe(1)
    })

    it("when arc is created, then start is at source top and end at target top", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 2, z: 4, height: 6 })
        const buildingB = createTestBuilding({ id: "file-b", x: 12, z: 14, height: 8 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "temporal",
                strength: 0.5,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB], couplings)
        const arc = arcs[0]
        expect(arc?.start[0]).toBe(2)
        expect(arc?.start[1]).toBeCloseTo(6.16)
        expect(arc?.start[2]).toBe(4)
        expect(arc?.end[0]).toBe(12)
        expect(arc?.end[1]).toBeCloseTo(8.16)
        expect(arc?.end[2]).toBe(14)
    })

    it("when arc is created, then control point is lifted above both buildings", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0, height: 4 })
        const buildingB = createTestBuilding({ id: "file-b", x: 10, z: 10, height: 6 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "temporal",
                strength: 0.5,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB], couplings)
        const arc = arcs[0]
        expect(arc?.control[0]).toBeCloseTo(5)
        expect(arc?.control[2]).toBeCloseTo(5)
        const planarDistance = Math.hypot(10, 10)
        const expectedLift = CAUSAL_ARC_BASE_LIFT + Math.min(8, planarDistance * 0.28)
        const maxBuildingTop = Math.max(4.16, 6.16)
        expect(arc?.control[1]).toBeCloseTo(maxBuildingTop + expectedLift)
    })

    it("when arc is created, then particleSpeed depends on normalized strength", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0, height: 2 })
        const buildingB = createTestBuilding({ id: "file-b", x: 5, z: 5, height: 3 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "temporal",
                strength: 0.8,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB], couplings)
        const expectedSpeed = 0.25 + 0.8 * 0.55
        expect(arcs[0]?.particleSpeed).toBeCloseTo(expectedSpeed)
    })

    it("when no couplings provided, then returns empty array", (): void => {
        const building = createTestBuilding({ id: "file-a" })
        const arcs = createCodeCityCausalArcs([building], [])
        expect(arcs).toHaveLength(0)
    })

    it("when multiple valid couplings provided, then creates arc for each", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 0, z: 0 })
        const buildingB = createTestBuilding({ id: "file-b", x: 5, z: 5 })
        const buildingC = createTestBuilding({ id: "file-c", x: 10, z: 10 })
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                sourceFileId: "file-a",
                targetFileId: "file-b",
                couplingType: "temporal",
                strength: 0.5,
            },
            {
                sourceFileId: "file-b",
                targetFileId: "file-c",
                couplingType: "dependency",
                strength: 0.9,
            },
        ]

        const arcs = createCodeCityCausalArcs([buildingA, buildingB, buildingC], couplings)
        expect(arcs).toHaveLength(2)
    })
})

describe("createCodeCityNavigationTrail", (): void => {
    it("when all chain file ids match buildings, then returns trail points", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 2, z: 4, height: 6 })
        const buildingB = createTestBuilding({ id: "file-b", x: 8, z: 12, height: 10 })
        const trail = createCodeCityNavigationTrail([buildingA, buildingB], ["file-a", "file-b"])
        expect(trail).toHaveLength(2)
        expect(trail[0]?.[0]).toBe(2)
        expect(trail[0]?.[1]).toBeCloseTo(6.35)
        expect(trail[0]?.[2]).toBe(4)
        expect(trail[1]?.[0]).toBe(8)
        expect(trail[1]?.[1]).toBeCloseTo(10.35)
        expect(trail[1]?.[2]).toBe(12)
    })

    it("when some chain file ids do not match buildings, then filters them out", (): void => {
        const building = createTestBuilding({ id: "file-a", x: 5, z: 10, height: 4 })
        const trail = createCodeCityNavigationTrail([building], ["file-a", "file-missing"])
        expect(trail).toHaveLength(1)
        expect(trail[0]?.[0]).toBe(5)
    })

    it("when chain is empty, then returns empty array", (): void => {
        const building = createTestBuilding({ id: "file-a" })
        const trail = createCodeCityNavigationTrail([building], [])
        expect(trail).toHaveLength(0)
    })

    it("when buildings list is empty, then returns empty array", (): void => {
        const trail = createCodeCityNavigationTrail([], ["file-a", "file-b"])
        expect(trail).toHaveLength(0)
    })

    it("when chain preserves order, then trail follows same order", (): void => {
        const buildingA = createTestBuilding({ id: "file-a", x: 1, z: 1, height: 2 })
        const buildingB = createTestBuilding({ id: "file-b", x: 10, z: 10, height: 5 })
        const buildingC = createTestBuilding({ id: "file-c", x: 20, z: 20, height: 8 })
        const trail = createCodeCityNavigationTrail(
            [buildingA, buildingB, buildingC],
            ["file-c", "file-a", "file-b"],
        )
        expect(trail).toHaveLength(3)
        expect(trail[0]?.[0]).toBe(20)
        expect(trail[1]?.[0]).toBe(1)
        expect(trail[2]?.[0]).toBe(10)
    })
})
