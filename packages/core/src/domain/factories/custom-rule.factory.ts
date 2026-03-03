import {
    type CustomRuleScope,
    type CustomRuleStatus,
    type CustomRuleType,
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_STATUS,
    CUSTOM_RULE_TYPE,
    type ICustomRuleExample,
    type ICustomRuleProps,
    CustomRule,
} from "../entities/custom-rule.entity"
import {Severity} from "../value-objects/severity.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Input payload for creating custom rule.
 */
export interface ICreateCustomRuleProps {
    title: string
    rule: string
    type: CustomRuleType
    scope: CustomRuleScope
    severity: string
    examples?: readonly ICustomRuleExample[]
}

/**
 * Persistence payload for custom rule reconstitution.
 */
export interface IReconstituteCustomRuleProps {
    id: string
    title: string
    rule: string
    type: CustomRuleType
    scope: CustomRuleScope
    severity: string
    status: CustomRuleStatus
    examples?: readonly ICustomRuleExample[]
}

/**
 * Factory for custom rule entity creation and restore.
 */
export class CustomRuleFactory implements IEntityFactory<
    CustomRule,
    ICreateCustomRuleProps,
    IReconstituteCustomRuleProps
> {
    /**
     * Creates new custom rule with defaults.
     *
     * @param input Creation payload.
     * @returns New custom rule.
     */
    public create(input: ICreateCustomRuleProps): CustomRule {
        const props: ICustomRuleProps = {
            title: input.title,
            rule: input.rule,
            type: normalizeType(input.type),
            scope: normalizeScope(input.scope),
            severity: Severity.create(input.severity),
            status: CUSTOM_RULE_STATUS.PENDING,
            examples: [...(input.examples ?? [])],
        }

        return new CustomRule(UniqueId.create(), props)
    }

    /**
     * Reconstitutes custom rule from persistence payload.
     *
     * @param input Snapshot payload.
     * @returns Restored custom rule.
     */
    public reconstitute(input: IReconstituteCustomRuleProps): CustomRule {
        const props: ICustomRuleProps = {
            title: input.title,
            rule: input.rule,
            type: normalizeType(input.type),
            scope: normalizeScope(input.scope),
            severity: Severity.create(input.severity),
            status: input.status,
            examples: [...(input.examples ?? [])],
        }

        return new CustomRule(UniqueId.create(input.id), props)
    }
}

/**
 * Normalizes custom rule type using known constants.
 *
 * @param type Raw type.
 * @returns Normalized type.
 */
function normalizeType(type: string): CustomRuleType {
    const normalized = type.trim().toUpperCase()
    if (Object.values(CUSTOM_RULE_TYPE).includes(normalized as CustomRuleType) === false) {
        throw new Error(`Unknown custom rule type: ${type}`)
    }
    return normalized as CustomRuleType
}

/**
 * Normalizes custom rule scope using known constants.
 *
 * @param scope Raw scope.
 * @returns Normalized scope.
 */
function normalizeScope(scope: string): CustomRuleScope {
    const normalized = scope.trim().toUpperCase()
    if (Object.values(CUSTOM_RULE_SCOPE).includes(normalized as CustomRuleScope) === false) {
        throw new Error(`Unknown custom rule scope: ${scope}`)
    }
    return normalized as CustomRuleScope
}
