/**
 * Supported check run statuses.
 */
export const CHECK_RUN_STATUS = {
    QUEUED: "queued",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
} as const

/**
 * Check run status literal type.
 */
export type CheckRunStatus = (typeof CHECK_RUN_STATUS)[keyof typeof CHECK_RUN_STATUS]

/**
 * Supported check run conclusions.
 */
export const CHECK_RUN_CONCLUSION = {
    SUCCESS: "success",
    FAILURE: "failure",
    NEUTRAL: "neutral",
    CANCELLED: "cancelled",
} as const

/**
 * Check run conclusion literal type.
 */
export type CheckRunConclusion = (typeof CHECK_RUN_CONCLUSION)[keyof typeof CHECK_RUN_CONCLUSION]

/**
 * Platform-agnostic check run payload.
 */
export interface ICheckRunDTO {
    readonly id: string
    readonly name: string
    readonly status: CheckRunStatus
    readonly conclusion: CheckRunConclusion
    readonly summary?: string
    readonly detailsUrl?: string
}
