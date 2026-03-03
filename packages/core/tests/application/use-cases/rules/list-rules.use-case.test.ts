import {describe, expect, test} from "bun:test"

import {LibraryRuleFactory} from "../../../../src/domain/factories/library-rule.factory"
import {
    LIBRARY_RULE_SCOPE,
    type LibraryRule,
    type LibraryRuleScope,
} from "../../../../src/domain/entities/library-rule.entity"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import type {ILibraryRuleFilters} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import type {ILibraryRuleRepository} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import {ListRulesUseCase} from "../../../../src/application/use-cases/rules/list-rules.use-case"

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
            return rule.language === normalized
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

    public findByOrganization(_organizationId: OrganizationId): Promise<readonly LibraryRule[]> {
        return Promise.resolve([])
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

describe("ListRulesUseCase", () => {
    test("сортирует и делает пагинацию только по глобальным правилам", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.saveMany([
            createRule({
                uuid: "rule-z",
                title: "Zeta",
                rule: "Avoid long methods",
                whyIsThisImportant: "Readability",
                language: "ts",
                buckets: ["quality", "style"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "LOW",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-a",
                title: "Alpha",
                rule: "Avoid magic numbers",
                whyIsThisImportant: "Clarity",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "MEDIUM",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-b",
                title: "Beta",
                rule: "No var",
                whyIsThisImportant: "Modern style",
                language: "ts",
                buckets: ["maintainability"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "HIGH",
                isGlobal: false,
                organizationId: OrganizationId.create("org-scope"),
            }),
        ])

        const useCase = new ListRulesUseCase(repository)
        const result = await useCase.execute({page: 1, limit: 2})

        expect(result.isOk).toBe(true)
        expect(result.value.total).toBe(2)
        expect(result.value.rules.map((item) => item.title)).toEqual(["Alpha", "Zeta"])
        expect(result.value.rules).toHaveLength(2)
    })

    test("фильтрует по category/language/severity/scope с проверкой case-insensitive для категории", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.saveMany([
            createRule({
                uuid: "match-1",
                title: "Match first",
                rule: "Do not use any",
                whyIsThisImportant: "Safety",
                language: "ts",
                buckets: ["quality", "style"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "HIGH",
                isGlobal: true,
            }),
            createRule({
                uuid: "ignore-1",
                title: "Ignore one",
                rule: "Use tabs",
                whyIsThisImportant: "Style",
                language: "ts",
                buckets: ["style"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "LOW",
                isGlobal: true,
            }),
            createRule({
                uuid: "ignore-2",
                title: "Ignore two",
                rule: "No tabs",
                whyIsThisImportant: "Readability",
                language: "python",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
                severity: "HIGH",
                isGlobal: true,
            }),
        ])

        const useCase = new ListRulesUseCase(repository)
        const result = await useCase.execute({
            language: "ts",
            category: "QUALITY",
            scope: LIBRARY_RULE_SCOPE.FILE,
            severity: "high",
            page: 1,
            limit: 10,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.total).toBe(1)
        expect(result.value.rules).toHaveLength(1)
        expect(result.value.rules[0]?.uuid).toBe("match-1")
    })

    test("валидация собирает все ошибки для неверных параметров", async () => {
        const useCase = new ListRulesUseCase(new InMemoryLibraryRuleRepository())
        const result = await useCase.execute({
            language: 10 as unknown as string,
            severity: "weird",
            scope: "UNRECOGNIZED" as string,
            page: 0,
            limit: -1,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "language",
                message: "must be a non-empty string",
            },
            {
                field: "severity",
                message: "Unknown severity level: weird",
            },
            {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            },
            {
                field: "page",
                message: "page must be a positive integer",
            },
            {
                field: "limit",
                message: "limit must be a positive integer",
            },
        ])
    })

    test("поддерживает пагинацию по page и limit", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.saveMany([
            createRule({
                uuid: "rule-1",
                title: "A",
                rule: "R1",
                whyIsThisImportant: "I1",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "MEDIUM",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-2",
                title: "B",
                rule: "R2",
                whyIsThisImportant: "I2",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "MEDIUM",
                isGlobal: true,
            }),
            createRule({
                uuid: "rule-3",
                title: "C",
                rule: "R3",
                whyIsThisImportant: "I3",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "MEDIUM",
                isGlobal: true,
            }),
        ])

        const useCase = new ListRulesUseCase(repository)
        const result = await useCase.execute({
            page: 2,
            limit: 2,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.total).toBe(3)
        expect(result.value.rules).toHaveLength(1)
        expect(result.value.rules[0]?.title).toBe("C")
    })

    test("спецсимвол '*' для language убирает языковый фильтр", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.saveMany([
            createRule({
                uuid: "ts-rule",
                title: "TS",
                rule: "R1",
                whyIsThisImportant: "I",
                language: "ts",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "LOW",
                isGlobal: true,
            }),
            createRule({
                uuid: "py-rule",
                title: "Python",
                rule: "R2",
                whyIsThisImportant: "I",
                language: "py",
                buckets: ["quality"],
                scope: LIBRARY_RULE_SCOPE.FILE,
                severity: "LOW",
                isGlobal: true,
            }),
        ])

        const useCase = new ListRulesUseCase(repository)
        const result = await useCase.execute({
            language: "*",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.total).toBe(2)
        expect(result.value.rules).toHaveLength(2)
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
    readonly severity: string
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
        organizationId: input.organizationId?.value ?? undefined,
        examples: [{snippet: "const a = 1", isCorrect: true}],
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
    const normalized = category.toLowerCase()
    return rule.buckets.some((bucket) => {
        return bucket.toLowerCase() === normalized
    })
}
