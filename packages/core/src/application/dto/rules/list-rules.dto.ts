import type {ILibraryRuleDTO} from "./library-rule.dto"

/**
 * Input payload for listing rules library.
 */
export interface IListRulesInput {
    /** Filter by target language. */
    readonly language?: string

    /** Filter by category/bucket slug. */
    readonly category?: string

    /** Filter by severity level. */
    readonly severity?: string

    /** Filter by scope. */
    readonly scope?: string

    /** Result page number (1-based). */
    readonly page?: number

    /** Max results per page. */
    readonly limit?: number
}

/**
 * Output payload for rule list use case.
 */
export interface IListRulesOutput {
    /** Returned rules after filtering. */
    readonly rules: readonly ILibraryRuleDTO[]

    /** Total matching rules count. */
    readonly total: number
}
