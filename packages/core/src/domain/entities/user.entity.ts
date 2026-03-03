import {MemberRole} from "../value-objects/member-role.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {UserPreferences} from "../value-objects/user-preferences.value-object"
import {Entity} from "./entity"

/**
 * Props required to create a user entity.
 */
export interface IUserProps {
    email: string
    displayName: string
    roles: MemberRole[]
    preferences: UserPreferences
    authProviders: string[]
}

/**
 * User domain entity.
 */
export class User extends Entity<IUserProps> {
    /**
     * Creates user entity.
     *
     * @param id Entity identifier.
     * @param props Entity props.
     */
    public constructor(id: UniqueId, props: IUserProps) {
        super(id, props)
        this.normalizeState()
    }

    /**
     * User email.
     *
     * @returns Normalized email.
     */
    public get email(): string {
        return this.props.email
    }

    /**
     * Display name.
     *
     * @returns Display name.
     */
    public get displayName(): string {
        return this.props.displayName
    }

    /**
     * User roles.
     *
     * @returns Active roles.
     */
    public get roles(): MemberRole[] {
        return [...this.props.roles]
    }

    /**
     * User preferences.
     *
     * @returns User preferences.
     */
    public get preferences(): UserPreferences {
        return this.props.preferences
    }

    /**
     * Authentication providers linked to user account.
     *
     * @returns List of normalized auth providers.
     */
    public get authProviders(): string[] {
        return [...this.props.authProviders]
    }

    /**
     * Replaces user preferences.
     *
     * @param prefs New preferences.
     */
    public updatePreferences(prefs: UserPreferences): void {
        this.props.preferences = prefs
    }

    /**
     * Checks whether user has role or equivalent higher role.
     *
     * @param role Required role.
     * @returns True when user has at least requested role.
     */
    public hasRole(role: MemberRole): boolean {
        return this.props.roles.some((userRole) => userRole.hasPermission(role))
    }

    /**
     * Normalizes and validates entity state.
     */
    private normalizeState(): void {
        this.props.email = normalizeEmail(this.props.email)
        this.props.displayName = normalizeDisplayName(this.props.displayName)
        this.props.roles = normalizeRoles(this.props.roles)
        this.props.authProviders = normalizeAuthProviders(this.props.authProviders)
    }
}

/**
 * Normalizes and validates email.
 *
 * @param email Raw email.
 * @returns Lowercase normalized email.
 */
function normalizeEmail(email: string): string {
    const normalizedEmail = email.trim().toLowerCase()

    if (!isEmail(normalizedEmail)) {
        throw new Error(`Invalid email: ${email}`)
    }

    return normalizedEmail
}

/**
 * Normalizes and validates display name.
 *
 * @param displayName Raw display name.
 * @returns Trimmed display name.
 */
function normalizeDisplayName(displayName: string): string {
    const normalizedDisplayName = displayName.trim()

    if (normalizedDisplayName.length === 0) {
        throw new Error("Display name cannot be empty")
    }

    return normalizedDisplayName
}

/**
 * Deduplicates and validates role list.
 *
 * @param roles Raw roles.
 * @returns Normalized roles.
 */
function normalizeRoles(roles: MemberRole[]): MemberRole[] {
    const uniqueRoles = new Map<string, MemberRole>()

    for (const role of roles) {
        uniqueRoles.set(role.toString(), role)
    }

    return [...uniqueRoles.values()]
}

/**
 * Deduplicates and validates auth provider names.
 *
 * @param providers Raw providers.
 * @returns Normalized provider list.
 */
function normalizeAuthProviders(providers: string[]): string[] {
    const normalizedProviders = providers
        .map((provider) => provider.trim().toLowerCase())
        .filter((provider) => provider.length > 0)

    if (normalizedProviders.length !== providers.length) {
        throw new Error("Auth provider cannot be empty")
    }

    return [...new Set(normalizedProviders)]
}

/**
 * Checks whether value looks like a valid email.
 *
 * @param value Candidate email.
 * @returns True when email matches basic RFC-style format.
 */
function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
