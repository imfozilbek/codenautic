import {ValidationError} from "../../../domain/errors/validation.error"
import {LibraryRuleFactory} from "../../../domain/factories/library-rule.factory"
import type {LibraryRule} from "../../../domain/entities/library-rule.entity"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {
    parseRuleConfigList,
    type IConfigLibraryRuleItem,
} from "../../dto/config/rule-config-data.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing default library rules.
 */
export interface IImportDefaultLibraryRulesUseCaseDependencies {
    /**
     * Library rule repository port.
     */
    readonly libraryRuleRepository: ILibraryRuleRepository
}

/**
 * Imports default library rules from settings-service payload.
 */
export class ImportDefaultLibraryRulesUseCase
    implements IUseCase<readonly IConfigLibraryRuleItem[], IImportResult, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly ruleFactory: LibraryRuleFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportDefaultLibraryRulesUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.ruleFactory = new LibraryRuleFactory()
    }

    /**
     * Imports default rules.
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
        const createdRules: LibraryRule[] = []
        let skipped = 0

        for (const item of items) {
            const existing = await this.libraryRuleRepository.findByUuid(item.uuid)
            if (existing !== null) {
                skipped += 1
                continue
            }

            createdRules.push(this.ruleFactory.create({
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
        }

        if (createdRules.length > 0) {
            await this.libraryRuleRepository.saveMany(createdRules)
        }

        return Result.ok<IImportResult, ValidationError>({
            total: items.length,
            created: createdRules.length,
            updated: 0,
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
}
