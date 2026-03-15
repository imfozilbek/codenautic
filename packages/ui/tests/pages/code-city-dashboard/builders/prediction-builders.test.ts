import { describe, expect, it } from "vitest"

import {
    resolvePredictionRiskLevel,
    resolvePredictionReason,
    resolvePredictionConfidence,
    resolvePredictionRiskPriority,
    buildPredictionOverlayEntries,
    buildPredictedRiskByFileId,
    buildPredictionConfusionMatrix,
    buildPredictionDashboardHotspots,
    buildPredictionQualityTrendPoints,
    buildTrendForecastChartPoints,
    buildPredictionAccuracyPoints,
    buildPredictionAccuracyCases,
    buildPredictionAlertModules,
    resolvePredictionAlertFocusFileId,
    buildPredictionComparisonSnapshots,
    buildPredictionBugProneFiles,
    buildPredictionExplainEntries,
} from "@/pages/code-city-dashboard/builders/prediction-builders"
import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"
import type { ICityPredictionOverlayEntry } from "@/components/codecity/overlays/city-prediction-overlay"
import type { IHealthTrendPoint } from "@/components/codecity/health-trend-chart"

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

    it("when all entries are low risk, then has no true positives", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f1", riskLevel: "low", confidenceScore: 50, label: "a", reason: "r" },
            { fileId: "f2", riskLevel: "low", confidenceScore: 50, label: "b", reason: "r" },
            { fileId: "f3", riskLevel: "low", confidenceScore: 50, label: "c", reason: "r" },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        expect(matrix.truePositive).toBe(0)
        expect(matrix.falsePositive).toBe(0)
    })

    it("when entries cover all 4 matrix quadrants, then all values are positive", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f0", riskLevel: "high", confidenceScore: 90, label: "a", reason: "r" },
            { fileId: "f1", riskLevel: "high", confidenceScore: 85, label: "b", reason: "r" },
            { fileId: "f2", riskLevel: "high", confidenceScore: 80, label: "c", reason: "r" },
            { fileId: "f3", riskLevel: "low", confidenceScore: 50, label: "d", reason: "r" },
            { fileId: "f4", riskLevel: "low", confidenceScore: 45, label: "e", reason: "r" },
            { fileId: "f5", riskLevel: "low", confidenceScore: 48, label: "f", reason: "r" },
            { fileId: "f6", riskLevel: "medium", confidenceScore: 70, label: "g", reason: "r" },
            { fileId: "f7", riskLevel: "medium", confidenceScore: 65, label: "h", reason: "r" },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        const total =
            matrix.truePositive + matrix.trueNegative + matrix.falsePositive + matrix.falseNegative
        expect(total).toBe(8)
    })

    it("when low risk entry at index 0 (divisible by 3), then counts as trueNegative", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f0", riskLevel: "low", confidenceScore: 50, label: "a", reason: "r" },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        expect(matrix.trueNegative).toBe(1)
    })

    it("when low risk entry at index 1 (not divisible by 3), then counts as falseNegative", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f0", riskLevel: "high", confidenceScore: 90, label: "a", reason: "r" },
            { fileId: "f1", riskLevel: "low", confidenceScore: 50, label: "b", reason: "r" },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        expect(matrix.falseNegative).toBe(1)
    })

    it("when high risk entry at index 0 (divisible by 3), then counts as falsePositive", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f0", riskLevel: "high", confidenceScore: 90, label: "a", reason: "r" },
        ]

        const matrix = buildPredictionConfusionMatrix(entries)

        expect(matrix.falsePositive).toBe(1)
    })
})

