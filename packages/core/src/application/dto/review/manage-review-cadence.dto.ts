/**
 * Supported review cadence event types.
 */
export const REVIEW_CADENCE_EVENT_TYPE = {
    AUTO_TRIGGER: "auto-trigger",
    MANUAL_TRIGGER: "manual-trigger",
    RESUME_COMMAND: "resume-command",
} as const

/**
 * Review cadence event type values.
 */
export type ReviewCadenceEventType =
    (typeof REVIEW_CADENCE_EVENT_TYPE)[keyof typeof REVIEW_CADENCE_EVENT_TYPE]

/**
 * Event from automatic review trigger.
 */
export interface IReviewCadenceAutoTriggerEvent {
    /**
     * Event type.
     */
    readonly type: typeof REVIEW_CADENCE_EVENT_TYPE.AUTO_TRIGGER

    /**
     * Number of suggestions produced by the previous review cycle.
     *
     * Used only when auto-pause cadence is enabled.
     */
    readonly suggestionCount?: number
}

/**
 * Event from a manual @codenautic command.
 */
export interface IReviewCadenceManualTriggerEvent {
    /**
     * Event type.
     */
    readonly type: typeof REVIEW_CADENCE_EVENT_TYPE.MANUAL_TRIGGER

    /**
     * Number of suggestions produced by the previous review cycle.
     *
     * Used only when auto-pause cadence is enabled.
     */
    readonly suggestionCount?: number
}

/**
 * Event from resume command.
 */
export interface IReviewCadenceResumeCommandEvent {
    /**
     * Event type.
     */
    readonly type: typeof REVIEW_CADENCE_EVENT_TYPE.RESUME_COMMAND
}

/**
 * Review cadence evaluation input event.
 */
export type IReviewCadenceEvent =
    | IReviewCadenceAutoTriggerEvent
    | IReviewCadenceManualTriggerEvent
    | IReviewCadenceResumeCommandEvent

/**
 * Input for manageReviewCadenceUseCase.
 */
export interface IManageReviewCadenceInput {
    /**
     * Repository identifier.
     */
    readonly repoId: string

    /**
     * Trigger event and optional previous cycle metrics.
     */
    readonly event: IReviewCadenceEvent
}

/**
 * Result of cadence check.
 */
export interface IManageReviewCadenceOutput {
    /**
     * Whether review should be executed.
     */
    readonly shouldReview: boolean

    /**
     * Human-readable reason for the decision.
     */
    readonly reason: string
}
