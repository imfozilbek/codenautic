import type {ReviewPipelineState} from "./review-pipeline-state"
import type {IStageTransitionMetadata} from "./pipeline-stage.contract"

/**
 * Stage execution statuses captured in pipeline result.
 */
export const PIPELINE_STAGE_RESULT_STATUS = {
    OK: "ok",
    FAIL: "fail",
    SKIPPED: "skipped",
} as const

/**
 * Stage result status literal.
 */
export type PipelineStageResultStatus =
    (typeof PIPELINE_STAGE_RESULT_STATUS)[keyof typeof PIPELINE_STAGE_RESULT_STATUS]

/**
 * One stage execution record.
 */
export interface IPipelineStageExecutionResult {
    stageId: string
    stageName: string
    durationMs: number
    status: PipelineStageResultStatus
    attempt: number
    metadata?: IStageTransitionMetadata
}

/**
 * Full pipeline execution output.
 */
export interface IPipelineResult {
    runId: string
    definitionVersion: string
    context: ReviewPipelineState
    stageResults: readonly IPipelineStageExecutionResult[]
    totalDurationMs: number
    success: boolean
    stoppedAtStageId?: string
    failureReason?: string
}
