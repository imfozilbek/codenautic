/**
 * Factory contract for entity and aggregate lifecycle.
 *
 * @template TEntity Domain object type.
 * @template TCreateInput Input type for new object creation.
 * @template TReconstituteInput Input type for restoring from persistence.
 */
export interface IEntityFactory<TEntity, TCreateInput, TReconstituteInput> {
    /**
     * Creates new domain object.
     *
     * @param input New object payload.
     * @returns New domain instance.
     */
    create(input: TCreateInput): TEntity

    /**
     * Restores domain object from persistence representation.
     *
     * @param input Persistence payload.
     * @returns Restored domain instance.
     */
    reconstitute(input: TReconstituteInput): TEntity
}
