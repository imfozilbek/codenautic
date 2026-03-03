import {describe, expect, test} from "bun:test"

import {FEEDBACK_TYPE} from "../../../src/domain/events/feedback-received"
import {RuleEffectivenessService} from "../../../src/domain/services/rule-effectiveness.service"

describe("RuleEffectivenessService", () => {
    const baseTime = new Date("2025-01-02T00:00:00.000Z")

    test("returns zero metrics for unknown rule", () => {
        const service = new RuleEffectivenessService({now: baseTime})

        expect(service.getEffectiveness("rule-unknown")).toEqual({
            ruleId: "rule-unknown",
            helpfulRate: 0,
            falsePositiveRate: 0,
            implementedRate: 0,
            weightedSampleSize: 0,
            totalSamples: 0,
        })
    })

    test("tracks signals and calculates simple rates without decay", () => {
        const service = new RuleEffectivenessService({
            now: baseTime,
            halfLifeHours: 720,
        })
        service.track("rule-simple", [
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: baseTime},
            {type: FEEDBACK_TYPE.FALSE_POSITIVE, createdAt: baseTime},
            {type: FEEDBACK_TYPE.REJECTED, createdAt: baseTime},
            {type: FEEDBACK_TYPE.IGNORED, createdAt: baseTime},
        ])

        expect(service.getEffectiveness("rule-simple")).toEqual({
            ruleId: "rule-simple",
            helpfulRate: 0.25,
            falsePositiveRate: 0.25,
            implementedRate: 0.25,
            weightedSampleSize: 4,
            totalSamples: 4,
        })
    })

    test("decays old signals and prefers recent feedback", () => {
        const service = new RuleEffectivenessService({
            now: new Date("2025-01-03T00:00:00.000Z"),
            halfLifeHours: 24,
        })
        service.track("rule-decay", [
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: new Date("2025-01-03T00:00:00.000Z")},
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: new Date("2025-01-02T00:00:00.000Z")},
            {type: FEEDBACK_TYPE.FALSE_POSITIVE, createdAt: new Date("2025-01-02T00:00:00.000Z")},
        ])

        const actual = service.getEffectiveness("rule-decay")
        const expectedDenominator = 1 + 0.5 + 0.5
        expect(actual.ruleId).toBe("rule-decay")
        expect(actual.weightedSampleSize).toBe(expectedDenominator)
        expect(actual.totalSamples).toBe(3)
        expect(actual.helpfulRate).toBeCloseTo((1 + 0.5) / expectedDenominator, 10)
        expect(actual.falsePositiveRate).toBeCloseTo(0.5 / expectedDenominator, 10)
        expect(actual.implementedRate).toBeCloseTo((1 + 0.5) / expectedDenominator, 10)
    })

    test("tracks per rule independently", () => {
        const service = new RuleEffectivenessService({now: baseTime})
        service.track("rule-first", [
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: baseTime},
        ])
        service.track("rule-second", [
            {type: FEEDBACK_TYPE.FALSE_POSITIVE, createdAt: baseTime},
        ])

        expect(service.getEffectiveness("rule-first")).toMatchObject({
            ruleId: "rule-first",
            helpfulRate: 1,
        })
        expect(service.getEffectiveness("rule-second")).toMatchObject({
            ruleId: "rule-second",
            falsePositiveRate: 1,
        })
    })

    test("ignores invalid inputs in track", () => {
        const service = new RuleEffectivenessService({now: baseTime})

        service.track("   ", [{type: FEEDBACK_TYPE.ACCEPTED, createdAt: baseTime}])
        service.track("rule-invalid", [])

        expect(service.getEffectiveness("   ")).toEqual({
            ruleId: "",
            helpfulRate: 0,
            falsePositiveRate: 0,
            implementedRate: 0,
            weightedSampleSize: 0,
            totalSamples: 0,
        })
        expect(service.getEffectiveness("rule-invalid")).toEqual({
            ruleId: "rule-invalid",
            helpfulRate: 0,
            falsePositiveRate: 0,
            implementedRate: 0,
            weightedSampleSize: 0,
            totalSamples: 0,
        })
    })

    test("merges signals in multiple track calls and clamps minimum half-life", () => {
        const service = new RuleEffectivenessService({
            now: baseTime,
            halfLifeHours: 0.5,
        })
        service.track("rule-merge", [
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: baseTime},
        ])
        service.track("rule-merge", [
            {type: FEEDBACK_TYPE.FALSE_POSITIVE, createdAt: baseTime},
        ])

        expect(service.getEffectiveness("rule-merge")).toEqual({
            ruleId: "rule-merge",
            helpfulRate: 0.5,
            falsePositiveRate: 0.5,
            implementedRate: 0.5,
            weightedSampleSize: 2,
            totalSamples: 2,
        })
    })

    test("clears all accumulated feedback state", () => {
        const service = new RuleEffectivenessService({now: baseTime})
        service.track("rule-clear", [
            {type: FEEDBACK_TYPE.ACCEPTED, createdAt: baseTime},
        ])
        service.clear()

        expect(service.getEffectiveness("rule-clear")).toEqual({
            ruleId: "rule-clear",
            helpfulRate: 0,
            falsePositiveRate: 0,
            implementedRate: 0,
            weightedSampleSize: 0,
            totalSamples: 0,
        })
    })
})
