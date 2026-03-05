import {describe, expect, test} from "bun:test"

import {
    CustomRule,
    CUSTOM_RULE_STATUS,
    type CustomRuleScope,
} from "../../../src/domain/entities/custom-rule.entity"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("CustomRule", () => {
    test("creates rule with normalized fields", () => {
        const rule = new CustomRule(UniqueId.create("rule-1"), {
            title: "   No TODO comments   ",
            rule: "  TODO  ",
            type: "REGEX",
            scope: "FILE",
            status: "PENDING",
            severity: Severity.create(" high "),
            examples: [
                {
                    snippet: "  const x = 1  ",
                    isCorrect: false,
                },
            ],
        })

        expect(rule.id.value).toBe("rule-1")
        expect(rule.title).toBe("No TODO comments")
        expect(rule.rule).toBe("TODO")
        expect(rule.type).toBe("REGEX")
        expect(rule.scope).toBe("FILE")
        expect(rule.status).toBe(CUSTOM_RULE_STATUS.PENDING)
        expect(rule.severity.toString()).toBe("HIGH")
        expect(rule.examples).toEqual([{snippet: "const x = 1", isCorrect: false}])
    })

    test("activates from pending", () => {
        const rule = createPendingRule()
        rule.activate()

        expect(rule.status).toBe(CUSTOM_RULE_STATUS.ACTIVE)
    })

    test("rejects from pending", () => {
        const rule = createPendingRule()
        rule.reject()

        expect(rule.status).toBe(CUSTOM_RULE_STATUS.REJECTED)
    })

    test("deletes from any non-deleted status", () => {
        const rule = createPendingRule()
        rule.softDelete()

        expect(rule.status).toBe(CUSTOM_RULE_STATUS.DELETED)
    })

    test("prevents activation after delete", () => {
        const rule = createPendingRule()
        rule.softDelete()

        expect(() => {
            rule.activate()
        }).toThrow("Deleted rule cannot be activated")
    })

    test("throws when activating from non-pending status", () => {
        const rule = new CustomRule(UniqueId.create(), {
            title: "Active rule",
            rule: "x",
            type: "REGEX",
            scope: "FILE",
            status: "ACTIVE",
            severity: Severity.create("LOW"),
            examples: [],
        })

        expect(() => {
            rule.activate()
        }).toThrow("Cannot activate rule in status ACTIVE")
    })

    test("throws when rejecting deleted rule", () => {
        const rule = createPendingRule()
        rule.softDelete()

        expect(() => {
            rule.reject()
        }).toThrow("Deleted rule cannot be rejected")
    })

    test("throws when rejecting non-pending status", () => {
        const rule = new CustomRule(UniqueId.create(), {
            title: "Active rule",
            rule: "x",
            type: "REGEX",
            scope: "FILE",
            status: "ACTIVE",
            severity: Severity.create("LOW"),
            examples: [],
        })

        expect(() => {
            rule.reject()
        }).toThrow("Cannot reject rule in status ACTIVE")
    })

    test("throws when deleting already deleted rule", () => {
        const rule = createPendingRule()
        rule.softDelete()

        expect(() => {
            rule.softDelete()
        }).toThrow("Rule is already deleted")
    })

    test("throws on unknown scope", () => {
        expect(() => {
            return new CustomRule(UniqueId.create(), {
                title: "Bad scope",
                rule: "x",
                type: "REGEX",
                scope: "GLOBAL" as unknown as CustomRuleScope,
                status: "PENDING",
                severity: Severity.create("LOW"),
                examples: [],
            })
        }).toThrow("Unknown custom rule scope")
    })

    test("throws on unknown type", () => {
        expect(() => {
            return new CustomRule(UniqueId.create(), {
                title: "Bad type",
                rule: "x",
                type: "UNKNOWN" as unknown as "REGEX",
                scope: "FILE",
                status: "PENDING",
                severity: Severity.create("LOW"),
                examples: [],
            })
        }).toThrow("Unknown custom rule type: UNKNOWN")
    })

    test("throws on unknown status", () => {
        expect(() => {
            return new CustomRule(UniqueId.create(), {
                title: "Bad status",
                rule: "x",
                type: "REGEX",
                scope: "FILE",
                status: "UNKNOWN" as unknown as "PENDING",
                severity: Severity.create("LOW"),
                examples: [],
            })
        }).toThrow("Unknown custom rule status: UNKNOWN")
    })

    test("throws on empty examples snippet", () => {
        expect(() => {
            return new CustomRule(UniqueId.create(), {
                title: "Bad example",
                rule: "x",
                type: "REGEX",
                scope: "FILE",
                status: "PENDING",
                severity: Severity.create("LOW"),
                examples: [{snippet: "   ", isCorrect: true}],
            })
        }).toThrow("Example snippet cannot be empty")
    })

    test("throws on empty title", () => {
        expect(() => {
            return new CustomRule(UniqueId.create(), {
                title: "   ",
                rule: "x",
                type: "REGEX",
                scope: "CCR",
                status: "PENDING",
                severity: Severity.create("LOW"),
                examples: [],
            })
        }).toThrow("Rule title cannot be empty")
    })
})

function createPendingRule(): CustomRule {
    return new CustomRule(UniqueId.create(), {
        title: "No console logs",
        rule: "console",
        type: "REGEX",
        scope: "CCR",
        status: "PENDING",
        severity: Severity.create("MEDIUM"),
        examples: [],
    })
}
