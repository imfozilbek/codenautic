import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Base class for entities with identity semantics.
 *
 * @template TProps Entity state type.
 */
export abstract class Entity<TProps> {
    protected readonly props: TProps
    private readonly _id: UniqueId

    /**
     * Creates entity.
     *
     * @param id Immutable entity identifier.
     * @param props Mutable internal state container.
     */
    public constructor(id: UniqueId, props: TProps) {
        this._id = id
        this.props = props
    }

    /**
     * Entity identifier.
     *
     * @returns Immutable identifier.
     */
    public get id(): UniqueId {
        return this._id
    }

    /**
     * Identity-based equality.
     *
     * @param other Another entity.
     * @returns True when identifiers match.
     */
    public equals(other: Entity<TProps>): boolean {
        return this._id.equals(other.id)
    }
}
