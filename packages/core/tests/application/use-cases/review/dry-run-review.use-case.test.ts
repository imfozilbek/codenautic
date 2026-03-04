import {describe, expect, test} from "bun:test"

import type {IStageCommand, IStageTransition} from "../../../../src/application/types/review/pipeline-stage.contract"
import type {IPipelineDefinition} from "../../../../src/application/types/review/pipeline-definition.type"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {DryRunReviewUseCase} from "../../../../src/application/use-cases/review/dry-run-review.use-case"
import {PIPELINE_STAGE_RESULT_STATUS} from "../../../../src/application/types/review/pipeline-result.type"
import {StageError} from "../../../../src/domain/errors/stage.error"
import {Result} from "../../../../src/shared/result"
import type {IPipelineStageUseCase} from "../../../../src/application/types/review/pipeline-stage.contract"

const dryRunDefaults = {
    startAttempt: 1,
    mutatingStageIds: ["create-check"],
}

class StaticStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string
    public executions = 0
    private readonly transitionFactory: (state: ReviewPipelineState) => Result<IStageTransition, StageError>

    public constructor(
        stageId: string,
        stageName: string,
        transitionFactory: (state: ReviewPipelineState) => Result<IStageTransition, StageError>,
    ) {
        this.stageId = stageId
        this.stageName = stageName
        this.transitionFactory = transitionFactory
    }

    public execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        this.executions += 1
        return Promise.resolve(this.transitionFactory(input.state))
    }
}

class ThrowingStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string
    public executed = false

    public constructor(stageId: string, stageName: string) {
        this.stageId = stageId
        this.stageName = stageName
    }

    public execute(_input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        this.executed = true
        return Promise.resolve(
            Result.fail<IStageTransition, StageError>(
                new StageError({
                    runId: "never",
                    definitionVersion: "v1",
                    stageId: this.stageId,
                    attempt: 1,
                    recoverable: false,
                    message: "stage should be skipped in dry-run",
                }),
            ),
        )
    }
}

function createState(runId: string, definitionVersion: string): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId,
        definitionVersion,
        mergeRequest: {id: "mr-1"},
        config: {},
    })
}

function createDefinition(): IPipelineDefinition {
    return {
        definitionVersion: "v1",
        stages: [
            {stageId: "stage-a", stageName: "Stage A"},
            {stageId: "stage-b", stageName: "Stage B"},
        ],
    }
}

