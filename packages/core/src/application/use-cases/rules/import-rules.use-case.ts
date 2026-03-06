import {ValidationError} from "../../../domain/errors/validation.error"
import {LibraryRuleFactory} from "../../../domain/factories/library-rule.factory"
import type {LibraryRule, ILibraryRuleExample} from "../../../domain/entities/library-rule.entity"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {
    parseRuleConfigList,
    type IConfigLibraryRuleItem,
    type IRuleConfigExampleData,
} from "../../dto/config/rule-config-data.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing library rules.
 */
export interface IImportRulesUseCaseDependencies {
    /**
     * Library rule repository port.
     */
    readonly libraryRuleRepository: ILibraryRuleRepository
}

/**
 * Imports library rules with idempotent upsert.
 */
export class ImportRulesUseCase
    implements IUseCase<readonly IConfigLibraryRuleItem[], IImportResult, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly ruleFactory: LibraryRuleFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportRulesUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.ruleFactory = new LibraryRuleFactory()
    }

    /**
     * Imports library rules.
     *
     * @param input Rule config items.
     * @returns Import summary.
     */
    public async execute(
        input: readonly IConfigLibraryRuleItem[],
    ): Promise<Result<IImportResult, ValidationError>> {
        const normalized = this.validateInput(input)
        if (normalized.isFail) {
            return Result.fail<IImportResult, ValidationError>(normalized.error)
        }

        const items = normalized.value
        const pendingRules: LibraryRule[] = []
        let created = 0
        let updated = 0
        let skipped = 0

        for (const item of items) {
            const existing = await this.libraryRuleRepository.findByUuid(item.uuid)
            if (existing === null) {
                pendingRules.push(this.ruleFactory.create({
                    uuid: item.uuid,
                    title: item.title,
                    rule: item.rule,
                    whyIsThisImportant: item.whyIsThisImportant,
                    severity: item.severity,
                    examples: item.examples,
                    language: item.language,
                    buckets: item.buckets,
                    scope: item.scope,
                    plugAndPlay: item.plugAndPlay,
                    isGlobal: true,
                }))
                created += 1
                continue
            }

            if (this.isRuleUnchanged(existing, item)) {
                skipped += 1
                continue
            }

            pendingRules.push(this.ruleFactory.reconstitute({
                uuid: item.uuid,
                title: item.title,
                rule: item.rule,
                whyIsThisImportant: item.whyIsThisImportant,
                severity: item.severity,
                examples: item.examples,
                language: item.language,
                buckets: item.buckets,
                scope: item.scope,
                plugAndPlay: item.plugAndPlay,
                isGlobal: true,
            }))
            updated += 1
        }

        if (pendingRules.length > 0) {
            await this.libraryRuleRepository.saveMany(pendingRules)
        }

        return Result.ok<IImportResult, ValidationError>({
            total: items.length,
            created,
            updated,
            skipped,
            failed: 0,
        })
    }

    /**
     * Validates and normalizes import payload.
     *
     * @param input Raw payload.
     * @returns Normalized rule items or validation error.
     */
    private validateInput(
        input: unknown,
    ): Result<readonly IConfigLibraryRuleItem[], ValidationError> {
        if (Array.isArray(input) === false) {
            return Result.fail<readonly IConfigLibraryRuleItem[], ValidationError>(
                new ValidationError("Import library rules validation failed", [{
                    field: "items",
                    message: "must be an array",
                }]),
            )
        }

        const parsed = parseRuleConfigList({items: input})
        if (parsed === undefined) {
            return Result.fail<readonly IConfigLibraryRuleItem[], ValidationError>(
                new ValidationError("Import library rules validation failed", [{
                    field: "items",
                    message: "contains invalid rule payload",
                }]),
            )
        }

        return Result.ok<readonly IConfigLibraryRuleItem[], ValidationError>(parsed)
    }

    private isRuleUnchanged(existing: LibraryRule, item: IConfigLibraryRuleItem): boolean {
        return existing.severity.toString() === this.normalizeSeverity(item.severity)
            && this.isRuleTextEqual(existing, item)
            && this.isRuleOptionsEqual(existing, item)
            && this.areStringArraysEqual(existing.buckets, item.buckets)
            && this.areExamplesEqual(existing.examples, item.examples)
    }

    private normalizeSeverity(value: string): string {
        return value.trim().toUpperCase()
    }

    private isRuleTextEqual(existing: LibraryRule, item: IConfigLibraryRuleItem): boolean {
        return existing.title === item.title
            && existing.rule === item.rule
            && existing.whyIsThisImportant === item.whyIsThisImportant
    }

    private isRuleOptionsEqual(existing: LibraryRule, item: IConfigLibraryRuleItem): boolean {
        return existing.language === item.language
            && existing.scope === item.scope
            && existing.plugAndPlay === item.plugAndPlay
            && existing.isGlobal === true
            && existing.organizationId === undefined
    }

    private areStringArraysEqual(
        left: readonly string[],
        right: readonly string[],
    ): boolean {
        if (left.length !== right.length) {
            return false
        }

        for (let index = 0; index < left.length; index += 1) {
            if (left[index] !== right[index]) {
                return false
            }
        }

        return true
    }

    private areExamplesEqual(
        left: readonly ILibraryRuleExample[],
        right: readonly IRuleConfigExampleData[],
    ): boolean {
        if (left.length !== right.length) {
            return false
        }

        for (let index = 0; index < left.length; index += 1) {
            const leftExample = left[index]
            const rightExample = right[index]
            if (leftExample === undefined || rightExample === undefined) {
                return false
            }

            if (!this.isExampleEqual(leftExample, rightExample)) {
                return false
            }
        }

        return true
    }

    private isExampleEqual(
        left: ILibraryRuleExample,
        right: IRuleConfigExampleData,
    ): boolean {
        return left.snippet === right.snippet && left.isCorrect === right.isCorrect
    }
}
