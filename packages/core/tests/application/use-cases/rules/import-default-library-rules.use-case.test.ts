import {describe, expect, test} from "bun:test"

import {
    LIBRARY_RULE_SCOPE,
    type LibraryRule,
} from "../../../../src/domain/entities/library-rule.entity"
import {LibraryRuleFactory} from "../../../../src/domain/factories/library-rule.factory"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"
import type {
    ILibraryRuleFilters,
    ILibraryRuleRepository,
} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import {ImportDefaultLibraryRulesUseCase} from "../../../../src/application/use-cases/rules/import-default-library-rules.use-case"
import type {IConfigLibraryRuleItem} from "../../../../src/application/dto/config/rule-config-data.dto"
import {ValidationError} from "../../../../src/domain/errors/validation.error"

class InMemoryLibraryRuleRepository implements ILibraryRuleRepository {
    private readonly storage: Map<string, LibraryRule>

    public constructor() {
        this.storage = new Map<string, LibraryRule>()
    }

    public findById(id: UniqueId): Promise<LibraryRule | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(rule: LibraryRule): Promise<void> {
        this.storage.set(rule.uuid, rule)
        return Promise.resolve()
    }

    public findByUuid(ruleUuid: string): Promise<LibraryRule | null> {
        return Promise.resolve(this.storage.get(ruleUuid) ?? null)
    }

    public findByLanguage(language: string): Promise<readonly LibraryRule[]> {
        const normalized = language.toLowerCase()
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => rule.language.toLowerCase() === normalized),
        )
    }

    public findByCategory(category: string): Promise<readonly LibraryRule[]> {
        const normalized = category.toLowerCase()
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => {
                return rule.buckets.some((bucket) => bucket.toLowerCase() === normalized)
            }),
        )
    }

    public findGlobal(): Promise<readonly LibraryRule[]> {
        return Promise.resolve([...this.storage.values()].filter((rule) => rule.isGlobal))
    }

    public findByOrganization(organizationId: OrganizationId): Promise<readonly LibraryRule[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => {
                return rule.organizationId?.value === organizationId.value
            }),
        )
    }

    public count(filters: ILibraryRuleFilters): Promise<number> {
        if (filters === undefined) {
            return Promise.resolve(this.storage.size)
        }

        return Promise.resolve(this.storage.size)
    }

    public saveMany(rules: readonly LibraryRule[]): Promise<void> {
        for (const rule of rules) {
            this.storage.set(rule.uuid, rule)
        }
        return Promise.resolve()
    }

    public delete(id: UniqueId): Promise<void> {
        this.storage.delete(id.value)
        return Promise.resolve()
    }
}

describe("ImportDefaultLibraryRulesUseCase", () => {
    test("импортирует новые правила и нормализует поля", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new ImportDefaultLibraryRulesUseCase({
            libraryRuleRepository: repository,
        })
        const input: readonly IConfigLibraryRuleItem[] = [{
            uuid: "rule-1",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "HIGH",
            examples: [{
                snippet: "bad example",
                isCorrect: false,
            }],
            language: "",
            buckets: ["bucket-1", "bucket-1", "bucket-2"],
            scope: LIBRARY_RULE_SCOPE.PULL_REQUEST,
            plugAndPlay: true,
        }]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 1,
            created: 1,
            updated: 0,
            skipped: 0,
            failed: 0,
        })

        const stored = await repository.findByUuid("rule-1")
        expect(stored).not.toBeNull()
        expect(stored?.language).toBe("*")
        expect(stored?.scope).toBe(LIBRARY_RULE_SCOPE.PULL_REQUEST)
        expect(stored?.buckets).toEqual(["bucket-1", "bucket-2"])
    })

    test("пропускает уже существующие правила", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const factory = new LibraryRuleFactory()
        await repository.save(factory.create({
            uuid: "rule-1",
            title: "Existing",
            rule: "Body",
            whyIsThisImportant: "Why",
            severity: "LOW",
            scope: LIBRARY_RULE_SCOPE.FILE,
            plugAndPlay: false,
            language: "*",
            buckets: ["bucket-1"],
            isGlobal: true,
        }))

        const useCase = new ImportDefaultLibraryRulesUseCase({
            libraryRuleRepository: repository,
        })
        const input: readonly IConfigLibraryRuleItem[] = [
            createItem("rule-1"),
            createItem("rule-2"),
        ]

        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.created).toBe(1)
        expect(result.value.skipped).toBe(1)
    })

    test("возвращает ошибку при невалидном payload", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new ImportDefaultLibraryRulesUseCase({
            libraryRuleRepository: repository,
        })

        const result = await useCase.execute({} as unknown as IConfigLibraryRuleItem[])

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })

    test("обрабатывает пустой список", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new ImportDefaultLibraryRulesUseCase({
            libraryRuleRepository: repository,
        })

        const result = await useCase.execute([])

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            total: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
        })
    })
})

function createItem(uuid: string): IConfigLibraryRuleItem {
    return {
        uuid,
        title: "Rule title",
        rule: "Rule body",
        whyIsThisImportant: "Because",
        severity: "HIGH",
        examples: [{
            snippet: "good example",
            isCorrect: true,
        }],
        language: "*",
        buckets: ["bucket-1"],
        scope: LIBRARY_RULE_SCOPE.FILE,
        plugAndPlay: false,
    }
}
