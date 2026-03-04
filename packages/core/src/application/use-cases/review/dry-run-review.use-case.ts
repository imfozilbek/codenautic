import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {
    IPipelineDefinition,
    IPipelineDefinitionStage,
} from "../../types/review/pipeline-definition.type"
import {ReviewPipelineState} from "../../types/review/review-pipeline-state"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {
    PIPELINE_STAGE_RESULT_STATUS,
    type IPipelineResult,
    type IPipelineStageExecutionResult,
} from "../../types/review/pipeline-result.type"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"
import type {IReviewDryRunDefaults} from "../../dto/config/system-defaults.dto"

const PIPELINE_RUNTIME_STAGE_ID = "pipeline-runtime"
const PIPELINE_DEFINITION_STAGE_ID = "pipeline-definition"

interface IStageRunOutput {
    state: ReviewPipelineState
    execution: IPipelineStageExecutionResult
    failureError?: StageError
}

interface IStageFailureContext {
    readonly stageDefinition: IPipelineDefinitionStage
    readonly attempt: number
    readonly durationMs: number
}

/**
 * Command payload for dry-run review execution.
 */
export interface IDryRunReviewCommand {
    readonly initialState: ReviewPipelineState
    readonly definition: IPipelineDefinition
    readonly startFromStageId?: string
}

/**
 * Dependencies for dry-run review orchestrator.
 */
export interface IDryRunReviewDependencies {
    readonly stages: Readonly<Record<string, IPipelineStageUseCase>>
    readonly now?: () => Date
    readonly defaults: IReviewDryRunDefaults
}

/**
 * Review use case for simulation without write-side effects.
 */
export class DryRunReviewUseCase implements IUseCase<IDryRunReviewCommand, IPipelineResult, StageError> {
    private readonly stages: Readonly<Record<string, IPipelineStageUseCase>>
    private readonly nowProvider: () => Date
    private readonly mutatingStageIds: ReadonlySet<string>
    private readonly defaults: IReviewDryRunDefaults

    /**
     * Creates dry-run review use case.
     *
     * @param dependencies Runtime dependencies.
     */
    public constructor(dependencies: IDryRunReviewDependencies) {
        this.stages = dependencies.stages
        this.defaults = dependencies.defaults
        this.nowProvider = dependencies.now ?? (() => new Date())
        this.mutatingStageIds = new Set(this.defaults.mutatingStageIds)
    }

