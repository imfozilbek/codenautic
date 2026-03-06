import type {LibraryRule, LibraryRuleScope} from "../../../domain/entities/library-rule.entity"
import type {SeverityLevel} from "../../../domain/value-objects/severity.value-object"

/**
 * Rule example DTO for admin API boundaries.
 */
export interface ILibraryRuleExampleDTO {
    readonly snippet: string
    readonly isCorrect: boolean
}

/**
 * Library rule DTO for admin API.
 */
export interface ILibraryRuleDTO {
    readonly uuid: string
    readonly title: string
    readonly rule: string
    readonly whyIsThisImportant: string
    readonly severity: SeverityLevel
    readonly examples: readonly ILibraryRuleExampleDTO[]
    readonly language: string
    readonly buckets: readonly string[]
    readonly scope: LibraryRuleScope
    readonly plugAndPlay: boolean
    readonly isGlobal: boolean
    readonly organizationId: string | null
}

/**
 * Input payload for creating library rule.
 */
export interface ICreateLibraryRuleInput {
    readonly uuid: string
    readonly title: string
    readonly rule: string
    readonly whyIsThisImportant: string
    readonly severity: string
    readonly examples?: readonly ILibraryRuleExampleDTO[]
    readonly language?: string
    readonly buckets: readonly string[]
    readonly scope: string
    readonly plugAndPlay?: boolean
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

/**
 * Output payload for creating library rule.
 */
export interface ICreateLibraryRuleOutput {
    readonly rule: ILibraryRuleDTO
}

/**
 * Input payload for updating library rule.
 */
export interface IUpdateLibraryRuleInput {
    readonly ruleUuid: string
    readonly title?: string
    readonly rule?: string
    readonly whyIsThisImportant?: string
    readonly severity?: string
    readonly examples?: readonly ILibraryRuleExampleDTO[]
    readonly language?: string
    readonly buckets?: readonly string[]
    readonly scope?: string
    readonly plugAndPlay?: boolean
    readonly isGlobal?: boolean
    readonly organizationId?: string | null
}

/**
 * Output payload for updating library rule.
 */
export interface IUpdateLibraryRuleOutput {
    readonly rule: ILibraryRuleDTO
}

/**
 * Input payload for rule lookup/delete.
 */
export interface ILibraryRuleIdInput {
    readonly ruleUuid: string
}

/**
 * Output payload for rule lookup.
 */
export interface IGetLibraryRuleOutput {
    readonly rule: ILibraryRuleDTO
}

/**
 * Output payload for rule deletion.
 */
export interface IDeleteLibraryRuleOutput {
    readonly ruleUuid: string
}

/**
 * Maps library rule entity to DTO.
 *
 * @param rule Library rule entity.
 * @returns DTO payload.
 */
export function mapLibraryRuleToDTO(rule: LibraryRule): ILibraryRuleDTO {
    return {
        uuid: rule.uuid,
        title: rule.title,
        rule: rule.rule,
        whyIsThisImportant: rule.whyIsThisImportant,
        severity: rule.severity.toString(),
        examples: rule.examples.map((example) => {
            return {
                snippet: example.snippet,
                isCorrect: example.isCorrect,
            }
        }),
        language: rule.language,
        buckets: rule.buckets,
        scope: rule.scope,
        plugAndPlay: rule.plugAndPlay,
        isGlobal: rule.isGlobal,
        organizationId: rule.organizationId?.value ?? null,
    }
}
