import type {
    CustomRule,
    CustomRuleScope,
    CustomRuleStatus,
} from "../../../domain/entities/custom-rule.entity"
import type {OrganizationId} from "../../../domain/value-objects/organization-id.value-object"
import type {IRepository} from "./common/repository.port"

/**
 * Outbound persistence contract for custom rule entities.
 */
export interface ICustomRuleRepository extends IRepository<CustomRule> {
    /**
     * Finds custom rules by organization identifier.
     *
     * @param organizationId Organization identifier.
     * @returns Matching rules.
     */
    findByOrganizationId(organizationId: OrganizationId): Promise<readonly CustomRule[]>

    /**
     * Finds custom rules by lifecycle status.
     *
     * @param status Rule status.
     * @returns Matching rules.
     */
    findByStatus(status: CustomRuleStatus): Promise<readonly CustomRule[]>

    /**
     * Finds custom rules by scope.
     *
     * @param scope Rule scope.
     * @returns Matching rules.
     */
    findByScope(scope: CustomRuleScope): Promise<readonly CustomRule[]>

    /**
     * Finds active custom rules for organization.
     *
     * @param organizationId Organization identifier.
     * @returns Active rules.
     */
    findActiveByOrganization(
        organizationId: OrganizationId,
    ): Promise<readonly CustomRule[]>
}
