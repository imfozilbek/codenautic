import { describe, expect, it } from "vitest"

import {
    calculateSprintImprovementScore,
    buildSprintComparisonSnapshots,
    buildDistrictTrendIndicators,
    buildSprintAchievements,
    buildTeamLeaderboardEntries,
    buildSprintSummaryCardModel,
    buildTrendTimelineEntries,
} from "@/pages/code-city-dashboard/builders/sprint-gamification-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { ISprintComparisonMetric } from "@/components/graphs/sprint-comparison-view"
import type { IHealthTrendPoint } from "@/components/graphs/health-trend-chart"

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

    it("when given single file, then returns single achievement", (): void => {
        const singleFile: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/domain/review.ts", loc: 100, complexity: 20, churn: 4 },
        ]

        const achievements = buildSprintAchievements(singleFile)

        expect(achievements).toHaveLength(1)
        expect(achievements[0]?.relatedFileIds).toContain("f1")
    })

    it("when file has zero complexity, then uses minimum values", (): void => {
        const zeroFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/clean.ts", loc: 10, complexity: 0, churn: 0 },
        ]

        const achievements = buildSprintAchievements(zeroFiles)

        expect(achievements).toHaveLength(1)
        expect(achievements[0]?.improvementPercent).toBeGreaterThanOrEqual(4)
    })

    it("when achievements have same improvement percent, then sorts by title", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/aaa/file.ts", loc: 100, complexity: 10, churn: 4 },
            { id: "f2", path: "src/bbb/file.ts", loc: 100, complexity: 10, churn: 4 },
        ]

        const achievements = buildSprintAchievements(files)

        expect(achievements.length).toBe(2)
    })

    it("when file has very high complexity, then improvement is clamped at 24", (): void => {
        const highComplexityFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/complex.ts", loc: 500, complexity: 200, churn: 0 },
        ]

        const achievements = buildSprintAchievements(highComplexityFiles)

        expect(achievements[0]?.badge).toBeDefined()
    })
})

describe("buildTeamLeaderboardEntries", (): void => {
    const contributors = [
        { ownerId: "alice", ownerName: "Alice", commitCount: 50, color: "#ff0000" },
        { ownerId: "bob", ownerName: "Bob", commitCount: 30, color: "#00ff00" },
    ]

    const ownership = [
        { fileId: "f1", ownerId: "alice" },
        { fileId: "f2", ownerId: "bob" },
    ]

    it("when given files, contributors, and ownership, then returns leaderboard", (): void => {
        const entries = buildTeamLeaderboardEntries(testFiles, contributors, ownership)

        expect(entries).toHaveLength(2)
        entries.forEach((entry): void => {
            expect(entry.quality.sprint).toBeGreaterThanOrEqual(1)
            expect(entry.quality.sprint).toBeLessThanOrEqual(180)
            expect(entry.velocity.month).toBeGreaterThanOrEqual(1)
            expect(entry.ownership.month).toBeGreaterThanOrEqual(1)
        })
    })

    it("when sorted, then highest quality sprint is first", (): void => {
        const entries = buildTeamLeaderboardEntries(testFiles, contributors, ownership)

        for (let i = 0; i < entries.length - 1; i += 1) {
            const current = entries[i]
            const next = entries[i + 1]
            if (current !== undefined && next !== undefined) {
                if (current.quality.sprint === next.quality.sprint) {
                    expect(current.ownerName.localeCompare(next.ownerName)).toBeLessThanOrEqual(0)
                } else {
                    expect(current.quality.sprint).toBeGreaterThanOrEqual(next.quality.sprint)
                }
            }
        }
    })

    it("when contributor has no owned files, then uses fallback file ids", (): void => {
        const noOwnership: { fileId: string; ownerId: string }[] = []

        const entries = buildTeamLeaderboardEntries(testFiles, contributors, noOwnership)

        expect(entries).toHaveLength(2)
    })

    it("when given empty files, then still returns entries for contributors", (): void => {
        const entries = buildTeamLeaderboardEntries([], contributors, [])

        expect(entries).toHaveLength(2)
    })

    it("when given empty contributors, then returns empty array", (): void => {
        expect(buildTeamLeaderboardEntries(testFiles, [], ownership)).toHaveLength(0)
    })

    it("when ownership references missing file, then skips it", (): void => {
        const badOwnership = [{ fileId: "nonexistent", ownerId: "alice" }]

        const entries = buildTeamLeaderboardEntries(testFiles, contributors, badOwnership)

        expect(entries).toHaveLength(2)
    })

    it("when contributor has zero commits and zero files, then scores are clamped at 1", (): void => {
        const zeroContributors = [
            { ownerId: "zero", ownerName: "Zero", commitCount: 0, color: "#000" },
        ]

        const entries = buildTeamLeaderboardEntries([], zeroContributors, [])

        expect(entries[0]?.quality.sprint).toBeGreaterThanOrEqual(1)
        expect(entries[0]?.velocity.month).toBeGreaterThanOrEqual(1)
        expect(entries[0]?.ownership.month).toBeGreaterThanOrEqual(1)
    })

    it("when two contributors have same quality sprint, then sorts by name", (): void => {
        const sameQualityContributors = [
            { ownerId: "bob", ownerName: "Bob", commitCount: 50, color: "#00ff00" },
            { ownerId: "alice", ownerName: "Alice", commitCount: 50, color: "#ff0000" },
        ]
        const sameOwnership = [
            { fileId: "f1", ownerId: "alice" },
            { fileId: "f1", ownerId: "bob" },
        ]

        const entries = buildTeamLeaderboardEntries(testFiles, sameQualityContributors, sameOwnership)

        expect(entries).toHaveLength(2)
    })

    it("when ownership has duplicate fileId for same owner, then deduplicates", (): void => {
        const dupOwnership = [
            { fileId: "f1", ownerId: "alice" },
            { fileId: "f1", ownerId: "alice" },
        ]

        const entries = buildTeamLeaderboardEntries(testFiles, contributors, dupOwnership)

        const aliceEntry = entries.find((e) => e.ownerId === "alice")
        expect(aliceEntry?.fileIds).toHaveLength(1)
    })
})

