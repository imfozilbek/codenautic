import type {RuleCategory} from "../../../../domain/entities/rule-category.entity"
import type {IRepository} from "../common/repository.port"

/**
 * Outbound contract for rule category persistence.
 */
export interface IRuleCategoryRepository extends IRepository<RuleCategory> {
    /**
     * Finds category by kebab-case slug.
     *
     * @param slug Category slug.
     * @returns Matching category.
     */
    findBySlug(slug: string): Promise<RuleCategory | null>

    /**
     * Loads all categories.
     *
     * @returns All categories.
     */
    findAll(): Promise<readonly RuleCategory[]>

    /**
     * Loads categories with `isActive === true`.
     *
     * @returns Active categories.
     */
    findActive(): Promise<readonly RuleCategory[]>

    /**
     * Loads category weights for scoring.
     *
     * @returns Slug and weight pairs.
     */
    findAllWithWeights(): Promise<readonly {slug: string; weight: number}[]>

    /**
     * Persists many categories in one batch.
     *
     * @param categories Categories to persist.
     */
    saveMany(categories: readonly RuleCategory[]): Promise<void>
}
