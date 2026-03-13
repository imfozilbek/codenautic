import {NOTIFICATION_CHANNEL} from "@codenautic/core"
import type {
    NotificationChannel,
    CheckRunConclusion,
    CheckRunStatus,
    IChatChunkDTO,
    IChatRequestDTO,
    IChatResponseDTO,
    ICheckRunDTO,
    ICommentDTO,
    IGitProvider,
    INotificationPayload,
    INotificationProvider,
    IInlineCommentDTO,
    ILLMProvider,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
    IPipelineCheckpointStore,
    IPipelineStageCheckpoint,
    IReviewRepository,
    IRepositoryWorkspace,
    ICreateRepositoryWorkspaceInput,
    IRepositoryWorkspaceProvider,
    IRuleRepository,
    Review,
    ReviewStatus,
    Rule,
    RuleStatus,
    UniqueId,
} from "@codenautic/core"

/**
 * Minimal git provider for DI tests.
 *
 * @returns Provider instance.
 */
export function createGitProviderMock(): IGitProvider {
    return {
        getMergeRequest(_id: string): Promise<IMergeRequestDTO> {
            return Promise.resolve({} as IMergeRequestDTO)
        },
        getChangedFiles(_mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]> {
            return Promise.resolve([])
        },
        getFileTree(_ref: string): Promise<readonly []> {
            return Promise.resolve([])
        },
        getFileContentByRef(_filePath: string, _ref: string): Promise<string> {
            return Promise.resolve("")
        },
        getBranches(): Promise<readonly []> {
            return Promise.resolve([])
        },
        getCommitHistory(_ref: string): Promise<readonly []> {
            return Promise.resolve([])
        },
        getDiffBetweenRefs(
            baseRef: string,
            headRef: string,
        ): ReturnType<IGitProvider["getDiffBetweenRefs"]> {
            return Promise.resolve({
                baseRef,
                headRef,
                comparisonStatus: "identical",
                aheadBy: 0,
                behindBy: 0,
                totalCommits: 0,
                summary: {
                    changedFiles: 0,
                    addedFiles: 0,
                    modifiedFiles: 0,
                    deletedFiles: 0,
                    renamedFiles: 0,
                    additions: 0,
                    deletions: 0,
                    changes: 0,
                },
                files: [],
            })
        },
        getBlameData(_filePath: string, _ref: string): Promise<readonly []> {
            return Promise.resolve([])
        },
        getBlameDataBatch(
            _filePaths: readonly string[],
            _ref: string,
        ): Promise<readonly []> {
            return Promise.resolve([])
        },
        postComment(_mergeRequestId: string, _body: string): Promise<ICommentDTO> {
            return Promise.resolve({} as ICommentDTO)
        },
        postInlineComment(
            _mergeRequestId: string,
            comment: IInlineCommentDTO,
        ): Promise<IInlineCommentDTO> {
            return Promise.resolve(comment)
        },
        createCheckRun(_mergeRequestId: string, _name: string): Promise<ICheckRunDTO> {
            return Promise.resolve({} as ICheckRunDTO)
        },
        updateCheckRun(
            _checkId: string,
            _status: CheckRunStatus,
            _conclusion: CheckRunConclusion,
        ): Promise<ICheckRunDTO> {
            return Promise.resolve({} as ICheckRunDTO)
        },
    }
}

/**
 * Minimal repository workspace provider for DI tests.
 *
 * @returns Provider instance.
 */
export function createRepositoryWorkspaceProviderMock(): IRepositoryWorkspaceProvider {
    return {
        createWorkspace(
            input: ICreateRepositoryWorkspaceInput,
        ): Promise<IRepositoryWorkspace> {
            return Promise.resolve({
                workspaceId: "workspace-1",
                repositoryId: input.repositoryId,
                ref: input.ref,
                workspacePath: "/tmp/workspace-1",
                isShallow: input.shallow ?? false,
                createdAt: "2026-03-13T10:30:00.000Z",
            })
        },
        disposeWorkspace(_workspaceId: string): Promise<void> {
            return Promise.resolve()
        },
    }
}

/**
 * Minimal llm provider for DI tests.
 *
 * @returns Provider instance.
 */
export function createLlmProviderMock(): ILLMProvider {
    return {
        chat(_request: IChatRequestDTO): Promise<IChatResponseDTO> {
            return Promise.resolve({
                content: "ok",
                usage: {
                    input: 0,
                    output: 0,
                    total: 0,
                },
            })
        },
        stream(_request: IChatRequestDTO): AsyncIterable<IChatChunkDTO> {
            return {
                [Symbol.asyncIterator](): AsyncIterator<IChatChunkDTO> {
                    return {
                        next(): Promise<IteratorResult<IChatChunkDTO>> {
                            return Promise.resolve({
                                done: true,
                                value: undefined,
                            })
                        },
                    }
                },
            }
        },
        embed(_texts: readonly string[]): Promise<readonly number[][]> {
            return Promise.resolve([])
        },
    }
}

/**
 * Minimal notification provider for DI and factory tests.
 *
 * @param channel Supported channel.
 * @returns Provider instance.
 */
export function createNotificationProviderMock(
    channel: NotificationChannel = NOTIFICATION_CHANNEL.SLACK,
): INotificationProvider {
    return {
        channel,
        send(_payload: INotificationPayload): Promise<void> {
            return Promise.resolve()
        },
    }
}

/**
 * Minimal review repository for DI tests.
 *
 * @returns Repository instance.
 */
export function createReviewRepositoryMock(): IReviewRepository {
    return {
        findById(_id: UniqueId): Promise<Review | null> {
            return Promise.resolve(null)
        },
        save(_entity: Review): Promise<void> {
            return Promise.resolve()
        },
        findByMergeRequestId(_mergeRequestId: string): Promise<Review | null> {
            return Promise.resolve(null)
        },
        findByStatus(_status: ReviewStatus): Promise<readonly Review[]> {
            return Promise.resolve([])
        },
        findByDateRange(_from: Date, _to: Date): Promise<readonly Review[]> {
            return Promise.resolve([])
        },
        findByRepositoryId(_repositoryId: string): Promise<readonly Review[]> {
            return Promise.resolve([])
        },
    }
}

/**
 * Minimal pipeline checkpoint store for DI tests.
 *
 * @returns Store instance.
 */
export function createPipelineCheckpointStoreMock(): IPipelineCheckpointStore {
    return {
        save(_checkpoint: IPipelineStageCheckpoint): Promise<void> {
            return Promise.resolve()
        },
    }
}

/**
 * Minimal rule repository for DI tests.
 *
 * @returns Repository instance.
 */
export function createRuleRepositoryMock(): IRuleRepository {
    return {
        findById(_id: UniqueId): Promise<Rule | null> {
            return Promise.resolve(null)
        },
        save(_entity: Rule): Promise<void> {
            return Promise.resolve()
        },
        findByStatus(_status: RuleStatus): Promise<readonly Rule[]> {
            return Promise.resolve([])
        },
    }
}