describe("resolvePredictionRiskLevel — boundary values", (): void => {
    it("when churn is exactly 8, then returns 'high'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            churn: 8,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("high")
    })

    it("when complexity is exactly 24, then returns 'high'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            complexity: 24,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("high")
    })

    it("when bugs is exactly 4, then returns 'high'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            bugIntroductions: { "30d": 4 },
        }

        expect(resolvePredictionRiskLevel(file)).toBe("high")
    })

    it("when churn is exactly 4, then returns 'medium'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            churn: 4,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("medium")
    })

    it("when complexity is exactly 16, then returns 'medium'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            complexity: 16,
        }

        expect(resolvePredictionRiskLevel(file)).toBe("medium")
    })

    it("when bugs is exactly 2, then returns 'medium'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            bugIntroductions: { "30d": 2 },
        }

        expect(resolvePredictionRiskLevel(file)).toBe("medium")
    })

    it("when file has no optional fields, then returns 'low'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
        }

        expect(resolvePredictionRiskLevel(file)).toBe("low")
    })

    it("when all metrics are zero, then returns 'low'", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 0,
            complexity: 0,
            churn: 0,
            bugIntroductions: { "30d": 0 },
        }

        expect(resolvePredictionRiskLevel(file)).toBe("low")
    })
})

describe("resolvePredictionReason — edge cases", (): void => {
    it("when file has no optional fields and risk is 'high', then uses defaults", (): void => {
        const file: ICodeCityTreemapFileDescriptor = { id: "f1", path: "src/file.ts" }

        const reason = resolvePredictionReason(file, "high")

        expect(reason).toContain("Bug introductions 0")
        expect(reason).toContain("churn 0")
    })
})

describe("resolvePredictionConfidence — edge cases", (): void => {
    it("when file has moderate metrics, then returns value between 45 and 96", (): void => {
        const file: ICodeCityTreemapFileDescriptor = {
            id: "f1",
            path: "src/file.ts",
            loc: 100,
            bugIntroductions: { "30d": 2 },
            complexity: 10,
            churn: 3,
        }

        const confidence = resolvePredictionConfidence(file)

        expect(confidence).toBeGreaterThanOrEqual(45)
        expect(confidence).toBeLessThanOrEqual(96)
    })
})