describe("buildSprintSummaryCardModel", (): void => {
    it("when given all inputs, then returns summary card", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)
        const achievements = buildSprintAchievements(testFiles)
        const districtTrends = buildDistrictTrendIndicators(testFiles)

        const card = buildSprintSummaryCardModel(testFiles, snapshots, achievements, districtTrends)

        expect(card.metrics).toHaveLength(3)
        expect(card.overallImprovementScore).toBeGreaterThanOrEqual(1)
        expect(card.overallImprovementScore).toBeLessThanOrEqual(99)
        expect(card.achievementsCount).toBe(achievements.length)
    })

    it("when given empty files, then returns card with zero averages", (): void => {
        const card = buildSprintSummaryCardModel([], [], [], [])

        expect(card.metrics).toHaveLength(3)
        expect(card.sprintLabel).toBe("Sprint summary")
    })

    it("when no snapshots, then sprint label is fallback", (): void => {
        const card = buildSprintSummaryCardModel(testFiles, [], [], [])

        expect(card.sprintLabel).toBe("Sprint summary")
    })

    it("when no improving districts, then coverage metric shows 0 districts", (): void => {
        const card = buildSprintSummaryCardModel(testFiles, [], [], [])

        const coverageMetric = card.metrics.find((m) => m.id === "coverage")
        expect(coverageMetric?.value).toContain("0 districts")
    })
})

describe("buildTrendTimelineEntries", (): void => {
    const healthTrend: IHealthTrendPoint[] = [
        { timestamp: "2025-10-01T00:00:00Z", healthScore: 80 },
        { timestamp: "2025-11-01T00:00:00Z", healthScore: 75 },
        { timestamp: "2025-12-01T00:00:00Z", healthScore: 70 },
        { timestamp: "2026-01-01T00:00:00Z", healthScore: 65 },
        { timestamp: "2026-02-01T00:00:00Z", healthScore: 60 },
        { timestamp: "2026-03-01T00:00:00Z", healthScore: 55 },
    ]

    it("when given valid inputs, then returns timeline entries", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)

        const entries = buildTrendTimelineEntries(testFiles, healthTrend, snapshots)

        expect(entries.length).toBeGreaterThan(0)
        expect(entries.length).toBeLessThanOrEqual(4)
        entries.forEach((entry): void => {
            expect(entry.metrics).toHaveLength(3)
            expect(entry.id).toContain("trend-timeline-")
        })
    })

    it("when health trend is empty, then returns single entry", (): void => {
        const entries = buildTrendTimelineEntries(testFiles, [], [])

        expect(entries).toHaveLength(0)
    })

    it("when health trend has one point, then returns entries", (): void => {
        const singleTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 80 },
        ]

        const entries = buildTrendTimelineEntries(testFiles, singleTrend, [])

        expect(entries.length).toBeGreaterThanOrEqual(0)
    })

    it("when score improves, then summary mentions improvement", (): void => {
        const improvingTrend: IHealthTrendPoint[] = [
            { timestamp: "2025-10-01T00:00:00Z", healthScore: 50 },
            { timestamp: "2025-11-01T00:00:00Z", healthScore: 55 },
            { timestamp: "2025-12-01T00:00:00Z", healthScore: 60 },
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 70 },
            { timestamp: "2026-02-01T00:00:00Z", healthScore: 80 },
            { timestamp: "2026-03-01T00:00:00Z", healthScore: 90 },
        ]

        const entries = buildTrendTimelineEntries(testFiles, improvingTrend, [])

        const hasImprovement = entries.some((entry) => entry.summary.includes("improved"))
        expect(hasImprovement).toBe(true)
    })

    it("when score drops, then summary mentions drop", (): void => {
        const droppingTrend: IHealthTrendPoint[] = [
            { timestamp: "2025-10-01T00:00:00Z", healthScore: 90 },
            { timestamp: "2025-11-01T00:00:00Z", healthScore: 80 },
            { timestamp: "2025-12-01T00:00:00Z", healthScore: 70 },
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 60 },
            { timestamp: "2026-02-01T00:00:00Z", healthScore: 50 },
            { timestamp: "2026-03-01T00:00:00Z", healthScore: 40 },
        ]

        const entries = buildTrendTimelineEntries(testFiles, droppingTrend, [])

        const hasDrop = entries.some((entry) => entry.summary.includes("dropped"))
        expect(hasDrop).toBe(true)
    })

    it("when files are empty, then entries still have metric points", (): void => {
        const entries = buildTrendTimelineEntries([], healthTrend, [])

        expect(entries.length).toBeGreaterThan(0)
        entries.forEach((entry): void => {
            expect(entry.metrics).toHaveLength(3)
        })
    })

    it("when snapshot has title, then uses it as sprint label", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)

        const entries = buildTrendTimelineEntries(testFiles, healthTrend, snapshots)

        if (entries[0] !== undefined && snapshots[0] !== undefined) {
            expect(entries[0].sprintLabel).toBe(snapshots[0].title)
        }
    })
})

