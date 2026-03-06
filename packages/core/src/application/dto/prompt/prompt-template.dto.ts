import type {
    ITemplateVariable,
    PromptTemplate,
    PromptTemplateCategory,
    PromptTemplateType,
} from "../../../domain/entities/prompt-template.entity"

/**
 * Prompt template variable DTO.
 */
export interface IPromptTemplateVariableDTO {
    readonly name: string
}

/**
 * Prompt template DTO for application boundaries.
 */
export interface IPromptTemplateDTO {
    readonly id: string
    readonly name: string
    readonly category: PromptTemplateCategory
    readonly type: PromptTemplateType
    readonly content: string
    readonly variables: readonly IPromptTemplateVariableDTO[]
    readonly version: number
    readonly isGlobal: boolean
    readonly organizationId: string | null
}

/**
 * Input payload for prompt template creation.
 */
export interface ICreatePromptTemplateInput {
    readonly name: string
    readonly category: string
    readonly type: string
    readonly content: string
    readonly variables?: readonly string[]
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

/**
 * Output payload for prompt template creation.
 */
export interface ICreatePromptTemplateOutput {
    readonly template: IPromptTemplateDTO
}

/**
 * Input payload for prompt template updates.
 */
export interface IUpdatePromptTemplateInput {
    readonly templateId: string
    readonly name?: string
    readonly category?: string
    readonly type?: string
    readonly content?: string
    readonly variables?: readonly string[]
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
    readonly version?: number
}

/**
 * Output payload for prompt template updates.
 */
export interface IUpdatePromptTemplateOutput {
    readonly template: IPromptTemplateDTO
}

/**
 * Input payload for prompt template read/delete operations.
 */
export interface IPromptTemplateIdInput {
    readonly templateId: string
}

/**
 * Output payload for prompt template read operation.
 */
export interface IGetPromptTemplateOutput {
    readonly template: IPromptTemplateDTO
}

/**
 * Output payload for prompt template deletion.
 */
export interface IDeletePromptTemplateOutput {
    readonly templateId: string
}

/**
 * Input payload for listing prompt templates.
 */
export interface IListPromptTemplatesInput {
}

/**
 * Output payload for prompt template list.
 */
export interface IListPromptTemplatesOutput {
    readonly templates: readonly IPromptTemplateDTO[]
    readonly total: number
}

/**
 * Maps domain prompt template to DTO.
 *
 * @param template Domain template.
 * @returns DTO payload.
 */
export function mapPromptTemplateToDTO(template: PromptTemplate): IPromptTemplateDTO {
    return {
        id: template.id.value,
        name: template.name,
        category: template.category,
        type: template.type,
        content: template.content,
        variables: mapVariables(template.variables),
        version: template.version,
        isGlobal: template.isGlobal,
        organizationId: template.organizationId?.value ?? null,
    }
}

function mapVariables(variables: readonly ITemplateVariable[]): readonly IPromptTemplateVariableDTO[] {
    return variables.map((variable) => {
        return {
            name: variable.name,
        }
    })
}
