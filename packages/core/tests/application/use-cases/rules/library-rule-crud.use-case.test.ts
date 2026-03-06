import {describe, expect, test} from "bun:test"

import {CreateRuleUseCase} from "../../../../src/application/use-cases/rules/create-rule.use-case"
import {UpdateRuleUseCase} from "../../../../src/application/use-cases/rules/update-rule.use-case"
import {DeleteRuleUseCase} from "../../../../src/application/use-cases/rules/delete-rule.use-case"
import {GetRuleByIdUseCase} from "../../../../src/application/use-cases/rules/get-rule-by-id.use-case"
import {LibraryRuleFactory} from "../../../../src/domain/factories/library-rule.factory"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {LIBRARY_RULE_SCOPE, type LibraryRule} from "../../../../src/domain/entities/library-rule.entity"
import type {ILibraryRuleFilters, ILibraryRuleRepository} from "../../../../src/application/ports/outbound/rule/library-rule-repository.port"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

class InMemoryLibraryRuleRepository implements ILibraryRuleRepository {
    private readonly storage = new Map<string, LibraryRule>()

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

    public count(_filters: ILibraryRuleFilters): Promise<number> {
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

class FailingLibraryRuleFactory extends LibraryRuleFactory {
    public override create(): LibraryRule {
        throw new Error("Factory failed")
    }

    public override reconstitute(): LibraryRule {
        throw new Error("Factory failed")
    }
}

function buildRule(factory: LibraryRuleFactory, uuid: string, overrides?: Partial<{
    readonly isGlobal: boolean
    readonly organizationId?: string
}>): LibraryRule {
    return factory.create({
        uuid,
        title: "Rule title",
        rule: "Rule body",
        whyIsThisImportant: "Because",
        severity: "HIGH",
        examples: [{snippet: "const a = 1", isCorrect: true}],
        language: "ts",
        buckets: ["quality"],
        scope: LIBRARY_RULE_SCOPE.FILE,
        plugAndPlay: false,
        isGlobal: overrides?.isGlobal ?? true,
        organizationId: overrides?.organizationId,
    })
}

describe("CreateRuleUseCase", () => {
    test("creates library rule", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const result = await useCase.execute({
            uuid: "rule-1",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            examples: [{snippet: "bad()", isCorrect: false}],
            plugAndPlay: true,
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected rule creation success")
        }

        expect(result.value.rule.uuid).toBe("rule-1")
        expect(result.value.rule.language).toBe("*")
        expect(await repository.findByUuid("rule-1")).not.toBeNull()
    })

    test("rejects duplicate uuid", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.save(buildRule(new LibraryRuleFactory(), "rule-1"))

        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const result = await useCase.execute({
            uuid: "rule-1",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "uuid",
                message: "rule with the same uuid already exists",
            },
        ])
    })

    test("rejects invalid severity and scope", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const result = await useCase.execute({
            uuid: "rule-2",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "WRONG",
            buckets: ["quality"],
            scope: "UNKNOWN",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toEqual([
            {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            },
            {
                field: "severity",
                message: "Unknown severity level: WRONG",
            },
        ])
    })

    test("rejects invalid buckets and examples", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const result = await useCase.execute({
            uuid: "rule-3",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: [],
            scope: LIBRARY_RULE_SCOPE.FILE,
            examples: [{snippet: "", isCorrect: true}],
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields[0]?.field).toBe("buckets")
    })

    test("validates organization scope rules", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const missingOrg = await useCase.execute({
            uuid: "rule-4",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            isGlobal: false,
        })

        const globalWithOrg = await useCase.execute({
            uuid: "rule-5",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
            isGlobal: true,
            organizationId: "org-1",
        })

        expect(missingOrg.isFail).toBe(true)
        expect(globalWithOrg.isFail).toBe(true)
    })

    test("maps factory errors", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const useCase = new CreateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new FailingLibraryRuleFactory(),
        })

        const result = await useCase.execute({
            uuid: "rule-6",
            title: "Rule title",
            rule: "Rule body",
            whyIsThisImportant: "Because",
            severity: "LOW",
            buckets: ["quality"],
            scope: LIBRARY_RULE_SCOPE.FILE,
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })
})

