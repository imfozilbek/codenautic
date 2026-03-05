import {RuleCategory, type IRuleCategoryProps} from "../entities/rule-category.entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Input for rule category creation.
 */
export interface ICreateRuleCategoryProps {
    readonly slug: string
    readonly name: string
    readonly description: string
    readonly isActive?: boolean
}

/**
 * Input for rule category reconstitution.
 */
export interface IReconstituteRuleCategoryProps {
    readonly id: string
    readonly slug: string
    readonly name: string
    readonly description: string
    readonly isActive: boolean
}

/**
 * Factory for rule category entity lifecycle.
 */
export class RuleCategoryFactory
    implements IEntityFactory<RuleCategory, ICreateRuleCategoryProps, IReconstituteRuleCategoryProps>
{
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new rule category.
     *
     * @param input Category payload.
     * @returns Rule category entity.
     */
    public create(input: ICreateRuleCategoryProps): RuleCategory {
        const props: IRuleCategoryProps = {
            slug: input.slug,
            name: input.name,
            description: input.description,
            isActive: input.isActive ?? true,
        }

        return new RuleCategory(UniqueId.create(), props)
    }

    /**
     * Restores rule category from persistence snapshot.
     *
     * @param input Snapshot payload.
     * @returns Restored category entity.
     */
    public reconstitute(input: IReconstituteRuleCategoryProps): RuleCategory {
        const props: IRuleCategoryProps = {
            slug: input.slug,
            name: input.name,
            description: input.description,
            isActive: input.isActive,
        }

        return new RuleCategory(UniqueId.create(input.id), props)
    }
}