describe("DryRunReviewUseCase", () => {
    test("executes stages in pipeline order and returns trace", async () => {
        const definition = createDefinition()
        const writeStage = new StaticStageUseCase("stage-a", "Stage A", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state: state.with({
                    checkId: "check-a",
                }),
            })
        })
        const readStage = new StaticStageUseCase("stage-b", "Stage B", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state: state.with({
                    commentId: "comment-b",
                }),
            })
        })
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": writeStage,
                "stage-b": readStage,
            },
            defaults: dryRunDefaults,
            now: () => new Date("2026-03-03T08:00:00.000Z"),
        })

        const result = await useCase.execute({
            initialState: createState("run-1", "v1"),
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.success).toBe(true)
        expect(result.value.stageResults).toHaveLength(2)
        expect(result.value.context.checkId).toBe("check-a")
        expect(result.value.context.commentId).toBe("comment-b")
        expect(result.value.context.getStageAttempt("stage-a")).toBe(1)
        expect(result.value.context.getStageAttempt("stage-b")).toBe(1)
        expect(result.value.context.lastCompletedStageId).toBe("stage-b")
        expect(result.value.stageResults[0]?.stageId).toBe("stage-a")
        expect(result.value.stageResults[1]?.stageId).toBe("stage-b")
        expect(result.value.stageResults[0]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.OK)
        expect(result.value.stageResults[0]?.attempt).toBe(1)
        expect(result.value.totalDurationMs).toBeGreaterThanOrEqual(0)
        expect(writeStage.executions).toBe(1)
        expect(readStage.executions).toBe(1)
    })

    test("skips mutating stages when stage is in dry-run mutable deny-list", async () => {
        const mutatingStage = new ThrowingStageUseCase("create-check", "Create Check")
        const regularStage = new StaticStageUseCase("stage-b", "Stage B", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (_state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state: _state,
                    })
                }),
                "create-check": mutatingStage,
                "stage-b": regularStage,
            },
            defaults: dryRunDefaults,
            now: () => new Date("2026-03-03T08:00:00.000Z"),
        })
        const definitionWithMutating: IPipelineDefinition = {
            definitionVersion: "v1",
            stages: [
                {stageId: "create-check", stageName: "Create Check"},
                {stageId: "stage-b", stageName: "Stage B"},
            ],
        }

        const result = await useCase.execute({
            initialState: createState("run-2", "v1"),
            definition: definitionWithMutating,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.stageResults[0]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.SKIPPED)
        expect(result.value.stageResults[0]?.metadata?.checkpointHint).toBe(
            "dry-run:write-stage-skipped",
        )
        expect(mutatingStage.executed).toBe(false)
        expect(regularStage.executions).toBe(1)
    })

    test("returns fail output when stage returns failure", async () => {
        const definition = createDefinition()
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (_state) => {
                    return Result.fail<IStageTransition, StageError>(
                        new StageError({
                            runId: "run-3",
                            definitionVersion: "v1",
                            stageId: "stage-a",
                            attempt: 1,
                            recoverable: false,
                            message: "stage-a failed",
                        }),
                    )
                }),
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            defaults: dryRunDefaults,
        })

        const result = await useCase.execute({
            initialState: createState("run-3", "v1"),
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.success).toBe(false)
        expect(result.value.stoppedAtStageId).toBe("stage-a")
        expect(result.value.failureReason).toBe("stage-a failed")
        expect(result.value.stageResults).toHaveLength(1)
        expect(result.value.stageResults[0]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.FAIL)
    })

    test("uses implicit resume index from completed stage when startFromStageId omitted", async () => {
        const definition = createDefinition()
        const stageA = new StaticStageUseCase("stage-a", "Stage A", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const stageB = new StaticStageUseCase("stage-b", "Stage B", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": stageA,
                "stage-b": stageB,
            },
            defaults: dryRunDefaults,
        })
        const state = createState("run-4", "v1").with({
            currentStageId: "stage-a",
            lastCompletedStageId: "stage-a",
            stageAttempts: {
                "stage-a": 1,
            },
        })

        const result = await useCase.execute({
            initialState: state,
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.stageResults).toHaveLength(2)
        expect(result.value.stageResults[0]?.stageId).toBe("stage-a")
        expect(result.value.stageResults[0]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.SKIPPED)
        expect(result.value.stageResults[1]?.stageId).toBe("stage-b")
        expect(stageA.executions).toBe(0)
        expect(stageB.executions).toBe(1)
    })

    test("returns fail when startFromStageId does not exist", async () => {
        const definition = createDefinition()
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            defaults: dryRunDefaults,
        })

        const result = await useCase.execute({
            initialState: createState("run-5", "v1"),
            definition,
            startFromStageId: "missing",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.message).toBe("startFromStageId does not exist in pipeline definition")
        expect(result.error.message).toContain("startFromStageId does not exist in pipeline definition")
    })

    test("pinning definition version is forbidden when run has progress", async () => {
        const definition = createDefinition()
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            defaults: dryRunDefaults,
        })
        const state = createState("run-6", "v1").with({
            currentStageId: "stage-a",
            lastCompletedStageId: "stage-a",
            stageAttempts: {
                "stage-a": 1,
            },
        })

        const result = await useCase.execute({
            initialState: state,
            definition: {
                definitionVersion: "v2",
                stages: definition.stages,
            },
        })

        expect(result.isFail).toBe(true)
        expect(result.error.message).toContain("Cannot change definitionVersion for in-flight pipeline run")
    })

    test("accepts explicit startFromStageId and executes from that stage", async () => {
        const definition = {
            definitionVersion: "v1",
            stages: [
                {stageId: "stage-a", stageName: "Stage A"},
                {stageId: "stage-b", stageName: "Stage B"},
                {stageId: "stage-c", stageName: "Stage C"},
            ],
        } as const
        const stageA = new StaticStageUseCase("stage-a", "Stage A", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const stageB = new StaticStageUseCase("stage-b", "Stage B", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const stageC = new StaticStageUseCase("stage-c", "Stage C", (state) => {
            return Result.ok<IStageTransition, StageError>({
                state,
            })
        })
        const useCase = new DryRunReviewUseCase({
            stages: {
                "stage-a": stageA,
                "stage-b": stageB,
                "stage-c": stageC,
            },
            defaults: dryRunDefaults,
        })

        const result = await useCase.execute({
            initialState: createState("run-7", "v1"),
            definition,
            startFromStageId: "stage-b",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.stageResults).toHaveLength(3)
        expect(result.value.stageResults[0]?.status).toBe(
            PIPELINE_STAGE_RESULT_STATUS.SKIPPED,
        )
        expect(result.value.stageResults[1]?.stageId).toBe("stage-b")
        expect(result.value.stageResults[2]?.stageId).toBe("stage-c")
        expect(stageA.executions).toBe(0)
        expect(stageB.executions).toBe(1)
        expect(stageC.executions).toBe(1)
    })
})