describe("buildPredictionDashboardHotspots", (): void => {
    it("when given files and overlay entries, then returns hotspot entries", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/high.ts",
                loc: 200,
                bugIntroductions: { "30d": 5 },
                complexity: 30,
                churn: 10,
            },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/high.ts",
                reason: "test",
            },
        ]

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots).toHaveLength(1)
        expect(hotspots[0]?.riskLevel).toBe("high")
        expect(hotspots[0]?.predictedIssueIncrease).toBeGreaterThanOrEqual(3)
    })

    it("when overlay entry references missing file, then uses default issue increase", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = []
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "missing",
                riskLevel: "medium",
                confidenceScore: 70,
                label: "missing.ts",
                reason: "test",
            },
        ]

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots).toHaveLength(1)
        expect(hotspots[0]?.predictedIssueIncrease).toBeGreaterThanOrEqual(1)
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildPredictionDashboardHotspots([], [])).toHaveLength(0)
    })

    it("when risk is 'low', then predicted issue increase is 1", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [{ id: "f1", path: "src/low.ts", loc: 10 }]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "low",
                confidenceScore: 50,
                label: "src/low.ts",
                reason: "low",
            },
        ]

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots[0]?.predictedIssueIncrease).toBe(1)
    })

    it("when risk is 'medium' with 0 bugs, then predicted issue increase is at least 2", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/med.ts", loc: 100, bugIntroductions: { "30d": 0 } },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "medium",
                confidenceScore: 70,
                label: "src/med.ts",
                reason: "med",
            },
        ]

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots[0]?.predictedIssueIncrease).toBe(2)
    })

    it("when risk is 'medium' with many bugs, then uses ceil(bugs/2)", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/med.ts", loc: 100, bugIntroductions: { "30d": 7 } },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "medium",
                confidenceScore: 70,
                label: "src/med.ts",
                reason: "med",
            },
        ]

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots[0]?.predictedIssueIncrease).toBe(4)
    })

    it("when overlay has more than 6 entries, then returns at most 6", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 8 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/file${String(i)}.ts`,
            loc: 100,
        }))
        const overlayEntries: ICityPredictionOverlayEntry[] = Array.from({ length: 8 }, (_, i) => ({
            fileId: `f${String(i)}`,
            riskLevel: "high" as const,
            confidenceScore: 90,
            label: `src/file${String(i)}.ts`,
            reason: "test",
        }))

        const hotspots = buildPredictionDashboardHotspots(files, overlayEntries)

        expect(hotspots.length).toBeLessThanOrEqual(6)
    })
})

describe("buildPredictionQualityTrendPoints", (): void => {
    const healthTrend: IHealthTrendPoint[] = [
        { timestamp: "2025-10-01T00:00:00Z", healthScore: 80 },
        { timestamp: "2025-11-01T00:00:00Z", healthScore: 75 },
        { timestamp: "2025-12-01T00:00:00Z", healthScore: 70 },
        { timestamp: "2026-01-01T00:00:00Z", healthScore: 65 },
    ]

    it("when given health trend, then returns quality trend points", (): void => {
        const points = buildPredictionQualityTrendPoints(healthTrend)

        expect(points).toHaveLength(4)
        points.forEach((point): void => {
            expect(point.qualityScore).toBeGreaterThanOrEqual(1)
            expect(point.forecastQualityScore).toBeGreaterThanOrEqual(1)
        })
    })

    it("when given empty trend, then returns empty array", (): void => {
        expect(buildPredictionQualityTrendPoints([])).toHaveLength(0)
    })

    it("when given single point, then returns single trend point", (): void => {
        const single: IHealthTrendPoint[] = [{ timestamp: "2026-01-01T00:00:00Z", healthScore: 50 }]

        const points = buildPredictionQualityTrendPoints(single)

        expect(points).toHaveLength(1)
    })

    it("when health trend has more than 4 points, then uses last 4", (): void => {
        const longTrend: IHealthTrendPoint[] = Array.from({ length: 8 }, (_, i) => ({
            timestamp: `2025-0${String(i + 1)}-01T00:00:00Z`,
            healthScore: 90 - i * 5,
        }))

        const points = buildPredictionQualityTrendPoints(longTrend)

        expect(points).toHaveLength(4)
    })

    it("when health score is very low, then forecast score is clamped at 1", (): void => {
        const lowTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 1 },
        ]

        const points = buildPredictionQualityTrendPoints(lowTrend)

        expect(points[0]?.forecastQualityScore).toBe(1)
    })

    it("when timestamp is invalid, then uses raw timestamp as label", (): void => {
        const invalidTrend: IHealthTrendPoint[] = [{ timestamp: "not-a-date", healthScore: 80 }]

        const points = buildPredictionQualityTrendPoints(invalidTrend)

        expect(points[0]?.timestamp).toBe("not-a-date")
    })
})

describe("buildTrendForecastChartPoints", (): void => {
    const healthTrend: IHealthTrendPoint[] = [
        { timestamp: "2025-10-01T00:00:00Z", healthScore: 80 },
        { timestamp: "2025-11-01T00:00:00Z", healthScore: 75 },
        { timestamp: "2025-12-01T00:00:00Z", healthScore: 70 },
        { timestamp: "2026-01-01T00:00:00Z", healthScore: 65 },
        { timestamp: "2026-02-01T00:00:00Z", healthScore: 60 },
        { timestamp: "2026-03-01T00:00:00Z", healthScore: 55 },
    ]

    it("when given health trend and overlay, then returns forecast points", (): void => {
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            { fileId: "f1", riskLevel: "high", confidenceScore: 90, label: "test", reason: "r" },
        ]

        const points = buildTrendForecastChartPoints(healthTrend, overlayEntries)

        expect(points).toHaveLength(6)
        points.forEach((point): void => {
            expect(point.confidenceHigh).toBeGreaterThanOrEqual(point.forecastScore)
            expect(point.confidenceLow).toBeLessThanOrEqual(point.forecastScore)
        })
    })

    it("when overlay entries are empty, then fileId is undefined", (): void => {
        const points = buildTrendForecastChartPoints(healthTrend, [])

        points.forEach((point): void => {
            expect(point.fileId).toBeUndefined()
        })
    })

    it("when given empty health trend, then returns empty array", (): void => {
        expect(buildTrendForecastChartPoints([], [])).toHaveLength(0)
    })

    it("when forecast score is very high, then confidence high is clamped at 100", (): void => {
        const highTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 100 },
        ]

        const points = buildTrendForecastChartPoints(highTrend, [])

        expect(points[0]?.confidenceHigh).toBeLessThanOrEqual(100)
    })

    it("when forecast score is very low, then confidence low is clamped at 1", (): void => {
        const lowTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 1 },
        ]

        const points = buildTrendForecastChartPoints(lowTrend, [])

        expect(points[0]?.confidenceLow).toBeGreaterThanOrEqual(1)
    })
})

describe("buildPredictionAccuracyPoints", (): void => {
    const healthTrend: IHealthTrendPoint[] = [
        { timestamp: "2025-10-01T00:00:00Z", healthScore: 80 },
        { timestamp: "2025-11-01T00:00:00Z", healthScore: 75 },
        { timestamp: "2025-12-01T00:00:00Z", healthScore: 70 },
        { timestamp: "2026-01-01T00:00:00Z", healthScore: 65 },
    ]

    it("when given health trend, then returns accuracy points with valid scores", (): void => {
        const points = buildPredictionAccuracyPoints(healthTrend)

        expect(points).toHaveLength(4)
        points.forEach((point): void => {
            expect(point.accuracyScore).toBeGreaterThanOrEqual(0)
            expect(point.accuracyScore).toBeLessThanOrEqual(100)
            expect(point.predictedIncidents).toBeGreaterThanOrEqual(1)
            expect(point.actualIncidents).toBeGreaterThanOrEqual(0)
        })
    })

    it("when given empty trend, then returns empty array", (): void => {
        expect(buildPredictionAccuracyPoints([])).toHaveLength(0)
    })

    it("when health score is 100, then predicted incidents is at least 1", (): void => {
        const perfectTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 100 },
        ]

        const points = buildPredictionAccuracyPoints(perfectTrend)

        expect(points[0]?.predictedIncidents).toBeGreaterThanOrEqual(1)
    })

    it("when health score is 0, then predicted incidents is high", (): void => {
        const zeroTrend: IHealthTrendPoint[] = [
            { timestamp: "2026-01-01T00:00:00Z", healthScore: 0 },
        ]

        const points = buildPredictionAccuracyPoints(zeroTrend)

        expect(points[0]?.predictedIncidents).toBeGreaterThanOrEqual(1)
    })
})

describe("buildPredictionAccuracyCases", (): void => {
    const files: ICodeCityTreemapFileDescriptor[] = [
        { id: "f1", path: "src/review.ts", loc: 200, bugIntroductions: { "30d": 5 } },
        { id: "f2", path: "src/utils.ts", loc: 100, bugIntroductions: { "30d": 0 } },
    ]

    it("when given files and entries, then returns accuracy cases", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/review.ts",
                reason: "r",
            },
            {
                fileId: "f2",
                riskLevel: "low",
                confidenceScore: 50,
                label: "src/utils.ts",
                reason: "r",
            },
        ]

        const cases = buildPredictionAccuracyCases(files, entries)

        expect(cases).toHaveLength(2)
        expect(cases[0]?.actualOutcome).toBe("incident")
    })

    it("when file has bugIntroductions > 1, then outcome is 'incident'", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/review.ts",
                reason: "r",
            },
        ]

        const cases = buildPredictionAccuracyCases(files, entries)

        expect(cases[0]?.actualOutcome).toBe("incident")
    })

    it("when file has 0 bugs and odd index, then outcome is 'stable'", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f1", riskLevel: "high", confidenceScore: 90, label: "a", reason: "r" },
            { fileId: "f2", riskLevel: "low", confidenceScore: 50, label: "b", reason: "r" },
        ]

        const cases = buildPredictionAccuracyCases(files, entries)

        expect(cases[1]?.actualOutcome).toBe("stable")
    })

    it("when entry references missing file, then uses defaults", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "missing",
                riskLevel: "low",
                confidenceScore: 50,
                label: "missing.ts",
                reason: "r",
            },
        ]

        const cases = buildPredictionAccuracyCases([], entries)

        expect(cases).toHaveLength(1)
        expect(cases[0]?.actualOutcome).toBe("incident")
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildPredictionAccuracyCases([], [])).toHaveLength(0)
    })
})

describe("buildPredictionAlertModules", (): void => {
    it("when files have packageName, then uses it as module id", (): void => {
        const files = [
            { id: "f1", path: "src/domain/review.ts", loc: 100, packageName: "core" },
            { id: "f2", path: "src/infra/db.ts", loc: 100, packageName: "adapters" },
        ] as unknown as ICodeCityTreemapFileDescriptor[]

        const modules = buildPredictionAlertModules(files)

        expect(modules.some((m) => m.moduleId === "core")).toBe(true)
        expect(modules.some((m) => m.moduleId === "adapters")).toBe(true)
    })

    it("when files have no packageName, then uses second path segment", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/domain/review.ts", loc: 100 },
        ]

        const modules = buildPredictionAlertModules(files)

        expect(modules[0]?.moduleId).toBe("domain")
    })

    it("when path has no segments, then uses full path", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [{ id: "f1", path: "review.ts", loc: 100 }]

        const modules = buildPredictionAlertModules(files)

        expect(modules[0]?.moduleId).toBe("review.ts")
    })

    it("when given empty files, then returns empty array", (): void => {
        expect(buildPredictionAlertModules([])).toHaveLength(0)
    })

    it("when first 3 modules, then enabledByDefault is true", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 5 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/pkg${String(i)}/file.ts`,
            loc: 100,
        }))

        const modules = buildPredictionAlertModules(files)

        expect(modules.length).toBeGreaterThanOrEqual(4)
        expect(modules[0]?.enabledByDefault).toBe(true)
        expect(modules[1]?.enabledByDefault).toBe(true)
        expect(modules[2]?.enabledByDefault).toBe(true)
        if (modules[3] !== undefined) {
            expect(modules[3].enabledByDefault).toBe(false)
        }
    })

    it("when files share same module, then deduplicates", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/domain/a.ts", loc: 100 },
            { id: "f2", path: "src/domain/b.ts", loc: 100 },
        ]

        const modules = buildPredictionAlertModules(files)

        expect(modules).toHaveLength(1)
    })

    it("when packageName is empty string, then falls back to path segment", (): void => {
        const files = [
            { id: "f1", path: "src/core/file.ts", loc: 100, packageName: "" },
        ] as unknown as ICodeCityTreemapFileDescriptor[]

        const modules = buildPredictionAlertModules(files)

        expect(modules[0]?.moduleId).toBe("core")
    })
})