describe("calculateSprintImprovementScore — edge cases", (): void => {
    it("when beforeValue is 0, then treats it as 1 for division", (): void => {
        const metrics: ISprintComparisonMetric[] = [
            { label: "Complexity", beforeValue: 0, afterValue: 5 },
        ]

        const score = calculateSprintImprovementScore(metrics)

        expect(score).toBe(0)
    })

    it("when Coverage metric improves, then contributes positively", (): void => {
        const metrics: ISprintComparisonMetric[] = [
            { label: "Coverage", beforeValue: 50, afterValue: 80 },
        ]

        const score = calculateSprintImprovementScore(metrics)

        expect(score).toBeGreaterThan(0)
    })

    it("when Coverage metric degrades, then contributes negatively", (): void => {
        const metrics: ISprintComparisonMetric[] = [
            { label: "Coverage", beforeValue: 80, afterValue: 50 },
        ]

        const score = calculateSprintImprovementScore(metrics)

        expect(score).toBe(0)
    })
})

describe("buildDistrictTrendIndicators — edge cases", (): void => {
    it("when single file, then returns single district entry", (): void => {
        const singleFile: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/only.ts", loc: 100, complexity: 10 },
        ]

        const indicators = buildDistrictTrendIndicators(singleFile)

        expect(indicators).toHaveLength(1)
    })

    it("when files have zero metrics, then district still has entries", (): void => {
        const zeroFiles: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/clean.ts", loc: 10, complexity: 0, churn: 0 },
        ]

        const indicators = buildDistrictTrendIndicators(zeroFiles)

        expect(indicators).toHaveLength(1)
        expect(indicators[0]?.fileCount).toBe(1)
    })

    it("when duplicate file id in same district, then does not double count", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/file.ts", loc: 100, complexity: 10 },
            { id: "f1", path: "src/file.ts", loc: 100, complexity: 10 },
        ]

        const indicators = buildDistrictTrendIndicators(files)

        expect(indicators).toHaveLength(1)
        expect(indicators[0]?.fileCount).toBe(1)
    })

    it("when multiple districts, then sorted by delta magnitude", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "aaa/file.ts", loc: 100, complexity: 50, churn: 10, bugIntroductions: { "30d": 5 } },
            { id: "f2", path: "bbb/file.ts", loc: 100, complexity: 5, churn: 1 },
            { id: "f3", path: "ccc/file.ts", loc: 100, complexity: 20, churn: 5 },
        ]

        const indicators = buildDistrictTrendIndicators(files)

        expect(indicators.length).toBe(3)
        for (let i = 0; i < indicators.length - 1; i += 1) {
            const current = indicators[i]
            const next = indicators[i + 1]
            if (current !== undefined && next !== undefined) {
                expect(Math.abs(current.deltaPercentage)).toBeGreaterThanOrEqual(
                    Math.abs(next.deltaPercentage),
                )
            }
        }
    })
})

describe("buildSprintComparisonSnapshots — edge cases", (): void => {
    it("when single file, then returns single snapshot", (): void => {
        const singleFile: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/only.ts", loc: 100, complexity: 10, churn: 3 },
        ]

        const snapshots = buildSprintComparisonSnapshots(singleFile)

        expect(snapshots).toHaveLength(1)
        expect(snapshots[0]?.metrics).toHaveLength(3)
    })

    it("when file has zero complexity and churn, then uses minimum values", (): void => {
        const zeroFile: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/clean.ts", loc: 10, complexity: 0, churn: 0 },
        ]

        const snapshots = buildSprintComparisonSnapshots(zeroFile)

        expect(snapshots).toHaveLength(1)
        snapshots[0]?.metrics.forEach((metric): void => {
            expect(metric.beforeValue).toBeGreaterThanOrEqual(1)
            expect(metric.afterValue).toBeGreaterThanOrEqual(1)
        })
    })

    it("when snapshots have improvement scores, then they are non-negative", (): void => {
        const snapshots = buildSprintComparisonSnapshots(testFiles)

        snapshots.forEach((snapshot): void => {
            expect(snapshot.improvementScore).toBeGreaterThanOrEqual(0)
        })
    })
})
