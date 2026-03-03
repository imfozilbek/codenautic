import {UniqueId} from "./unique-id.value-object"

/**
 * Supported BYOK status for key record.
 */
export const API_KEY_STATUS = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
} as const

/**
 * Literal API key status type.
 */
export type ApiKeyStatus = (typeof API_KEY_STATUS)[keyof typeof API_KEY_STATUS]

/**
 * Input model for API key configuration.
 */
export interface ICreateAPIKeyConfigInput {
    provider: string
    keyId: string
    status?: ApiKeyStatus
    createdAt?: string | Date
    id?: string
}

/**
 * Persistence model for API key configuration.
 */
export interface IAPIKeyConfigProps {
    provider: string
    keyId: string
    status: ApiKeyStatus
    createdAt: Date
    id: string
}

/**
 * Normalized and immutable API key config.
 */
export class APIKeyConfig {
    private readonly providerValue: string
    private readonly keyIdValue: string
    private readonly statusValue: ApiKeyStatus
    private readonly createdAtValue: Date
    private readonly idValue: UniqueId

    /**
     * Creates immutable API key config.
     *
     * @param props Validated properties.
     */
    private constructor(props: IAPIKeyConfigProps) {
        this.providerValue = props.provider
        this.keyIdValue = props.keyId
        this.statusValue = props.status
        this.createdAtValue = new Date(props.createdAt)
        this.idValue = UniqueId.create(props.id)
        Object.freeze(this)
    }

    /**
     * Creates API key config from input model.
     *
     * @param input Input model.
     * @returns Immutable API key config.
     */
    public static create(input: ICreateAPIKeyConfigInput): APIKeyConfig {
        const provider = normalizeProvider(input.provider)
        const keyId = normalizeKeyId(input.keyId)
        const status = input.status ?? API_KEY_STATUS.ACTIVE
        const createdAt = parseDate(input.createdAt)
        const id = input.id ?? `${provider}::${keyId}::${createdAt.toISOString()}`

        return new APIKeyConfig({
            provider,
            keyId,
            status,
            createdAt,
            id,
        })
    }

    /**
     * Provider name.
     *
     * @returns Provider normalized to upper-case.
     */
    public get provider(): string {
        return this.providerValue
    }

    /**
     * Human-readable key identifier.
     *
     * @returns Key identifier.
     */
    public get keyId(): string {
        return this.keyIdValue
    }

    /**
     * Current key status.
     *
     * @returns Status.
     */
    public get status(): ApiKeyStatus {
        return this.statusValue
    }

    /**
     * Creation timestamp.
     *
     * @returns Creation date.
     */
    public get createdAt(): Date {
        return new Date(this.createdAtValue)
    }

    /**
     * Stable key id.
     *
     * @returns Internal key identifier.
     */
    public get id(): string {
        return this.idValue.value
    }

    /**
     * Indicates whether key is active.
     *
     * @returns True when key status is active.
     */
    public isActive(): boolean {
        return this.statusValue === API_KEY_STATUS.ACTIVE
    }

    /**
     * Serializes API key config.
     *
     * @returns Serializable payload.
     */
    public toJSON(): IAPIKeyConfigProps {
        return {
            provider: this.providerValue,
            keyId: this.keyIdValue,
            status: this.statusValue,
            createdAt: new Date(this.createdAtValue),
            id: this.idValue.value,
        }
    }
}

/**
 * Normalizes provider value.
 *
 * @param value Raw provider string.
 * @returns Normalized provider.
 */
function normalizeProvider(value: string): string {
    const normalized = value.trim().toUpperCase()

    if (normalized.length === 0) {
        throw new Error("API key provider cannot be empty")
    }

    return normalized
}

/**
 * Normalizes key identifier.
 *
 * @param value Raw key id.
 * @returns Normalized key id.
 */
function normalizeKeyId(value: string): string {
    const normalized = value.trim()

    if (normalized.length === 0) {
        throw new Error("API key id cannot be empty")
    }

    return normalized
}

/**
 * Parses nullable date into Date.
 *
 * @param value Raw date.
 * @returns Date instance.
 */
function parseDate(value: string | Date | undefined): Date {
    if (value === undefined) {
        return new Date()
    }

    if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) {
            throw new Error("API key createdAt must be valid date")
        }
        return new Date(value)
    }

    const normalizedDate = new Date(value)
    if (!Number.isFinite(normalizedDate.getTime())) {
        throw new Error("API key createdAt must be valid date")
    }

    return normalizedDate
}
