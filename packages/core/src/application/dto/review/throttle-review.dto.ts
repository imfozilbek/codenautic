/**
 * Input for throttleReviewUseCase.
 */
export interface IThrottleReviewInput {
    /**
     * Repository identifier.
     */
    readonly repoId: string
}

/**
 * Output for throttleReviewUseCase.
 */
export interface IThrottleReviewOutput {
    /**
     * Whether review is allowed at this moment.
     */
    readonly allowed: boolean

    /**
     * Number of seconds until the next review can be retried.
     */
    readonly retryAfter?: number
}