    /**
     * Executes pipeline definition in deterministic simulation mode.
     * No external write side effects are executed for mutating stages.
     *
     * @param input Input payload.
     * @returns Simulation report or fail.
     */
    public async execute(input: IDryRunReviewCommand): Promise<Result<IPipelineResult, StageError>> {
        try {
            const definitionValidation = this.validateDefinition(input.initialState, input.definition)
            if (definitionValidation.isFail) {
                return Result.fail<IPipelineResult, StageError>(definitionValidation.error)
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
        } catch (error: unknown) {
            return Result.fail<IPipelineResult, StageError>(
                this.createPipelineError(
                    input.initialState,
                    input.definition.definitionVersion,
                    PIPELINE_RUNTIME_STAGE_ID,
                    this.resolveUnexpectedErrorMessage(error),
                ),
            )
        }
    }

    /**
     * Runs all stages from computed index and accumulates trace.
     *
     * @param initialState Initial state.
     * @param definition Pipeline definition.
     * @param startIndex Stage start index.
     * @param initialResults Pre-filled skipped stage records.
     * @param startedAt Pipeline start timestamp.
     * @returns Simulation result.
     */
    private async runStages(
        initialState: ReviewPipelineState,
        definition: IPipelineDefinition,
        startIndex: number,
        initialResults: IPipelineStageExecutionResult[],
        startedAt: Date,
    ): Promise<Result<IPipelineResult, StageError>> {
        let state = initialState
        const stageResults = [...initialResults]

        for (const stage of definition.stages.slice(startIndex)) {
            const stageResult = await this.executeOneStage(state, definition, stage)
            if (stageResult.isFail) {
                return Result.fail<IPipelineResult, StageError>(stageResult.error)
            }

            state = stageResult.value.state
            stageResults.push(stageResult.value.execution)

            if (stageResult.value.failureError !== undefined) {
                return Result.ok<IPipelineResult, StageError>({
                    runId: state.runId,
                    definitionVersion: definition.definitionVersion,
                    context: state,
                    stageResults,
                    totalDurationMs: this.calculateDurationMs(startedAt, this.nowProvider()),
                    success: false,
                    stoppedAtStageId: stage.stageId,
                    failureReason: stageResult.value.failureError.message,
                })
            }
        }

        return Result.ok<IPipelineResult, StageError>({
            runId: state.runId,
            definitionVersion: definition.definitionVersion,
            context: state,
            stageResults,
            totalDurationMs: this.calculateDurationMs(startedAt, this.nowProvider()),
            success: true,
        })
    }

    /**
     * Executes one stage and converts it to stage result or failure record.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @returns Stage output.
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
                    `No stage implementation registered for stageId ${stageDefinition.stageId}`,
                ),
            )
        }

        const attempt = state.getStageAttempt(stageDefinition.stageId) + 1
        const startedState = state.incrementStageAttempt(stageDefinition.stageId).with({
            currentStageId: stageDefinition.stageId,
        })
        const startedAt = this.nowProvider()

        if (this.mutatingStageIds.has(stageDefinition.stageId)) {
            return Result.ok<IStageRunOutput, StageError>({
                state: startedState.with({
                    lastCompletedStageId: stageDefinition.stageId,
                }),
                execution: {
                    stageId: stageDefinition.stageId,
                    stageName: stageDefinition.stageName,
                    durationMs: 0,
                    status: PIPELINE_STAGE_RESULT_STATUS.SKIPPED,
                    attempt,
                    metadata: {
                        checkpointHint: "dry-run:write-stage-skipped",
                        notes: `Skipping mutating stage ${stageDefinition.stageId} in dry-run`,
                    },
                },
            })
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
                    durationMs: this.calculateDurationMs(startedAt, this.nowProvider()),
                },
                transitionResult.error,
            )
        }

        if (transitionResult.value.isFail) {
            return this.handleStageFailure(
                startedState,
                definition,
                {
                    stageDefinition,
                    attempt,
                    durationMs: this.calculateDurationMs(startedAt, this.nowProvider()),
                },
                transitionResult.value.error,
            )
        }

        return this.handleStageSuccess(transitionResult.value.value.state, definition, stageDefinition, attempt, {
            durationMs: this.calculateDurationMs(startedAt, this.nowProvider()),
            metadata: transitionResult.value.value.metadata,
        })
    }

    /**
     * Executes stage use-case and captures unexpected exceptions.
     *
     * @param stageUseCase Stage use-case.
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @param attempt Stage attempt.
     * @returns Stage transition.
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
            } satisfies IStageCommand)

            return Result.ok<Result<IStageTransition, StageError>, StageError>(transitionResult)
        } catch (error: unknown) {
            return Result.fail<Result<IStageTransition, StageError>, StageError>(
                new StageError({
                    runId: state.runId,
                    definitionVersion: definition.definitionVersion,
                    stageId: stageDefinition.stageId,
                    attempt,
                    recoverable: false,
                    message: this.resolveUnexpectedErrorMessage(error),
                    originalError: error instanceof Error ? error : undefined,
                }),
            )
        }
    }

    /**
     * Handles stage failure and creates failed stage output.
     *
     * @param state Stage state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @param attempt Stage attempt.
     * @param durationMs Duration.
     * @param error Stage error.
     * @returns Failed output.
     */
    private handleStageFailure(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        context: IStageFailureContext,
        error: StageError,
    ): Result<IStageRunOutput, StageError> {
        const normalizedError = this.normalizeStageError(
            error,
            state,
            definition,
            context.stageDefinition,
            context.attempt,
        )

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
     * Handles successful stage completion.
     *
     * @param state Stage state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @param attempt Attempt number.
     * @param context Result metadata.
     * @returns Successful stage output.
     */
    private handleStageSuccess(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageDefinition: IPipelineDefinitionStage,
        attempt: number,
        context: {
            readonly durationMs: number
            readonly metadata?: {readonly checkpointHint?: string; readonly notes?: string}
        },
    ): Result<IStageRunOutput, StageError> {
        const completedState = state.with({
            definitionVersion: definition.definitionVersion,
            currentStageId: stageDefinition.stageId,
            lastCompletedStageId: stageDefinition.stageId,
        })

        return Result.ok<IStageRunOutput, StageError>({
            state: completedState,
            execution: {
                stageId: stageDefinition.stageId,
                stageName: stageDefinition.stageName,
                durationMs: context.durationMs,
                status: PIPELINE_STAGE_RESULT_STATUS.OK,
                attempt,
                metadata: context.metadata,
            },
        })
    }

    /**
     * Creates skipped results before start index (for resumption).
     *
     * @param state Runtime state.
     * @param stages All stages.
     * @param startIndex Start index.
     * @returns Stage results.
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
     * Validates pipeline definition.
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

            if (stageIds.has(stageId) === true) {
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
     * Resolves start index for execution.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @param startFromStageId Optional start stage id.
     * @returns Start index.
     */
    private resolveStartIndex(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        startFromStageId: string | undefined,
    ): Result<number, StageError> {
        if (startFromStageId === undefined) {
            return this.resolveImplicitStartIndex(state, definition)
        }

        if (startFromStageId.trim().length === 0) {
            return Result.fail<number, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_RUNTIME_STAGE_ID,
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
                    PIPELINE_RUNTIME_STAGE_ID,
                    "startFromStageId does not exist in pipeline definition",
                ),
            )
        }

        return Result.ok<number, StageError>(startIndex)
    }

