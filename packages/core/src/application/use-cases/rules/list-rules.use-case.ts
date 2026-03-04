import {
    LIBRARY_RULE_SCOPE,
    type LibraryRule,
    type LibraryRuleScope,
} from "../../../domain/entities/library-rule.entity"
import {Severity, type SeverityLevel} from "../../../domain/value-objects/severity.value-object"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {type ILibraryRuleFilters} from "../../ports/outbound/rule/library-rule-repository.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {IListRulesInput, IListRulesOutput} from "../../dto/rules/list-rules.dto"
import {Result} from "../../../shared/result"
import type {IListRulesDefaults} from "../../dto/config/system-defaults.dto"

const MAX_LIMIT = 100

interface INormalizedListRulesInput {
    readonly language?: string
    readonly category?: string
    readonly severity?: SeverityLevel
    readonly scope?: LibraryRuleScope
    readonly page: number
    readonly limit: number
}

/**
 * Use case for searching and paginating library rules.
 */
export class ListRulesUseCase implements
    IUseCase<IListRulesInput, IListRulesOutput, ValidationError>
{
    private readonly ruleRepository: ILibraryRuleRepository
    private readonly defaults: IListRulesDefaults

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: {
        readonly ruleRepository: ILibraryRuleRepository
        readonly defaults: IListRulesDefaults
    }) {
        this.ruleRepository = dependencies.ruleRepository
        this.defaults = dependencies.defaults
    }

    /**
     * Возвращает отсортированный и отфильтрованный список правил из библиотеки.
     *
     * @param input Raw input payload.
     * @returns Paginated rules + total matching count.
     */
    public async execute(
        input: IListRulesInput,
    ): Promise<Result<IListRulesOutput, ValidationError>> {
        const normalizedInputResult = this.validateAndNormalizeInput(input)
        if (normalizedInputResult.isFail) {
            return Result.fail<IListRulesOutput, ValidationError>(normalizedInputResult.error)
        }

        const normalizedInput = normalizedInputResult.value
        const filters = this.createFilters(normalizedInput)
        const candidates = await this.findCandidates(normalizedInput)
        const matched = this.filterRules(candidates, normalizedInput)
        const sorted = this.sortRules(matched)
        const rules = this.applyPagination(sorted, normalizedInput.page, normalizedInput.limit)
        const total = await this.ruleRepository.count(filters)

        return Result.ok<IListRulesOutput, ValidationError>({
            rules,
            total,
        })
    }

    /**
     * Normalizes input and returns validation result.
     *
     * @param input Raw payload.
     * @returns Normalized payload or validation errors.
     */
    private validateAndNormalizeInput(
        input: IListRulesInput,
    ): Result<INormalizedListRulesInput, ValidationError> {
        const fields: IValidationErrorField[] = []
        const category = this.normalizeCategory(input.category)
        const language = this.normalizeLanguage(input.language)
        const severity = this.normalizeSeverity(input.severity)
        const scope = this.normalizeScope(input.scope)
        const page = this.normalizePositiveInteger(input.page, this.defaults.page, "page")
        const limit = this.normalizePositiveInteger(input.limit, this.defaults.limit, "limit")

        this.collectError(fields, category.error, "category")
        this.collectError(fields, language.error, "language")
        this.collectError(fields, severity.error, "severity")
        this.collectError(fields, scope.error, "scope")
        this.collectError(fields, page.error, "page")
        this.collectError(fields, limit.error, "limit")

        if (fields.length > 0) {
            return Result.fail<INormalizedListRulesInput, ValidationError>(
                new ValidationError("List rules validation failed", fields),
            )
        }

        return Result.ok<INormalizedListRulesInput, ValidationError>({
            category: category.value,
            language: language.value,
            severity: severity.value,
            scope: scope.value,
            page: page.value,
            limit: limit.value,
        })
    }

    /**
     * Добавляет поле ошибки в список если ошибка существует.
     *
     * @param fields Общий список ошибок.
     * @param error Потенциальная ошибка поля.
     * @param fallbackField Поле по умолчанию, если сообщение приходит без поля.
     */
    private collectError(
        fields: IValidationErrorField[],
        error: IValidationErrorField | undefined,
        fallbackField: string,
    ): void {
        if (error === undefined) {
            return
        }

        fields.push({
            field: error.field.length === 0 ? fallbackField : error.field,
            message: error.message,
        })
    }

    /**
     * Creates repository filter object from normalized use-case input.
     *
     * @param input Normalized list filters.
     * @returns Repository-compatible filters.
     */
    private createFilters(input: INormalizedListRulesInput): ILibraryRuleFilters {
        return {
            language: input.language,
            category: input.category,
            severity: input.severity,
            scope: input.scope,
            isGlobal: true,
        }
    }

    /**
     * Normalizes optional category filter.
     *
     * @param category Raw category.
     * @returns Normalized category and optional validation error.
     */
    private normalizeCategory(
        category: unknown,
    ): {readonly value?: string; readonly error?: IValidationErrorField} {
        if (category === undefined) {
            return {value: undefined}
        }

        if (typeof category !== "string") {
            return {error: {field: "category", message: "must be a non-empty string"}}
        }

        const normalized = category.trim()
        if (normalized.length === 0) {
            return {error: {field: "category", message: "must be a non-empty string"}}
        }

        return {value: normalized.toLowerCase()}
    }

    /**
     * Normalizes optional language filter.
     *
     * @param language Raw language.
     * @returns Normalized language and optional validation error.
     */
    private normalizeLanguage(
        language: unknown,
    ): {readonly value?: string; readonly error?: IValidationErrorField} {
        if (language === undefined) {
            return {value: undefined}
        }

        if (typeof language !== "string") {
            return {error: {field: "language", message: "must be a non-empty string"}}
        }

        const normalized = language.trim()
        if (normalized.length === 0) {
            return {error: {field: "language", message: "must be a non-empty string"}}
        }

        if (normalized === "*") {
            return {value: undefined}
        }

        return {value: normalized.toLowerCase()}
    }

    /**
     * Normalizes optional severity filter.
     *
     * @param severity Raw severity value.
     * @returns Normalized severity and optional validation error.
     */
    private normalizeSeverity(
        severity: unknown,
    ): {readonly value?: SeverityLevel; readonly error?: IValidationErrorField} {
        if (severity === undefined) {
            return {value: undefined}
        }

        if (typeof severity !== "string") {
            return {error: {field: "severity", message: "must be a known severity level"}}
        }

        try {
            return {value: Severity.create(severity).toString()}
        } catch (error: unknown) {
            const fallbackMessage = error instanceof Error
                ? error.message
                : "must be a known severity level"

            return {
                error: {
                    field: "severity",
                    message: fallbackMessage,
                },
            }
        }
    }

    /**
     * Normalizes optional scope filter.
     *
     * @param scope Raw scope value.
     * @returns Normalized scope and optional validation error.
     */
    private normalizeScope(
        scope: unknown,
    ): {readonly value?: LibraryRuleScope; readonly error?: IValidationErrorField} {
        if (scope === undefined) {
            return {value: undefined}
        }

        if (typeof scope !== "string") {
            return {error: {field: "scope", message: "must be FILE or PULL_REQUEST"}}
        }

        const normalized = scope.trim().toUpperCase()
        if (
            Object.values(LIBRARY_RULE_SCOPE).includes(normalized as LibraryRuleScope) === false
        ) {
            return {error: {field: "scope", message: "must be FILE or PULL_REQUEST"}}
        }

        return {value: normalized as LibraryRuleScope}
    }

    /**
     * Normalizes optional positive integer pagination option.
     *
     * @param value Raw value.
     * @param fallback Default value.
     * @param fieldName Field name.
     * @returns Normalized value and optional validation error.
     */
    private normalizePositiveInteger(
        value: unknown,
        fallback: number,
        fieldName: "page" | "limit",
    ): {readonly value: number; readonly error?: IValidationErrorField} {
        if (value === undefined) {
            return {value: fallback}
        }

        if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
            return {
                value: fallback,
                error: {field: fieldName, message: `${fieldName} must be a positive integer`},
            }
        }

        if (fieldName === "limit" && value > MAX_LIMIT) {
            return {
                value: MAX_LIMIT,
                error: {
                    field: "limit",
                    message: `limit must be at most ${MAX_LIMIT}`,
                },
            }
        }

        return {value}
    }

    /**
     * Loads candidate rules through repository methods by cheapest index.
     *
     * @param input Normalized filters.
     * @returns Candidate rules.
     */
    private async findCandidates(input: INormalizedListRulesInput): Promise<readonly LibraryRule[]> {
        if (input.category !== undefined) {
            return this.ruleRepository.findByCategory(input.category)
        }

        if (input.language !== undefined) {
            return this.ruleRepository.findByLanguage(input.language)
        }

        return this.ruleRepository.findGlobal()
    }

    /**
     * Filters candidates by all requested criteria.
     *
     * @param rules Candidate rules.
     * @param input Normalized filters.
     * @returns Rules after full filtering.
     */
    private filterRules(
        rules: readonly LibraryRule[],
        input: INormalizedListRulesInput,
    ): readonly LibraryRule[] {
        return rules.filter((rule) => {
            if (rule.isGlobal === false) {
                return false
            }

            if (input.language !== undefined && rule.language !== input.language) {
                return false
            }

            if (
                input.category !== undefined &&
                rule.buckets.some((bucket) => bucket.toLowerCase() === input.category) === false
            ) {
                return false
            }

            if (input.scope !== undefined && rule.scope !== input.scope) {
                return false
            }

            if (input.severity !== undefined && rule.severity.toString() !== input.severity) {
                return false
            }

            return true
        })
    }

    /**
     * Sorts rules by title for stable UI output.
     *
     * @param rules Filtered rules.
     * @returns Sorted copy.
     */
    private sortRules(rules: readonly LibraryRule[]): readonly LibraryRule[] {
        return [...rules].sort((left, right) => {
            return left.title.localeCompare(right.title)
        })
    }

    /**
     * Applies pagination.
     *
     * @param rules Matched rules.
     * @param page Number from 1.
     * @param limit Max items per page.
     * @returns Paginated list.
     */
    private applyPagination(
        rules: readonly LibraryRule[],
        page: number,
        limit: number,
    ): readonly LibraryRule[] {
        const offset = (page - 1) * limit
        return rules.slice(offset, offset + limit)
    }
}
