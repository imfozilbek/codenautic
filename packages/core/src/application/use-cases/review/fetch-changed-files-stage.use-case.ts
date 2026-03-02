import type {IGitProvider} from "../../ports/outbound/git/git-provider.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {StageError} from "../../../domain/errors/stage.error"
import {FilePath} from "../../../domain/value-objects/file-path.value-object"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"

/**
 * Dependencies for fetch-changed-files stage use case.
 */
export interface IFetchChangedFilesStageDependencies {
    gitProvider: IGitProvider
}

/**
 * Stage 6 use case. Fetches changed files and applies config ignorePaths filters.
 */
export class FetchChangedFilesStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly gitProvider: IGitProvider

    /**
     * Creates fetch-changed-files stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IFetchChangedFilesStageDependencies) {
        this.stageId = "fetch-changed-files"
        this.stageName = "Fetch Changed Files"
        this.gitProvider = dependencies.gitProvider
    }

    /**
     * Loads merge request diff files and writes filtered file list to state.
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
                    "Missing merge request id for changed files fetch",
                    false,
                    new NotFoundError("MergeRequest", "id"),
                ),
            )
        }

        try {
            const changedFiles = await this.gitProvider.getChangedFiles(mergeRequestId)
            const ignorePatterns = this.resolveIgnorePatterns(input.state.config)
            const filteredFiles = changedFiles.filter((file): boolean => {
                const filePath = FilePath.create(file.path)
                const shouldIgnore = ignorePatterns.some((pattern): boolean => {
                    return filePath.matchesGlob(pattern)
                })

                return shouldIgnore === false
            })

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    files: filteredFiles.map((file) => {
                        return {
                            path: file.path,
                            status: file.status,
                            oldPath: file.oldPath,
                            patch: file.patch,
                            hunks: [...file.hunks],
                        }
                    }),
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        changedFiles: {
                            total: changedFiles.length,
                            ignored: changedFiles.length - filteredFiles.length,
                            remaining: filteredFiles.length,
                        },
                    }),
                }),
                metadata: {
                    checkpointHint: "files:fetched",
                },
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to fetch changed files",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Resolves ignore path patterns from config payload.
     *
     * @param config Config payload.
     * @returns Normalized ignore path patterns.
     */
    private resolveIgnorePatterns(config: Readonly<Record<string, unknown>>): readonly string[] {
        const rawIgnorePaths = config["ignorePaths"]
        if (!Array.isArray(rawIgnorePaths)) {
            return []
        }

        const patterns: string[] = []
        for (const rawPattern of rawIgnorePaths) {
            if (typeof rawPattern !== "string") {
                continue
            }

            const normalizedPattern = rawPattern.trim()
            if (normalizedPattern.length === 0) {
                continue
            }

            patterns.push(normalizedPattern)
        }

        return patterns
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
