import {
    type ITemplateVariable,
    PROMPT_TEMPLATE_CATEGORY,
    type PromptTemplateCategory,
    PROMPT_TEMPLATE_TYPE,
    type PromptTemplateType,
    PromptTemplate,
    type IPromptTemplateProps,
} from "../entities/prompt-template.entity"
import {OrganizationId} from "../value-objects/organization-id.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Input for prompt template creation.
 */
export interface ICreatePromptTemplateProps {
    readonly name: string
    readonly category: string
    readonly type: string
    readonly content: string
    readonly variables?: readonly ITemplateVariable[]
    readonly version?: number
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

/**
 * Snapshot input for template reconstitution.
 */
export interface IReconstitutePromptTemplateProps {
    readonly id: string
    readonly name: string
    readonly category: string
    readonly type: string
    readonly content: string
    readonly variables?: readonly ITemplateVariable[]
    readonly version: number
    readonly isGlobal: boolean
    readonly organizationId?: string | null
}

/**
 * Factory for PromptTemplate.
 */
export class PromptTemplateFactory
    implements IEntityFactory<PromptTemplate, ICreatePromptTemplateProps, IReconstitutePromptTemplateProps>
{
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new prompt template with stable defaults.
     *
     * @param input Creation payload.
     * @returns Prompt template entity.
     */
    public create(input: ICreatePromptTemplateProps): PromptTemplate {
        const props: IPromptTemplateProps = {
            name: input.name,
            category: normalizeCategory(input.category),
            type: normalizeType(input.type),
            content: input.content,
            variables: [...(input.variables ?? [])],
            version: input.version ?? 1,
            isGlobal: input.isGlobal ?? true,
            organizationId: normalizeOrganizationId(input.organizationId),
        }

        return new PromptTemplate(UniqueId.create(), props)
    }

    /**
     * Reconstitutes prompt template from persistence snapshot.
     *
     * @param input Snapshot payload.
     * @returns Reconstituted prompt template.
     */
    public reconstitute(input: IReconstitutePromptTemplateProps): PromptTemplate {
        const props: IPromptTemplateProps = {
            name: input.name,
            category: normalizeCategory(input.category),
            type: normalizeType(input.type),
            content: input.content,
            variables: [...(input.variables ?? [])],
            version: input.version,
            isGlobal: input.isGlobal,
            organizationId: normalizeOrganizationId(input.organizationId),
        }

        return new PromptTemplate(UniqueId.create(input.id), props)
    }
}

/**
 * Normalizes category value into supported category set.
 *
 * @param value Raw category.
 * @returns Normalized category.
 */
function normalizeCategory(value: string): PromptTemplateCategory {
    const normalized = value.trim().toLowerCase()
    if (
        Object.values(PROMPT_TEMPLATE_CATEGORY).includes(
            normalized as PromptTemplateCategory,
        ) === false
    ) {
        throw new Error(`Unknown prompt template category: ${value}`)
    }

    return normalized as PromptTemplateCategory
}

/**
 * Normalizes type value into supported template type.
 *
 * @param value Raw type.
 * @returns Normalized type.
 */
function normalizeType(value: string): PromptTemplateType {
    const normalized = value.trim().toLowerCase()
    if (
        Object.values(PROMPT_TEMPLATE_TYPE).includes(
            normalized as PromptTemplateType,
        ) === false
    ) {
        throw new Error(`Unknown prompt template type: ${value}`)
    }

    return normalized as PromptTemplateType
}

/**
 * Normalizes organization id for scoped templates.
 *
 * @param value Raw organization id.
 * @returns Parsed organization id value object.
 */
function normalizeOrganizationId(value: string | null | undefined): OrganizationId | undefined {
    if (value === undefined || value === null) {
        return undefined
    }

    return OrganizationId.create(value)
}
