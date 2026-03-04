import {describe, expect, test} from "bun:test"

import {LIBRARY_RULE_SCOPE} from "../../../src/domain/entities/library-rule.entity"
import {LibraryRuleFactory} from "../../../src/domain/factories/library-rule.factory"
import {RuleContextFormatterService} from "../../../src/domain/services/rule-context-formatter.service"

describe("RuleContextFormatterService", () => {
    const factory = new LibraryRuleFactory()

    const securityRule = factory.create({
        uuid: "rule-security-1",
        title: "Avoid eval",
        rule: "Do not use eval",
        whyIsThisImportant: "Eval enables arbitrary code execution",
        severity: "HIGH",
        examples: [{
            snippet: "eval(userInput)",
            isCorrect: false,
        }],
        language: "ts",
        buckets: ["security"],
        scope: LIBRARY_RULE_SCOPE.FILE,
        plugAndPlay: true,
    })

    const performanceRule = factory.create({
        uuid: "rule-performance-1",
        title: "Avoid nested loops",
        rule: "Prefer indexed lookup instead of nested loops",
        whyIsThisImportant: "Nested loops can be quadratic",
        severity: "MEDIUM",
        examples: [{
            snippet: "for (const a of list) { for (const b of list) {} }",
            isCorrect: false,
        }],
        language: "ts",
        buckets: ["performance", "scalability"],
        scope: LIBRARY_RULE_SCOPE.FILE,
        plugAndPlay: false,
    })

    test("formats rules as JSON array string", () => {
        const service = new RuleContextFormatterService()

        const result = service.formatForPrompt([securityRule])

        expect(result).toBe(JSON.stringify([{
            title: "Avoid eval",
            rule: "Do not use eval",
            severity: "HIGH",
            examples: [{
                snippet: "eval(userInput)",
                isCorrect: false,
            }],
        }]))
    })

    test("filters rules by bucket category", () => {
        const service = new RuleContextFormatterService()

        const result = service.formatCategorySection(
            [securityRule, performanceRule],
            "SECURITY",
        )

        expect(result).toBe(JSON.stringify([{
            title: "Avoid eval",
            rule: "Do not use eval",
            severity: "HIGH",
            examples: [{
                snippet: "eval(userInput)",
                isCorrect: false,
            }],
        }]))
    })

    test("returns empty JSON array for empty rules", () => {
        const service = new RuleContextFormatterService()

        const result = service.formatForPrompt([])

        expect(result).toBe("[]")
    })

    test("throws on empty category", () => {
        const service = new RuleContextFormatterService()

        expect(() => {
            service.formatCategorySection([securityRule], "   ")
        }).toThrow("Category must be a non-empty string")
    })

    test("throws on invalid rule entry", () => {
        const service = new RuleContextFormatterService()

        expect(() => {
            service.formatForPrompt([{} as unknown as typeof securityRule])
        }).toThrow("Rules must contain LibraryRule entities")
    })
})