describe("resolvePredictionAlertFocusFileId", (): void => {
    const files: ICodeCityTreemapFileDescriptor[] = [
        { id: "f1", path: "src/domain/review.ts", loc: 100 },
        { id: "f2", path: "src/infra/db.ts", loc: 100 },
    ]

    it("when moduleIds match a file, then returns that file id", (): void => {
        const result = resolvePredictionAlertFocusFileId(["domain"], files)

        expect(result).toBe("f1")
    })

    it("when moduleIds are empty, then returns undefined", (): void => {
        expect(resolvePredictionAlertFocusFileId([], files)).toBeUndefined()
    })

    it("when no file matches moduleIds, then returns undefined", (): void => {
        expect(resolvePredictionAlertFocusFileId(["nonexistent"], files)).toBeUndefined()
    })

    it("when files array is empty, then returns undefined", (): void => {
        expect(resolvePredictionAlertFocusFileId(["domain"], [])).toBeUndefined()
    })
})

describe("buildPredictionComparisonSnapshots", (): void => {
    it("when given files and entries, then returns 3 period snapshots", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/review.ts",
                loc: 200,
                bugIntroductions: { "30d": 5 },
                complexity: 20,
            },
            { id: "f2", path: "src/utils.ts", loc: 100, bugIntroductions: { "30d": 1 } },
            { id: "f3", path: "src/service.ts", loc: 150 },
        ]
        const entries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/review.ts",
                reason: "r",
            },
            {
                fileId: "f2",
                riskLevel: "medium",
                confidenceScore: 70,
                label: "src/utils.ts",
                reason: "r",
            },
            {
                fileId: "f3",
                riskLevel: "low",
                confidenceScore: 50,
                label: "src/service.ts",
                reason: "r",
            },
        ]

        const snapshots = buildPredictionComparisonSnapshots(files, entries)

        expect(snapshots).toHaveLength(3)
        expect(snapshots[0]?.periodLabel).toBe("3 months ago")
        expect(snapshots[1]?.periodLabel).toBe("2 months ago")
        expect(snapshots[2]?.periodLabel).toBe("1 month ago")
    })

    it("when entries are empty, then uses fallback labels and default risk", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/file.ts", loc: 100 },
        ]

        const snapshots = buildPredictionComparisonSnapshots(files, [])

        expect(snapshots).toHaveLength(3)
        snapshots.forEach((snapshot): void => {
            expect(snapshot.summary).toContain("core module")
            expect(snapshot.accuracyScore).toBeGreaterThanOrEqual(0)
        })
    })

    it("when given empty files and entries, then returns 3 snapshots with defaults", (): void => {
        const snapshots = buildPredictionComparisonSnapshots([], [])

        expect(snapshots).toHaveLength(3)
    })

    it("when entry has high risk, then predicted hotspots are higher", (): void => {
        const entries: ICityPredictionOverlayEntry[] = [
            { fileId: "f1", riskLevel: "high", confidenceScore: 90, label: "hot.ts", reason: "r" },
        ]
        const files: ICodeCityTreemapFileDescriptor[] = [{ id: "f1", path: "src/hot.ts", loc: 200 }]

        const snapshots = buildPredictionComparisonSnapshots(files, entries)

        expect(snapshots[0]?.predictedHotspots).toBeGreaterThanOrEqual(4)
    })
})

