import {describe, expect, test} from "bun:test"

import type {
    IReviewConfigDTO,
    IReviewPromptOverridesDTO,
} from "../../../../src/application/dto/review/review-config.dto"

describe("IReviewConfigDTO", () => {
    test("supports full config payload with prompt overrides", () => {
        const promptOverrides: IReviewPromptOverridesDTO = {
            categories: {
                descriptions: {
                    bug: "bug description",
                    performance: "performance description",
                    security: "security description",
                },
            },
            severity: {
                flags: {
                    critical: "critical guidance",
                    high: "high guidance",
                    medium: "medium guidance",
                    low: "low guidance",
                },
            },
            generation: {
                main: "generation guidance",
            },
            templates: {
                hallucinationCheck: "hallucination guidance",
            },
        }

        const config: IReviewConfigDTO = {
            severityThreshold: "HIGH",
            ignorePaths: ["dist/**", "vendor/**"],
            maxSuggestionsPerFile: 5,
            maxSuggestionsPerCCR: 30,
            cadence: "per_commit",
            customRuleIds: ["rule-1", "rule-2"],
            promptOverrides,
        }

        expect(config.severityThreshold).toBe("HIGH")
        expect(config.ignorePaths).toEqual(["dist/**", "vendor/**"])
        expect(config.customRuleIds).toEqual(["rule-1", "rule-2"])
        expect(config.promptOverrides?.severity?.flags?.high).toBe("high guidance")
        expect(config.promptOverrides?.templates?.hallucinationCheck).toBe("hallucination guidance")
    })

    test("supports config payload without prompt overrides", () => {
        const config: IReviewConfigDTO = {
            severityThreshold: "MEDIUM",
            ignorePaths: [],
            maxSuggestionsPerFile: 3,
            maxSuggestionsPerCCR: 20,
            cadence: "daily",
            customRuleIds: [],
        }

        expect(config.promptOverrides).toBeUndefined()
        expect(config.maxSuggestionsPerCCR).toBe(20)
    })
})
