/**
 * Strongly typed unique identifier for entities and aggregates.
 */
export class UniqueId {
    public readonly value: string

    /**
     * Creates immutable identifier.
     *
     * @param value Raw identifier string.
     */
    private constructor(value: string) {
        this.value = value
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
            throw new Error("UniqueId cannot be empty")
        }

        return new UniqueId(normalizedValue)
    }

    /**
     * Compares identifiers by raw value.
     *
     * @param other Another identifier instance.
     * @returns True when values are equal.
     */
    public equals(other: UniqueId): boolean {
        return this.value === other.value
    }
}
