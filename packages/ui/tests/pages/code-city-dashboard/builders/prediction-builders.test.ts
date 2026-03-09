import { describe, expect, it } from "vitest"

import {
    resolvePredictionRiskLevel,
    resolvePredictionReason,
    resolvePredictionConfidence,
    resolvePredictionRiskPriority,
    buildPredictionOverlayEntries,
    buildPredictedRiskByFileId,
    buildPredictionConfusionMatrix,
} from "@/pages/code-city-dashboard/builders/prediction-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"

describe("resolvePredictionRiskLevel", (): void => {
    it("when bugs >= 4, then returns 'high'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 100,
            bugIntroductions: { "30d": 5 },
        }

        expect(resolvePredictionRiskLevel(file)).toBe("high")
    })

    it("when complexity >= 24, then returns 'high'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 100,
            complexity: 25,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("high")
    })

    it("when bugs >= 2 and < 4, then returns 'medium'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 100,
            bugIntroductions: { "30d": 3 },
        }

        expect(resolvePredictionRiskLevel(file)).toBe("medium")
    })

    it("when all metrics are low, then returns 'low'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 100,
            bugIntroductions: { "30d": 0 },
            complexity: 5,
            churn: 1,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("low")
    })
})

describe("resolvePredictionReason", (): void => {
    const file: ICodeCityTreemapFileDescriptor = {
        id: "f1",
        path: "src/review.ts",
        loc: 100,
        bugIntroductions: { "30d": 5 },
        churn: 3,
    }

    it("when risk is 'high', then reason mentions bug introductions", (): void => {
        expect(resolvePredictionReason(file, "high")).toContain("Bug introductions")
    })

    it("when risk is 'medium', then reason mentions volatility", (): void => {
        expect(resolvePredictionReason(file, "medium")).toContain("volatility")
    })

    it("when risk is 'low', then reason mentions baseline", (): void => {
        expect(resolvePredictionReason(file, "low")).toContain("baseline")
    })
})

describe("resolvePredictionConfidence", (): void => {
    it("when file has high metrics, then returns high confidence (clamped at 96)", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 500,
            bugIntroductions: { "30d": 10 },
            complexity: 50,
            churn: 20,
        }

        expect(resolvePredictionConfidence(file)).toBe(96)
    })

    it("when file has zero metrics, then returns minimum confidence (45)", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/review.ts",
            loc: 10,
        }

        expect(resolvePredictionConfidence(file)).toBe(45)
    })
})

describe("resolvePredictionRiskPriority", (): void => {
    it("when risk is 'high', then returns 3", (): void => {
        expect(resolvePredictionRiskPriority("high")).toBe(3)
    })

    it("when risk is 'medium', then returns 2", (): void => {
        expect(resolvePredictionRiskPriority("medium")).toBe(2)
    })

    it("when risk is 'low', then returns 1", (): void => {
        expect(resolvePredictionRiskPriority("low")).toBe(1)
    })
})

describe("buildPredictionOverlayEntries", (): void => {
    it("when given files, then returns sorted entries by risk", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/low.ts", loc: 10 },
            {
                id: "f2",
                path: "src/high.ts",
                loc: 200,
                bugIntroductions: { "30d": 5 },
                complexity: 30,
            },
        ]

        const entries = buildPredictionOverlayEntries(files)

        expect(entries.length).toBeGreaterThan(0)
        expect(entries[0]?.riskLevel).toBe("high")
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildPredictionOverlayEntries([])).toHaveLength(0)
    })
})

describe("buildPredictedRiskByFileId", (): void => {
    it("when entries exist, then returns risk map", (): void => {
        const entries = [
            {
                fileId: "f1",
                riskLevel: "high" as const,
                confidenceScore: 80,
                label: "test",
                reason: "test",
            },
        ]

        const result = buildPredictedRiskByFileId(entries)

        expect(result).toBeDefined()
        expect(result?.f1).toBe("high")
    })

    it("when entries are empty, then returns undefined", (): void => {
        expect(buildPredictedRiskByFileId([])).toBeUndefined()
    })
})

describe("buildPredictionConfusionMatrix", (): void => {
    it("when given entries, then returns matrix with non-negative values", (): void => {
        const entries = [
            {
                fileId: "f1",
                riskLevel: "high" as const,
                confidenceScore: 80,
                label: "a",
                reason: "r",
            },
            {
                fileId: "f2",
                riskLevel: "low" as const,
                confidenceScore: 50,
                label: "b",
                reason: "r",
            },
            {
                fileId: "f3",
                riskLevel: "medium" as const,
                confidenceScore: 70,
                label: "c",
                reason: "r",
            },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        expect(matrix.truePositive).toBeGreaterThanOrEqual(0)
        expect(matrix.trueNegative).toBeGreaterThanOrEqual(0)
        expect(matrix.falsePositive).toBeGreaterThanOrEqual(0)
        expect(matrix.falseNegative).toBeGreaterThanOrEqual(0)
    })

    it("when given empty entries, then returns all zeros", (): void => {
        const matrix = buildPredictionConfusionMatrix([])

        expect(matrix.truePositive).toBe(0)
        expect(matrix.trueNegative).toBe(0)
        expect(matrix.falsePositive).toBe(0)
        expect(matrix.falseNegative).toBe(0)
    })
})
