import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IDomainEventBus} from "../../ports/outbound/common/domain-event-bus.port"
import type {ILogger} from "../../ports/outbound/common/logger.port"
import {
    PIPELINE_CHECKPOINT_STATUS,
    type IPipelineCheckpointStore,
    type PipelineCheckpointStatus,
} from "../../ports/outbound/review/pipeline-checkpoint-store.port"
import type {IPipelineDefinition, IPipelineDefinitionStage} from "../../types/review/pipeline-definition.type"
import {
    PIPELINE_STAGE_RESULT_STATUS,
    type IPipelineResult,
    type IPipelineStageExecutionResult,
} from "../../types/review/pipeline-result.type"
import {
    type IPipelineStageUseCase,
    type IStageTransition,
    type IStageTransitionMetadata,
} from "../../types/review/pipeline-stage.contract"
import {ReviewPipelineState} from "../../types/review/review-pipeline-state"
import {PipelineCompleted} from "../../../domain/events/pipeline-completed"
import {PipelineFailed} from "../../../domain/events/pipeline-failed"
import {PipelineStarted} from "../../../domain/events/pipeline-started"
import {StageCompleted} from "../../../domain/events/stage-completed"
import {StageFailed} from "../../../domain/events/stage-failed"
import {StageStarted} from "../../../domain/events/stage-started"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"

const PIPELINE_RUNTIME_STAGE_ID = "pipeline-runtime"
const PIPELINE_DEFINITION_STAGE_ID = "pipeline-definition"
const PIPELINE_COMPLETION_STAGE_ID = "pipeline-completion"
const PIPELINE_FAILURE_STAGE_ID = "pipeline-failure"
const FIRST_STAGE_ATTEMPT = 1

/**
 * Pipeline run command payload.
 */
export interface IPipelineRunCommand {
    initialState: ReviewPipelineState
    definition: IPipelineDefinition
    startFromStageId?: string
}

/**
 * Constructor dependencies for pipeline orchestrator.
 */
export interface IPipelineOrchestratorDependencies {
    stages: Readonly<Record<string, IPipelineStageUseCase>>
    domainEventBus: IDomainEventBus
    checkpointStore: IPipelineCheckpointStore
    logger: ILogger
    now?: () => Date
}

/**
 * Stage failure handler context.
 */
interface IStageFailureContext {
    stageDefinition: IPipelineDefinitionStage
    attempt: number
    durationMs: number
}

/**
 * Output payload for one stage run.
 */
interface IStageRunOutput {
    state: ReviewPipelineState
    execution: IPipelineStageExecutionResult
    failureError?: StageError
}

/**
 * Unified side-effect execution parameters.
 */
interface IExecuteSideEffectParams {
    effect: () => Promise<void>
    state: ReviewPipelineState
    definitionVersion: string
    stageId: string
    attempt: number
    recoverable: boolean
    failureMessage: string
}

/**
 * Success stage handler context.
 */
interface IStageSuccessContext {
    stageDefinition: IPipelineDefinitionStage
    attempt: number
    durationMs: number
    metadata?: IStageTransitionMetadata
}

/**
 * Failed pipeline result builder context.
 */
interface IBuildFailedPipelineResultContext {
    stoppedAtStageId: string
    failureReason: string
}

/**
 * Logger guard context.
 */
interface ILogWithGuardParams {
    method: "info" | "debug" | "error"
    state: ReviewPipelineState
    definitionVersion: string
    stageId: string
    attempt: number
    message: string
    context: Record<string, unknown>
}

/**
 * Unexpected error normalization parameters.
 */
interface INormalizeUnexpectedErrorParams {
    error: unknown
    state: ReviewPipelineState
    definitionVersion: string
    stageId: string
    attempt: number
    recoverable: boolean
    failureMessage: string
}

/**
 * Review pipeline orchestrator use case.
 */