describe("UpdateRuleUseCase", () => {
    test("updates rule fields", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const factory = new LibraryRuleFactory()
        await repository.save(buildRule(factory, "rule-7"))

        const useCase = new UpdateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: factory,
        })

        const result = await useCase.execute({
            ruleUuid: "rule-7",
            title: "Updated title",
            severity: "CRITICAL",
            buckets: ["security"],
            examples: [{snippet: "bad()", isCorrect: false}],
            plugAndPlay: true,
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected update success")
        }

        expect(result.value.rule.title).toBe("Updated title")
        expect(result.value.rule.severity).toBe("CRITICAL")
        expect(result.value.rule.buckets).toEqual(["security"])
    })

    test("rejects missing rule and no fields", async () => {
        const useCase = new UpdateRuleUseCase({
            libraryRuleRepository: new InMemoryLibraryRuleRepository(),
            libraryRuleFactory: new LibraryRuleFactory(),
        })

        const noFields = await useCase.execute({
            ruleUuid: "rule-8",
        })

        const missing = await useCase.execute({
            ruleUuid: "missing",
            title: "Updated",
        })

        expect(noFields.isFail).toBe(true)
        expect(missing.isFail).toBe(true)
    })

    test("validates scope and severity updates", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const factory = new LibraryRuleFactory()
        await repository.save(buildRule(factory, "rule-9"))

        const useCase = new UpdateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: factory,
        })

        const invalidSeverity = await useCase.execute({
            ruleUuid: "rule-9",
            severity: "BAD",
        })

        const invalidScope = await useCase.execute({
            ruleUuid: "rule-9",
            scope: "INVALID",
        })

        expect(invalidSeverity.isFail).toBe(true)
        expect(invalidScope.isFail).toBe(true)
    })

    test("validates organization scope updates", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const factory = new LibraryRuleFactory()
        await repository.save(buildRule(factory, "rule-10"))

        const useCase = new UpdateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: factory,
        })

        const missingOrg = await useCase.execute({
            ruleUuid: "rule-10",
            isGlobal: false,
        })

        const invalidOrg = await useCase.execute({
            ruleUuid: "rule-10",
            organizationId: "bad org",
        })

        expect(missingOrg.isFail).toBe(true)
        expect(invalidOrg.isFail).toBe(true)
    })

    test("maps factory errors on update", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        const factory = new LibraryRuleFactory()
        await repository.save(buildRule(factory, "rule-11"))

        const useCase = new UpdateRuleUseCase({
            libraryRuleRepository: repository,
            libraryRuleFactory: new FailingLibraryRuleFactory(),
        })

        const result = await useCase.execute({
            ruleUuid: "rule-11",
            title: "Updated title",
        })

        expect(result.isFail).toBe(true)
        expect(result.error).toBeInstanceOf(ValidationError)
    })
})

describe("GetRuleByIdUseCase", () => {
    test("returns rule by uuid", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.save(buildRule(new LibraryRuleFactory(), "rule-12"))

        const useCase = new GetRuleByIdUseCase({
            libraryRuleRepository: repository,
        })

        const result = await useCase.execute({
            ruleUuid: "rule-12",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.rule.uuid).toBe("rule-12")
    })

    test("returns validation error when not found", async () => {
        const useCase = new GetRuleByIdUseCase({
            libraryRuleRepository: new InMemoryLibraryRuleRepository(),
        })

        const result = await useCase.execute({
            ruleUuid: "missing",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields[0]?.field).toBe("ruleUuid")
    })
})

describe("DeleteRuleUseCase", () => {
    test("deletes rule", async () => {
        const repository = new InMemoryLibraryRuleRepository()
        await repository.save(buildRule(new LibraryRuleFactory(), "rule-13"))

        const useCase = new DeleteRuleUseCase({
            libraryRuleRepository: repository,
        })

        const result = await useCase.execute({
            ruleUuid: "rule-13",
        })

        expect(result.isOk).toBe(true)
        expect(await repository.findByUuid("rule-13")).toBeNull()
    })

    test("returns error when rule missing", async () => {
        const useCase = new DeleteRuleUseCase({
            libraryRuleRepository: new InMemoryLibraryRuleRepository(),
        })

        const result = await useCase.execute({
            ruleUuid: "missing",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields[0]?.field).toBe("ruleUuid")
    })
})
