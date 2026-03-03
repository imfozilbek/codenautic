import type {UniqueId} from "../../../../domain/value-objects/unique-id.value-object"
import type {OrganizationId} from "../../../../domain/value-objects/organization-id.value-object"
import type {SeverityLevel} from "../../../../domain/value-objects/severity.value-object"
import type {LibraryRule, LibraryRuleScope} from "../../../../domain/entities/library-rule.entity"
import type {IRepository} from "../common/repository.port"

/**
 * Filters for library rule repository.
 */
export interface ILibraryRuleFilters {
    /** Target language filter. */
    readonly language?: string

    /** Bucket filter. */
    readonly category?: string

    /** Severity filter. */
    readonly severity?: SeverityLevel

    /** Rule applicability scope filter. */
    readonly scope?: LibraryRuleScope

    /** Limit list to global rules. */
    readonly isGlobal?: boolean
}

/**
 * Port for library rule persistence and search.
 */
export interface ILibraryRuleRepository extends IRepository<LibraryRule> {
    /**
     * Finds rule by natural UUID.
     *
     * @param ruleUuid Rule UUID.
     * @returns Matching rule or null.
     */
    findByUuid(ruleUuid: string): Promise<LibraryRule | null>

    /**
     * Finds rules by target language.
     *
     * @param language Target language.
     * @returns Matching rules.
     */
    findByLanguage(language: string): Promise<readonly LibraryRule[]>

    /**
     * Finds rules by category/bucket slug.
     *
     * @param category Bucket slug.
     * @returns Matching rules.
     */
    findByCategory(category: string): Promise<readonly LibraryRule[]>

    /**
     * Finds global rules.
     *
     * @returns Global rule list.
     */
    findGlobal(): Promise<readonly LibraryRule[]>

    /**
     * Finds organization-scoped rules.
     *
     * @param organizationId Organization identifier.
     * @returns Matching rules for organization.
     */
    findByOrganization(organizationId: OrganizationId): Promise<readonly LibraryRule[]>

    /**
     * Counts rules by combined filters.
     *
     * @param filters Filtering criteria.
     * @returns Total count.
     */
    count(filters: ILibraryRuleFilters): Promise<number>

    /**
     * Persists many rules.
     *
     * @param rules Library rules.
     * @returns Promise resolved when operation completes.
     */
    saveMany(rules: readonly LibraryRule[]): Promise<void>

    /**
     * Deletes rule by identifier.
     *
     * @param id Rule entity identifier.
     * @returns Promise resolved when operation completes.
     */
    delete(id: UniqueId): Promise<void>
}
