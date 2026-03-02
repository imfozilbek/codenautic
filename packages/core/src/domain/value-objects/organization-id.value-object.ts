const ORGANIZATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

/**
 * Hybrid tenancy organization identifier value object.
 * `null` value represents global tenancy scope.
 */
export class OrganizationId {
    private readonly rawValue: string | null

    /**
     * Creates immutable organization id.
     *
     * @param rawValue Organization id string or null for global scope.
     */
    private constructor(rawValue: string | null) {
        this.rawValue = rawValue
        Object.freeze(this)
    }

    /**
     * Creates validated organization id.
     *
     * @param value Organization id string; null/undefined means global scope.
     * @returns Immutable organization id value object.
     * @throws Error When provided string is empty.
     * @throws Error When provided string has invalid format.
     */
    public static create(value?: string | null): OrganizationId {
        if (value === undefined || value === null) {
            return new OrganizationId(null)
        }

        const normalizedValue = value.trim()
        if (normalizedValue.length === 0) {
            throw new Error("OrganizationId cannot be empty")
        }

        if (!ORGANIZATION_ID_PATTERN.test(normalizedValue)) {
            throw new Error("OrganizationId has invalid format")
        }

        return new OrganizationId(normalizedValue)
    }

    /**
     * Raw organization id string.
     *
     * @returns Tenant id or null for global scope.
     */
    public get value(): string | null {
        return this.rawValue
    }

    /**
     * Checks whether object represents global tenant scope.
     *
     * @returns True when tenant scope is global.
     */
    public isGlobal(): boolean {
        return this.rawValue === null
    }

    /**
     * Stable string representation.
     *
     * @returns Tenant id string or `global`.
     */
    public toString(): string {
        if (this.rawValue === null) {
            return "global"
        }

        return this.rawValue
    }
}
