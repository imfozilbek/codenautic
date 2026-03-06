import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import {PromptTemplateFactory} from "../../../domain/factories/prompt-template.factory"
import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateCategory,
    type PromptTemplateType,
} from "../../../domain/entities/prompt-template.entity"
import {PromptEngineService} from "../../../domain/services/prompt-engine.service"
import {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {
    type ICreatePromptTemplateInput,
    type ICreatePromptTemplateOutput,
    mapPromptTemplateToDTO,
} from "../../dto/prompt/prompt-template.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for prompt template creation.
 */
export interface ICreatePromptTemplateUseCaseDependencies {
    readonly promptTemplateRepository: IPromptTemplateRepository
    readonly promptTemplateFactory: PromptTemplateFactory
    readonly promptEngineService: PromptEngineService
}

/**
 * Creates prompt templates for admin API.
 */
export class CreatePromptTemplateUseCase
    implements IUseCase<ICreatePromptTemplateInput, ICreatePromptTemplateOutput, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository
    private readonly promptTemplateFactory: PromptTemplateFactory
    private readonly promptEngineService: PromptEngineService

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: ICreatePromptTemplateUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
        this.promptTemplateFactory = dependencies.promptTemplateFactory
        this.promptEngineService = dependencies.promptEngineService
    }

    /**
     * Creates new prompt template with validated payload.
     *
     * @param input Request payload.
     * @returns Created template DTO.
     */
    public async execute(
        input: ICreatePromptTemplateInput,
    ): Promise<Result<ICreatePromptTemplateOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<ICreatePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template creation validation failed", fields),
            )
        }

        const prepared = this.prepareTemplateInput(input)
        if (prepared.isFail) {
            return Result.fail<ICreatePromptTemplateOutput, ValidationError>(prepared.error)
        }

        const conflict = await this.findConflict(prepared.value.name, prepared.value.scope)
        if (conflict) {
            return Result.fail<ICreatePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template creation validation failed", [
                    {
                        field: "name",
                        message: "template with the same name already exists in scope",
                    },
                ]),
            )
        }

        try {
            const template = this.promptTemplateFactory.create({
                name: prepared.value.name,
                category: prepared.value.category,
                type: prepared.value.type,
                content: prepared.value.content,
                variables: prepared.value.variables.map((variable) => ({name: variable})),
                isGlobal: prepared.value.scope.isGlobal,
                organizationId: prepared.value.scope.organizationId,
            })

            await this.promptTemplateRepository.save(template)

            return Result.ok<ICreatePromptTemplateOutput, ValidationError>({
                template: mapPromptTemplateToDTO(template),
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<ICreatePromptTemplateOutput, ValidationError>(
                    new ValidationError("Prompt template creation validation failed", [
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

    private prepareTemplateInput(
        input: ICreatePromptTemplateInput,
    ): Result<{
        readonly name: string
        readonly category: PromptTemplateCategory
        readonly type: PromptTemplateType
        readonly content: string
        readonly variables: readonly string[]
        readonly scope: {readonly isGlobal: boolean; readonly organizationId?: string | null}
    }, ValidationError> {
        const name = input.name.trim()
        const category = this.normalizeCategory(input.category)
        const type = this.normalizeType(input.type)
        if (category === undefined || type === undefined) {
            return Result.fail(
                new ValidationError("Prompt template creation validation failed", [
                    ...(category === undefined ? [{
                        field: "category",
                        message: "must be a supported category",
                    }] : []),
                    ...(type === undefined ? [{
                        field: "type",
                        message: "must be a supported type",
                    }] : []),
                ]),
            )
        }

        const scopeResult = this.resolveScope(input.isGlobal, input.organizationId)
        if (scopeResult.isFail) {
            return Result.fail(scopeResult.error)
        }

        const content = input.content.trim()
        const contentValidation = this.promptEngineService.validate(content)
        if (contentValidation.isFail) {
            return Result.fail(this.mapTemplateValidationError(contentValidation.error))
        }

        const variablesResult = this.resolveVariables(input.variables, content)
        if (variablesResult.isFail) {
            return Result.fail(variablesResult.error)
        }

        return Result.ok({
            name,
            category,
            type,
            content,
            variables: variablesResult.value,
            scope: scopeResult.value,
        })
    }

    private validateInput(input: ICreatePromptTemplateInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []
        fields.push(...this.validateRequiredString("name", input.name))
        fields.push(...this.validateRequiredString("category", input.category))
        fields.push(...this.validateRequiredString("type", input.type))
        fields.push(...this.validateRequiredString("content", input.content))

        const variablesValidation = this.validateOptionalVariables(input.variables)
        if (variablesValidation !== undefined) {
            fields.push(variablesValidation)
        }

        fields.push(...this.validateScopeInput(input.isGlobal, input.organizationId))

        return fields
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
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        const resolvedIsGlobal = this.resolveIsGlobal(isGlobal, organizationId)
        if (resolvedIsGlobal) {
            return this.resolveGlobalScope(organizationId)
        }

        return this.resolveOrganizationScope(organizationId)
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
                    new ValidationError("Prompt template creation validation failed", [
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

    private validateOptionalVariables(
        variables: readonly string[] | undefined,
    ): IValidationErrorField | undefined {
        if (variables === undefined) {
            return undefined
        }

        return this.validateVariables(variables)
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

    private resolveIsGlobal(
        isGlobal: boolean | undefined,
        organizationId: string | null | undefined,
    ): boolean {
        if (isGlobal !== undefined) {
            return isGlobal
        }

        if (organizationId !== undefined) {
            return false
        }

        return true
    }

    private resolveGlobalScope(
        organizationId: string | null | undefined,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        if (organizationId !== undefined && organizationId !== null) {
            return Result.fail(
                new ValidationError("Prompt template creation validation failed", [
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
        organizationId: string | null | undefined,
    ): Result<{readonly isGlobal: boolean; readonly organizationId?: string | null}, ValidationError> {
        if (organizationId === undefined || organizationId === null) {
            return Result.fail(
                new ValidationError("Prompt template creation validation failed", [
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
                new ValidationError("Prompt template creation validation failed", [
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
        return new ValidationError("Prompt template creation validation failed", error.fields.map((field) => {
            return {
                field: field.field === "template" ? "content" : field.field,
                message: field.message,
            }
        }))
    }

    private async findConflict(
        name: string,
        scope: {readonly isGlobal: boolean; readonly organizationId?: string | null},
    ): Promise<boolean> {
        const templates = await this.promptTemplateRepository.findAll()
        const normalizedName = name.trim().toLowerCase()

        return templates.some((template) => {
            if (template.name.toLowerCase() !== normalizedName) {
                return false
            }

            if (scope.isGlobal) {
                return template.isGlobal
            }

            if (template.isGlobal) {
                return false
            }

            return template.organizationId?.value === scope.organizationId
        })
    }
}
