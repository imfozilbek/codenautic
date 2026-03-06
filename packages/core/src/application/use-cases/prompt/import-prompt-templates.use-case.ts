import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {PromptTemplateFactory} from "../../../domain/factories/prompt-template.factory"
import {PromptEngineService} from "../../../domain/services/prompt-engine.service"
import type {PromptTemplate} from "../../../domain/entities/prompt-template.entity"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {
    parsePromptTemplateConfigList,
    type IConfigPromptTemplateItem,
} from "../../dto/config/prompt-template-config.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing prompt templates.
 */
export interface IImportPromptTemplatesUseCaseDependencies {
    /**
     * Prompt template repository port.
     */
    readonly promptTemplateRepository: IPromptTemplateRepository
}

/**
 * Imports prompt templates with idempotent upsert.
 */
export class ImportPromptTemplatesUseCase
    implements IUseCase<readonly IConfigPromptTemplateItem[], IImportResult, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository
    private readonly templateFactory: PromptTemplateFactory
    private readonly promptEngine: PromptEngineService

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportPromptTemplatesUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
        this.templateFactory = new PromptTemplateFactory()
        this.promptEngine = new PromptEngineService()
    }

    /**
     * Imports prompt templates.
     *
     * @param input Prompt template items.
     * @returns Import summary.
     */
    public async execute(
        input: readonly IConfigPromptTemplateItem[],
    ): Promise<Result<IImportResult, ValidationError>> {
        const normalized = this.validateInput(input)
        if (normalized.isFail) {
            return Result.fail<IImportResult, ValidationError>(normalized.error)
        }

        const items = normalized.value
        const validationErrors: IValidationErrorField[] = []

        for (const [index, item] of items.entries()) {
            const validation = this.promptEngine.validate(item.content)
            if (validation.isFail) {
                this.collectTemplateErrors(index, validation.error, validationErrors)
            }
        }

        if (validationErrors.length > 0) {
            return Result.fail<IImportResult, ValidationError>(
                new ValidationError("Import prompt templates validation failed", validationErrors),
            )
        }

        let created = 0
        let updated = 0
        let skipped = 0

        for (const item of items) {
            const existing = await this.promptTemplateRepository.findByName(item.name)
            if (existing === null) {
                const template = this.templateFactory.create({
                    name: item.name,
                    category: item.category,
                    type: item.type,
                    content: item.content,
                    variables: item.variables.map((name) => ({name})),
                    isGlobal: true,
                })

                await this.promptTemplateRepository.save(template)
                created += 1
                continue
            }

            if (this.isTemplateUnchanged(existing, item)) {
                skipped += 1
                continue
            }

            const template = this.templateFactory.reconstitute({
                id: existing.id.value,
                name: item.name,
                category: item.category,
                type: item.type,
                content: item.content,
                variables: item.variables.map((name) => ({name})),
                version: existing.version,
                isGlobal: true,
            })

            await this.promptTemplateRepository.save(template)
            updated += 1
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
     * Validates and normalizes input payload.
     *
     * @param input Raw payload.
     * @returns Normalized items or validation error.
     */
    private validateInput(
        input: unknown,
    ): Result<readonly IConfigPromptTemplateItem[], ValidationError> {
        if (Array.isArray(input) === false) {
            return Result.fail<readonly IConfigPromptTemplateItem[], ValidationError>(
                new ValidationError("Import prompt templates validation failed", [{
                    field: "items",
                    message: "must be an array",
                }]),
            )
        }

        const parsed = parsePromptTemplateConfigList({items: input})
        if (parsed === undefined) {
            return Result.fail<readonly IConfigPromptTemplateItem[], ValidationError>(
                new ValidationError("Import prompt templates validation failed", [{
                    field: "items",
                    message: "contains invalid prompt template payload",
                }]),
            )
        }

        return Result.ok<readonly IConfigPromptTemplateItem[], ValidationError>(parsed)
    }

    /**
     * Maps prompt engine validation errors.
     *
     * @param index Template index.
     * @param error Validation error from prompt engine.
     * @param fields Target list for validation errors.
     */
    private collectTemplateErrors(
        index: number,
        error: ValidationError,
        fields: IValidationErrorField[],
    ): void {
        for (const field of error.fields) {
            const message = field.message.trim()
            fields.push({
                field: `items[${index}].content`,
                message: message.length === 0 ? "template content is invalid" : message,
            })
        }
    }

    private isTemplateUnchanged(
        existing: PromptTemplate,
        item: IConfigPromptTemplateItem,
    ): boolean {
        if (existing.name !== item.name) {
            return false
        }

        if (existing.category !== item.category || existing.type !== item.type) {
            return false
        }

        if (existing.content !== item.content) {
            return false
        }

        if (existing.isGlobal !== true || existing.organizationId !== undefined) {
            return false
        }

        return this.areVariablesEqual(existing.variables, item.variables)
    }

    private areVariablesEqual(
        existingVariables: readonly {readonly name: string}[],
        incoming: readonly string[],
    ): boolean {
        if (existingVariables.length !== incoming.length) {
            return false
        }

        for (let index = 0; index < existingVariables.length; index += 1) {
            if (existingVariables[index]?.name !== incoming[index]) {
                return false
            }
        }

        return true
    }
}