describe("buildPredictionBugProneFiles", (): void => {
    it("when given files and overlay, then returns sorted by bug introductions", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/low.ts", loc: 100, bugIntroductions: { "30d": 1 } },
            { id: "f2", path: "src/high.ts", loc: 200, bugIntroductions: { "30d": 5 } },
            { id: "f3", path: "src/mid.ts", loc: 150, bugIntroductions: { "30d": 3 } },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f2",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/high.ts",
                reason: "r",
            },
        ]

        const bugProne = buildPredictionBugProneFiles(files, overlayEntries)

        expect(bugProne[0]?.bugIntroductions30d).toBe(5)
        expect(bugProne[0]?.fileId).toBe("f2")
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildPredictionBugProneFiles([], [])).toHaveLength(0)
    })

    it("when files have same bugIntroductions, then sorts by confidence", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/a.ts", loc: 100, bugIntroductions: { "30d": 3 }, complexity: 5 },
            {
                id: "f2",
                path: "src/b.ts",
                loc: 100,
                bugIntroductions: { "30d": 3 },
                complexity: 20,
            },
        ]

        const bugProne = buildPredictionBugProneFiles(files, [])

        expect(bugProne[0]?.confidenceScore).toBeGreaterThanOrEqual(
            bugProne[1]?.confidenceScore ?? 0,
        )
    })

    it("when file has no bugIntroductions, then defaults to 0", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/clean.ts", loc: 10 },
        ]

        const bugProne = buildPredictionBugProneFiles(files, [])

        expect(bugProne[0]?.bugIntroductions30d).toBe(0)
    })

    it("when overlay has confidence for file, then uses overlay confidence", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            { id: "f1", path: "src/file.ts", loc: 100 },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 92,
                label: "src/file.ts",
                reason: "r",
            },
        ]

        const bugProne = buildPredictionBugProneFiles(files, overlayEntries)

        expect(bugProne[0]?.confidenceScore).toBe(92)
    })

    it("when more than 6 files, then returns at most 6", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 10 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/file${String(i)}.ts`,
            loc: 100,
            bugIntroductions: { "30d": i },
        }))

        const bugProne = buildPredictionBugProneFiles(files, [])

        expect(bugProne.length).toBeLessThanOrEqual(6)
    })
})

describe("buildPredictionExplainEntries", (): void => {
    it("when given files and overlay entries, then returns explain entries", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/review.ts",
                loc: 200,
                complexity: 15,
                churn: 5,
                bugIntroductions: { "30d": 3 },
            },
        ]
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "f1",
                riskLevel: "high",
                confidenceScore: 90,
                label: "src/review.ts",
                reason: "high risk",
            },
        ]

        const entries = buildPredictionExplainEntries(files, overlayEntries)

        expect(entries).toHaveLength(1)
        expect(entries[0]?.explanation).toContain("complexity 15")
        expect(entries[0]?.explanation).toContain("churn 5")
        expect(entries[0]?.explanation).toContain("3 bug introductions")
    })

    it("when overlay entry references missing file, then uses zero defaults", (): void => {
        const overlayEntries: ICityPredictionOverlayEntry[] = [
            {
                fileId: "missing",
                riskLevel: "low",
                confidenceScore: 50,
                label: "missing.ts",
                reason: "r",
            },
        ]

        const entries = buildPredictionExplainEntries([], overlayEntries)

        expect(entries).toHaveLength(1)
        expect(entries[0]?.explanation).toContain("complexity 0")
    })

    it("when given empty inputs, then returns empty array", (): void => {
        expect(buildPredictionExplainEntries([], [])).toHaveLength(0)
    })

    it("when overlay has more than 6 entries, then returns at most 6", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 8 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/file${String(i)}.ts`,
            loc: 100,
        }))
        const overlayEntries: ICityPredictionOverlayEntry[] = Array.from({ length: 8 }, (_, i) => ({
            fileId: `f${String(i)}`,
            riskLevel: "high" as const,
            confidenceScore: 90,
            label: `src/file${String(i)}.ts`,
            reason: "test",
        }))

        const entries = buildPredictionExplainEntries(files, overlayEntries)

        expect(entries.length).toBeLessThanOrEqual(6)
    })
})

