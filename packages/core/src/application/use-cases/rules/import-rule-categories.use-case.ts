import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {RuleCategoryFactory} from "../../../domain/factories/rule-category.factory"
import type {RuleCategory} from "../../../domain/entities/rule-category.entity"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IRuleCategoryRepository} from "../../ports/outbound/rule/rule-category-repository.port"
import type {IConfigRuleCategoryItem} from "../../dto/config/rule-category-config.dto"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing rule categories.
 */
export interface IImportRuleCategoriesUseCaseDependencies {
    /**
     * Rule category repository port.
     */
    readonly ruleCategoryRepository: IRuleCategoryRepository
}

/**
 * Imports rule categories with idempotent upsert.
 */
export class ImportRuleCategoriesUseCase
    implements IUseCase<readonly IConfigRuleCategoryItem[], IImportResult, ValidationError>
{
    private readonly ruleCategoryRepository: IRuleCategoryRepository
    private readonly categoryFactory: RuleCategoryFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportRuleCategoriesUseCaseDependencies) {
        this.ruleCategoryRepository = dependencies.ruleCategoryRepository
        this.categoryFactory = new RuleCategoryFactory()
    }

    /**
     * Imports rule categories.
     *
     * @param input Category config items.
     * @returns Import result summary.
     */
    public async execute(
        input: readonly IConfigRuleCategoryItem[],
    ): Promise<Result<IImportResult, ValidationError>> {
        const normalized = this.validateInput(input)
        if (normalized.isFail) {
            return Result.fail<IImportResult, ValidationError>(normalized.error)
        }

        const items = normalized.value
        let created = 0
        let updated = 0
        let skipped = 0

        for (const item of items) {
            const existing = await this.ruleCategoryRepository.findBySlug(item.slug)
            if (existing === null) {
                const category = this.categoryFactory.create({
                    slug: item.slug,
                    name: item.name,
                    description: item.description,
                    weight: item.weight,
                    isActive: true,
                })

                await this.ruleCategoryRepository.save(category)
                created += 1
                continue
            }

            if (this.isCategoryUnchanged(existing, item)) {
                skipped += 1
                continue
            }

            const category = this.categoryFactory.reconstitute({
                id: existing.id.value,
                slug: item.slug,
                name: item.name,
                description: item.description,
                weight: item.weight,
                isActive: true,
            })

            await this.ruleCategoryRepository.save(category)
            updated += 1
        }

        const result: IImportResult = {
            total: items.length,
            created,
            updated,
            skipped,
            failed: 0,
        }

        return Result.ok<IImportResult, ValidationError>(result)
    }

    /**
     * Validates category import payload.
     *
     * @param input Raw input payload.
     * @returns Normalized items or validation error.
     */
    private validateInput(
        input: unknown,
    ): Result<readonly IConfigRuleCategoryItem[], ValidationError> {
        if (Array.isArray(input) === false) {
            return Result.fail<readonly IConfigRuleCategoryItem[], ValidationError>(
                new ValidationError("Import rule categories validation failed", [{
                    field: "items",
                    message: "must be an array",
                }]),
            )
        }

        const fields: IValidationErrorField[] = []
        const normalized: IConfigRuleCategoryItem[] = []
        const seen = new Set<string>()

        for (let index = 0; index < input.length; index += 1) {
            const item = this.parseItem(input[index], index, fields)
            if (item === undefined) {
                continue
            }

            const slugKey = item.slug.toLowerCase()
            if (seen.has(slugKey)) {
                fields.push({
                    field: `items[${index}].slug`,
                    message: "must be unique",
                })
                continue
            }

            seen.add(slugKey)
            normalized.push(item)
        }

        if (fields.length > 0) {
            return Result.fail<readonly IConfigRuleCategoryItem[], ValidationError>(
                new ValidationError("Import rule categories validation failed", fields),
            )
        }

        return Result.ok<readonly IConfigRuleCategoryItem[], ValidationError>(
            Object.freeze(normalized),
        )
    }

    /**
     * Parses one category item.
     *
     * @param value Raw item payload.
     * @param index Item index.
     * @param fields Target validation errors list.
     * @returns Parsed item or undefined.
     */
    private parseItem(
        value: unknown,
        index: number,
        fields: IValidationErrorField[],
    ): IConfigRuleCategoryItem | undefined {
        const record = this.readObject(value, index, fields)
        if (record === undefined) {
            return undefined
        }

        const slug = this.readSlug(record, index, fields)
        const name = this.readRequiredText(record, "name", index, fields)
        const description = this.readRequiredText(record, "description", index, fields)
        const weight = this.readWeight(record, index, fields)

        if (slug === undefined || name === undefined || description === undefined || weight === undefined) {
            return undefined
        }

        return {
            slug,
            name,
            description,
            weight,
        }
    }

    /**
     * Reads object payload.
     *
     * @param value Raw value.
     * @param index Item index.
     * @param fields Validation errors list.
     * @returns Record or undefined.
     */
    private readObject(
        value: unknown,
        index: number,
        fields: IValidationErrorField[],
    ): Record<string, unknown> | undefined {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            fields.push({
                field: `items[${index}]`,
                message: "must be an object",
            })
            return undefined
        }

        return value as Record<string, unknown>
    }

    /**
     * Reads required text field.
     *
     * @param record Raw item record.
     * @param field Field name.
     * @param index Item index.
     * @param fields Validation error list.
     * @returns Parsed text or undefined.
     */
    private readRequiredText(
        record: Record<string, unknown>,
        field: string,
        index: number,
        fields: IValidationErrorField[],
    ): string | undefined {
        const value = record[field]
        if (typeof value !== "string" || value.trim().length === 0) {
            fields.push({
                field: `items[${index}].${field}`,
                message: "must be a non-empty string",
            })
            return undefined
        }

        return value.trim()
    }

    /**
     * Reads slug value.
     *
     * @param record Raw item record.
     * @param index Item index.
     * @param fields Validation error list.
     * @returns Normalized slug or undefined.
     */
    private readSlug(
        record: Record<string, unknown>,
        index: number,
        fields: IValidationErrorField[],
    ): string | undefined {
        const value = record["slug"]
        if (typeof value !== "string" || value.trim().length === 0) {
            fields.push({
                field: `items[${index}].slug`,
                message: "must be a non-empty string",
            })
            return undefined
        }

        const normalized = value.trim()
        if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) === false) {
            fields.push({
                field: `items[${index}].slug`,
                message: "must be kebab-case",
            })
            return undefined
        }

        return normalized
    }

    /**
     * Reads weight field value.
     *
     * @param record Raw item record.
     * @param index Item index.
     * @param fields Validation error list.
     * @returns Weight value or undefined.
     */
    private readWeight(
        record: Record<string, unknown>,
        index: number,
        fields: IValidationErrorField[],
    ): number | undefined {
        const value = record["weight"]
        if (value === undefined) {
            return 0
        }

        if (typeof value !== "number" || Number.isFinite(value) === false || value < 0) {
            fields.push({
                field: `items[${index}].weight`,
                message: "must be a non-negative number",
            })
            return undefined
        }

        return value
    }

    private isCategoryUnchanged(
        existing: RuleCategory,
        item: IConfigRuleCategoryItem,
    ): boolean {
        return existing.slug === item.slug
            && existing.name === item.name
            && existing.description === item.description
            && existing.weight === item.weight
            && existing.isActive === true
    }
}
