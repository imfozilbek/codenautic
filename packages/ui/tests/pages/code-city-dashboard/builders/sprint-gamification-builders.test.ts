import { describe, expect, it } from "vitest"

import {
    calculateSprintImprovementScore,
    buildSprintComparisonSnapshots,
    buildDistrictTrendIndicators,
    buildSprintAchievements,
} from "@/pages/code-city-dashboard/builders/sprint-gamification-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { ISprintComparisonMetric } from "@/components/graphs/sprint-comparison-view"

const testFiles: ICodeCityTreemapFileDescriptor[] = [
    {
        id: "f1",
        path: "src/domain/review.ts",
        loc: 200,
        complexity: 15,
        churn: 5,
        bugIntroductions: { "30d": 3 },
    },
    {
        id: "f2",
        path: "src/infra/db.ts",
        loc: 150,
        complexity: 10,
        churn: 2,
        bugIntroductions: { "30d": 1 },
    },
    {
        id: "f3",
        path: "src/app/service.ts",
        loc: 100,
        complexity: 8,
        churn: 1,
        bugIntroductions: { "30d": 0 },
    },
]

describe("calculateSprintImprovementScore", (): void => {
    it("when metrics show improvement, then returns positive score", (): void => {
        const metrics: ISprintComparisonMetric[] = [
            { label: "Complexity", beforeValue: 20, afterValue: 15 },
            { label: "Coverage", beforeValue: 60, afterValue: 80 },
            { label: "Churn", beforeValue: 10, afterValue: 5 },
        ]

        const score = calculateSprintImprovementScore(metrics)

        expect(score).toBeGreaterThan(0)
    })

    it("when metrics show no change, then returns 0", (): void => {
        const metrics: ISprintComparisonMetric[] = [
            { label: "Complexity", beforeValue: 10, afterValue: 10 },
        ]

        const score = calculateSprintImprovementScore(metrics)

        expect(score).toBe(0)
    })

    it("when given empty metrics, then returns 0", (): void => {
        expect(calculateSprintImprovementScore([])).toBe(0)
    })
})

describe("buildSprintComparisonSnapshots", (): void => {
    it("when given files, then returns at most 3 snapshots", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)

        expect(snapshots.length).toBeLessThanOrEqual(3)
    })

    it("when given files, then each snapshot has 3 metrics", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)

        snapshots.forEach((snapshot): void => {
            expect(snapshot.metrics).toHaveLength(3)
        })
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildSprintComparisonSnapshots([])).toHaveLength(0)
    })
})

describe("buildDistrictTrendIndicators", (): void => {
    it("when given files, then groups by district", (): void => {
        const indicators = buildDistrictTrendIndicators(testFiles)

        expect(indicators.length).toBeGreaterThan(0)
    })

    it("when given files in same directory, then aggregates them", (): void => {
        const sameDir: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/file1.ts", loc: 100, complexity: 10, churn: 2 },
            { id: "f2", path: "src/file2.ts", loc: 100, complexity: 5, churn: 1 },
        ]

        const indicators = buildDistrictTrendIndicators(sameDir)
        const srcDistrict = indicators.find((entry): boolean => entry.districtId === "src")

        expect(srcDistrict).toBeDefined()
        expect(srcDistrict?.fileCount).toBe(2)
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildDistrictTrendIndicators([])).toHaveLength(0)
    })
})

describe("buildSprintAchievements", (): void => {
    it("when given files, then returns at most 4 achievements", (): void => {
        const achievements = buildSprintAchievements(testFiles)

        expect(achievements.length).toBeLessThanOrEqual(4)
    })

    it("when given files, then each achievement has badge", (): void => {
        const achievements = buildSprintAchievements(testFiles)

        achievements.forEach((achievement): void => {
            expect(["gold", "silver", "bronze"]).toContain(achievement.badge)
        })
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildSprintAchievements([])).toHaveLength(0)
    })
})
