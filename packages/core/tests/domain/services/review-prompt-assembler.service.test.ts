import {describe, expect, test} from "bun:test"

import {
    ReviewPromptAssemblerService,
    type IReviewPromptSections,
} from "../../../src/domain/services/review-prompt-assembler.service"

describe("ReviewPromptAssemblerService", () => {
    test("assembles markdown sections with override precedence", () => {
        const service = new ReviewPromptAssemblerService()

        const defaults: IReviewPromptSections = {
            categories: {
                bug: "Default bug guidance",
                performance: "Default performance guidance",
                security: "Default security guidance",
            },
            severity: {
                critical: "Default critical flag",
                high: "Default high flag",
                medium: "Default medium flag",
                low: "Default low flag",
            },
            generation: {
                main: "Default generation instructions",
            },
            rules: {
                context: "[{\"uuid\":\"rule-1\"}]",
            },
        }

        const overrides: IReviewPromptSections = {
            categories: {
                bug: "Override bug guidance",
            },
            severity: {
                high: "Override high flag",
            },
            generation: {
                main: "Override generation instructions",
            },
        }

        const result = service.assembleSections(overrides, defaults)

        const expected = [
            [
                "## Categories",
                "### Bug",
                "Override bug guidance",
                "### Performance",
                "Default performance guidance",
                "### Security",
                "Default security guidance",
            ].join("\n"),
            [
                "## Severity",
                "### Critical",
                "Default critical flag",
                "### High",
                "Override high flag",
                "### Medium",
                "Default medium flag",
                "### Low",
                "Default low flag",
            ].join("\n"),
            [
                "## Generation",
                "Override generation instructions",
            ].join("\n"),
            [
                "## Rules",
                "[{\"uuid\":\"rule-1\"}]",
            ].join("\n"),
        ].join("\n\n")

        expect(result).toBe(expected)
    })

    test("omits rules section when override is empty array", () => {
        const service = new ReviewPromptAssemblerService()

        const defaults: IReviewPromptSections = {
            categories: {
                bug: "Default bug guidance",
            },
            rules: {
                context: "[{\"uuid\":\"rule-1\"}]",
            },
        }

        const overrides: IReviewPromptSections = {
            rules: {
                context: "[]",
            },
        }

        const result = service.assembleSections(overrides, defaults)

        const expected = [
            "## Categories",
            "### Bug",
            "Default bug guidance",
        ].join("\n")

        expect(result).toBe(expected)
    })

    test("returns empty string when no sections available", () => {
        const service = new ReviewPromptAssemblerService()

        const result = service.assembleSections(undefined, undefined)

        expect(result).toBe("")
    })
})
