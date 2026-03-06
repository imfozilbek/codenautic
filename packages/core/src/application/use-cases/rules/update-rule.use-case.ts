import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {LibraryRuleFactory} from "../../../domain/factories/library-rule.factory"
import {LIBRARY_RULE_SCOPE, type LibraryRuleScope} from "../../../domain/entities/library-rule.entity"
import {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import {Severity} from "../../../domain/value-objects/severity.value-object"
import type {LibraryRule} from "../../../domain/entities/library-rule.entity"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import {
    type IUpdateLibraryRuleInput,
    type IUpdateLibraryRuleOutput,
    mapLibraryRuleToDTO,
} from "../../dto/rules/library-rule.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for library rule update.
 */
export interface IUpdateRuleUseCaseDependencies {
    readonly libraryRuleRepository: ILibraryRuleRepository
    readonly libraryRuleFactory: LibraryRuleFactory
}

/**
 * Updates library rules for admin API.
 */
export class UpdateRuleUseCase
    implements IUseCase<IUpdateLibraryRuleInput, IUpdateLibraryRuleOutput, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly libraryRuleFactory: LibraryRuleFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IUpdateRuleUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.libraryRuleFactory = dependencies.libraryRuleFactory
    }

    /**
     * Updates existing library rule.
     *
     * @param input Request payload.
     * @returns Updated rule DTO.
     */
    public async execute(
        input: IUpdateLibraryRuleInput,
    ): Promise<Result<IUpdateLibraryRuleOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IUpdateLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule update validation failed", fields),
            )
        }

        const existing = await this.libraryRuleRepository.findByUuid(input.ruleUuid.trim())
        if (existing === null) {
            return Result.fail<IUpdateLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule update validation failed", [
                    {
                        field: "ruleUuid",
                        message: "rule not found",
                    },
                ]),
            )
        }

        const nextState = this.resolveNextState(existing, input)
        if (nextState.isFail) {
            return Result.fail<IUpdateLibraryRuleOutput, ValidationError>(nextState.error)
        }

        try {
            const rule = this.libraryRuleFactory.reconstitute({
                uuid: existing.uuid,
                title: nextState.value.title,
                rule: nextState.value.rule,
                whyIsThisImportant: nextState.value.whyIsThisImportant,
                severity: nextState.value.severity,
                examples: nextState.value.examples,
                language: nextState.value.language,
                buckets: nextState.value.buckets,
                scope: nextState.value.scope,
                plugAndPlay: nextState.value.plugAndPlay,
                isGlobal: nextState.value.isGlobal,
                organizationId: nextState.value.organizationId ?? undefined,
            })

            await this.libraryRuleRepository.save(rule)

            return Result.ok<IUpdateLibraryRuleOutput, ValidationError>({
                rule: mapLibraryRuleToDTO(rule),
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<IUpdateLibraryRuleOutput, ValidationError>(
                    this.mapFactoryError(error, "Library rule update validation failed"),
                )
            }

            throw error
        }
    }

    private validateInput(input: IUpdateLibraryRuleInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []
        fields.push(...this.validateRequiredString("ruleUuid", input.ruleUuid))

        if (!this.hasUpdateFields(input)) {
            fields.push({
                field: "rule",
                message: "at least one field must be provided",
            })
            return fields
        }

        fields.push(...this.validateOptionalString("title", input.title))
        fields.push(...this.validateOptionalString("rule", input.rule))
        fields.push(...this.validateOptionalString("whyIsThisImportant", input.whyIsThisImportant))
        fields.push(...this.validateOptionalString("language", input.language))
        fields.push(...this.validateOptionalBuckets(input.buckets))
        fields.push(...this.validateOptionalBoolean("plugAndPlay", input.plugAndPlay))

        const scopeValidation = this.validateOptionalScope(input.scope)
        if (scopeValidation !== undefined) {
            fields.push(scopeValidation)
        }

        const severityValidation = this.validateOptionalSeverity(input.severity)
        if (severityValidation !== undefined) {
            fields.push(severityValidation)
        }

        fields.push(...this.validateScopeInput(input.isGlobal, input.organizationId))
        fields.push(...this.validateOptionalExamples(input.examples))

        return fields
    }

    private resolveNextState(
        existing: LibraryRule,
        input: IUpdateLibraryRuleInput,
    ): Result<{
        readonly title: string
        readonly rule: string
        readonly whyIsThisImportant: string
        readonly severity: string
        readonly examples: readonly {readonly snippet: string; readonly isCorrect: boolean}[]
        readonly language: string
        readonly buckets: readonly string[]
        readonly scope: LibraryRuleScope
        readonly plugAndPlay: boolean
        readonly isGlobal: boolean
        readonly organizationId: string | null | undefined
    }, ValidationError> {
        const scopeResult = this.resolveScope(existing, input.isGlobal, input.organizationId)
        if (scopeResult.isFail) {
            return Result.fail(scopeResult.error)
        }

        return Result.ok({
            title: this.resolveString(existing.title, input.title),
            rule: this.resolveString(existing.rule, input.rule),
            whyIsThisImportant: this.resolveString(existing.whyIsThisImportant, input.whyIsThisImportant),
            severity: this.resolveSeverity(existing, input.severity),
            examples: this.resolveExamples(existing, input.examples),
            language: this.resolveLanguage(existing, input.language),
            buckets: this.resolveBuckets(existing, input.buckets),
            scope: this.resolveScopeValue(existing, input.scope),
            plugAndPlay: this.resolveBoolean(existing.plugAndPlay, input.plugAndPlay),
            isGlobal: scopeResult.value.isGlobal,
            organizationId: scopeResult.value.organizationId,
        })
    }

    private validateRequiredString(field: string, value: string): IValidationErrorField[] {
        if (typeof value !== "string" || value.trim().length === 0) {
            return [
                {
                    field,
                    message: "must be a non-empty string",
                },
            ]
        }

        return []
    }

    private validateOptionalString(field: string, value: string | undefined): IValidationErrorField[] {
        if (value === undefined) {
            return []
        }

        if (typeof value !== "string" || value.trim().length === 0) {
            return [
                {
                    field,
                    message: "must be a non-empty string",
                },
            ]
        }

        return []
    }

    private validateOptionalBoolean(
        field: string,
        value: boolean | undefined,
    ): IValidationErrorField[] {
        if (value === undefined) {
            return []
        }

        if (typeof value !== "boolean") {
            return [
                {
                    field,
                    message: "must be a boolean",
                },
            ]
        }

        return []
    }

    private validateOptionalBuckets(value: readonly string[] | undefined): IValidationErrorField[] {
        if (value === undefined) {
            return []
        }

        if (!Array.isArray(value) || value.length === 0) {
            return [
                {
                    field: "buckets",
                    message: "must be a non-empty array of strings",
                },
            ]
        }

        for (const bucket of value) {
            if (typeof bucket !== "string" || bucket.trim().length === 0) {
                return [
                    {
                        field: "buckets",
                        message: "must be a non-empty array of strings",
                    },
                ]
            }
        }

        return []
    }

    private validateOptionalExamples(
        examples: unknown,
    ): IValidationErrorField[] {
        if (examples === undefined) {
            return []
        }

        if (!Array.isArray(examples)) {
            return [
                {
                    field: "examples",
                    message: "must be an array",
                },
            ]
        }

        for (const example of examples) {
            if (example === null || typeof example !== "object") {
                return [
                    {
                        field: "examples",
                        message: "must contain objects with snippet and isCorrect",
                    },
                ]
            }

            const record = example as Record<string, unknown>
            if (typeof record.snippet !== "string" || record.snippet.trim().length === 0) {
                return [
                    {
                        field: "examples",
                        message: "snippet must be a non-empty string",
                    },
                ]
            }

            if (typeof record.isCorrect !== "boolean") {
                return [
                    {
                        field: "examples",
                        message: "isCorrect must be a boolean",
                    },
                ]
            }
        }

        return []
    }

    private validateOptionalScope(value: string | undefined): IValidationErrorField | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string" || value.trim().length === 0) {
            return {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            }
        }

        const normalized = value.trim().toUpperCase()
        if (Object.values(LIBRARY_RULE_SCOPE).includes(normalized as LibraryRuleScope) === false) {
            return {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            }
        }

        return undefined
    }

    private validateOptionalSeverity(value: string | undefined): IValidationErrorField | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string" || value.trim().length === 0) {
            return {
                field: "severity",
                message: "must be a known severity level",
            }
        }

        try {
            Severity.create(value)
        } catch (error: unknown) {
            return {
                field: "severity",
                message: error instanceof Error ? error.message : "must be a known severity level",
            }
        }

        return undefined
    }

    private validateScopeInput(
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (isGlobal !== undefined && typeof isGlobal !== "boolean") {
            fields.push({
                field: "isGlobal",
                message: "must be a boolean",
            })
        }

        if (organizationId !== undefined && organizationId !== null) {
            if (typeof organizationId !== "string" || organizationId.trim().length === 0) {
                fields.push({
                    field: "organizationId",
                    message: "must be null or a non-empty string",
                })
            }
        }

        return fields
    }

    private hasUpdateFields(input: IUpdateLibraryRuleInput): boolean {
        return [
            input.title,
            input.rule,
            input.whyIsThisImportant,
            input.severity,
            input.examples,
            input.language,
            input.buckets,
            input.scope,
            input.plugAndPlay,
            input.isGlobal,
            input.organizationId,
        ].some((value) => value !== undefined)
    }

    private resolveString(existing: string, incoming?: string): string {
        return incoming?.trim() ?? existing
    }

    private resolveSeverity(existing: LibraryRule, incoming?: string): string {
        if (incoming === undefined) {
            return existing.severity.toString()
        }

        return incoming.trim()
    }

    private resolveExamples(
        existing: LibraryRule,
        incoming?: readonly {readonly snippet: string; readonly isCorrect: boolean}[],
    ): readonly {readonly snippet: string; readonly isCorrect: boolean}[] {
        if (incoming === undefined) {
            return existing.examples.map((example) => {
                return {
                    snippet: example.snippet,
                    isCorrect: example.isCorrect,
                }
            })
        }

        return incoming.map((example) => {
            return {
                snippet: example.snippet.trim(),
                isCorrect: example.isCorrect,
            }
        })
    }

    private resolveLanguage(existing: LibraryRule, incoming?: string): string {
        if (incoming === undefined) {
            return existing.language
        }

        return incoming.trim()
    }

    private resolveBuckets(existing: LibraryRule, incoming?: readonly string[]): readonly string[] {
        if (incoming === undefined) {
            return existing.buckets
        }

        const normalized: string[] = []
        const seen = new Set<string>()
        for (const bucket of incoming) {
            const trimmed = bucket.trim()
            if (!seen.has(trimmed)) {
                seen.add(trimmed)
                normalized.push(trimmed)
            }
        }

        return Object.freeze(normalized)
    }

    private resolveScopeValue(existing: LibraryRule, incoming?: string): LibraryRuleScope {
        if (incoming === undefined) {
            return existing.scope
        }

        return incoming.trim().toUpperCase() as LibraryRuleScope
    }

    private resolveBoolean(existing: boolean, incoming?: boolean): boolean {
        return incoming ?? existing
    }

    private resolveScope(
        existing: LibraryRule,
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): Result<{readonly isGlobal: boolean; readonly organizationId: string | null | undefined}, ValidationError> {
        const resolved = this.normalizeScope(existing, isGlobal, organizationId)
        const consistencyError = this.validateScopeConsistency(resolved)
        if (consistencyError !== undefined) {
            return Result.fail(
                new ValidationError("Library rule update validation failed", [
                    consistencyError,
                ]),
            )
        }

        const formatError = this.validateOrganizationIdFormat(resolved.organizationId)
        if (formatError !== undefined) {
            return Result.fail(
                new ValidationError("Library rule update validation failed", [
                    formatError,
                ]),
            )
        }

        return Result.ok(resolved)
    }

    private normalizeScope(
        existing: LibraryRule,
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): {readonly isGlobal: boolean; readonly organizationId: string | null | undefined} {
        let resolvedIsGlobal = existing.isGlobal
        let resolvedOrganizationId = existing.organizationId?.value ?? null

        if (isGlobal !== undefined) {
            resolvedIsGlobal = isGlobal
        }

        if (organizationId !== undefined) {
            resolvedOrganizationId = organizationId
            if (isGlobal === undefined) {
                resolvedIsGlobal = false
            }
        }

        return {
            isGlobal: resolvedIsGlobal,
            organizationId: resolvedOrganizationId,
        }
    }

    private validateScopeConsistency(
        resolved: {readonly isGlobal: boolean; readonly organizationId: string | null | undefined},
    ): IValidationErrorField | undefined {
        if (resolved.isGlobal && resolved.organizationId !== undefined && resolved.organizationId !== null) {
            return {
                field: "organizationId",
                message: "global rule cannot have organizationId",
            }
        }

        if (!resolved.isGlobal && (resolved.organizationId === undefined || resolved.organizationId === null)) {
            return {
                field: "organizationId",
                message: "organizationId is required for non-global rules",
            }
        }

        return undefined
    }

    private validateOrganizationIdFormat(
        organizationId: string | null | undefined,
    ): IValidationErrorField | undefined {
        if (organizationId === undefined || organizationId === null) {
            return undefined
        }

        try {
            OrganizationId.create(organizationId)
        } catch (error: unknown) {
            return {
                field: "organizationId",
                message: error instanceof Error ? error.message : "organizationId is invalid",
            }
        }

        return undefined
    }

    private mapFactoryError(error: Error, message: string): ValidationError {
        return new ValidationError(message, [
            {
                field: this.resolveErrorField(error.message),
                message: error.message,
            },
        ])
    }

    private resolveErrorField(message: string): string {
        const normalized = message.toLowerCase()
        if (normalized.includes("uuid")) {
            return "ruleUuid"
        }
        if (normalized.includes("title")) {
            return "title"
        }
        if (normalized.includes("rule")) {
            return "rule"
        }
        if (normalized.includes("important")) {
            return "whyIsThisImportant"
        }
        if (normalized.includes("severity")) {
            return "severity"
        }
        if (normalized.includes("bucket")) {
            return "buckets"
        }
        if (normalized.includes("scope")) {
            return "scope"
        }
        if (normalized.includes("language")) {
            return "language"
        }
        if (normalized.includes("organization")) {
            return "organizationId"
        }

        return "rule"
    }
}
