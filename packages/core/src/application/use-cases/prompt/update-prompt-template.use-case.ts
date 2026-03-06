import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import {PromptTemplateFactory} from "../../../domain/factories/prompt-template.factory"
import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
    type PromptTemplate,
} from "../../../domain/entities/prompt-template.entity"
import {PromptEngineService} from "../../../domain/services/prompt-engine.service"
import {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import {UniqueId} from "../../../domain/value-objects/unique-id.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {
    type IUpdatePromptTemplateInput,
    type IUpdatePromptTemplateOutput,
    mapPromptTemplateToDTO,
} from "../../dto/prompt/prompt-template.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for prompt template update.
 */
export interface IUpdatePromptTemplateUseCaseDependencies {
    readonly promptTemplateRepository: IPromptTemplateRepository
    readonly promptTemplateFactory: PromptTemplateFactory
    readonly promptEngineService: PromptEngineService
}

/**
 * Updates existing prompt templates for admin API.
 */
export class UpdatePromptTemplateUseCase
    implements IUseCase<IUpdatePromptTemplateInput, IUpdatePromptTemplateOutput, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository
    private readonly promptTemplateFactory: PromptTemplateFactory
    private readonly promptEngineService: PromptEngineService

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IUpdatePromptTemplateUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
        this.promptTemplateFactory = dependencies.promptTemplateFactory
        this.promptEngineService = dependencies.promptEngineService
    }

    /**
     * Updates existing prompt template.
     *
     * @param input Update payload.
     * @returns Updated template DTO.
     */
    public async execute(
        input: IUpdatePromptTemplateInput,
    ): Promise<Result<IUpdatePromptTemplateOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template update validation failed", fields),
            )
        }

        const id = UniqueId.create(input.templateId.trim())
        const existing = await this.promptTemplateRepository.findById(id)
        if (existing === null) {
            return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "templateId",
                        message: "template not found",
                    },
                ]),
            )
        }

        const nextState = this.resolveNextState(existing, input)
        if (nextState.isFail) {
            return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(nextState.error)
        }

        const contentValidation = this.promptEngineService.validate(nextState.value.content)
        if (contentValidation.isFail) {
            return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(
                this.mapTemplateValidationError(contentValidation.error),
            )
        }

        const conflict = await this.findConflict(existing, nextState.value)
        if (conflict) {
            return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "name",
                        message: "template with the same name already exists in scope",
                    },
                ]),
            )
        }

        try {
            const template = this.promptTemplateFactory.reconstitute({
                id: existing.id.value,
                name: nextState.value.name,
                category: nextState.value.category,
                type: nextState.value.type,
                content: nextState.value.content,
                variables: nextState.value.variables.map((variable) => ({name: variable})),
                version: nextState.value.version,
                isGlobal: nextState.value.isGlobal,
                organizationId: nextState.value.organizationId,
            })

            await this.promptTemplateRepository.save(template)

            return Result.ok<IUpdatePromptTemplateOutput, ValidationError>({
                template: mapPromptTemplateToDTO(template),
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<IUpdatePromptTemplateOutput, ValidationError>(
                    new ValidationError("Prompt template update validation failed", [
                        {
                            field: "template",
                            message: error.message,
                        },
                    ]),
                )
            }

            throw error
        }
    }

    private validateInput(input: IUpdatePromptTemplateInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []
        fields.push(...this.validateRequiredString("templateId", input.templateId))

        if (!this.hasUpdateFields(input)) {
            fields.push({
                field: "template",
                message: "at least one field must be provided",
            })
            return fields
        }

        fields.push(...this.validateOptionalString("name", input.name))
        fields.push(...this.validateOptionalString("category", input.category))
        fields.push(...this.validateOptionalString("type", input.type))
        fields.push(...this.validateOptionalString("content", input.content))

        const variablesValidation = this.validateOptionalVariables(input.variables)
        if (variablesValidation !== undefined) {
            fields.push(variablesValidation)
        }

        const booleanValidation = this.validateOptionalBoolean("isGlobal", input.isGlobal)
        if (booleanValidation !== undefined) {
            fields.push(booleanValidation)
        }

        fields.push(...this.validateOptionalOrganizationId(input.organizationId))

        const versionValidation = this.validateVersion(input.version)
        if (versionValidation !== undefined) {
            fields.push(versionValidation)
        }

        return fields
    }

    private resolveNextState(
        existing: PromptTemplate,
        input: IUpdatePromptTemplateInput,
    ): Result<{
        readonly name: string
        readonly category: PromptTemplateCategory
        readonly type: PromptTemplateType
        readonly content: string
        readonly variables: readonly string[]
        readonly version: number
        readonly isGlobal: boolean
        readonly organizationId?: string | null
    }, ValidationError> {
        const name = this.resolveName(existing.name, input.name)
        const categoryResult = this.resolveCategory(existing.category, input.category)
        if (categoryResult.isFail) {
            return Result.fail(categoryResult.error)
        }

        const typeResult = this.resolveType(existing.type, input.type)
        if (typeResult.isFail) {
            return Result.fail(typeResult.error)
        }

        const content = this.resolveContent(existing.content, input.content)
        const variablesResult = this.resolveVariables(input.variables, content)
        if (variablesResult.isFail) {
            return Result.fail(variablesResult.error)
        }

        const scopeResult = this.resolveScope(existing, input.isGlobal, input.organizationId)
        if (scopeResult.isFail) {
            return Result.fail(scopeResult.error)
        }

        const version = this.resolveVersion(existing.version, input.version)

        return Result.ok({
            name,
            category: categoryResult.value,
            type: typeResult.value,
            content,
            variables: variablesResult.value,
            version,
            isGlobal: scopeResult.value.isGlobal,
            organizationId: scopeResult.value.organizationId,
        })
    }

    private normalizeCategory(value: string): PromptTemplateCategory | undefined {
        const normalized = value.trim().toLowerCase()
        if (
            Object.values(PROMPT_TEMPLATE_CATEGORY).includes(
                normalized as PromptTemplateCategory,
            ) === false
        ) {
            return undefined
        }

        return normalized as PromptTemplateCategory
    }

    private normalizeType(value: string): PromptTemplateType | undefined {
        const normalized = value.trim().toLowerCase()
        if (
            Object.values(PROMPT_TEMPLATE_TYPE).includes(
                normalized as PromptTemplateType,
            ) === false
        ) {
            return undefined
        }

        return normalized as PromptTemplateType
    }

    private resolveScope(
        existing: PromptTemplate,
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        const resolvedIsGlobal = this.resolveIsGlobal(existing.isGlobal, isGlobal, organizationId)
        const resolvedOrganizationId = this.resolveOrganizationId(
            existing.organizationId?.value ?? null,
            organizationId,
        )

        if (resolvedIsGlobal) {
            return this.resolveGlobalScope(resolvedOrganizationId)
        }

        return this.resolveOrganizationScope(resolvedOrganizationId)
    }

    private resolveVariables(
        variables: readonly string[] | undefined,
        content: string,
    ): Result<readonly string[], ValidationError> {
        if (variables === undefined) {
            return Result.ok(this.promptEngineService.extractVariables(content))
        }

        const normalized: string[] = []
        const seen = new Set<string>()
        for (const entry of variables) {
            if (typeof entry !== "string" || entry.trim().length === 0) {
                return Result.fail(
                    new ValidationError("Prompt template update validation failed", [
                        {
                            field: "variables",
                            message: "variables must be an array of non-empty strings",
                        },
                    ]),
                )
            }

            const value = entry.trim()
            if (!seen.has(value)) {
                seen.add(value)
                normalized.push(value)
            }
        }

        return Result.ok(Object.freeze(normalized))
    }

    private validateVariables(value: readonly string[]): IValidationErrorField | undefined {
        if (!Array.isArray(value)) {
            return {
                field: "variables",
                message: "variables must be an array of strings",
            }
        }

        for (const entry of value) {
            if (typeof entry !== "string" || entry.trim().length === 0) {
                return {
                    field: "variables",
                    message: "variables must be an array of non-empty strings",
                }
            }
        }

        return undefined
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
    ): IValidationErrorField | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "boolean") {
            return {
                field,
                message: "must be a boolean",
            }
        }

        return undefined
    }

    private validateOptionalOrganizationId(
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

    private validateOptionalVariables(
        variables: readonly string[] | undefined,
    ): IValidationErrorField | undefined {
        if (variables === undefined) {
            return undefined
        }

        return this.validateVariables(variables)
    }

    private validateVersion(version: number | undefined): IValidationErrorField | undefined {
        if (version === undefined) {
            return undefined
        }

        if (!Number.isInteger(version) || version < 1) {
            return {
                field: "version",
                message: "must be a positive integer",
            }
        }

        return undefined
    }

    private hasUpdateFields(input: IUpdatePromptTemplateInput): boolean {
        return (
            input.name !== undefined
            || input.category !== undefined
            || input.type !== undefined
            || input.content !== undefined
            || input.variables !== undefined
            || input.isGlobal !== undefined
            || input.organizationId !== undefined
            || input.version !== undefined
        )
    }

    private resolveName(existing: string, incoming?: string): string {
        return incoming?.trim() ?? existing
    }

    private resolveCategory(
        existing: PromptTemplateCategory,
        incoming?: string,
    ): Result<PromptTemplateCategory, ValidationError> {
        if (incoming === undefined) {
            return Result.ok(existing)
        }

        const normalized = this.normalizeCategory(incoming)
        if (normalized === undefined) {
            return Result.fail(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "category",
                        message: "must be a supported category",
                    },
                ]),
            )
        }

        return Result.ok(normalized)
    }

    private resolveType(
        existing: PromptTemplateType,
        incoming?: string,
    ): Result<PromptTemplateType, ValidationError> {
        if (incoming === undefined) {
            return Result.ok(existing)
        }

        const normalized = this.normalizeType(incoming)
        if (normalized === undefined) {
            return Result.fail(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "type",
                        message: "must be a supported type",
                    },
                ]),
            )
        }

        return Result.ok(normalized)
    }

    private resolveContent(existing: string, incoming?: string): string {
        return incoming?.trim() ?? existing
    }

    private resolveVersion(existing: number, incoming?: number): number {
        return incoming ?? existing
    }

    private resolveIsGlobal(
        currentIsGlobal: boolean,
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): boolean {
        if (isGlobal !== undefined) {
            return isGlobal
        }

        if (organizationId !== undefined) {
            return false
        }

        return currentIsGlobal
    }

    private resolveOrganizationId(
        currentOrganizationId: string | null,
        organizationId: string | null | undefined,
    ): string | null {
        if (organizationId !== undefined) {
            return organizationId
        }

        return currentOrganizationId
    }

    private resolveGlobalScope(
        organizationId: string | null,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        if (organizationId !== null) {
            return Result.fail(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "organizationId",
                        message: "global template cannot have organizationId",
                    },
                ]),
            )
        }

        return Result.ok({
            isGlobal: true,
            organizationId: undefined,
        })
    }

    private resolveOrganizationScope(
        organizationId: string | null,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        if (organizationId === null) {
            return Result.fail(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "organizationId",
                        message: "organizationId is required for non-global templates",
                    },
                ]),
            )
        }

        try {
            OrganizationId.create(organizationId)
        } catch (error: unknown) {
            return Result.fail(
                new ValidationError("Prompt template update validation failed", [
                    {
                        field: "organizationId",
                        message: error instanceof Error ? error.message : "organizationId is invalid",
                    },
                ]),
            )
        }

        return Result.ok({
            isGlobal: false,
            organizationId,
        })
    }

    private mapTemplateValidationError(error: ValidationError): ValidationError {
        return new ValidationError("Prompt template update validation failed", error.fields.map((field) => {
            return {
                field: field.field === "template" ? "content" : field.field,
                message: field.message,
            }
        }))
    }

    private async findConflict(
        existing: PromptTemplate,
        nextState: {readonly name: string; readonly isGlobal: boolean; readonly organizationId?: string | null},
    ): Promise<boolean> {
        const templates = await this.promptTemplateRepository.findAll()
        const normalizedName = nextState.name.trim().toLowerCase()

        return templates.some((template) => {
            if (template.id.value === existing.id.value) {
                return false
            }

            if (template.name.toLowerCase() !== normalizedName) {
                return false
            }

            if (nextState.isGlobal) {
                return template.isGlobal
            }

            if (template.isGlobal) {
                return false
            }

            return template.organizationId?.value === nextState.organizationId
        })
    }
}
