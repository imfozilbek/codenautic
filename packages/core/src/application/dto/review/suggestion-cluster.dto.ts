/**
 * Подтип кластера для группировки предложений.
 */
export type SuggestionClusterType = "parent" | "related"

/**
 * Группа связанных предложений, сформированных на этапе кластеризации.
 */
export interface ISuggestionClusterDTO {
    readonly type: SuggestionClusterType
    readonly relatedSuggestionIds: readonly string[]
    readonly parentSuggestionId?: string
    readonly problemDescription: string
    readonly actionStatement: string
}
