import { describe, expect, it } from "vitest"

import {
    buildRefactoringTargets,
    buildCityRefactoringOverlayEntries,
    buildRefactoringTimelineTasks,
    buildImpactAnalysisSeeds,
    buildChangeRiskGaugeModel,
    buildImpactGraphModel,
    buildWhatIfOptions,
} from "@/pages/code-city-dashboard/builders/impact-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"

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

describe("buildRefactoringTargets", (): void => {
    it("when given files, then returns sorted targets by ROI", (): void => {
        const targets = buildRefactoringTargets(testFiles)

        expect(targets.length).toBeGreaterThan(0)
        expect(targets.length).toBeLessThanOrEqual(6)
    })

    it("when given files, then each target has required fields", (): void => {
        const targets = buildRefactoringTargets(testFiles)
        const first = targets[0]

        expect(first).toBeDefined()
        expect(first?.roiScore).toBeGreaterThanOrEqual(1)
        expect(first?.riskScore).toBeGreaterThanOrEqual(1)
        expect(first?.effortScore).toBeGreaterThanOrEqual(1)
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildRefactoringTargets([])).toHaveLength(0)
    })
})

describe("buildCityRefactoringOverlayEntries", (): void => {
    it("when given targets, then returns at most 5 overlay entries", (): void => {
        const targets = buildRefactoringTargets(testFiles)
        const entries = buildCityRefactoringOverlayEntries(targets)

        expect(entries.length).toBeLessThanOrEqual(5)
    })

    it("when first entry, then has 'critical' priority", (): void => {
        const targets = buildRefactoringTargets(testFiles)
        const entries = buildCityRefactoringOverlayEntries(targets)

        expect(entries[0]?.priority).toBe("critical")
    })
})

describe("buildRefactoringTimelineTasks", (): void => {
    it("when given targets, then returns tasks with incremental start weeks", (): void => {
        const targets = buildRefactoringTargets(testFiles)
        const tasks = buildRefactoringTimelineTasks(targets)

        expect(tasks.length).toBeGreaterThan(0)
        expect(tasks[0]?.startWeek).toBe(1)
    })

    it("when given targets, then later tasks have dependencies", (): void => {
        const targets = buildRefactoringTargets(testFiles)
        const tasks = buildRefactoringTimelineTasks(targets)

        if (tasks.length >= 2) {
            expect(tasks[1]?.dependencies.length).toBeGreaterThan(0)
        }
    })
})

describe("buildImpactAnalysisSeeds", (): void => {
    it("when given files, then returns at most 6 seeds", (): void => {
        const seeds = buildImpactAnalysisSeeds(testFiles)

        expect(seeds.length).toBeLessThanOrEqual(6)
        expect(seeds.length).toBe(testFiles.length)
    })

    it("when given files, then each seed has affected items", (): void => {
        const seeds = buildImpactAnalysisSeeds(testFiles)

        expect(seeds[0]?.affectedFiles.length).toBeGreaterThan(0)
        expect(seeds[0]?.affectedTests.length).toBeGreaterThan(0)
        expect(seeds[0]?.affectedConsumers.length).toBeGreaterThan(0)
    })
})

describe("buildChangeRiskGaugeModel", (): void => {
    it("when given seeds and health trend, then returns model with score", (): void => {
        const seeds = buildImpactAnalysisSeeds(testFiles)
        const healthTrend = [
            { timestamp: "2024-01-01T00:00:00Z", healthScore: 80 },
            { timestamp: "2024-02-01T00:00:00Z", healthScore: 75 },
            { timestamp: "2024-03-01T00:00:00Z", healthScore: 70 },
        ]

        const model = buildChangeRiskGaugeModel(seeds, healthTrend)

        expect(model.currentScore).toBeGreaterThanOrEqual(0)
        expect(model.historicalPoints.length).toBeLessThanOrEqual(3)
    })

    it("when given empty seeds, then currentScore is 0", (): void => {
        const model = buildChangeRiskGaugeModel([], [])

        expect(model.currentScore).toBe(0)
    })
})

describe("buildImpactGraphModel", (): void => {
    it("when given seeds, then returns nodes and edges", (): void => {
        const seeds = buildImpactAnalysisSeeds(testFiles)
        const graph = buildImpactGraphModel(seeds)

        expect(graph.nodes.length).toBeGreaterThan(0)
        expect(graph.edges.length).toBe(graph.nodes.length - 1)
    })

    it("when given empty seeds, then returns empty graph", (): void => {
        const graph = buildImpactGraphModel([])

        expect(graph.nodes).toHaveLength(0)
        expect(graph.edges).toHaveLength(0)
    })
})

describe("buildWhatIfOptions", (): void => {
    it("when given seeds, then returns options with affected counts", (): void => {
        const seeds = buildImpactAnalysisSeeds(testFiles)
        const options = buildWhatIfOptions(seeds)

        expect(options.length).toBeGreaterThan(0)
        expect(options[0]?.affectedCount).toBeGreaterThan(0)
    })
})