export class PipelineOrchestratorUseCase
    implements IUseCase<IPipelineRunCommand, IPipelineResult, StageError>
{
    private readonly stages: Readonly<Record<string, IPipelineStageUseCase>>
    private readonly domainEventBus: IDomainEventBus
    private readonly checkpointStore: IPipelineCheckpointStore
    private readonly logger: ILogger
    private readonly nowProvider: () => Date

    /**
     * Creates orchestrator instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IPipelineOrchestratorDependencies) {
        this.stages = dependencies.stages
        this.domainEventBus = dependencies.domainEventBus
        this.checkpointStore = dependencies.checkpointStore
        this.logger = dependencies.logger
        this.nowProvider = dependencies.now ?? (() => new Date())
    }

    /**
     * Executes pipeline definition over immutable state.
     *
     * @param input Run command payload.
     * @returns Pipeline result or stage error.
     */
    public async execute(input: IPipelineRunCommand): Promise<Result<IPipelineResult, StageError>> {
        try {
            return await this.executeInternal(input)
        } catch (error: unknown) {
            return Result.fail<IPipelineResult, StageError>(
                this.normalizeUnexpectedError({
                    error,
                    state: input.initialState,
                    definitionVersion: input.definition.definitionVersion,
                    stageId: PIPELINE_RUNTIME_STAGE_ID,
                    attempt: FIRST_STAGE_ATTEMPT,
                    recoverable: false,
                    failureMessage: "Pipeline orchestration crashed unexpectedly",
                }),
            )
        }
    }

    /**
     * Executes validated run command.
     *
     * @param input Run command payload.
     * @returns Pipeline result or stage error.
     */
    private async executeInternal(
        input: IPipelineRunCommand,
    ): Promise<Result<IPipelineResult, StageError>> {
        const definitionValidationResult = this.validateDefinition(input.initialState, input.definition)
        if (definitionValidationResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(definitionValidationResult.error)
        }

        const pinnedStateResult = this.pinDefinitionVersion(input.initialState, input.definition)
        if (pinnedStateResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(pinnedStateResult.error)
        }

        const startIndexResult = this.resolveStartIndex(
            pinnedStateResult.value,
            input.definition,
            input.startFromStageId,
        )
        if (startIndexResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(startIndexResult.error)
        }

        const startedAt = this.nowProvider()
        const firstStage = input.definition.stages[startIndexResult.value]
        if (firstStage === undefined) {
            return Result.fail<IPipelineResult, StageError>(
                this.createPipelineError(
                    pinnedStateResult.value,
                    input.definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "Pipeline definition has no stage at resolved start index",
                ),
            )
        }

        const startedEventResult = await this.publishPipelineStarted(
            pinnedStateResult.value,
            input.definition,
            firstStage.stageId,
        )
        if (startedEventResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(startedEventResult.error)
        }

        const skippedResults = this.createSkippedResults(
            pinnedStateResult.value,
            input.definition.stages,
            startIndexResult.value,
        )

        return this.runStages(
            pinnedStateResult.value,
            input.definition,
            startIndexResult.value,
            skippedResults,
            startedAt,
        )
    }

    /**
     * Validates pipeline definition consistency before execution.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @returns Validation result.
     */
    private validateDefinition(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
    ): Result<void, StageError> {
        if (definition.stages.length === 0) {
            return Result.fail<void, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "Pipeline definition must contain at least one stage",
                ),
            )
        }

        const stageIds = new Set<string>()
        for (const stage of definition.stages) {
            const stageId = stage.stageId.trim()
            if (stageId.length === 0) {
                return Result.fail<void, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_DEFINITION_STAGE_ID,
                        "Pipeline definition contains empty stageId",
                    ),
                )
            }

            if (stageIds.has(stageId)) {
                return Result.fail<void, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_DEFINITION_STAGE_ID,
                        `Pipeline definition contains duplicate stageId: ${stageId}`,
                    ),
                )
            }

            stageIds.add(stageId)

            if (this.stages[stageId] === undefined) {
                return Result.fail<void, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_DEFINITION_STAGE_ID,
                        `No stage implementation registered for stageId ${stageId}`,
                    ),
                )
            }
        }

        return Result.ok<void, StageError>(undefined)
    }

    /**
     * Resolves start index from optional stage id.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param startFromStageId Optional stage id.
     * @returns Start index or stage error.
     */
    private resolveStartIndex(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        startFromStageId: string | undefined,
    ): Result<number, StageError> {
        if (definition.stages.length === 0) {
            return Result.fail<number, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "Pipeline definition must contain at least one stage",
                ),
            )
        }

        if (startFromStageId === undefined) {
            return this.resolveImplicitStartIndex(state, definition)
        }

        if (startFromStageId.trim().length === 0) {
            return Result.fail<number, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "startFromStageId must be a non-empty string when provided",
                ),
            )
        }

        const startIndex = definition.stages.findIndex((stage): boolean => {
            return stage.stageId === startFromStageId
        })

        if (startIndex < 0) {
            return Result.fail<number, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "startFromStageId does not exist in pipeline definition",
                ),
            )
        }

        return Result.ok<number, StageError>(startIndex)
    }

    /**
     * Resolves start index from current state when startFromStageId is not set.
     *
     * - if currentStageId is present and differs from lastCompletedStageId,
     *   resume starts from current stage;
     * - otherwise resume starts from the next stage after lastCompletedStageId.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @returns Stage index or stage error.
     */
    private resolveImplicitStartIndex(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
    ): Result<number, StageError> {
        if (state.currentStageId !== null) {
            const currentIndex = definition.stages.findIndex((stage): boolean => {
                return stage.stageId === state.currentStageId
            })
            if (currentIndex < 0) {
                return Result.fail<number, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_RUNTIME_STAGE_ID,
                        `Current stage id ${state.currentStageId} not found in definition`,
                    ),
                )
            }

            if (state.currentStageId === state.lastCompletedStageId) {
                const completedStage = currentIndex + 1
                if (completedStage >= definition.stages.length) {
                    return Result.fail<number, StageError>(
                        this.createPipelineError(
                            state,
                            definition.definitionVersion,
                            PIPELINE_RUNTIME_STAGE_ID,
                            "Pipeline run is already completed, no stages left to execute",
                        ),
                    )
                }

                return Result.ok<number, StageError>(completedStage)
            }

            return Result.ok<number, StageError>(currentIndex)
        }

        if (state.lastCompletedStageId !== null) {
            const lastCompletedIndex = definition.stages.findIndex((stage): boolean => {
                return stage.stageId === state.lastCompletedStageId
            })

            if (lastCompletedIndex < 0) {
                return Result.fail<number, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_RUNTIME_STAGE_ID,
                        `Last completed stage id ${state.lastCompletedStageId} not found in definition`,
                    ),
                )
            }

            const nextIndex = lastCompletedIndex + 1
            if (nextIndex >= definition.stages.length) {
                return Result.fail<number, StageError>(
                    this.createPipelineError(
                        state,
                        definition.definitionVersion,
                        PIPELINE_RUNTIME_STAGE_ID,
                        "Pipeline run is already completed, no stages left to execute",
                    ),
                )
            }

            return Result.ok<number, StageError>(nextIndex)
        }

        return Result.ok<number, StageError>(0)
    }

    /**
     * Pins definition version into state.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @returns Pinned state or stage error.
     */
    private pinDefinitionVersion(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
    ): Result<ReviewPipelineState, StageError> {
        if (state.definitionVersion === definition.definitionVersion) {
            return Result.ok<ReviewPipelineState, StageError>(state)
        }

        if (state.hasProgress) {
            return Result.fail<ReviewPipelineState, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "Cannot change definitionVersion for in-flight pipeline run",
                ),
            )
        }

        return Result.ok<ReviewPipelineState, StageError>(
            state.with({
                definitionVersion: definition.definitionVersion,
            }),
        )
    }

    /**
     * Runs stages and accumulates execution result.
     *
     * @param initialState Initial run state.
     * @param definition Pipeline definition.
     * @param startIndex Stage start index.
     * @param stageResults Initial stage results.
     * @param startedAt Run start time.
     * @returns Pipeline result or stage error.
     */
    private async runStages(
        initialState: ReviewPipelineState,
        definition: IPipelineDefinition,
        startIndex: number,
        stageResults: IPipelineStageExecutionResult[],
        startedAt: Date,
    ): Promise<Result<IPipelineResult, StageError>> {
        let state = initialState

        for (const stage of definition.stages.slice(startIndex)) {
            const stageResult = await this.executeOneStage(state, definition, stage)
            if (stageResult.isFail) {
                return Result.fail<IPipelineResult, StageError>(stageResult.error)
            }

            state = stageResult.value.state
            stageResults.push(stageResult.value.execution)

            if (stageResult.value.failureError !== undefined) {
                return Result.ok<IPipelineResult, StageError>(
                    this.buildFailedPipelineResult(
                        state,
                        definition,
                        stageResults,
                        startedAt,
                        {
                            stoppedAtStageId: stage.stageId,
                            failureReason: stageResult.value.failureError.message,
                        },
                    ),
                )
            }
        }

        return this.buildCompletedPipelineResult(state, definition, stageResults, startedAt)
    }

    /**
     * Builds successful pipeline result and emits completion side effects.
     *
     * @param state Final state.
     * @param definition Pipeline definition.
     * @param stageResults Executed stage records.
     * @param startedAt Pipeline start time.
     * @returns Successful pipeline result or stage error.
     */
    private async buildCompletedPipelineResult(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageResults: readonly IPipelineStageExecutionResult[],
        startedAt: Date,
    ): Promise<Result<IPipelineResult, StageError>> {
        const finishedAt = this.nowProvider()
        const totalDurationMs = this.calculateDurationMs(startedAt, finishedAt)

        const completedEventResult = await this.publishPipelineCompleted(
            state,
            definition,
            totalDurationMs,
            stageResults.length,
        )
        if (completedEventResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(completedEventResult.error)
        }

        const infoLogResult = await this.logWithGuard({
            method: "info",
            state,
            definitionVersion: definition.definitionVersion,
            stageId: PIPELINE_COMPLETION_STAGE_ID,
            attempt: FIRST_STAGE_ATTEMPT,
            message: "Pipeline execution completed",
            context: {
                runId: state.runId,
                definitionVersion: definition.definitionVersion,
                stageCount: stageResults.length,
                totalDurationMs,
            },
        })
        if (infoLogResult.isFail) {
            return Result.fail<IPipelineResult, StageError>(infoLogResult.error)
        }

        return Result.ok<IPipelineResult, StageError>({
            runId: state.runId,
            definitionVersion: definition.definitionVersion,
            context: state,
            stageResults,
            totalDurationMs,
            success: true,
        })
    }

    /**
     * Builds failed pipeline result with partial stage trace.
     *
     * @param state State at failure point.
     * @param definition Pipeline definition.
     * @param stageResults Stage records up to failure.
     * @param startedAt Pipeline start time.
     * @param stoppedAtStageId Failed stage identifier.
     * @param failureReason Human-readable reason.
     * @returns Failed pipeline result.
     */
    private buildFailedPipelineResult(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageResults: readonly IPipelineStageExecutionResult[],
        startedAt: Date,
        context: IBuildFailedPipelineResultContext,
    ): IPipelineResult {
        const finishedAt = this.nowProvider()

        return {
            runId: state.runId,
            definitionVersion: definition.definitionVersion,
            context: state,
            stageResults,
            totalDurationMs: this.calculateDurationMs(startedAt, finishedAt),
            success: false,
            stoppedAtStageId: context.stoppedAtStageId,
            failureReason: context.failureReason,
        }
    }

    /**
     * Executes one stage with lifecycle and checkpoint side effects.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition entry.
     * @returns Updated stage output or orchestration failure.
     */
    private async executeOneStage(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageDefinition: IPipelineDefinitionStage,
    ): Promise<Result<IStageRunOutput, StageError>> {
        const stageUseCase = this.stages[stageDefinition.stageId]
        if (stageUseCase === undefined) {
            return Result.fail<IStageRunOutput, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    stageDefinition.stageId,
                    "No stage implementation registered for stageId",
                ),
            )
        }

        const attempt = state.getStageAttempt(stageDefinition.stageId) + 1
        const startedState = state
            .incrementStageAttempt(stageDefinition.stageId)
            .with({
                currentStageId: stageDefinition.stageId,
            })
        const stageStartedAt = this.nowProvider()

        const startedCheckpointResult = await this.saveCheckpoint(
            startedState,
            stageDefinition.stageId,
            attempt,
            PIPELINE_CHECKPOINT_STATUS.STARTED,
        )
        if (startedCheckpointResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(startedCheckpointResult.error)
        }

        const stageStartedEventResult = await this.publishStageStarted(
            startedState,
            definition,
            stageDefinition.stageId,
            attempt,
        )
        if (stageStartedEventResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(stageStartedEventResult.error)
        }

        const transitionResult = await this.executeStageUseCase(
            stageUseCase,
            startedState,
            definition,
            stageDefinition,
            attempt,
        )
        if (transitionResult.isFail) {
            return this.handleStageFailure(
                startedState,
                definition,
                {
                    stageDefinition,
                    attempt,
                    durationMs: this.calculateDurationMs(stageStartedAt, this.nowProvider()),
                },
                transitionResult.error,
            )
        }

        const stageFinishedAt = this.nowProvider()
        const durationMs = this.calculateDurationMs(stageStartedAt, stageFinishedAt)

        if (transitionResult.value.isFail) {
            return this.handleStageFailure(
                startedState,
                definition,
                {
                    stageDefinition,
                    attempt,
                    durationMs,
                },
                transitionResult.value.error,
            )
        }

        return this.handleStageSuccess(
            transitionResult.value.value.state,
            definition,
            {
                stageDefinition,
                attempt,
                durationMs,
                metadata: transitionResult.value.value.metadata,
            },
        )
    }

    /**
     * Executes stage use case and normalizes unexpected exceptions.
     *
     * @param stageUseCase Stage use case.
     * @param state Current stage state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @param attempt Attempt number.
     * @returns Stage transition result or stage error.
     */
    private async executeStageUseCase(
        stageUseCase: IPipelineStageUseCase,
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageDefinition: IPipelineDefinitionStage,
        attempt: number,
    ): Promise<Result<Result<IStageTransition, StageError>, StageError>> {
        try {
            const transitionResult = await stageUseCase.execute({
                state,
            })

            return Result.ok<Result<IStageTransition, StageError>, StageError>(transitionResult)
        } catch (error: unknown) {
            return Result.fail<Result<IStageTransition, StageError>, StageError>(
                this.normalizeUnexpectedError({
                    error,
                    state,
                    definitionVersion: definition.definitionVersion,
                    stageId: stageDefinition.stageId,
                    attempt,
                    recoverable: false,
                    failureMessage: "Stage use case threw unexpected exception",
                }),
            )
        }
    }

    /**
     * Creates skipped stage records before resume start index.
     *
     * @param state Current state.
     * @param stages All pipeline stages.
     * @param startIndex Resume start index.
     * @returns Skipped stage records.
     */
    private createSkippedResults(
        state: ReviewPipelineState,
        stages: readonly IPipelineDefinitionStage[],
        startIndex: number,
    ): IPipelineStageExecutionResult[] {
        const skippedResults: IPipelineStageExecutionResult[] = []

        for (const skippedStage of stages.slice(0, startIndex)) {
            skippedResults.push({
                stageId: skippedStage.stageId,
                stageName: skippedStage.stageName,
                durationMs: 0,
                status: PIPELINE_STAGE_RESULT_STATUS.SKIPPED,
                attempt: state.getStageAttempt(skippedStage.stageId),
            })
        }

        return skippedResults
    }

    /**
     * Handles stage failure side effects.
     *
     * @param state State at stage start.
     * @param definition Pipeline definition.
     * @param context Stage execution metadata.
     * @param error Stage error.
     * @returns Failed stage execution record or orchestration failure.
     */
    private async handleStageFailure(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        context: IStageFailureContext,
        error: StageError,
    ): Promise<Result<IStageRunOutput, StageError>> {
        const normalizedError = this.normalizeStageError(
            error,
            state,
            definition.definitionVersion,
            context.stageDefinition.stageId,
            context.attempt,
        )

        const failedCheckpointResult = await this.saveCheckpoint(
            state,
            context.stageDefinition.stageId,
            context.attempt,
            PIPELINE_CHECKPOINT_STATUS.FAILED,
        )
        if (failedCheckpointResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(failedCheckpointResult.error)
        }

        const stageFailedEventResult = await this.publishStageFailed(
            state,
            definition,
            context.stageDefinition.stageId,
            context.attempt,
            normalizedError,
        )
        if (stageFailedEventResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(stageFailedEventResult.error)
        }

        const pipelineFailedEventResult = await this.publishPipelineFailed(
            state,
            definition,
            context.stageDefinition.stageId,
            normalizedError,
        )
        if (pipelineFailedEventResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(pipelineFailedEventResult.error)
        }

        const errorLogResult = await this.logWithGuard({
            method: "error",
            state,
            definitionVersion: definition.definitionVersion,
            stageId: context.stageDefinition.stageId,
            attempt: context.attempt,
            message: "Pipeline stage failed",
            context: {
                runId: state.runId,
                definitionVersion: definition.definitionVersion,
                stageId: context.stageDefinition.stageId,
                attempt: context.attempt,
                durationMs: context.durationMs,
                errorCode: normalizedError.code,
                recoverable: normalizedError.recoverable,
            },
        })
        if (errorLogResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(errorLogResult.error)
        }

        return Result.ok<IStageRunOutput, StageError>({
            state,
            execution: {
                stageId: context.stageDefinition.stageId,
                stageName: context.stageDefinition.stageName,
                durationMs: context.durationMs,
                status: PIPELINE_STAGE_RESULT_STATUS.FAIL,
                attempt: context.attempt,
            },
            failureError: normalizedError,
        })
    }

    /**
     * Handles successful stage completion side effects.
     *
     * @param state Stage transition state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition entry.
     * @param attempt Attempt number.
     * @param durationMs Stage duration.
     * @param metadata Stage transition metadata.
     * @returns Successful stage execution result or orchestration failure.
     */
    private async handleStageSuccess(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        context: IStageSuccessContext,
    ): Promise<Result<IStageRunOutput, StageError>> {
        const completedState = state.with({
            definitionVersion: definition.definitionVersion,
            currentStageId: context.stageDefinition.stageId,
            lastCompletedStageId: context.stageDefinition.stageId,
        })

        const completedCheckpointResult = await this.saveCheckpoint(
            completedState,
            context.stageDefinition.stageId,
            context.attempt,
            PIPELINE_CHECKPOINT_STATUS.COMPLETED,
        )
        if (completedCheckpointResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(completedCheckpointResult.error)
        }

        const stageCompletedEventResult = await this.publishStageCompleted(
            completedState,
            definition,
            context.stageDefinition.stageId,
            context.attempt,
            context.durationMs,
        )
        if (stageCompletedEventResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(stageCompletedEventResult.error)
        }

        const debugLogResult = await this.logWithGuard({
            method: "debug",
            state: completedState,
            definitionVersion: definition.definitionVersion,
            stageId: context.stageDefinition.stageId,
            attempt: context.attempt,
            message: "Pipeline stage completed",
            context: {
                runId: completedState.runId,
                definitionVersion: definition.definitionVersion,
                stageId: context.stageDefinition.stageId,
                attempt: context.attempt,
                durationMs: context.durationMs,
            },
        })
        if (debugLogResult.isFail) {
            return Result.fail<IStageRunOutput, StageError>(debugLogResult.error)
        }

        return Result.ok<IStageRunOutput, StageError>({
            state: completedState,
            execution: {
                stageId: context.stageDefinition.stageId,
                stageName: context.stageDefinition.stageName,
                durationMs: context.durationMs,
                status: PIPELINE_STAGE_RESULT_STATUS.OK,
                attempt: context.attempt,
                metadata: context.metadata,
            },
        })
    }

    /**
     * Persists stage checkpoint.
     *
     * @param state Current state.
     * @param currentStageId Stage id.
     * @param attempt Stage attempt.
     * @param status Checkpoint status.
     * @returns Side-effect execution result.
     */
    private async saveCheckpoint(
        state: ReviewPipelineState,
        currentStageId: string,
        attempt: number,
        status: PipelineCheckpointStatus,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.checkpointStore.save({
                    runId: state.runId,
                    definitionVersion: state.definitionVersion,
                    currentStageId,
                    lastCompletedStageId: state.lastCompletedStageId,
                    attempt,
                    status,
                    occurredAt: this.nowProvider(),
                })
            },
            state,
            definitionVersion: state.definitionVersion,
            stageId: currentStageId,
            attempt,
            recoverable: true,
            failureMessage: "Failed to persist pipeline checkpoint",
        })
    }

    /**
     * Normalizes stage error metadata to current execution context.
     *
     * @param error Original stage error.
     * @param state Current state.
     * @param definitionVersion Definition version.
     * @param stageId Stage identifier.
     * @param attempt Stage attempt.
     * @returns Normalized stage error.
     */
    private normalizeStageError(
        error: StageError,
        state: ReviewPipelineState,
        definitionVersion: string,
        stageId: string,
        attempt: number,
    ): StageError {
        const normalizedStageId = this.normalizeStageIdentifier(stageId, PIPELINE_RUNTIME_STAGE_ID)
        const normalizedAttempt = Math.max(FIRST_STAGE_ATTEMPT, attempt)

        const isSameRun = error.runId === state.runId
        const isSameDefinition = error.definitionVersion === definitionVersion
        const isSameStage = error.stageId === normalizedStageId
        const isSameAttempt = error.attempt === normalizedAttempt

        if (isSameRun && isSameDefinition && isSameStage && isSameAttempt) {
            return error
        }

        return new StageError({
            runId: state.runId,
            definitionVersion,
            stageId: normalizedStageId,
            attempt: normalizedAttempt,
            recoverable: error.recoverable,
            message: error.message,
            originalError: error,
        })
    }

    /**
     * Publishes pipeline started event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param startedStageId First stage id.
     * @returns Side-effect execution result.
     */
    private async publishPipelineStarted(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        startedStageId: string,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new PipelineStarted(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        startedStageId,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId: startedStageId,
            attempt: FIRST_STAGE_ATTEMPT,
            recoverable: false,
            failureMessage: "Failed to publish PipelineStarted event",
        })
    }

    /**
     * Publishes stage started event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageId Stage identifier.
     * @param attempt Stage attempt.
     * @returns Side-effect execution result.
     */
    private async publishStageStarted(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageId: string,
        attempt: number,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new StageStarted(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        stageId,
                        attempt,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId,
            attempt,
            recoverable: true,
            failureMessage: "Failed to publish StageStarted event",
        })
    }

    /**
     * Publishes stage completed event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageId Stage identifier.
     * @param attempt Stage attempt.
     * @param durationMs Stage duration.
     * @returns Side-effect execution result.
     */
    private async publishStageCompleted(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageId: string,
        attempt: number,
        durationMs: number,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new StageCompleted(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        stageId,
                        attempt,
                        durationMs,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId,
            attempt,
            recoverable: true,
            failureMessage: "Failed to publish StageCompleted event",
        })
    }

    /**
     * Publishes stage failed event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageId Stage identifier.
     * @param attempt Stage attempt.
     * @param error Stage error.
     * @returns Side-effect execution result.
     */
    private async publishStageFailed(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageId: string,
        attempt: number,
        error: StageError,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new StageFailed(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        stageId,
                        attempt,
                        recoverable: error.recoverable,
                        errorCode: error.code,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId,
            attempt,
            recoverable: true,
            failureMessage: "Failed to publish StageFailed event",
        })
    }

    /**
     * Publishes pipeline completed event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param totalDurationMs Total duration.
     * @param stageCount Executed stage count.
     * @returns Side-effect execution result.
     */
    private async publishPipelineCompleted(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        totalDurationMs: number,
        stageCount: number,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new PipelineCompleted(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        totalDurationMs,
                        stageCount,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId: PIPELINE_COMPLETION_STAGE_ID,
            attempt: FIRST_STAGE_ATTEMPT,
            recoverable: false,
            failureMessage: "Failed to publish PipelineCompleted event",
        })
    }

    /**
     * Publishes pipeline failed event.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageId Failed stage id.
     * @param error Stage error.
     * @returns Side-effect execution result.
     */
    private async publishPipelineFailed(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageId: string,
        error: StageError,
    ): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.domainEventBus.publish([
                    new PipelineFailed(state.runId, {
                        runId: state.runId,
                        definitionVersion: definition.definitionVersion,
                        failedStageId: stageId,
                        terminal: error.recoverable === false,
                        reason: error.message,
                    }),
                ])
            },
            state,
            definitionVersion: definition.definitionVersion,
            stageId: PIPELINE_FAILURE_STAGE_ID,
            attempt: error.attempt,
            recoverable: false,
            failureMessage: "Failed to publish PipelineFailed event",
        })
    }

    /**
     * Writes log entry through guarded side-effect execution.
     *
     * @param params Log execution parameters.
     * @returns Side-effect execution result.
     */
    private async logWithGuard(params: ILogWithGuardParams): Promise<Result<void, StageError>> {
        return this.executeSideEffect({
            effect: async (): Promise<void> => {
                await this.logger[params.method](params.message, params.context)
            },
            state: params.state,
            definitionVersion: params.definitionVersion,
            stageId: params.stageId,
            attempt: params.attempt,
            recoverable: true,
            failureMessage: `Failed to write ${params.method} log entry`,
        })
    }

    /**
     * Executes side effect with normalized stage errors.
     *
     * @param params Side-effect execution parameters.
     * @returns Success or normalized stage error.
     */
    private async executeSideEffect(
        params: IExecuteSideEffectParams,
    ): Promise<Result<void, StageError>> {
        try {
            await params.effect()
            return Result.ok<void, StageError>(undefined)
        } catch (error: unknown) {
            return Result.fail<void, StageError>(
                this.normalizeUnexpectedError({
                    error,
                    state: params.state,
                    definitionVersion: params.definitionVersion,
                    stageId: params.stageId,
                    attempt: params.attempt,
                    recoverable: params.recoverable,
                    failureMessage: params.failureMessage,
                }),
            )
        }
    }

    /**
     * Normalizes unknown error to stage error.
     *
     * @param params Unexpected error normalization parameters.
     * @returns Normalized stage error.
     */
    private normalizeUnexpectedError(params: INormalizeUnexpectedErrorParams): StageError {
        if (params.error instanceof StageError) {
            return this.normalizeStageError(
                params.error,
                params.state,
                params.definitionVersion,
                params.stageId,
                params.attempt,
            )
        }

        const normalizedStageId = this.normalizeStageIdentifier(
            params.stageId,
            PIPELINE_RUNTIME_STAGE_ID,
        )
        const normalizedAttempt = Math.max(FIRST_STAGE_ATTEMPT, params.attempt)

        if (params.error instanceof Error) {
            return new StageError({
                runId: params.state.runId,
                definitionVersion: params.definitionVersion,
                stageId: normalizedStageId,
                attempt: normalizedAttempt,
                recoverable: params.recoverable,
                message: `${params.failureMessage}: ${params.error.message}`,
                originalError: params.error,
            })
        }

        return new StageError({
            runId: params.state.runId,
            definitionVersion: params.definitionVersion,
            stageId: normalizedStageId,
            attempt: normalizedAttempt,
            recoverable: params.recoverable,
            message: `${params.failureMessage}: unknown error type`,
        })
    }

    /**
     * Normalizes stage identifier with fallback.
     *
     * @param stageId Candidate stage identifier.
     * @param fallback Fallback value.
     * @returns Normalized stage identifier.
     */
    private normalizeStageIdentifier(stageId: string, fallback: string): string {
        const normalizedStageId = stageId.trim()
        if (normalizedStageId.length === 0) {
            return fallback
        }

        return normalizedStageId
    }

    /**
     * Calculates duration in milliseconds.
     *
     * @param startedAt Start timestamp.
     * @param finishedAt Finish timestamp.
     * @returns Duration in milliseconds.
     */
    private calculateDurationMs(startedAt: Date, finishedAt: Date): number {
        return Math.max(0, finishedAt.getTime() - startedAt.getTime())
    }

    /**
     * Creates non-recoverable pipeline-level stage error.
     *
     * @param state Current state.
     * @param definitionVersion Definition version.
     * @param stageId Stage identifier.
     * @param message Error message.
     * @returns Stage error instance.
     */
    private createPipelineError(
        state: ReviewPipelineState,
        definitionVersion: string,
        stageId: string,
        message: string,
    ): StageError {
        return new StageError({
            runId: state.runId,
            definitionVersion,
            stageId: this.normalizeStageIdentifier(stageId, PIPELINE_RUNTIME_STAGE_ID),
            attempt: FIRST_STAGE_ATTEMPT,
            recoverable: false,
            message,
        })
    }
}

/**
 * Backward-compatible alias for previous runner naming.
 */
export const PipelineRunner = PipelineOrchestratorUseCase
