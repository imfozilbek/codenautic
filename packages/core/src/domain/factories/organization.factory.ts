import {APIKeyConfig, type ICreateAPIKeyConfigInput} from "../value-objects/api-key-config.value-object"
import {MemberRole} from "../value-objects/member-role.value-object"
import {OrgSettings, type OrgSettingsInput} from "../value-objects/org-settings.value-object"
import {Organization, type IOrganizationMemberProps, type IOrganizationProps} from "../aggregates/organization.aggregate"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating new organization.
 */
export interface ICreateOrganizationProps {
    name: string
    ownerId: string
    settings?: OrgSettingsInput
    apiKeys?: readonly ICreateAPIKeyConfigInput[]
    byokEnabled?: boolean
    members?: readonly IOrganizationMemberProps[]
}

/**
 * Persistence snapshot for organization reconstitution.
 */
export interface IReconstituteOrganizationProps {
    id: string
    name: string
    ownerId: string
    settings: OrgSettingsInput
    apiKeys?: readonly ICreateAPIKeyConfigInput[]
    byokEnabled: boolean
    members?: readonly IOrganizationMemberProps[]
}

/**
 * Factory for organization aggregate creation and restoration.
 */
export class OrganizationFactory implements IEntityFactory<Organization, ICreateOrganizationProps, IReconstituteOrganizationProps> {
    /**
     * Creates organization in default state.
     *
     * @param input Raw input.
     * @returns New organization.
     */
    public create(input: ICreateOrganizationProps): Organization {
        const props: IOrganizationProps = {
            name: input.name,
            ownerId: UniqueId.create(input.ownerId),
            settings: OrgSettings.create(input.settings),
            apiKeys: normalizeApiKeys(input.apiKeys),
            byokEnabled: input.byokEnabled ?? false,
            members: combineInitialMembers(input.ownerId, input.members),
        }

        return new Organization(UniqueId.create(), props)
    }

    /**
     * Restores organization from persistence state.
     *
     * @param input Snapshot data.
     * @returns Restored organization.
     */
    public reconstitute(input: IReconstituteOrganizationProps): Organization {
        const props: IOrganizationProps = {
            name: input.name,
            ownerId: UniqueId.create(input.ownerId),
            settings: OrgSettings.create(input.settings),
            apiKeys: normalizeApiKeys(input.apiKeys),
            byokEnabled: input.byokEnabled,
            members: input.members ?? [],
        }

        return new Organization(UniqueId.create(input.id), props)
    }
}

/**
 * Combines owner as initial member with optional external members.
 *
 * @param ownerId Owner id.
 * @param members Optional members.
 * @returns Members payload for aggregate constructor.
 */
function combineInitialMembers(
    ownerId: string,
    members?: readonly IOrganizationMemberProps[],
): IOrganizationMemberProps[] {
    const normalizedMembers = (members ?? [])
        .map((member) => ({
            userId: member.userId.trim(),
            role: member.role.trim(),
        }))
        .filter((member) => member.userId.length > 0)

    normalizedMembers.push({
        userId: ownerId,
        role: MemberRole.create("OWNER").toString(),
    })

    return normalizedMembers
}

/**
 * Validates and converts key configs.
 *
 * @param keys Raw input.
 * @returns Parsed key configs.
 */
function normalizeApiKeys(keys: readonly ICreateAPIKeyConfigInput[] = []): APIKeyConfig[] {
    return keys.map((key) => APIKeyConfig.create(key))
}
