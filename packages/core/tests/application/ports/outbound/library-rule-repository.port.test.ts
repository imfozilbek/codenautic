import {describe, expect, test} from "bun:test"

import type {ILibraryRuleFilters} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import type {ILibraryRuleRepository} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import {LibraryRuleFactory} from "../../../../src/domain/factories/library-rule.factory"
import {
    LIBRARY_RULE_SCOPE,
    type LibraryRule,
    type LibraryRuleScope,
} from "../../../../src/domain/entities/library-rule.entity"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import type {SeverityLevel} from "../../../../src/domain/value-objects/severity.value-object"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

class InMemoryLibraryRuleRepository implements ILibraryRuleRepository {
    private readonly storage: Map<string, LibraryRule>

    public constructor() {
        this.storage = new Map<string, LibraryRule>()
    }

    public findById(id: UniqueId): Promise<LibraryRule | null> {
        const rule = this.storage.get(id.value)
        return Promise.resolve(rule ?? null)
    }

    public save(rule: LibraryRule): Promise<void> {
        this.storage.set(rule.id.value, rule)
        return Promise.resolve()
    }

    public findByUuid(ruleUuid: string): Promise<LibraryRule | null> {
        for (const rule of this.storage.values()) {
            if (rule.uuid === ruleUuid) {
                return Promise.resolve(rule)
            }
        }

        return Promise.resolve(null)
    }

    public findByLanguage(language: string): Promise<readonly LibraryRule[]> {
        const normalized = language.toLowerCase()
        const rules = [...this.storage.values()].filter((rule) => {
            return rule.language.toLowerCase() === normalized
        })

        return Promise.resolve(rules)
    }

    public findByCategory(category: string): Promise<readonly LibraryRule[]> {
        const normalized = category.toLowerCase()
        const rules = [...this.storage.values()].filter((rule) => {
            return rule.buckets.some((bucket) => {
                return bucket.toLowerCase() === normalized
            })
        })

        return Promise.resolve(rules)
    }

    public findGlobal(): Promise<readonly LibraryRule[]> {
        const rules = [...this.storage.values()].filter((rule) => {
            return rule.isGlobal
        })

        return Promise.resolve(rules)
    }

    public findByOrganization(organizationId: OrganizationId): Promise<readonly LibraryRule[]> {
        const rules = [...this.storage.values()].filter((rule) => {
            return (
                rule.organizationId !== undefined && rule.organizationId.value === organizationId.value
            )
        })

        return Promise.resolve(rules)
    }

    public count(filters: ILibraryRuleFilters): Promise<number> {
        const rules = [...this.storage.values()].filter((rule) => {
            return matchesFilters(rule, filters)
        })

        return Promise.resolve(rules.length)
    }

    public saveMany(rules: readonly LibraryRule[]): Promise<void> {
        for (const rule of rules) {
            this.storage.set(rule.id.value, rule)
        }

        return Promise.resolve()
    }

    public delete(id: UniqueId): Promise<void> {
        this.storage.delete(id.value)
        return Promise.resolve()
    }
}

