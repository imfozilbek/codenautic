import {InvalidUniqueIdError} from "../errors/invalid-unique-id.error"

/**
 * Strongly typed unique identifier for entities and aggregates.
 */
export class UniqueId {
    private readonly rawValue: string

    /**
     * Creates immutable identifier.
     *
     * @param value Raw identifier string.
     */
    private constructor(value: string) {
        this.rawValue = value
        Object.freeze(this)
    }

    /**
     * Creates new identifier instance.
     *
     * @param value Optional raw value. Random UUID is generated when omitted.
     * @returns Immutable identifier.
     * @throws Error when identifier value is empty.
     */
    public static create(value?: string): UniqueId {
        const rawValue = value ?? crypto.randomUUID()
        const normalizedValue = rawValue.trim()

        if (normalizedValue.length === 0) {
            throw new InvalidUniqueIdError()
        }

        return new UniqueId(normalizedValue)
    }

    /**
     * Raw identifier value.
     *
     * @returns Identifier string.
     */
    public get value(): string {
        return this.rawValue
    }

    /**
     * Compares identifiers by raw value.
     *
     * @param other Another identifier instance.
     * @returns True when values are equal.
     */
    public equals(other: UniqueId): boolean {
        return this.isEqual(other)
    }

    /**
     * Compares identifiers by raw value.
     *
     * @param other Another identifier instance.
     * @returns True when values are equal.
     */
    public isEqual(other: UniqueId): boolean {
        return this.rawValue === other.rawValue
    }
}
