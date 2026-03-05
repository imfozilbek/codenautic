import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {RuleCategoryFactory} from "../../../domain/factories/rule-category.factory"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IRuleCategoryRepository} from "../../ports/outbound/rule/rule-category-repository.port"
import type {IConfigRuleCategoryItem} from "../../dto/config/rule-category-config.dto"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing default rule categories.
 */
export interface IImportDefaultRuleCategoriesUseCaseDependencies {
    /**
     * Rule category repository port.
     */
    readonly ruleCategoryRepository: IRuleCategoryRepository
}

/**
 * Imports default rule categories from settings-service payload.
 */
export class ImportDefaultRuleCategoriesUseCase
    implements IUseCase<readonly IConfigRuleCategoryItem[], IImportResult, ValidationError>
{
    private readonly ruleCategoryRepository: IRuleCategoryRepository
    private readonly categoryFactory: RuleCategoryFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportDefaultRuleCategoriesUseCaseDependencies) {
        this.ruleCategoryRepository = dependencies.ruleCategoryRepository
        this.categoryFactory = new RuleCategoryFactory()
    }

    /**
     * Imports default rule categories.
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
        const updated = 0
        let skipped = 0
        const failed = 0

        for (const item of items) {
            const existing = await this.ruleCategoryRepository.findBySlug(item.slug)
            if (existing !== null) {
                skipped += 1
                continue
            }

            const category = this.categoryFactory.create({
                slug: item.slug,
                name: item.name,
                description: item.description,
                weight: item.weight,
                isActive: true,
            })

            await this.ruleCategoryRepository.save(category)
            created += 1
        }

        const result: IImportResult = {
            total: items.length,
            created,
            updated,
            skipped,
            failed,
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
     * @param record Input record.
     * @param key Field name.
     * @param index Item index.
     * @param fields Validation errors list.
     * @returns Text value or undefined.
     */
    private readRequiredText(
        record: Record<string, unknown>,
        key: string,
        index: number,
        fields: IValidationErrorField[],
    ): string | undefined {
        const value = this.readNonEmptyText(record[key])
        if (value === undefined) {
            fields.push({
                field: `items[${index}].${key}`,
                message: "must be a non-empty string",
            })
        }

        return value
    }

    /**
     * Reads optional weight value.
     *
     * @param record Input record.
     * @param index Item index.
     * @param fields Validation errors list.
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

    /**
     * Reads and validates slug field.
     *
     * @param record Input record.
     * @param index Item index.
     * @param fields Validation errors list.
     * @returns Slug value or undefined.
     */
    private readSlug(
        record: Record<string, unknown>,
        index: number,
        fields: IValidationErrorField[],
    ): string | undefined {
        const slug = this.readNonEmptyText(record["slug"])
        if (slug === undefined) {
            fields.push({
                field: `items[${index}].slug`,
                message: "must be a non-empty string",
            })
            return undefined
        }

        if (ImportDefaultRuleCategoriesUseCase.SLUG_PATTERN.test(slug) === false) {
            fields.push({
                field: `items[${index}].slug`,
                message: "must be kebab-case",
            })
            return undefined
        }

        return slug
    }

    /**
     * Reads and normalizes non-empty text.
     *
     * @param value Raw value.
     * @returns Trimmed string or undefined.
     */
    private readNonEmptyText(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Valid kebab-case slug matcher.
     */
    private static readonly SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
}
