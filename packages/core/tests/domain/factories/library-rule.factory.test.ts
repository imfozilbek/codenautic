import {describe, expect, test} from "bun:test"

import {LIBRARY_RULE_SCOPE} from "../../../src/domain/entities/library-rule.entity"
import {LibraryRuleFactory} from "../../../src/domain/factories/library-rule.factory"

describe("LibraryRuleFactory", () => {
    test("создаёт правило с нормализованными значениями по умолчанию", () => {
        const factory = new LibraryRuleFactory()
        const rule = factory.create({
            uuid: "  rule-1  ",
            title: "  No todo  ",
            rule: "  TODO  ",
            whyIsThisImportant: "  Keep quality  ",
            severity: " high ",
            language: undefined,
            examples: [
                {
                    snippet: "  const x = 1  ",
                    isCorrect: true,
                },
            ],
            buckets: ["  style ", "STYLE"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            plugAndPlay: true,
        })

        expect(rule.id.value).toBe("rule-1")
        expect(rule.language).toBe("*")
        expect(rule.plugAndPlay).toBe(true)
        expect(rule.isGlobal).toBe(true)
        expect(rule.scope).toBe(LIBRARY_RULE_SCOPE.FILE)
        expect(rule.buckets).toEqual(["style", "STYLE"])
    })

    test("создаёт scoped правило при organizationId", () => {
        const factory = new LibraryRuleFactory()
        const rule = factory.create({
            uuid: "rule-org",
            title: "Scoped",
            rule: "Scoped rule",
            whyIsThisImportant: "Owner specific",
            severity: "low",
            organizationId: " org-acme ",
            examples: [],
            language: "ts",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
            isGlobal: false,
            plugAndPlay: false,
        })

        expect(rule.isGlobal).toBe(false)
        expect(rule.organizationId?.value).toBe("org-acme")
        expect(rule.language).toBe("ts")
    })

    test("репликация из снапшота соблюдает нормализацию", () => {
        const factory = new LibraryRuleFactory()
        const rule = factory.reconstitute({
            uuid: "rule-restore",
            title: "  Restored title  ",
            rule: "  Restore this  ",
            whyIsThisImportant: "  For migration  ",
            severity: "critical",
            examples: [
                {
                    snippet: "  const x = 1  ",
                    isCorrect: true,
                },
            ],
            language: "Dockerfile",
            buckets: ["  migration ", "MIGRATION"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            plugAndPlay: true,
            isGlobal: true,
        })

        expect(rule.uuid).toBe("rule-restore")
        expect(rule.title).toBe("Restored title")
        expect(rule.rule).toBe("Restore this")
        expect(rule.severity.toString()).toBe("CRITICAL")
        expect(rule.buckets).toEqual(["migration", "MIGRATION"])
    })

    test("пробрасывает ошибку при неизвестной сфере видимости", () => {
        const factory = new LibraryRuleFactory()

        expect(() => {
            return factory.create({
                uuid: "rule-invalid",
                title: "Bad",
                rule: "Bad",
                whyIsThisImportant: "Bad",
                severity: "low",
                examples: [],
                language: "ts",
                buckets: ["style"],
                scope: "INVALID" as unknown as (typeof LIBRARY_RULE_SCOPE)[keyof typeof LIBRARY_RULE_SCOPE],
                plugAndPlay: false,
            })
        }).toThrow("Unknown rule scope")
    })
})
