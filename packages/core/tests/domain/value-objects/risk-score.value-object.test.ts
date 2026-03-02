import {describe, expect, test} from "bun:test"

import {
    RISK_SCORE_LEVEL,
    RiskScore,
    type RiskScoreLevel,
} from "../../../src/domain/value-objects/risk-score.value-object"

describe("RiskScore", () => {
    test("creates score in inclusive range 0..100", () => {
        const lowBoundary = RiskScore.create(0)
        const highBoundary = RiskScore.create(100)

        expect(lowBoundary.value).toBe(0)
        expect(lowBoundary.level).toBe(RISK_SCORE_LEVEL.LOW)
        expect(highBoundary.value).toBe(100)
        expect(highBoundary.level).toBe(RISK_SCORE_LEVEL.CRITICAL)
    })

    test("throws when score is outside allowed range", () => {
        expect(() => {
            RiskScore.create(-1)
        }).toThrow("RiskScore value must be between 0 and 100")

        expect(() => {
            RiskScore.create(101)
        }).toThrow("RiskScore value must be between 0 and 100")
    })

    test("throws when score is not finite number", () => {
        expect(() => {
            RiskScore.create(Number.NaN)
        }).toThrow("RiskScore value must be a finite number")

        expect(() => {
            RiskScore.create(Number.POSITIVE_INFINITY)
        }).toThrow("RiskScore value must be a finite number")
    })

    test("calculates weighted score from factors", () => {
        const score = RiskScore.calculate({
            issues: 80,
            size: 50,
            complexity: 70,
            hotspots: 40,
            history: 90,
        })

        expect(score.value).toBe(66.5)
        expect(score.level).toBe(RISK_SCORE_LEVEL.HIGH)
    })

    test("throws when factor is outside allowed range", () => {
        expect(() => {
            RiskScore.calculate({
                issues: -1,
                size: 0,
                complexity: 0,
                hotspots: 0,
                history: 0,
            })
        }).toThrow("RiskScore factor issues must be between 0 and 100")

        expect(() => {
            RiskScore.calculate({
                issues: 0,
                size: 0,
                complexity: 0,
                hotspots: 0,
                history: 200,
            })
        }).toThrow("RiskScore factor history must be between 0 and 100")
    })

    test("maps levels by thresholds", () => {
        const cases: ReadonlyArray<{readonly value: number; readonly expectedLevel: RiskScoreLevel}> = [
            {value: 24.99, expectedLevel: RISK_SCORE_LEVEL.LOW},
            {value: 25, expectedLevel: RISK_SCORE_LEVEL.MEDIUM},
            {value: 49.99, expectedLevel: RISK_SCORE_LEVEL.MEDIUM},
            {value: 50, expectedLevel: RISK_SCORE_LEVEL.HIGH},
            {value: 74.99, expectedLevel: RISK_SCORE_LEVEL.HIGH},
            {value: 75, expectedLevel: RISK_SCORE_LEVEL.CRITICAL},
        ]

        for (const testCase of cases) {
            expect(RiskScore.create(testCase.value).level).toBe(testCase.expectedLevel)
        }
    })
})
