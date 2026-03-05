import {describe, expect, test} from "bun:test"

import {
    buildReviewOverridePromptConfigurations,
    parseReviewOverridesConfig,
    REVIEW_OVERRIDE_PROMPT_NAMES,
    type IReviewOverridesConfigData,
} from "../../../../src/application/dto/config/review-overrides-config.dto"

describe("review override config dto", () => {
    test("parses review override payload", () => {
        const raw = createOverrides()

        const parsed = parseReviewOverridesConfig(raw)

        expect(parsed).toEqual(raw)
        expect(parsed?.categories.descriptions.bug).toBe("Bug description")
        expect(parsed?.severity.flags.critical).toBe("Critical description")
        expect(parsed?.generation.main).toBe("Generation instructions")
    })

    test("returns undefined for invalid payload", () => {
        expect(parseReviewOverridesConfig(null)).toBeUndefined()
        expect(parseReviewOverridesConfig({})).toBeUndefined()
        expect(parseReviewOverridesConfig({name: "missing"})).toBeUndefined()
        expect(parseReviewOverridesConfig({
            name: "bad-categories",
            categories: {},
            severity: createOverrides().severity,
            generation: createOverrides().generation,
        })).toBeUndefined()
        expect(parseReviewOverridesConfig({
            name: "bad-category-desc",
            categories: {
                descriptions: {
                    bug: "   ",
                    performance: "ok",
                    security: "ok",
                },
            },
            severity: createOverrides().severity,
            generation: createOverrides().generation,
        })).toBeUndefined()
        expect(parseReviewOverridesConfig({
            name: "bad-severity-flags",
            categories: createOverrides().categories,
            severity: {},
            generation: createOverrides().generation,
        })).toBeUndefined()
        expect(parseReviewOverridesConfig({
            name: "missing-severity-flag",
            categories: createOverrides().categories,
            severity: {
                flags: {
                    critical: "Critical description",
                },
            },
            generation: createOverrides().generation,
        })).toBeUndefined()
        expect(parseReviewOverridesConfig({
            name: "missing-generation",
            categories: createOverrides().categories,
            severity: createOverrides().severity,
            generation: {},
        })).toBeUndefined()
    })

    test("builds prompt configuration defaults from overrides", () => {
        const overrides = createOverrides()

        const configs = buildReviewOverridePromptConfigurations(overrides)

        expect(configs).toHaveLength(2)

        const codeReview = configs.find(
            (config) => config.name === REVIEW_OVERRIDE_PROMPT_NAMES.CODE_REVIEW_SYSTEM,
        )
        const crossFile = configs.find(
            (config) => config.name === REVIEW_OVERRIDE_PROMPT_NAMES.CROSS_FILE_ANALYSIS_SYSTEM,
        )

        expect(codeReview?.defaults).toMatchObject({
            bugText: "Bug description",
            perfText: "Performance description",
            secText: "Security description",
            criticalText: "Critical description",
            highText: "High description",
            mediumText: "Medium description",
            lowText: "Low description",
            mainGenText: "Generation instructions",
        })
        expect(crossFile?.defaults).toMatchObject({
            criticalText: "Critical description",
            highText: "High description",
            mediumText: "Medium description",
            lowText: "Low description",
            mainGenText: "Generation instructions",
        })
        expect(crossFile?.defaults["bugText"]).toBeUndefined()
        expect(crossFile?.defaults["perfText"]).toBeUndefined()
        expect(crossFile?.defaults["secText"]).toBeUndefined()
    })
})

function createOverrides(): IReviewOverridesConfigData {
    return {
        name: "default-review-overrides",
        categories: {
            descriptions: {
                bug: "Bug description",
                performance: "Performance description",
                security: "Security description",
            },
        },
        severity: {
            flags: {
                critical: "Critical description",
                high: "High description",
                medium: "Medium description",
                low: "Low description",
            },
        },
        generation: {
            main: "Generation instructions",
        },
    }
}
