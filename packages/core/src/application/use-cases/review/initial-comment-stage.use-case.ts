import type {IGitProvider} from "../../ports/outbound/git/git-provider.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {StageError} from "../../../domain/errors/stage.error"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"

const DEFAULT_INITIAL_COMMENT_BODY = "CodeNautic review started. Preparing analysis..."

/**
 * Dependencies for initial-comment stage use case.
 */
export interface IInitialCommentStageDependencies {
    gitProvider: IGitProvider
}

/**
 * Stage 9 use case. Posts initial review-started comment and stores commentId in state.
 */
export class InitialCommentStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly gitProvider: IGitProvider

    /**
     * Creates initial-comment stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IInitialCommentStageDependencies) {
        this.stageId = "initial-comment"
        this.stageName = "Initial Comment"
        this.gitProvider = dependencies.gitProvider
    }

    /**
     * Posts initial comment and writes `commentId` into pipeline state.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const mergeRequestId = readStringField(input.state.mergeRequest, "id")
        if (mergeRequestId === undefined) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Missing merge request id for initial comment",
                    false,
                    new NotFoundError("MergeRequest", "id"),
                ),
            )
        }

        const configuredComment = readStringField(input.state.config, "initialCommentBody")
        const commentBody = configuredComment ?? DEFAULT_INITIAL_COMMENT_BODY

        try {
            const createdComment = await this.gitProvider.postComment(
                mergeRequestId,
                commentBody,
            )

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    commentId: createdComment.id,
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        initialComment: {
                            id: createdComment.id,
                            createdAt: createdComment.createdAt,
                        },
                    }),
                }),
                metadata: {
                    checkpointHint: "initial-comment:created",
                },
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to create initial review comment",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Creates normalized stage error.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pinned definition version.
     * @param message Error message.
     * @param recoverable Recoverable flag.
     * @param originalError Optional wrapped error.
     * @returns Stage error.
     */
    private createStageError(
        runId: string,
        definitionVersion: string,
        message: string,
        recoverable: boolean,
        originalError?: Error,
    ): StageError {
        return new StageError({
            runId,
            definitionVersion,
            stageId: this.stageId,
            attempt: INITIAL_STAGE_ATTEMPT,
            recoverable,
            message,
            originalError,
        })
    }
}
