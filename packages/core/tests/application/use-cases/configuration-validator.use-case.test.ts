import {describe, expect, test} from "bun:test"

import {ConfigurationValidatorUseCase} from "../../../src/application/use-cases/configuration-validator.use-case"

describe("ConfigurationValidatorUseCase", () => {
    test("validates required fields and normalizes values", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "high",
            ignorePaths: [" src/** ", "dist/**"],
            maxSuggestionsPerFile: 7,
            maxSuggestionsPerCCR: 20,
            cadence: " standard ",
            customRuleIds: [" rule-1 ", "rule-2 "],
            promptOverrides: {
                systemPrompt: " system prompt ",
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.severityThreshold).toBe("HIGH")
        expect(result.value.ignorePaths).toEqual(["src/**", "dist/**"])
        expect(result.value.promptOverrides).toEqual({
            systemPrompt: "system prompt",
        })
    })

    test("preserves unknown top-level fields", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "MEDIUM",
            ignorePaths: [],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            adapterFeature: true,
            nested: {
                enabled: true,
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.adapterFeature).toBe(true)
        expect(result.value.nested).toEqual({enabled: true})
    })

    test("returns detailed error for invalid payload shape", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute("invalid")

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "config",
                message: "must be a non-null object",
            },
        ])
    })

    test("returns detailed field errors when schema constraints fail", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "warning",
            ignorePaths: [""],
            maxSuggestionsPerFile: 0,
            maxSuggestionsPerCCR: 0.5,
            cadence: " ",
            customRuleIds: [""],
            promptOverrides: {
                systemPrompt: "",
            },
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "severityThreshold",
            message: "must be one of LOW | MEDIUM | HIGH | CRITICAL",
        })
        expect(result.error.fields).toContainEqual({
            field: "ignorePaths",
            message: "must contain only non-empty strings",
        })
        expect(result.error.fields).toContainEqual({
            field: "maxSuggestionsPerFile",
            message: "must be an integer greater than or equal to 1",
        })
        expect(result.error.fields).toContainEqual({
            field: "promptOverrides.systemPrompt",
            message: "must be a non-empty string when provided",
        })
    })

    test("supports reviewDepthStrategy and directories with defaults", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: ["src/**"],
            maxSuggestionsPerFile: 4,
            maxSuggestionsPerCCR: 10,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            directories: [
                {
                    path: "src/core",
                    config: {
                        reviewDepthStrategy: "always-heavy",
                        maxSuggestionsPerFile: 2,
                    },
                },
            ],
        })

        expect(result.isOk).toBe(true)
        expect(result.value.reviewDepthStrategy).toBe("auto")
        expect(result.value.directories).toHaveLength(1)
        expect(result.value.directories?.[0]?.path).toBe("src/core")
        expect(result.value.directories?.[0]?.config.reviewDepthStrategy).toBe("always-heavy")
        expect(result.value.directories?.[0]?.config.maxSuggestionsPerFile).toBe(2)
    })

    test("collects validation errors for unsupported reviewDepthStrategy", async () => {
        const useCase = new ConfigurationValidatorUseCase()
        const result = await useCase.execute({
            severityThreshold: "LOW",
            ignorePaths: ["src/**"],
            maxSuggestionsPerFile: 1,
            maxSuggestionsPerCCR: 2,
            cadence: "standard",
            customRuleIds: ["rule-1"],
            reviewDepthStrategy: "always-medium",
            directories: [],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "reviewDepthStrategy",
            message: "must be one of auto | always-light | always-heavy",
        })
    })
})
