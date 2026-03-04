import { describe, expect, it } from "vitest"

import {
    createCodeCityCausalArcs,
    createCodeCityBuildingImpactMap,
    createCodeCityBuildingMeshes,
    createCodeCityDistrictMeshes,
    resolveCodeCityCausalArcColor,
    resolveCodeCityBugEmissionSettings,
    resolveCodeCityRenderBudget,
    resolveCodeCityBuildingImpactProfile,
    resolveCodeCityBuildingColor,
} from "@/components/graphs/codecity-3d-scene-renderer"
import type {
    ICodeCity3DCausalCouplingDescriptor,
    ICodeCity3DSceneFileDescriptor,
    ICodeCity3DSceneImpactedFileDescriptor,
} from "@/components/graphs/codecity-3d-scene"

describe("CodeCity3DSceneRenderer building generation", (): void => {
    it("строит здания из файлов по правилам height=LOC, width=complexity, color=coverage", (): void => {
        const files: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
            {
                bugIntroductions: {
                    "30d": 4,
                    "7d": 2,
                    "90d": 6,
                },
                complexity: 32,
                coverage: 91,
                id: "src/core/auth.ts",
                loc: 240,
                path: "src/core/auth.ts",
            },
            {
                bugIntroductions: {
                    "30d": 2,
                    "7d": 0,
                    "90d": 1,
                },
                complexity: 8,
                coverage: 58,
                id: "src/core/cache.ts",
                loc: 96,
                path: "src/core/cache.ts",
            },
            {
                bugIntroductions: {
                    "30d": 1,
                    "7d": 0,
                    "90d": 0,
                },
                complexity: 3,
                coverage: undefined,
                id: "src/core/worker.ts",
                loc: 30,
                path: "src/core/worker.ts",
            },
        ]

        const buildings = createCodeCityBuildingMeshes(files)
        expect(buildings).toHaveLength(3)

        const firstBuilding = buildings.find((building): boolean => {
            return building.id === "src/core/auth.ts"
        })
        expect(firstBuilding).toMatchObject({
            color: "#22c55e",
            districtId: "core",
            height: 10,
            id: "src/core/auth.ts",
            recentBugCount: 2,
            totalBugCount: 12,
            width: 3.4,
        })
        expect(firstBuilding?.depth).toBeGreaterThan(0.5)
        expect(firstBuilding?.x).toBeTypeOf("number")
        expect(firstBuilding?.z).toBeTypeOf("number")

        const secondBuilding = buildings.find((building): boolean => {
            return building.id === "src/core/cache.ts"
        })
        expect(secondBuilding).toMatchObject({
            color: "#fb923c",
            districtId: "core",
            height: 4,
            id: "src/core/cache.ts",
            recentBugCount: 0,
            totalBugCount: 3,
            width: 1,
        })
        expect(secondBuilding?.depth).toBeGreaterThan(0.5)
        expect(secondBuilding?.x).toBeTypeOf("number")
        expect(secondBuilding?.z).toBeTypeOf("number")

        const thirdBuilding = buildings.find((building): boolean => {
            return building.id === "src/core/worker.ts"
        })
        expect(thirdBuilding).toMatchObject({
            color: "#facc15",
            districtId: "core",
            height: 1.25,
            id: "src/core/worker.ts",
            recentBugCount: 0,
            totalBugCount: 1,
            width: 1,
        })
        expect(thirdBuilding?.depth).toBeGreaterThan(0.5)
        expect(thirdBuilding?.x).toBeTypeOf("number")
        expect(thirdBuilding?.z).toBeTypeOf("number")
    })

    it("маппит coverage диапазоны в ожидаемые цвета", (): void => {
        expect(resolveCodeCityBuildingColor(undefined)).toBe("#facc15")
        expect(resolveCodeCityBuildingColor(90)).toBe("#22c55e")
        expect(resolveCodeCityBuildingColor(70)).toBe("#14b8a6")
        expect(resolveCodeCityBuildingColor(50)).toBe("#fb923c")
        expect(resolveCodeCityBuildingColor(40)).toBe("#ef4444")
    })

    it("группирует здания по районам и строит district layout с labels", (): void => {
        const files: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
            {
                complexity: 16,
                coverage: 80,
                id: "src/api/auth.ts",
                loc: 120,
                path: "src/api/auth.ts",
            },
            {
                complexity: 12,
                coverage: 74,
                id: "src/worker/index.ts",
                loc: 95,
                path: "src/worker/index.ts",
            },
            {
                complexity: 22,
                coverage: 88,
                id: "src/ui/dashboard.tsx",
                loc: 180,
                path: "src/ui/dashboard.tsx",
            },
        ]

        const districts = createCodeCityDistrictMeshes(files)
        expect(districts).toHaveLength(3)
        const districtIds = districts
            .map((district): string => district.id)
            .sort((leftDistrict, rightDistrict): number => {
                return leftDistrict.localeCompare(rightDistrict)
            })
        expect(districtIds).toEqual(["api", "ui", "worker"])
        for (const district of districts) {
            expect(district.label.length).toBeGreaterThan(0)
            expect(district.width).toBeGreaterThan(0)
            expect(district.depth).toBeGreaterThan(0)
        }

        const buildings = createCodeCityBuildingMeshes(files)
        const buildingDistrictIds = buildings.map((building): string => building.districtId)
        expect(buildingDistrictIds).toContain("api")
        expect(buildingDistrictIds).toContain("ui")
        expect(buildingDistrictIds).toContain("worker")
    })

    it("строит impact карту с glow для affected зданий и ripple для соседей", (): void => {
        const files: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
            {
                complexity: 20,
                coverage: 83,
                id: "src/core/auth.ts",
                loc: 120,
                path: "src/core/auth.ts",
            },
            {
                complexity: 14,
                coverage: 72,
                id: "src/core/cache.ts",
                loc: 88,
                path: "src/core/cache.ts",
            },
            {
                complexity: 8,
                coverage: 66,
                id: "src/core/queue.ts",
                loc: 64,
                path: "src/core/queue.ts",
            },
            {
                complexity: 16,
                coverage: 90,
                id: "src/api/router.ts",
                loc: 108,
                path: "src/api/router.ts",
            },
        ]
        const impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor> = [
            {
                fileId: "src/core/auth.ts",
                impactType: "changed",
            },
            {
                fileId: "src/api/router.ts",
                impactType: "impacted",
            },
        ]

        const buildings = createCodeCityBuildingMeshes(files)
        const impactMap = createCodeCityBuildingImpactMap(buildings, impactedFiles)

        expect(impactMap.get("src/core/auth.ts")).toBe("changed")
        expect(impactMap.get("src/api/router.ts")).toBe("impacted")

        const coreRippleIds = ["src/core/cache.ts", "src/core/queue.ts"].filter(
            (fileId): boolean => impactMap.get(fileId) === "ripple",
        )
        expect(coreRippleIds.length).toBeGreaterThan(0)
    })

    it("возвращает профиль glow/pulse/ripple для impact состояний", (): void => {
        expect(resolveCodeCityBuildingImpactProfile("none")).toMatchObject({
            baseIntensity: 0,
            pulseAmplitude: 0,
            rippleLift: 0,
        })
        expect(resolveCodeCityBuildingImpactProfile("changed")).toMatchObject({
            baseIntensity: 0.3,
            emissive: "#fb7185",
        })
        expect(resolveCodeCityBuildingImpactProfile("impacted")).toMatchObject({
            baseIntensity: 0.25,
            emissive: "#22d3ee",
        })
        expect(resolveCodeCityBuildingImpactProfile("ripple")).toMatchObject({
            emissive: "#38bdf8",
            rippleLift: 0.16,
        })
    })

    it("применяет render budget для LOD, instancing и dpr в зависимости от нагрузки", (): void => {
        expect(resolveCodeCityRenderBudget(120, 62)).toMatchObject({
            dpr: [1, 1.5],
            quality: "high",
            useInstancing: false,
        })
        expect(resolveCodeCityRenderBudget(320, 60)).toMatchObject({
            dpr: [0.95, 1.25],
            quality: "medium",
            useInstancing: true,
        })
        expect(resolveCodeCityRenderBudget(720, 58)).toMatchObject({
            dpr: [0.75, 1],
            quality: "low",
            useInstancing: true,
        })
        expect(resolveCodeCityRenderBudget(180, 46)).toMatchObject({
            quality: "medium",
            useInstancing: true,
        })
    })

    it("строит causal arcs между связанными зданиями и кодирует цвет по типу связи", (): void => {
        const files: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
            {
                complexity: 18,
                coverage: 88,
                id: "src/api/auth.ts",
                loc: 140,
                path: "src/api/auth.ts",
            },
            {
                complexity: 22,
                coverage: 74,
                id: "src/api/repository.ts",
                loc: 170,
                path: "src/api/repository.ts",
            },
            {
                complexity: 13,
                coverage: 69,
                id: "src/services/retry.ts",
                loc: 110,
                path: "src/services/retry.ts",
            },
        ]
        const couplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
            {
                couplingType: "temporal",
                sourceFileId: "src/api/auth.ts",
                strength: 0.62,
                targetFileId: "src/api/repository.ts",
            },
            {
                couplingType: "dependency",
                sourceFileId: "src/api/repository.ts",
                strength: 0.84,
                targetFileId: "src/services/retry.ts",
            },
            {
                couplingType: "ownership",
                sourceFileId: "src/services/retry.ts",
                strength: 0.41,
                targetFileId: "src/api/auth.ts",
            },
        ]

        const buildings = createCodeCityBuildingMeshes(files)
        const arcs = createCodeCityCausalArcs(buildings, couplings)

        expect(arcs).toHaveLength(3)
        expect(arcs.map((arc): string => arc.color)).toEqual([
            "#38bdf8",
            "#fb923c",
            "#22c55e",
        ])
        const firstArc = arcs[0]
        expect(firstArc?.control[1]).toBeGreaterThan(firstArc?.start[1] ?? 0)
        expect(firstArc?.control[1]).toBeGreaterThan(firstArc?.end[1] ?? 0)
        expect(firstArc?.particleSpeed).toBeGreaterThan(0.25)
    })

    it("возвращает стабильные цвета causal arcs для всех coupling типов", (): void => {
        expect(resolveCodeCityCausalArcColor("temporal")).toBe("#38bdf8")
        expect(resolveCodeCityCausalArcColor("dependency")).toBe("#fb923c")
        expect(resolveCodeCityCausalArcColor("ownership")).toBe("#22c55e")
    })

    it("подбирает bug emission профиль по частоте багов и recent активности", (): void => {
        expect(resolveCodeCityBugEmissionSettings(12, 3)).toMatchObject({
            color: "#ef4444",
            particleCount: 6,
        })
        expect(resolveCodeCityBugEmissionSettings(6, 0)).toMatchObject({
            color: "#f97316",
            particleCount: 4,
            pulseStrength: 0.3,
        })
        expect(resolveCodeCityBugEmissionSettings(2, 1)).toMatchObject({
            color: "#facc15",
            particleCount: 2,
            pulseStrength: 0.75,
        })
    })
})
