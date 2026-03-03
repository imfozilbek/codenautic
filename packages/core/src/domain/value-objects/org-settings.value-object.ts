/**
 * Primitive types supported by organization settings values.
 */
export const ORG_SETTING_VALUE_TYPE = {
    BOOLEAN: "boolean",
    NUMBER: "number",
    STRING: "string",
} as const

/**
 * Primitive payload type for organization settings.
 */
export type OrgSettingValue = boolean | number | string

/**
 * Flexible organization settings container as immutable map.
 */
export type OrgSettingsProps = Record<string, OrgSettingValue>

/**
 * Input model for settings creation/update.
 */
export type OrgSettingsInput = Record<string, unknown>

/**
 * Immutable organization-level settings value object.
 */
export class OrgSettings {
    private readonly values: OrgSettingsProps

    /**
     * Creates immutable settings.
     *
     * @param input Raw settings.
     */
    private constructor(input: OrgSettingsProps) {
        this.values = cloneShallow(input)
        Object.freeze(this.values)
        Object.freeze(this)
    }

    /**
     * Creates default settings when no input provided.
     *
     * @param input Raw settings.
     * @returns Organization settings value object.
     */
    public static create(input: OrgSettingsInput = {}): OrgSettings {
        return new OrgSettings(normalizeInput(input))
    }

    /**
     * Reads setting value.
     *
     * @param key Setting key.
     * @returns Value or undefined.
     */
    public get(key: string): OrgSettingValue | undefined {
        const normalizedKey = key.trim()
        return this.values[normalizedKey]
    }

    /**
     * Checks whether key exists.
     *
 * @param key Setting key.
     * @returns True when key exists.
     */
    public has(key: string): boolean {
        return this.get(key) !== undefined
    }

    /**
     * Creates merged settings snapshot.
     *
     * @param patch Partial settings update.
     * @returns New organization settings.
     */
    public merge(patch: OrgSettingsInput): OrgSettings {
        const updates = normalizeInput(patch)
        return new OrgSettings({...this.values, ...updates})
    }

    /**
     * Serializes settings to plain object.
     *
     * @returns Serializable settings map.
     */
    public toJSON(): OrgSettingsProps {
        return cloneShallow(this.values)
    }
}

/**
 * Normalizes and validates raw settings payload.
 *
 * @param input Raw settings input.
 * @returns Validated settings map.
 */
function normalizeInput(input: OrgSettingsInput): OrgSettingsProps {
    if (typeof input !== "object" || input === null) {
        throw new Error("OrgSettings must be an object")
    }

    const normalized: OrgSettingsProps = {}

    for (const key of Object.keys(input)) {
        const normalizedKey = key.trim()
        const value = input[key]

        if (normalizedKey.length === 0) {
            throw new Error("OrgSettings key cannot be empty")
        }

        if (!isOrgSettingValue(value)) {
            throw new Error(
                `OrgSettings value for ${normalizedKey} must be boolean, number, or string`,
            )
        }

        normalized[normalizedKey] = value
    }

    return normalized
}

/**
 * Checks if value is supported organization setting primitive.
 *
 * @param value Candidate value.
 * @returns True when value can be persisted as organization setting.
 */
function isOrgSettingValue(value: unknown): value is OrgSettingValue {
    return (
        typeof value === ORG_SETTING_VALUE_TYPE.BOOLEAN ||
        typeof value === ORG_SETTING_VALUE_TYPE.NUMBER ||
        typeof value === ORG_SETTING_VALUE_TYPE.STRING
    )
}

/**
 * Shallow clones plain records.
 *
 * @param value Input record.
 * @returns New plain record.
 */
function cloneShallow<TProps extends Record<string, unknown>>(value: TProps): TProps {
    return {...value}
}
