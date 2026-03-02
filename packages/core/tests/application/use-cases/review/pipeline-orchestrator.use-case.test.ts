import {describe, expect, test} from "bun:test"

import type {ILogger} from "../../../../src/application/ports/outbound/common/logger.port"
import type {IDomainEventBus} from "../../../../src/application/ports/outbound/common/domain-event-bus.port"
import {
    PIPELINE_CHECKPOINT_STATUS,
    type IPipelineCheckpointStore,
    type IPipelineStageCheckpoint,
} from "../../../../src/application/ports/outbound/review/pipeline-checkpoint-store.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../../../src/application/types/review/pipeline-stage.contract"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {
    PipelineOrchestratorUseCase,
    type IPipelineRunCommand,
} from "../../../../src/application/use-cases/review/pipeline-orchestrator.use-case"
import {PIPELINE_STAGE_RESULT_STATUS} from "../../../../src/application/types/review/pipeline-result.type"
import type {DomainEventPayload} from "../../../../src/domain/events/base-domain-event"
import type {BaseDomainEvent} from "../../../../src/domain/events/base-domain-event"
import {StageError} from "../../../../src/domain/errors/stage.error"
import {Result} from "../../../../src/shared/result"

class InMemoryDomainEventBus implements IDomainEventBus {
    public readonly publishedEvents: BaseDomainEvent<DomainEventPayload>[] = []

    public publish(events: readonly BaseDomainEvent<DomainEventPayload>[]): Promise<void> {
        this.publishedEvents.push(...events)
        return Promise.resolve()
    }
}

class InMemoryCheckpointStore implements IPipelineCheckpointStore {
    public readonly checkpoints: IPipelineStageCheckpoint[] = []

    public save(checkpoint: IPipelineStageCheckpoint): Promise<void> {
        this.checkpoints.push(checkpoint)
        return Promise.resolve()
    }
}

class InMemoryLogger implements ILogger {
    public readonly infoMessages: string[] = []
    public readonly warnMessages: string[] = []
    public readonly errorMessages: string[] = []
    public readonly debugMessages: string[] = []

    public info(message: string): Promise<void> {
        this.infoMessages.push(message)
        return Promise.resolve()
    }

    public warn(message: string): Promise<void> {
        this.warnMessages.push(message)
        return Promise.resolve()
    }

    public error(message: string): Promise<void> {
        this.errorMessages.push(message)
        return Promise.resolve()
    }

    public debug(message: string): Promise<void> {
        this.debugMessages.push(message)
        return Promise.resolve()
    }

    public child(_context: Record<string, unknown>): ILogger {
        return this
    }
}

class StaticStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string
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
        return Promise.resolve(this.transitionFactory(input.state))
    }
}

