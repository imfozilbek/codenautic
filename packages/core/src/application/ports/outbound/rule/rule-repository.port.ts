import type {Rule, RuleStatus} from "../../../../domain/aggregates/rule.aggregate"
import type {UniqueId} from "../../../../domain/value-objects/unique-id.value-object"

/**
 * Outbound persistence contract for rule aggregates.
 */
export interface IRuleRepository {
    /**
     * Finds rule by identifier.
     *
     * @param id Rule identifier.
     * @returns Rule aggregate or null.
     */
    findById(id: UniqueId): Promise<Rule | null>

    /**
     * Persists rule aggregate state.
     *
     * @param rule Rule aggregate.
     * @returns Promise that resolves when save is completed.
     */
    save(rule: Rule): Promise<void>

    /**
     * Finds rules by lifecycle status.
     *
     * @param status Rule lifecycle status.
     * @returns List of matching rules.
     */
    findByStatus(status: RuleStatus): Promise<readonly Rule[]>
}
