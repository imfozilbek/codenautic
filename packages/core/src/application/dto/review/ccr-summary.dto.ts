/**
 * Supported modes for existing CCR summary integration.
 */
export const CCR_SUMMARY_EXISTING_DESCRIPTION_MODES = [
    "REPLACE",
    "COMPLEMENT",
    "CONCATENATE",
] as const

/**
 * Supported modes for new commits summary integration.
 */
export const CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES = [
    "NONE",
    "REPLACE",
    "CONCATENATE",
] as const

/**
 * Existing summary composition mode.
 */
export type CCROldSummaryMode = (typeof CCR_SUMMARY_EXISTING_DESCRIPTION_MODES)[number]

/**
 * New commits summary composition mode.
 */
export type CCRNewCommitsSummaryMode =
    (typeof CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES)[number]

/**
 * Input payload for CCR summary generation.
 */
export interface IGenerateCCRSummaryInput {
    /**
     * Existing summary text from previous run.
     */
    readonly existingSummary?: string

    /**
     * Summary built from current review context.
     */
    readonly newCommitsSummary?: string

    /**
     * How to include existing summary.
     */
    readonly existingDescriptionMode?: CCROldSummaryMode

    /**
     * How to include new commits summary.
     */
    readonly newCommitsDescriptionMode?: CCRNewCommitsSummaryMode

    /**
     * Optional model override.
     */
    readonly model?: string

    /**
     * Optional max tokens for LLM request.
     */
    readonly maxTokens?: number
}

/**
 * Result of CCR summary generation.
 */
export interface IGenerateCCRSummaryOutput {
    /**
     * Final summary produced by LLM.
     */
    readonly summary: string
}