describe("PipelineOrchestratorUseCase", () => {
    test("executes stages sequentially and returns successful pipeline result", async () => {
        const definition = {
            definitionVersion: "v1",
            stages: [
                {stageId: "stage-a", stageName: "Stage A"},
                {stageId: "stage-b", stageName: "Stage B"},
            ],
        }
        const initialState = ReviewPipelineState.create({
            runId: "run-1",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-1"},
            config: {},
        })
        const domainEventBus = new InMemoryDomainEventBus()
        const checkpointStore = new InMemoryCheckpointStore()
        const logger = new InMemoryLogger()
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state: state.with({
                            suggestions: [{id: "s-1"}],
                        }),
                        metadata: {
                            checkpointHint: "ctx-loaded",
                        },
                    })
                }),
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state: state.with({
                            metrics: {duration: 5},
                        }),
                    })
                }),
            },
            domainEventBus,
            checkpointStore,
            logger,
            now: () => new Date("2026-03-03T08:00:00.000Z"),
        })

        const result = await orchestrator.execute({
            initialState,
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.success).toBe(true)
        expect(result.value.stageResults).toHaveLength(2)
        expect(result.value.context.lastCompletedStageId).toBe("stage-b")
        expect(result.value.context.getStageAttempt("stage-a")).toBe(1)
        expect(result.value.context.getStageAttempt("stage-b")).toBe(1)
        expect(result.value.stageResults[0]?.metadata?.checkpointHint).toBe("ctx-loaded")
        expect(checkpointStore.checkpoints).toHaveLength(4)
        expect(domainEventBus.publishedEvents.map((event) => event.eventName)).toEqual([
            "PipelineStarted",
            "StageStarted",
            "StageCompleted",
            "StageStarted",
            "StageCompleted",
            "PipelineCompleted",
        ])
        expect(logger.errorMessages).toHaveLength(0)
    })

    test("uses default now provider when custom now dependency is not provided", async () => {
        const definition = {
            definitionVersion: "v1",
            stages: [{stageId: "stage-a", stageName: "Stage A"}],
        }
        const initialState = ReviewPipelineState.create({
            runId: "run-default-now",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-default-now"},
            config: {},
        })
        const checkpointStore = new InMemoryCheckpointStore()
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            domainEventBus: new InMemoryDomainEventBus(),
            checkpointStore,
            logger: new InMemoryLogger(),
        })

        const result = await orchestrator.execute({
            initialState,
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.totalDurationMs).toBeGreaterThanOrEqual(0)
        expect(checkpointStore.checkpoints).toHaveLength(2)
        expect(checkpointStore.checkpoints[0]?.occurredAt).toBeInstanceOf(Date)
        expect(checkpointStore.checkpoints[1]?.occurredAt).toBeInstanceOf(Date)
    })

    test("returns failure on stage error and publishes failure lifecycle events", async () => {
        const definition = {
            definitionVersion: "v1",
            stages: [
                {stageId: "stage-a", stageName: "Stage A"},
                {stageId: "stage-b", stageName: "Stage B"},
            ],
        }
        const initialState = ReviewPipelineState.create({
            runId: "run-2",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-2"},
            config: {},
        })
        const domainEventBus = new InMemoryDomainEventBus()
        const checkpointStore = new InMemoryCheckpointStore()
        const logger = new InMemoryLogger()
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (_state) => {
                    return Result.fail<IStageTransition, StageError>(
                        new StageError({
                            runId: "run-2",
                            definitionVersion: "v1",
                            stageId: "stage-b",
                            attempt: 1,
                            recoverable: false,
                            message: "Stage B failed",
                        }),
                    )
                }),
            },
            domainEventBus,
            checkpointStore,
            logger,
            now: () => new Date("2026-03-03T08:00:00.000Z"),
        })

        const result = await orchestrator.execute({
            initialState,
            definition,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.success).toBe(false)
        expect(result.value.stoppedAtStageId).toBe("stage-b")
        expect(result.value.failureReason).toBe("Stage B failed")
        expect(result.value.stageResults).toHaveLength(2)
        expect(result.value.stageResults[1]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.FAIL)
        expect(checkpointStore.checkpoints).toHaveLength(4)
        expect(checkpointStore.checkpoints[3]?.status).toBe(PIPELINE_CHECKPOINT_STATUS.FAILED)
        expect(domainEventBus.publishedEvents.map((event) => event.eventName)).toEqual([
            "PipelineStarted",
            "StageStarted",
            "StageCompleted",
            "StageStarted",
            "StageFailed",
            "PipelineFailed",
        ])
        expect(logger.errorMessages).toHaveLength(1)
    })

    test("returns fail result when startFromStageId is empty string", async () => {
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            domainEventBus: new InMemoryDomainEventBus(),
            checkpointStore: new InMemoryCheckpointStore(),
            logger: new InMemoryLogger(),
        })

        const result = await orchestrator.execute({
            initialState: ReviewPipelineState.create({
                runId: "run-empty-start",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
            }),
            definition: {
                definitionVersion: "v1",
                stages: [{stageId: "stage-a", stageName: "Stage A"}],
            },
            startFromStageId: " ",
        })

        expect(result.isFail).toBe(true)
        expect(result.error.message).toContain("startFromStageId must be a non-empty string")
    })

    test("returns fail result when checkpoint side effect rejects", async () => {
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            domainEventBus: new InMemoryDomainEventBus(),
            checkpointStore: {
                save: (): Promise<void> => {
                    return Promise.reject(new Error("storage unavailable"))
                },
            },
            logger: new InMemoryLogger(),
        })

        const result = await orchestrator.execute({
            initialState: ReviewPipelineState.create({
                runId: "run-checkpoint-fail",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
            }),
            definition: {
                definitionVersion: "v1",
                stages: [{stageId: "stage-a", stageName: "Stage A"}],
            },
        })

        expect(result.isFail).toBe(true)
        expect(result.error.code).toBe("STAGE_ERROR")
        expect(result.error.message).toContain("Failed to persist pipeline checkpoint")
    })

    test("returns failure when in-flight run tries to switch definition version", async () => {
        const initialState = ReviewPipelineState.create({
            runId: "run-3",
            definitionVersion: "v0",
            mergeRequest: {id: "mr-3"},
            config: {},
            stageAttempts: {"stage-a": 1},
            lastCompletedStageId: "stage-a",
        })
        const command: IPipelineRunCommand = {
            initialState,
            definition: {
                definitionVersion: "v1",
                stages: [{stageId: "stage-a", stageName: "Stage A"}],
            },
        }
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-a": new StaticStageUseCase("stage-a", "Stage A", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            domainEventBus: new InMemoryDomainEventBus(),
            checkpointStore: new InMemoryCheckpointStore(),
            logger: new InMemoryLogger(),
        })

        const result = await orchestrator.execute(command)

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("Cannot change definitionVersion")
    })

    test("marks pre-start stages as skipped when resuming from middle stage", async () => {
        const definition = {
            definitionVersion: "v1",
            stages: [
                {stageId: "stage-a", stageName: "Stage A"},
                {stageId: "stage-b", stageName: "Stage B"},
                {stageId: "stage-c", stageName: "Stage C"},
            ],
        }
        const initialState = ReviewPipelineState.create({
            runId: "run-4",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-4"},
            config: {},
            stageAttempts: {"stage-a": 1},
            lastCompletedStageId: "stage-a",
        })
        const orchestrator = new PipelineOrchestratorUseCase({
            stages: {
                "stage-b": new StaticStageUseCase("stage-b", "Stage B", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
                "stage-c": new StaticStageUseCase("stage-c", "Stage C", (state) => {
                    return Result.ok<IStageTransition, StageError>({
                        state,
                    })
                }),
            },
            domainEventBus: new InMemoryDomainEventBus(),
            checkpointStore: new InMemoryCheckpointStore(),
            logger: new InMemoryLogger(),
            now: () => new Date("2026-03-03T08:00:00.000Z"),
        })

        const result = await orchestrator.execute({
            initialState,
            definition,
            startFromStageId: "stage-b",
        })

        expect(result.isOk).toBe(true)
        expect(result.value.stageResults).toHaveLength(3)
        expect(result.value.stageResults[0]?.status).toBe(PIPELINE_STAGE_RESULT_STATUS.SKIPPED)
        expect(result.value.stageResults[1]?.stageId).toBe("stage-b")
        expect(result.value.stageResults[2]?.stageId).toBe("stage-c")
    })
})
