import {describe, expect, test} from "bun:test"

import {
    LIBRARY_RULE_SCOPE,
    LibraryRule,
    type ILibraryRuleExample,
    type LibraryRuleScope,
} from "../../../src/domain/entities/library-rule.entity"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

const BASE_EXAMPLES: readonly ILibraryRuleExample[] = [
    {
        snippet: "  const value = 1  ",
        isCorrect: true,
    },
]

describe("LibraryRule", () => {
    test("создаёт правило с нормализацией полей", () => {
        const rule = new LibraryRule(UniqueId.create("r1"), {
            uuid: "  rule-uuid  ",
            title: "  Keep code style  ",
            rule: "  Use clear names  ",
            whyIsThisImportant: "  Easier to support  ",
            severity: Severity.create("high"),
            examples: BASE_EXAMPLES,
            language: "  TypeScript  ",
            buckets: ["  style  ", "STYLE"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            plugAndPlay: true,
            isGlobal: true,
        })

        expect(rule.id.value).toBe("r1")
        expect(rule.uuid).toBe("rule-uuid")
        expect(rule.title).toBe("Keep code style")
        expect(rule.rule).toBe("Use clear names")
        expect(rule.whyIsThisImportant).toBe("Easier to support")
        expect(rule.severity.toString()).toBe("HIGH")
        expect(rule.language).toBe("typescript")
        expect(rule.buckets).toEqual(["style", "STYLE"])
        expect(rule.scope).toBe(LIBRARY_RULE_SCOPE.FILE)
        expect(rule.plugAndPlay).toBe(true)
        expect(rule.isGlobal).toBe(true)
        expect(rule.organizationId).toBeUndefined()
    })

    test("требует уникальный UUID", () => {
        expect(() => {
            return new LibraryRule(UniqueId.create("bad"), {
                uuid: "   ",
                title: "Title",
                rule: "Rule body",
                whyIsThisImportant: "Why",
                severity: Severity.create("low"),
                examples: BASE_EXAMPLES,
                language: "ts",
                buckets: ["a"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                plugAndPlay: false,
                isGlobal: true,
            })
        }).toThrow("Rule uuid cannot be empty")
    })

    test("предотвращает конфликт global/organizationId", () => {
        const organizationId = OrganizationId.create("org-1")

        expect(() => {
            return new LibraryRule(UniqueId.create("r2"), {
                uuid: "rule-2",
                title: "Scoped rule",
                rule: "Rule body",
                whyIsThisImportant: "Why",
                severity: Severity.create("low"),
                examples: BASE_EXAMPLES,
                language: "ts",
                buckets: ["a"],
                scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
                plugAndPlay: false,
                isGlobal: true,
                organizationId,
            })
        }).toThrow("Global rules cannot have organizationId")
    })

    test("предотвращает org rule без organizationId", () => {
        expect(() => {
            return new LibraryRule(UniqueId.create("r3"), {
                uuid: "rule-3",
                title: "Org rule",
                rule: "Rule body",
                whyIsThisImportant: "Why",
                severity: Severity.create("low"),
                examples: BASE_EXAMPLES,
                language: "ts",
                buckets: ["a"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                plugAndPlay: false,
                isGlobal: false,
            })
        }).toThrow("Organization-scoped rule must include organizationId")
    })

    test("нормализует и валидирует примеры", () => {
        expect(() => {
            return new LibraryRule(UniqueId.create("r4"), {
                uuid: "rule-4",
                title: "Bad example",
                rule: "Rule body",
                whyIsThisImportant: "Why",
                severity: Severity.create("medium"),
                examples: [
                    {
                        snippet: "   ",
                        isCorrect: true,
                    },
                ],
                language: "ts",
                buckets: ["a"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                plugAndPlay: false,
                isGlobal: true,
            })
        }).toThrow("Example snippet cannot be empty")
    })

    test("нормализует допустимую область и язык", () => {
        const rule = new LibraryRule(UniqueId.create("r5"), {
            uuid: "rule-5",
            title: "Scope",
            rule: "Rule body",
            whyIsThisImportant: "Why",
            severity: Severity.create("medium"),
            examples: BASE_EXAMPLES,
            language: "*",
            buckets: ["a"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            plugAndPlay: false,
            isGlobal: true,
        })

        expect(rule.scope).toBe<LibraryRuleScope>(LIBRARY_RULE_SCOPE.FILE)
        expect(rule.language).toBe("*")
        expect(rule.buckets).toEqual(["a"])
    })
})