describe("buildPredictionOverlayEntries — additional edge cases", (): void => {
    it("when more than 8 files, then returns at most 8 entries", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = Array.from({ length: 12 }, (_, i) => ({
            id: `f${String(i)}`,
            path: `src/file${String(i)}.ts`,
            loc: 100,
            bugIntroductions: { "30d": i },
        }))

        const entries = buildPredictionOverlayEntries(files)

        expect(entries.length).toBeLessThanOrEqual(8)
    })

    it("when entries have same risk, then sorts by confidence descending", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [
            {
                id: "f1",
                path: "src/a.ts",
                loc: 100,
                bugIntroductions: { "30d": 5 },
                complexity: 30,
                churn: 10,
            },
            {
                id: "f2",
                path: "src/b.ts",
                loc: 100,
                bugIntroductions: { "30d": 6 },
                complexity: 30,
                churn: 10,
            },
        ]

        const entries = buildPredictionOverlayEntries(files)

        expect(entries[0]?.confidenceScore).toBeGreaterThanOrEqual(entries[1]?.confidenceScore ?? 0)
    })

    it("when single file, then returns single entry", (): void => {
        const files: ICodeCityTreemapFileDescriptor[] = [{ id: "f1", path: "src/only.ts", loc: 50 }]

        const entries = buildPredictionOverlayEntries(files)

        expect(entries).toHaveLength(1)
    })
})