    /**
     * Resolves implicit start index from checkpoint state.
     *
     * - if currentStageId exists and differs from lastCompletedStageId, resumes from current stage
     * - otherwise continues with next stage after lastCompletedStageId
     * - fallback to index 0 for new runs.
     *
     * @param state Current state.
     * @param definition Pipeline definition.
     * @returns Start index or fail.
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
                const completedIndex = currentIndex + 1
                if (completedIndex >= definition.stages.length) {
                    return Result.fail<number, StageError>(
                        this.createPipelineError(
                            state,
                            definition.definitionVersion,
                            PIPELINE_RUNTIME_STAGE_ID,
                            "Pipeline run is already completed, no stages left to execute",
                        ),
                    )
                }

                return Result.ok<number, StageError>(completedIndex)
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
     * Pins definition version in state when pipeline is not in progress.
     *
     * @param state Pipeline state.
     * @param definition Pipeline definition.
     * @returns Pinned state.
     */
    private pinDefinitionVersion(
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
    ): Result<ReviewPipelineState, StageError> {
        if (state.hasProgress && state.definitionVersion !== definition.definitionVersion) {
            return Result.fail<ReviewPipelineState, StageError>(
                this.createPipelineError(
                    state,
                    definition.definitionVersion,
                    PIPELINE_DEFINITION_STAGE_ID,
                    "Cannot change definitionVersion for in-flight pipeline run",
                ),
            )
        }

        if (state.definitionVersion === definition.definitionVersion) {
            return Result.ok<ReviewPipelineState, StageError>(state)
        }

        return Result.ok<ReviewPipelineState, StageError>(
            state.with({
                definitionVersion: definition.definitionVersion,
            }),
        )
    }

    /**
     * Builds stage-normalized pipeline error.
     *
     * @param state Pipeline state.
     * @param definitionVersion Definition version.
     * @param stageId Stage id.
     * @param message Message.
     * @returns StageError.
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
            stageId,
            attempt: this.defaults.startAttempt,
            recoverable: false,
            message,
        })
    }

    /**
     * Normalizes stage error and ensures required metadata.
     *
     * @param error Raw error.
     * @param state Pipeline state.
     * @param definition Pipeline definition.
     * @param stageDefinition Stage definition.
     * @param attempt Current attempt.
     * @returns StageError.
     */
    private normalizeStageError(
        error: StageError,
        state: ReviewPipelineState,
        definition: IPipelineDefinition,
        stageDefinition: IPipelineDefinitionStage,
        attempt: number,
    ): StageError {
        return new StageError({
            runId: state.runId,
            definitionVersion: definition.definitionVersion,
            stageId: stageDefinition.stageId,
            attempt,
            recoverable: error.recoverable,
            message: error.message,
            originalError: error.originalError ?? undefined,
        })
    }

    /**
     * Resolves unexpected error message.
     *
     * @param error Unknown error.
     * @returns Message string.
     */
    private resolveUnexpectedErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return "Dry-run stage failed due to unexpected error"
    }

    /**
     * Computes duration between two points.
     *
     * @param startedAt Start timestamp.
     * @param finishedAt End timestamp.
     * @returns Duration in ms.
     */
    private calculateDurationMs(startedAt: Date, finishedAt: Date): number {
        return Math.max(0, finishedAt.getTime() - startedAt.getTime())
    }
}
