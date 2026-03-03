import type {IDirectoryConfig} from "../config/directory-config.dto"

export const REVIEW_DEPTH_STRATEGY = {
    AUTO: "auto",
    ALWAYS_LIGHT: "always-light",
    ALWAYS_HEAVY: "always-heavy",
} as const

export type ReviewDepthStrategy =
    (typeof REVIEW_DEPTH_STRATEGY)[keyof typeof REVIEW_DEPTH_STRATEGY]

/**
 * Optional prompt overrides for review pipeline stages.
 */
export interface IReviewPromptOverridesDTO {
    readonly systemPrompt?: string
    readonly reviewerPrompt?: string
    readonly summaryPrompt?: string
}

/**
 * Fully resolved and validated review config payload.
 *
 * Index signature keeps backward-compatible extensibility for adapter-specific
 * configuration flags that are not part of core review contract.
 */
export type ValidatedConfig = IReviewConfigDTO & {
    readonly [key: string]: unknown
}

/**
 * Review configuration snapshot used across application boundaries.
 *
 * This DTO intentionally uses only primitive values and arrays of primitives.
 */
export interface IReviewConfigDTO {
    readonly severityThreshold: string
    readonly ignorePaths: readonly string[]
    readonly maxSuggestionsPerFile: number
    readonly maxSuggestionsPerCCR: number
    readonly cadence: string
    readonly customRuleIds: readonly string[]
    readonly reviewDepthStrategy?: ReviewDepthStrategy
    readonly directories?: readonly IDirectoryConfig[]
    readonly promptOverrides?: IReviewPromptOverridesDTO
}
