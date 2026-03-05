import {OrganizationId} from "../value-objects/organization-id.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {
    PromptConfiguration,
    type IPromptConfigurationProps,
} from "../entities/prompt-configuration.entity"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Input for prompt configuration creation.
 */
export interface ICreatePromptConfigurationProps {
    readonly templateId: string
    readonly name: string
    readonly defaults?: Record<string, unknown>
    readonly overrides?: Record<string, unknown>
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

/**
 * Input for prompt configuration reconstitution.
 */
export interface IReconstitutePromptConfigurationProps {
    readonly id: string
    readonly templateId: string
    readonly name: string
    readonly defaults?: Record<string, unknown>
    readonly overrides?: Record<string, unknown>
    readonly isGlobal: boolean
    readonly organizationId?: string | null
}

/**
 * Factory for PromptConfiguration.
 */
export class PromptConfigurationFactory
    implements
        IEntityFactory<
            PromptConfiguration,
            ICreatePromptConfigurationProps,
            IReconstitutePromptConfigurationProps
        >
{
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new prompt configuration.
     *
     * @param input Creation payload.
     * @returns Prompt configuration entity.
     */
    public create(input: ICreatePromptConfigurationProps): PromptConfiguration {
        const props: IPromptConfigurationProps = {
            templateId: UniqueId.create(input.templateId),
            name: input.name,
            defaults: normalizeVariablesMap(input.defaults ?? {}),
            overrides: normalizeVariablesMap(input.overrides ?? {}),
            isGlobal: input.isGlobal ?? true,
            organizationId: normalizeOrganizationId(input.organizationId),
        }

        return new PromptConfiguration(UniqueId.create(), props)
    }

    /**
     * Reconstitutes configuration from persistence snapshot.
     *
     * @param input Snapshot payload.
     * @returns Restored prompt configuration.
     */
    public reconstitute(input: IReconstitutePromptConfigurationProps): PromptConfiguration {
        const props: IPromptConfigurationProps = {
            templateId: UniqueId.create(input.templateId),
            name: input.name,
            defaults: normalizeVariablesMap(input.defaults ?? {}),
            overrides: normalizeVariablesMap(input.overrides ?? {}),
            isGlobal: input.isGlobal,
            organizationId: normalizeOrganizationId(input.organizationId),
        }

        return new PromptConfiguration(UniqueId.create(input.id), props)
    }
}

/**
 * Normalizes organization id for scoped configuration.
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

/**
 * Normalizes variables map.
 *
 * @param value Raw variables map.
 * @returns Shallow copy of variables.
 */
function normalizeVariablesMap(value: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            const trimmedKey = key.trim()
            if (trimmedKey.length > 0) {
                result[trimmedKey] = value[key]
            }
        }
    }

    return result
}
