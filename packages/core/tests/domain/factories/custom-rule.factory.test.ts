import {describe, expect, test} from "bun:test"

import {CUSTOM_RULE_STATUS} from "../../../src/domain/entities/custom-rule.entity"
import {CustomRuleFactory} from "../../../src/domain/factories/custom-rule.factory"

describe("CustomRuleFactory", () => {
    test("creates pending custom rule with normalized input", () => {
        const factory = new CustomRuleFactory()
        const rule = factory.create({
            title: "  No var   ",
            rule: "  var + 1  ",
            type: "REGEX",
            scope: "file" as unknown as "FILE",
            severity: "low",
            examples: [
                {
                    snippet: "  var x = 1  ",
                    isCorrect: true,
                },
            ],
        })

        expect(rule.status).toBe(CUSTOM_RULE_STATUS.PENDING)
        expect(rule.title).toBe("No var")
        expect(rule.scope).toBe("FILE")
        expect(rule.examples).toEqual([{snippet: "var x = 1", isCorrect: true}])
    })

    test("reconstitutes custom rule snapshot", () => {
        const factory = new CustomRuleFactory()
        const rule = factory.reconstitute({
            id: "custom-1",
            title: "Use strict",
            rule: "use strict",
            type: "PROMPT",
            scope: "CCR",
            status: CUSTOM_RULE_STATUS.ACTIVE,
            severity: "CRITICAL",
            examples: [
                {
                    snippet: "function foo() {}",
                    isCorrect: false,
                },
            ],
        })

        expect(rule.id.value).toBe("custom-1")
        expect(rule.status).toBe(CUSTOM_RULE_STATUS.ACTIVE)
        expect(rule.type).toBe("PROMPT")
        expect(rule.severity.toString()).toBe("CRITICAL")
        expect(rule.examples).toHaveLength(1)
    })

    test("validates required title on create", () => {
        const factory = new CustomRuleFactory()

        expect(() => {
            factory.create({
                title: "   ",
                rule: "console",
                type: "REGEX",
                scope: "FILE",
                severity: "LOW",
            })
        }).toThrow("Rule title cannot be empty")
    })
})
