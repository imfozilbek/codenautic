import {
    AST_LANGUAGE,
    NOTIFICATION_CHANNEL,
} from "@codenautic/core"
import type {
    NotificationChannel,
    ExternalContextSource,
    CheckRunConclusion,
    CheckRunStatus,
    IChatChunkDTO,
    IChatRequestDTO,
    IChatResponseDTO,
    ICheckRunDTO,
    ICreatePipelineStatusInput,
    ICodeChunkEmbeddingGenerator,
    ICodeGraphClusteringService,
    ICodeGraphDiffService,
    ICodeGraphPageRankService,
    ICommentDTO,
    IExternalContextProvider,
    IGraphRepository,
    IGitPipelineStatusProvider,
    IGitProvider,
    INotificationPayload,
    INotificationProvider,
    IInlineCommentDTO,
    IParsedSourceFileDTO,
    IPipelineStatusDTO,
    ISourceCodeParser,
    IUpdatePipelineStatusInput,
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
export function createGitProviderMock(): IGitProvider & IGitPipelineStatusProvider {
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
        getContributorStats(
            _ref: string,
            _options?: Parameters<IGitProvider["getContributorStats"]>[1],
        ): ReturnType<IGitProvider["getContributorStats"]> {
            return Promise.resolve([])
        },
        getTemporalCoupling(
            _ref: string,
            _options?: Parameters<IGitProvider["getTemporalCoupling"]>[1],
        ): ReturnType<IGitProvider["getTemporalCoupling"]> {
            return Promise.resolve([])
        },
        getTags(): ReturnType<IGitProvider["getTags"]> {
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
        createPipelineStatus(
            _input: ICreatePipelineStatusInput,
        ): Promise<IPipelineStatusDTO> {
            return Promise.resolve({} as IPipelineStatusDTO)
        },
        updateCheckRun(
            _checkId: string,
            _status: CheckRunStatus,
            _conclusion: CheckRunConclusion,
        ): Promise<ICheckRunDTO> {
            return Promise.resolve({} as ICheckRunDTO)
        },
        updatePipelineStatus(
            _input: IUpdatePipelineStatusInput,
        ): Promise<IPipelineStatusDTO> {
            return Promise.resolve({} as IPipelineStatusDTO)
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
 * Minimal source-code parser for DI tests.
 *
 * @returns Parser instance.
 */
export function createSourceCodeParserMock(): ISourceCodeParser {
    return {
        language: AST_LANGUAGE.TYPESCRIPT,
        parse(_request: Parameters<ISourceCodeParser["parse"]>[0]): Promise<IParsedSourceFileDTO> {
            return Promise.resolve({} as IParsedSourceFileDTO)
        },
    }
}

/**
 * Minimal graph repository for DI tests.
 *
 * @returns Repository instance.
 */
export function createGraphRepositoryMock(): IGraphRepository {
    return {
        loadGraph(
            _repositoryId: string,
            _branch?: string,
        ): ReturnType<IGraphRepository["loadGraph"]> {
            return Promise.resolve(null)
        },
        saveGraph(
            _repositoryId: string,
            _graph: Parameters<IGraphRepository["saveGraph"]>[1],
            _branch?: string,
        ): ReturnType<IGraphRepository["saveGraph"]> {
            return Promise.resolve()
        },
        queryNodes(_filter: Parameters<IGraphRepository["queryNodes"]>[0]): ReturnType<
            IGraphRepository["queryNodes"]
        > {
            return Promise.resolve([])
        },
        queryEdges(_filter: Parameters<IGraphRepository["queryEdges"]>[0]): ReturnType<
            IGraphRepository["queryEdges"]
        > {
            return Promise.resolve([])
        },
        queryPaths(_query: Parameters<IGraphRepository["queryPaths"]>[0]): ReturnType<
            IGraphRepository["queryPaths"]
        > {
            return Promise.resolve([])
        },
    }
}

/**
 * Minimal code-chunk embedding generator for DI tests.
 *
 * @returns Generator instance.
 */
export function createCodeChunkEmbeddingGeneratorMock(): ICodeChunkEmbeddingGenerator {
    return {
        generateEmbeddings(
            _chunks: Parameters<ICodeChunkEmbeddingGenerator["generateEmbeddings"]>[0],
        ): ReturnType<ICodeChunkEmbeddingGenerator["generateEmbeddings"]> {
            return Promise.resolve([])
        },
    }
}

/**
 * Minimal code-graph page-rank service for DI tests.
 *
 * @returns Service instance.
 */
export function createCodeGraphPageRankServiceMock(): ICodeGraphPageRankService {
    return {
        calculateHotspots(
            _input: Parameters<ICodeGraphPageRankService["calculateHotspots"]>[0],
        ): ReturnType<ICodeGraphPageRankService["calculateHotspots"]> {
            return Promise.resolve([])
        },
    }
}

/**
 * Minimal code-graph clustering service for DI tests.
 *
 * @returns Service instance.
 */
export function createCodeGraphClusteringServiceMock(): ICodeGraphClusteringService {
    return {
        detectCommunities(
            _input: Parameters<ICodeGraphClusteringService["detectCommunities"]>[0],
        ): ReturnType<ICodeGraphClusteringService["detectCommunities"]> {
            return Promise.resolve({
                communities: [],
                modularity: 0,
            })
        },
    }
}

/**
 * Minimal code-graph diff service for DI tests.
 *
 * @returns Service instance.
 */
export function createCodeGraphDiffServiceMock(): ICodeGraphDiffService {
    return {
        calculateDiff(
            _input: Parameters<ICodeGraphDiffService["calculateDiff"]>[0],
        ): ReturnType<ICodeGraphDiffService["calculateDiff"]> {
            return Promise.resolve({
                addedNodes: [],
                removedNodes: [],
                changedNodes: [],
                addedEdges: [],
                removedEdges: [],
            })
        },
    }
}

/**
 * Minimal external-context provider for DI tests.
 *
 * @param source Supported external context source.
 * @returns Provider instance.
 */
export function createExternalContextProviderMock(
    source: ExternalContextSource = "JIRA",
): IExternalContextProvider {
    return {
        source,
        loadContext(_identifier: string): ReturnType<IExternalContextProvider["loadContext"]> {
            return Promise.resolve(null)
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
