import type {Review} from "../../../domain/aggregates/review.aggregate"
import type {UniqueId} from "../../../domain/value-objects/unique-id.value-object"

/**
 * Outbound persistence contract for review aggregates.
 */
export interface IReviewRepository {
    /**
     * Finds review by identifier.
     *
     * @param id Review identifier.
     * @returns Review aggregate or null.
     */
    findById(id: UniqueId): Promise<Review | null>

    /**
     * Persists review aggregate state.
     *
     * @param review Review aggregate.
     * @returns Promise that resolves when save is completed.
     */
    save(review: Review): Promise<void>
}
