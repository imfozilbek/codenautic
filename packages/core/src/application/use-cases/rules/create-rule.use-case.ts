import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {LibraryRuleFactory} from "../../../domain/factories/library-rule.factory"
import {LIBRARY_RULE_SCOPE, type LibraryRuleScope} from "../../../domain/entities/library-rule.entity"
import {Severity} from "../../../domain/value-objects/severity.value-object"
import {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import {
    type ICreateLibraryRuleInput,
    type ICreateLibraryRuleOutput,
    mapLibraryRuleToDTO,
} from "../../dto/rules/library-rule.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for library rule creation.
 */
export interface ICreateRuleUseCaseDependencies {
    readonly libraryRuleRepository: ILibraryRuleRepository
    readonly libraryRuleFactory: LibraryRuleFactory
}

/**
 * Creates library rules for admin API.
 */
export class CreateRuleUseCase
    implements IUseCase<ICreateLibraryRuleInput, ICreateLibraryRuleOutput, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly libraryRuleFactory: LibraryRuleFactory

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: ICreateRuleUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.libraryRuleFactory = dependencies.libraryRuleFactory
    }

    /**
     * Creates new library rule.
     *
     * @param input Request payload.
     * @returns Created rule DTO.
     */
    public async execute(
        input: ICreateLibraryRuleInput,
    ): Promise<Result<ICreateLibraryRuleOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<ICreateLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule creation validation failed", fields),
            )
        }

        const normalized = this.normalizeInput(input)
        const existing = await this.libraryRuleRepository.findByUuid(normalized.uuid)
        if (existing !== null) {
            return Result.fail<ICreateLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule creation validation failed", [
                    {
                        field: "uuid",
                        message: "rule with the same uuid already exists",
                    },
                ]),
            )
        }

        try {
            const rule = this.libraryRuleFactory.create({
                uuid: normalized.uuid,
                title: normalized.title,
                rule: normalized.rule,
                whyIsThisImportant: normalized.whyIsThisImportant,
                severity: normalized.severity,
                examples: normalized.examples,
                language: normalized.language,
                buckets: normalized.buckets,
                scope: normalized.scope,
                plugAndPlay: normalized.plugAndPlay,
                isGlobal: normalized.isGlobal,
                organizationId: normalized.organizationId ?? undefined,
            })

            await this.libraryRuleRepository.save(rule)

            return Result.ok<ICreateLibraryRuleOutput, ValidationError>({
                rule: mapLibraryRuleToDTO(rule),
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<ICreateLibraryRuleOutput, ValidationError>(
                    this.mapFactoryError(error, "Library rule creation validation failed"),
                )
            }

            throw error
        }
    }

    private validateInput(input: ICreateLibraryRuleInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []
        fields.push(...this.validateRequiredString("uuid", input.uuid))
        fields.push(...this.validateRequiredString("title", input.title))
        fields.push(...this.validateRequiredString("rule", input.rule))
        fields.push(...this.validateRequiredString("whyIsThisImportant", input.whyIsThisImportant))
        fields.push(...this.validateRequiredBuckets(input.buckets))
        fields.push(...this.validateOptionalString("language", input.language))
        fields.push(...this.validateOptionalBoolean("plugAndPlay", input.plugAndPlay))

        const scopeValidation = this.validateScope(input.scope)
        if (scopeValidation !== undefined) {
            fields.push(scopeValidation)
        }

        const severityValidation = this.validateSeverity(input.severity)
        if (severityValidation !== undefined) {
            fields.push(severityValidation)
        }

        fields.push(...this.validateScopeInput(input.isGlobal, input.organizationId))
        fields.push(...this.validateExamples(input.examples))

        return fields
    }

    private normalizeInput(input: ICreateLibraryRuleInput): {
        readonly uuid: string
        readonly title: string
        readonly rule: string
        readonly whyIsThisImportant: string
        readonly severity: string
        readonly examples: readonly {readonly snippet: string; readonly isCorrect: boolean}[]
        readonly language?: string
        readonly buckets: readonly string[]
        readonly scope: LibraryRuleScope
        readonly plugAndPlay?: boolean
        readonly isGlobal: boolean
        readonly organizationId: string | null | undefined
    } {
        const resolvedScope = this.resolveScope(input.isGlobal, input.organizationId)
        return {
            uuid: input.uuid.trim(),
            title: input.title.trim(),
            rule: input.rule.trim(),
            whyIsThisImportant: input.whyIsThisImportant.trim(),
            severity: input.severity.trim(),
            examples: this.normalizeExamples(input.examples),
            language: input.language?.trim(),
            buckets: this.normalizeBuckets(input.buckets),
            scope: this.normalizeScope(input.scope),
            plugAndPlay: input.plugAndPlay,
            isGlobal: resolvedScope.isGlobal,
            organizationId: resolvedScope.organizationId,
        }
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

    private validateRequiredBuckets(value: readonly string[]): IValidationErrorField[] {
        if (!Array.isArray(value)) {
            return [
                {
                    field: "buckets",
                    message: "must be an array of non-empty strings",
                },
            ]
        }

        if (value.length === 0) {
            return [
                {
                    field: "buckets",
                    message: "must include at least one bucket",
                },
            ]
        }

        for (const bucket of value) {
            if (typeof bucket !== "string" || bucket.trim().length === 0) {
                return [
                    {
                        field: "buckets",
                        message: "must be an array of non-empty strings",
                    },
                ]
            }
        }

        return []
    }

    private validateExamples(
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

    private validateScope(scope: string): IValidationErrorField | undefined {
        if (typeof scope !== "string" || scope.trim().length === 0) {
            return {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            }
        }

        const normalized = scope.trim().toUpperCase()
        if (Object.values(LIBRARY_RULE_SCOPE).includes(normalized as LibraryRuleScope) === false) {
            return {
                field: "scope",
                message: "must be FILE or PULL_REQUEST",
            }
        }

        return undefined
    }

    private validateSeverity(value: string): IValidationErrorField | undefined {
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
        fields.push(...this.validateOptionalBooleanField("isGlobal", isGlobal))
        fields.push(...this.validateOptionalOrganizationIdType(organizationId))
        fields.push(...this.validateScopeConsistency(isGlobal, organizationId))
        fields.push(...this.validateOrganizationIdFormat(organizationId))

        return fields
    }

    private resolveScope(
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): {readonly isGlobal: boolean; readonly organizationId: string | null | undefined} {
        if (isGlobal !== undefined) {
            return {
                isGlobal,
                organizationId,
            }
        }

        if (organizationId !== undefined) {
            return {
                isGlobal: false,
                organizationId,
            }
        }

        return {
            isGlobal: true,
            organizationId,
        }
    }

    private validateOptionalBooleanField(
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

    private validateOptionalOrganizationIdType(
        organizationId: string | null | undefined,
    ): IValidationErrorField[] {
        if (organizationId === undefined || organizationId === null) {
            return []
        }

        if (typeof organizationId !== "string" || organizationId.trim().length === 0) {
            return [
                {
                    field: "organizationId",
                    message: "must be null or a non-empty string",
                },
            ]
        }

        return []
    }

    private validateScopeConsistency(
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): IValidationErrorField[] {
        const scope = this.resolveScope(isGlobal, organizationId)
        if (scope.isGlobal && scope.organizationId !== undefined && scope.organizationId !== null) {
            return [
                {
                    field: "organizationId",
                    message: "global rule cannot have organizationId",
                },
            ]
        }

        if (!scope.isGlobal && (scope.organizationId === undefined || scope.organizationId === null)) {
            return [
                {
                    field: "organizationId",
                    message: "organizationId is required for non-global rules",
                },
            ]
        }

        return []
    }

    private validateOrganizationIdFormat(
        organizationId: string | null | undefined,
    ): IValidationErrorField[] {
        if (organizationId === undefined || organizationId === null) {
            return []
        }

        try {
            OrganizationId.create(organizationId)
        } catch (error: unknown) {
            return [
                {
                    field: "organizationId",
                    message: error instanceof Error ? error.message : "organizationId is invalid",
                },
            ]
        }

        return []
    }

    private normalizeScope(scope: string): LibraryRuleScope {
        return scope.trim().toUpperCase() as LibraryRuleScope
    }

    private normalizeBuckets(buckets: readonly string[]): readonly string[] {
        const normalized: string[] = []
        const seen = new Set<string>()

        for (const bucket of buckets) {
            const trimmed = bucket.trim()
            if (!seen.has(trimmed)) {
                seen.add(trimmed)
                normalized.push(trimmed)
            }
        }

        return Object.freeze(normalized)
    }

    private normalizeExamples(
        examples: readonly {readonly snippet: string; readonly isCorrect: boolean}[] | undefined,
    ): readonly {readonly snippet: string; readonly isCorrect: boolean}[] {
        if (examples === undefined) {
            return []
        }

        return examples.map((example) => {
            return {
                snippet: example.snippet.trim(),
                isCorrect: example.isCorrect,
            }
        })
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
            return "uuid"
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