describe("ILibraryRuleRepository contract", () => {
    test("сохраняет правило и находит его по id и uuid", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const rule = createRule({
            uuid: "rule-1",
            title: "Quality checks",
            rule: "No trailing TODO",
            whyIsThisImportant: "Keep consistency",
            language: "ts",
            buckets: ["quality", "maintainability"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            severity: "HIGH",
            isGlobal: true,
        })

        await repository.save(rule)

        const byId = await repository.findById(rule.id)
        const byUuid = await repository.findByUuid(rule.uuid)

        expect(byId).not.toBeNull()
        expect(byUuid).not.toBeNull()
        if (byId === null || byUuid === null) {
            throw new Error("Saved rule must be retrievable")
        }

        expect(byId.id.equals(rule.id)).toBe(true)
        expect(byUuid.uuid).toBe(rule.uuid)
    })

    test("фильтрует по языку, категории и организации", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const orgAcme = OrganizationId.create("org-acme")
        await repository.saveMany([
            createRule({
                uuid: "global-ts",
                title: "TS rule",
                rule: "Use strict",
                whyIsThisImportant: "Security",
                language: "ts",
                buckets: ["quality", "style"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "MEDIUM",
                isGlobal: true,
            }),
            createRule({
                uuid: "python-quality",
                title: "Python rule",
                rule: "No globals",
                whyIsThisImportant: "Clarity",
                language: "py",
                buckets: ["quality", "runtime"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "HIGH",
                isGlobal: true,
            }),
            createRule({
                uuid: "scoped-ts",
                title: "Scoped ts",
                rule: "No any",
                whyIsThisImportant: "Readability",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
                severity: "LOW",
                isGlobal: false,
                organizationId: orgAcme,
            }),
        ])

        const byLanguage = await repository.findByLanguage("ts")
        const byCategory = await repository.findByCategory("QUALITY")
        const byOrganization = await repository.findByOrganization(orgAcme)

        expect(byLanguage).toHaveLength(2)
        expect(byCategory).toHaveLength(3)
        expect(byOrganization).toHaveLength(1)
        expect(byOrganization[0]?.uuid).toBe("scoped-ts")
    })

    test("считает правило по комбинации фильтров", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.saveMany([
            createRule({
                uuid: "rule-1",
                title: "A",
                rule: "Check A",
                whyIsThisImportant: "Consistency",
                language: "ts",
                buckets: ["quality", "style"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "HIGH",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-2",
                title: "B",
                rule: "Check B",
                whyIsThisImportant: "Consistency",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "LOW",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-3",
                title: "C",
                rule: "Check C",
                whyIsThisImportant: "Consistency",
                language: "ts",
                buckets: ["quality", "security"],
                scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
                severity: "HIGH",
                isGlobal: true,
            }),
        ])

        const total = await repository.count({
            language: "ts",
            category: "quality",
            severity: "HIGH",
            scope: LIBRARY_RULE_SCOPE.FILE,
            isGlobal: true,
        })

        expect(total).toBe(1)
    })

    test("удаляет правило по идентификатору", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const rule = createRule({
            uuid: "delete-me",
            title: "Delete me",
            rule: "Obsolete rule",
            whyIsThisImportant: "Migration",
            language: "ts",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            severity: "MEDIUM",
            isGlobal: true,
        })

        await repository.save(rule)
        await repository.delete(rule.id)

        const found = await repository.findById(rule.id)
        expect(found).toBeNull()
    })
})

function createRule(input: {
    readonly uuid: string
    readonly title: string
    readonly rule: string
    readonly whyIsThisImportant: string
    readonly language: string
    readonly buckets: readonly string[]
    readonly scope: LibraryRuleScope
    readonly severity: SeverityLevel
    readonly isGlobal: boolean
    readonly organizationId?: OrganizationId
}): LibraryRule {
    const factory = new LibraryRuleFactory()

    return factory.create({
        uuid: input.uuid,
        title: input.title,
        rule: input.rule,
        whyIsThisImportant: input.whyIsThisImportant,
        severity: input.severity,
        language: input.language,
        buckets: input.buckets,
        scope: input.scope,
        plugAndPlay: false,
        isGlobal: input.isGlobal,
        organizationId:
            input.organizationId === undefined || input.organizationId.value === null
                ? undefined
                : input.organizationId.value,
        examples: [{snippet: "const value = 1", isCorrect: true}],
    })
}

function matchesFilters(rule: LibraryRule, filters: ILibraryRuleFilters): boolean {
    return (
        (filters.language === undefined || rule.language === filters.language) &&
        (filters.severity === undefined || rule.severity.toString() === filters.severity) &&
        (filters.scope === undefined || rule.scope === filters.scope) &&
        (filters.isGlobal === undefined || rule.isGlobal === filters.isGlobal) &&
        (filters.category === undefined || doesContainCategory(rule, filters.category))
    )
}

function doesContainCategory(rule: LibraryRule, category: string): boolean {
    const normalizedCategory = category.toLowerCase()
    return rule.buckets.some((bucket) => {
        return bucket.toLowerCase() === normalizedCategory
    })
}
