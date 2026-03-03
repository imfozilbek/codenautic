import {AggregateRoot} from "./aggregate-root"
import {MemberRole} from "../value-objects/member-role.value-object"
import {APIKeyConfig} from "../value-objects/api-key-config.value-object"
import {OrgSettings, type OrgSettingsInput} from "../value-objects/org-settings.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Organization member input for aggregate construction.
 */
export interface IOrganizationMemberProps {
    userId: string
    role: string
}

/**
 * Aggregated organization state.
 */
export interface IOrganizationProps {
    name: string
    ownerId: UniqueId
    settings: OrgSettings
    apiKeys: APIKeyConfig[]
    byokEnabled: boolean
    members: readonly IOrganizationMemberProps[]
}

/**
 * Organization aggregate root.
 */
export class Organization extends AggregateRoot<IOrganizationProps> {
    private readonly members: Map<string, MemberRole>

    /**
     * Creates organization aggregate.
     *
     * @param id Organization identifier.
     * @param props Organization props.
     */
    public constructor(id: UniqueId, props: IOrganizationProps) {
        super(id, props)

        this.props.name = normalizeName(props.name)
        this.props.settings = props.settings
        this.props.apiKeys = normalizeApiKeys(props.apiKeys)
        this.props.byokEnabled = Boolean(props.byokEnabled)
        this.members = normalizeMembers(props.members, props.ownerId)
        this.ensureStateIsValid()
    }

    /**
     * Organization display name.
     *
     * @returns Organization name.
     */
    public get name(): string {
        return this.props.name
    }

    /**
     * Organization owner id.
     *
     * @returns Owner unique id.
     */
    public get ownerId(): UniqueId {
        return this.props.ownerId
    }

    /**
     * Organization settings object.
     *
     * @returns Current settings.
     */
    public get settings(): OrgSettings {
        return this.props.settings
    }

    /**
     * Byok feature flag.
     *
     * @returns True when BYOK enabled.
     */
    public get byokEnabled(): boolean {
        return this.props.byokEnabled
    }

    /**
     * Organization API key configs.
     *
     * @returns API key config list.
     */
    public get apiKeys(): readonly APIKeyConfig[] {
        return [...this.props.apiKeys]
    }

    /**
     * Organization member user ids.
     *
     * @returns Readonly list of member ids.
     */
    public get memberIds(): readonly string[] {
        return [...this.members.keys()]
    }

    /**
     * Organization member count.
     *
     * @returns Count of unique members.
     */
    public get memberCount(): number {
        return this.members.size
    }

    /**
     * Adds new member to organization.
     *
     * @param userId User id.
     * @param role Member role.
     */
    public addMember(userId: UniqueId, role: MemberRole): void {
        const userIdValue = userId.value

        if (userIdValue === this.props.ownerId.value) {
            throw new Error("Owner already exists")
        }

        if (this.members.has(userIdValue)) {
            throw new Error(`Member ${userIdValue} already exists`)
        }

        this.members.set(userIdValue, role)
    }

    /**
     * Removes member by id.
     *
     * @param userId User id.
     */
    public removeMember(userId: UniqueId): void {
        const userIdValue = userId.value

        if (userIdValue === this.props.ownerId.value) {
            throw new Error("Owner cannot be removed")
        }

        if (!this.members.delete(userIdValue)) {
            throw new Error(`Member ${userIdValue} does not exist`)
        }
    }

    /**
     * Updates organization settings.
     *
     * @param settingsUpdate New partial settings.
     */
    public updateSettings(settingsUpdate: OrgSettingsInput): void {
        this.props.settings = this.props.settings.merge(settingsUpdate)
    }

    /**
     * Checks whether role is allowed for given user.
     *
     * @param userId User id.
     * @returns Role for user or null.
     */
    public getMemberRole(userId: UniqueId): MemberRole | null {
        const memberRole = this.members.get(userId.value)
        if (memberRole === undefined) {
            return null
        }
        return memberRole
    }

    /**
     * Checks whether user is a member.
     *
     * @param userId User id.
     * @returns True when user is member.
     */
    public hasMember(userId: UniqueId): boolean {
        return this.members.has(userId.value)
    }

    /**
     * Validates aggregate invariants.
     *
     * @throws Error when invalid invariant detected.
     */
    private ensureStateIsValid(): void {
        if (this.props.settings === undefined) {
            throw new Error("Organization settings must be defined")
        }

        if (this.props.apiKeys === undefined) {
            throw new Error("Organization apiKeys must be defined")
        }

        if (this.memberCount === 0) {
            throw new Error("Organization must have at least one member")
        }

        if (!this.members.has(this.props.ownerId.value)) {
            throw new Error("Organization must include owner as member")
        }

        if (!this.isOwner(this.props.ownerId)) {
            throw new Error("Organization owner must have ownership role")
        }
    }

    /**
     * Validates role assignment for owner user.
     *
     * @returns true when owner role is OWNER.
     */
    public isOwner(userId: UniqueId): boolean {
        const role = this.members.get(userId.value)
        if (role === undefined) {
            return false
        }

        return role.toString() === "OWNER"
    }
}

/**
 * Normalizes organization name.
 *
 * @param name Raw organization name.
 * @returns Normalized name.
 */
function normalizeName(name: string): string {
    const normalizedName = name.trim()
    if (normalizedName.length === 0) {
        throw new Error("Organization name cannot be empty")
    }
    return normalizedName
}

/**
 * Validates and normalizes member state.
 *
 * @param members Raw member list.
 * @param ownerId Owner id.
 * @returns Normalized member map.
 */
function normalizeMembers(
    members: readonly IOrganizationMemberProps[],
    ownerId: UniqueId,
): Map<string, MemberRole> {
    const memberMap = new Map<string, MemberRole>()

    for (const member of members) {
        const userId = member.userId.trim()
        if (userId.length === 0) {
            throw new Error("Member id cannot be empty")
        }

        const role = MemberRole.create(member.role)
        if (userId === ownerId.value && role.toString() !== "OWNER") {
            throw new Error("Owner role cannot be downgraded")
        }

        if (memberMap.has(userId)) {
            throw new Error(`Duplicate member entry for user ${userId}`)
        }

        memberMap.set(userId, role)
    }

    if (!memberMap.has(ownerId.value)) {
        memberMap.set(ownerId.value, MemberRole.create("OWNER"))
    }

    return memberMap
}

/**
 * Validates API key list and deduplicates records by key id.
 *
 * @param apiKeys Raw list.
 * @returns Cloned list.
 */
function normalizeApiKeys(apiKeys: readonly APIKeyConfig[]): APIKeyConfig[] {
    const normalizedKeys: APIKeyConfig[] = [...apiKeys]
    const byId = new Set<string>()

    for (const apiKey of apiKeys) {
        if (!(apiKey instanceof APIKeyConfig)) {
            throw new Error("API key must be APIKeyConfig instance")
        }

        const apiKeyId = apiKey.id
        if (byId.has(apiKeyId)) {
            throw new Error(`Duplicate API key id: ${apiKeyId}`)
        }
        byId.add(apiKeyId)
    }

    return normalizedKeys
}
