import {describe, expect, test} from "bun:test"

import {FEEDBACK_TYPE} from "../../../src/domain/events/feedback-received"
import {
    LearningService,
    type ITeamPatternAdjustment,
} from "../../../src/domain/services/learning.service"

const baseTime = new Date("2025-03-01T00:00:00.000Z")

describe("LearningService", () => {
    test("collects feedback and resolves rule effectiveness", () => {
        const service = new LearningService()

        service.collectFeedback([
            {
                ruleId: "rule-a",
                type: FEEDBACK_TYPE.ACCEPTED,
                createdAt: baseTime,
            },
            {
                ruleId: "rule-a",
                type: FEEDBACK_TYPE.FALSE_POSITIVE,
                createdAt: baseTime,
            },
            {
                ruleId: "rule-a",
                type: FEEDBACK_TYPE.ACCEPTED,
                createdAt: baseTime,
            },
            {
                ruleId: "  ",
                type: FEEDBACK_TYPE.ACCEPTED,
                createdAt: baseTime,
            },
            {
                ruleId: "rule-b",
                type: FEEDBACK_TYPE.ACCEPTED,
                createdAt: baseTime,
            },
        ])

        expect(service.getEffectiveness("rule-a").totalSamples).toBe(3)
        expect(service.getEffectiveness("rule-a").helpfulRate).toBeCloseTo(0.6666666666666666)
        expect(service.getEffectiveness("rule-b").totalSamples).toBe(1)
        expect(service.getEffectiveness("rule-b").falsePositiveRate).toBe(0)
        expect(service.getEffectiveness("rule-unknown").totalSamples).toBe(0)
    })

    test("stores and returns team adjustments sorted by impact", () => {
        const service = new LearningService()
        const adjustments: readonly ITeamPatternAdjustment[] = [
            {
                ruleId: "rule-a",
                weightDelta: 0.1,
                confidence: 0.4,
                samples: 10,
                falsePositiveRate: 0.7,
                helpfulRate: 0.3,
            },
            {
                ruleId: "rule-b",
                weightDelta: 0.6,
                confidence: 0.5,
                samples: 6,
                falsePositiveRate: 0.2,
                helpfulRate: 0.8,
            },
        ]

        service.adjustWeights("team-alpha", adjustments)

        const patterns = service.getTeamPatterns("team-alpha")
        expect(patterns).toHaveLength(2)
        expect(patterns.at(0)?.ruleId).toBe("rule-b")
        expect(patterns.at(1)?.ruleId).toBe("rule-a")
    })

    test("replaces team patterns on subsequent updates", () => {
        const service = new LearningService()

        service.adjustWeights("team-alpha", [
            {
                ruleId: "rule-a",
                weightDelta: 0.2,
                confidence: 0.2,
                samples: 5,
                falsePositiveRate: 0.6,
                helpfulRate: 0.4,
            },
        ])

        service.adjustWeights("team-alpha", [
            {
                ruleId: "rule-b",
                weightDelta: -0.4,
                confidence: 1,
                samples: 9,
                falsePositiveRate: 0.9,
                helpfulRate: 0.1,
            },
        ])

        const patterns = service.getTeamPatterns("team-alpha")
        expect(patterns).toHaveLength(1)
        expect(patterns.at(0)?.ruleId).toBe("rule-b")
    })

    test("returns empty patterns for missing team", () => {
        const service = new LearningService()
        expect(service.getTeamPatterns("team-none")).toEqual([])
    })
})
