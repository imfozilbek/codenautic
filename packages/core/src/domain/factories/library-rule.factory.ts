import {OrganizationId} from "../value-objects/organization-id.value-object"
import {Severity} from "../value-objects/severity.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"
import {LibraryRule, type ILibraryRuleProps, LIBRARY_RULE_SCOPE} from "../entities/library-rule.entity"

type ICreateLibraryRuleScope = (typeof LIBRARY_RULE_SCOPE)[keyof typeof LIBRARY_RULE_SCOPE]

/**
 * Properties to create a library rule.
 */
export interface ICreateLibraryRuleProps {
    /** Natural UUID of library rule. */
    readonly uuid: string

    /** Human-readable rule title. */
    readonly title: string

    /** Rule instruction text. */
    readonly rule: string

    /** Why this rule matters. */
    readonly whyIsThisImportant: string

    /** Severity level value. */
    readonly severity: string

    /** Optional example fixtures. */
    readonly examples?: readonly {
        readonly snippet: string
        readonly isCorrect: boolean
    }[]

    /** Target language. */
    readonly language?: string

    /** Coverage buckets. */
    readonly buckets?: readonly string[]

    /** Rule applicability scope. */
    readonly scope: ICreateLibraryRuleScope

    /** Predefined heuristic marker. */
    readonly plugAndPlay?: boolean

    /** Scope mode (default true). */
    readonly isGlobal?: boolean

    /** Organization scope for non-global rules. */
    readonly organizationId?: string
}

/**
 * Snapshot from persistence for library rule.
 */
export interface IReconstituteLibraryRuleProps {
    /** Natural UUID of library rule. */
    readonly uuid: string

    /** Human-readable rule title. */
    readonly title: string

    /** Rule instruction text. */
    readonly rule: string

    /** Why this rule matters. */
    readonly whyIsThisImportant: string

    /** Severity level value. */
    readonly severity: string

    /** Optional example fixtures. */
    readonly examples?: readonly {
        readonly snippet: string
        readonly isCorrect: boolean
    }[]

    /** Target language. */
    readonly language: string

    /** Coverage buckets. */
    readonly buckets: readonly string[]

    /** Rule applicability scope. */
    readonly scope: ICreateLibraryRuleScope

    /** Predefined heuristic marker. */
    readonly plugAndPlay: boolean

    /** Scope mode. */
    readonly isGlobal: boolean

    /** Organization scope for non-global rules. */
    readonly organizationId?: string
}

/**
 * Factory for creating and restoring library rules.
 */
export class LibraryRuleFactory implements IEntityFactory<
    LibraryRule,
    ICreateLibraryRuleProps,
    IReconstituteLibraryRuleProps
> {
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new library rule.
     *
     * @param input Creation payload.
     * @returns New rule entity.
     */
    public create(input: ICreateLibraryRuleProps): LibraryRule {
        const organizationId = normalizeOrganizationId(input.organizationId)
        const isGlobal = input.isGlobal ?? organizationId === undefined

        const props: ILibraryRuleProps = {
            uuid: input.uuid,
            title: input.title,
            rule: input.rule,
            whyIsThisImportant: input.whyIsThisImportant,
            severity: Severity.create(input.severity),
            examples: [...(input.examples ?? [])],
            language: input.language ?? "*",
            buckets: [...(input.buckets ?? [])],
            scope: input.scope,
            plugAndPlay: input.plugAndPlay ?? false,
            isGlobal,
            organizationId,
        }

        return new LibraryRule(UniqueId.create(input.uuid), props)
    }

    /**
     * Reconstitutes library rule from persistence payload.
     *
     * @param input Persistence payload.
     * @returns Restored rule entity.
     */
    public reconstitute(input: IReconstituteLibraryRuleProps): LibraryRule {
        const props: ILibraryRuleProps = {
            uuid: input.uuid,
            title: input.title,
            rule: input.rule,
            whyIsThisImportant: input.whyIsThisImportant,
            severity: Severity.create(input.severity),
            examples: [...(input.examples ?? [])],
            language: input.language,
            buckets: [...input.buckets],
            scope: input.scope,
            plugAndPlay: input.plugAndPlay,
            isGlobal: input.isGlobal,
            organizationId:
                input.organizationId === undefined
                    ? undefined
                    : OrganizationId.create(input.organizationId),
        }

        return new LibraryRule(UniqueId.create(input.uuid), props)
    }
}

/**
 * Normalizes organization identifier for scoped rule.
 *
 * @param organizationId Raw organization id.
 * @returns Normalized organization id or undefined.
 */
function normalizeOrganizationId(organizationId: string | undefined): OrganizationId | undefined {
    if (organizationId === undefined) {
        return undefined
    }

    return OrganizationId.create(organizationId)
}
