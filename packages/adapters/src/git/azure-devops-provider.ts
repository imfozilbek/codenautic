import {createTwoFilesPatch} from "diff"
import {
    WebApi,
    getPersonalAccessTokenHandler,
} from "azure-devops-node-api/WebApi"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    FILE_TREE_NODE_TYPE,
    GIT_REF_COMPARISON_STATUS,
    INLINE_COMMENT_SIDE,
    MERGE_REQUEST_DIFF_FILE_STATUS,
    type CheckRunConclusion,
    type CheckRunStatus,
    type IBlameData,
    type IBranchInfo,
    type ICheckRunDTO,
    type ICommentDTO,
    type ICommitHistoryOptions,
    type ICommitInfo,
    type IContributorFileStat,
    type IContributorStat,
    type IContributorStatsOptions,
    type ICreatePipelineStatusInput,
    type IFileBlame,
    type IFileTreeNode,
    type IGitPipelineStatusProvider,
    type IGitProvider,
    type IInlineCommentDTO,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
    type IPipelineStatusDTO,
    type IRefDiffFile,
    type IRefDiffResult,
    type IRefDiffSummary,
    type ITagInfo,
    type ITemporalCouplingEdge,
    type ITemporalCouplingOptions,
    type IUpdatePipelineStatusInput,
} from "@codenautic/core"

import {
    GIT_ACL_ERROR_KIND,
    mapExternalMergeRequest,
    normalizeGitAclError,
    shouldRetryGitAclError,
    type IExternalGitMergeRequest,
    type INormalizedGitAclError,
} from "./acl"
import {
    AZURE_DEVOPS_PROVIDER_ERROR_CODE,
    AzureDevOpsProviderError,
} from "./azure-devops-provider.error"

const AZURE_DEVOPS_PAGE_SIZE = 100
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const DETAILS_BATCH_SIZE = 20
const AZURE_DEVOPS_STATUS_GENRE = "codenautic"

const AZURE_DEVOPS_GIT_OBJECT_TYPE = {
    TREE: 2,
    BLOB: 3,
    TAG: 4,
} as const

const AZURE_DEVOPS_VERSION_TYPE = {
    BRANCH: 0,
    TAG: 1,
    COMMIT: 2,
} as const

const AZURE_DEVOPS_RECURSION_LEVEL = {
    NONE: 0,
    FULL: 120,
} as const

const AZURE_DEVOPS_CHANGE_TYPE = {
    ADD: 1,
    EDIT: 2,
    RENAME: 8,
    DELETE: 16,
    SOURCE_RENAME: 1024,
    TARGET_RENAME: 2048,
} as const

const AZURE_DEVOPS_COMMENT_TYPE = {
    TEXT: 1,
} as const

const AZURE_DEVOPS_COMMENT_THREAD_STATUS = {
    ACTIVE: 1,
} as const

const AZURE_DEVOPS_PULL_REQUEST_STATUS = {
    ACTIVE: 1,
    ABANDONED: 2,
    COMPLETED: 3,
} as const

const AZURE_DEVOPS_GIT_STATUS_STATE = {
    NOT_SET: 0,
    PENDING: 1,
    SUCCEEDED: 2,
    FAILED: 3,
    ERROR: 4,
    NOT_APPLICABLE: 5,
    PARTIALLY_SUCCEEDED: 6,
} as const

interface IAzureDevOpsVersionDescriptor {
    readonly version: string
    readonly versionType: number
}

interface IAzureDevOpsPullRequestIterationChangesInput {
    readonly pullRequestId: number
    readonly iterationId: number
    readonly skip: number
    readonly top: number
}

interface IAzureDevOpsGetItemsInput {
    readonly scopePath: string
    readonly recursionLevel: number
    readonly versionDescriptor: IAzureDevOpsVersionDescriptor
    readonly includeContentMetadata?: boolean
}

interface IAzureDevOpsGetItemInput {
    readonly path: string
    readonly versionDescriptor: IAzureDevOpsVersionDescriptor
    readonly includeContent?: boolean
    readonly includeContentMetadata?: boolean
}

interface IAzureDevOpsGetCommitsBatchInput {
    readonly versionDescriptor: IAzureDevOpsVersionDescriptor
    readonly searchCriteria: Readonly<Record<string, unknown>>
}

interface IAzureDevOpsGetCommitChangesInput {
    readonly commitId: string
    readonly skip: number
    readonly top: number
}

interface IAzureDevOpsGetRefsInput {
    readonly filter: string
    readonly peelTags?: boolean
}

interface IAzureDevOpsGetCommitDiffsInput {
    readonly baseVersionDescriptor: IAzureDevOpsVersionDescriptor
    readonly targetVersionDescriptor: IAzureDevOpsVersionDescriptor
    readonly skip: number
    readonly top: number
}

interface IAzureDevOpsCreateThreadInput {
    readonly pullRequestId: number
    readonly comments: readonly Readonly<Record<string, unknown>>[]
    readonly status?: number
    readonly threadContext?: Readonly<Record<string, unknown>>
    readonly pullRequestThreadContext?: Readonly<Record<string, unknown>>
}

interface IAzureDevOpsCreatePullRequestStatusInput {
    readonly pullRequestId: number
    readonly status: Readonly<Record<string, unknown>>
}

interface INormalizedCommitHistoryOptions {
    readonly author?: string
    readonly since?: string
    readonly until?: string
    readonly maxCount?: number
    readonly path?: string
}

interface INormalizedTemporalCouplingOptions extends INormalizedCommitHistoryOptions {
    readonly filePaths?: readonly string[]
}

interface IAzureDevOpsCommitDetails {
    readonly sha: string
    readonly message: string
    readonly authorName: string
    readonly authorEmail: string
    readonly date: string
    readonly parentCommitId?: string
    readonly diffs: readonly IParsedAzureDiff[]
}

interface IParsedAzureDiff {
    readonly filePath: string
    readonly oldPath?: string
    readonly status: IMergeRequestDiffFileDTO["status"]
    readonly additions: number
    readonly deletions: number
    readonly changes: number
    readonly patch: string
    readonly hunks: readonly string[]
}

interface IParsedPatchResult {
    readonly patch: string
    readonly hunks: readonly string[]
    readonly additions: number
    readonly deletions: number
    readonly changes: number
}

interface IAzureDevOpsTextFileSnapshot {
    readonly exists: boolean
    readonly isBinary: boolean
    readonly content: string
}

interface IAzureDevOpsNormalizedChange {
    readonly filePath: string
    readonly oldPath?: string
    readonly status: IMergeRequestDiffFileDTO["status"]
    readonly changeTrackingId?: number
}

interface IAzureDevOpsPullRequestDiffContext {
    readonly pullRequest: Readonly<Record<string, unknown>> | null
    readonly iterationId: number
    readonly changeEntries: readonly unknown[]
    readonly baseVersionDescriptor: IAzureDevOpsVersionDescriptor
    readonly headVersionDescriptor: IAzureDevOpsVersionDescriptor
}

interface IContributorAggregation {
    readonly name: string
    readonly email: string
    readonly files: Map<string, IContributorFileAggregation>
    commitCount: number
    additions: number
    deletions: number
    changes: number
    startedAt: string
    endedAt: string
}

interface IContributorFileAggregation {
    commitCount: number
    additions: number
    deletions: number
    changes: number
    lastCommitDate: string
}

interface ITemporalCouplingAggregation {
    readonly sourcePath: string
    readonly targetPath: string
    sharedCommitCount: number
    lastSeenAt: string
}

interface ILegacyPipelineContext {
    readonly mergeRequestId: string
    readonly name: string
}

/**
 * Minimal subset of Azure DevOps Git APIs used by the provider.
 */
export interface IAzureDevOpsGitClient {
    /**
     * Loads repository metadata.
     */
    getRepository(): Promise<unknown>

    /**
     * Loads pull request metadata.
     */
    getPullRequest(pullRequestId: number): Promise<unknown>

    /**
     * Loads pull request commits.
     */
    getPullRequestCommits(pullRequestId: number): Promise<readonly unknown[]>

    /**
     * Loads pull request iterations.
     */
    getPullRequestIterations(pullRequestId: number): Promise<readonly unknown[]>

    /**
     * Loads pull request iteration changes page.
     */
    getPullRequestIterationChanges(
        input: IAzureDevOpsPullRequestIterationChangesInput,
    ): Promise<unknown>

    /**
     * Creates pull request comment thread.
     */
    createThread(input: IAzureDevOpsCreateThreadInput): Promise<unknown>

    /**
     * Creates pull request status.
     */
    createPullRequestStatus(
        input: IAzureDevOpsCreatePullRequestStatusInput,
    ): Promise<unknown>

    /**
     * Lists repository items for a ref.
     */
    getItems(input: IAzureDevOpsGetItemsInput): Promise<readonly unknown[]>

    /**
     * Loads one repository item for a ref.
     */
    getItem(input: IAzureDevOpsGetItemInput): Promise<unknown>

    /**
     * Lists branch stats for repository.
     */
    getBranches(): Promise<readonly unknown[]>

    /**
     * Lists commits page using batch API.
     */
    getCommitsBatch(input: IAzureDevOpsGetCommitsBatchInput): Promise<readonly unknown[]>

    /**
     * Loads one commit details payload.
     */
    getCommit(commitId: string): Promise<unknown>

    /**
     * Loads one commit changes page.
     */
    getCommitChanges(input: IAzureDevOpsGetCommitChangesInput): Promise<unknown>

    /**
     * Lists refs by filter.
     */
    getRefs(input: IAzureDevOpsGetRefsInput): Promise<readonly unknown[]>

    /**
     * Loads annotated tag payload by tag object id.
     */
    getAnnotatedTag(tagObjectId: string): Promise<unknown>

    /**
     * Loads commit diff changes between two refs.
     */
    getCommitDiffs(input: IAzureDevOpsGetCommitDiffsInput): Promise<unknown>
}

/**
 * Azure DevOps provider configuration.
 */
export interface IAzureDevOpsProviderOptions {
    /**
     * Azure DevOps organization URL.
     */
    readonly organizationUrl: string

    /**
     * Azure DevOps project name or identifier.
     */
    readonly project: string

    /**
     * Repository identifier or friendly name.
     */
    readonly repositoryId: string

    /**
     * Personal access token.
     */
    readonly token: string

    /**
     * Optional client override for tests.
     */
    readonly client?: IAzureDevOpsGitClient

    /**
     * Optional retry cap for retryable ACL failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Optional sleep override for retry tests.
     */
    readonly sleep?: (delayMs: number) => Promise<void>
}

/**
 * Sequential batch review payload for Azure DevOps fallback flow.
 */
export interface IAzureDevOpsBatchReviewRequest {
    /**
     * Top-level review body posted as pull-request comment thread.
     */
    readonly body: string

    /**
     * Inline comments posted one-by-one as tracked threads.
     */
    readonly comments: readonly IInlineCommentDTO[]
}

/**
 * Azure DevOps implementation of the generic git provider contract.
 */
export class AzureDevOpsProvider implements IGitProvider, IGitPipelineStatusProvider {
    private readonly client: IAzureDevOpsGitClient
    private readonly project: string
    private readonly repositoryId: string
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly legacyPipelineContexts: Map<string, ILegacyPipelineContext>

    /**
     * Creates Azure DevOps provider.
     *
     * @param options Provider configuration.
     */
    public constructor(options: IAzureDevOpsProviderOptions) {
        this.project = normalizeRequiredText(options.project, "project")
        this.repositoryId = normalizeRequiredText(options.repositoryId, "repositoryId")
        this.client = options.client ?? createAzureDevOpsClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.legacyPipelineContexts = new Map<string, ILegacyPipelineContext>()
    }

    /**
     * Fetches pull request and normalizes it to merge-request DTO.
     *
     * @param id Pull request identifier.
     * @returns Merge-request payload.
     */
    public async getMergeRequest(id: string): Promise<IMergeRequestDTO> {
        const pullRequestId = normalizeMergeRequestId(id)
        const [pullRequest, commits, diffFiles] = await Promise.all([
            this.executeRequest("getPullRequest", () => {
                return this.client.getPullRequest(pullRequestId)
            }),
            this.executeRequest("getPullRequestCommits", () => {
                return this.client.getPullRequestCommits(pullRequestId)
            }),
            this.getChangedFiles(id),
        ])

        return mapExternalMergeRequest(
            createAzureMergeRequestPayload(pullRequest, commits, diffFiles),
        )
    }

    /**
     * Fetches changed files for pull request.
     *
     * @param mergeRequestId Pull request identifier.
     * @returns Diff files list.
     */
    public async getChangedFiles(
        mergeRequestId: string,
    ): Promise<readonly IMergeRequestDiffFileDTO[]> {
        const diffContext = await this.loadPullRequestDiffContext(
            normalizeMergeRequestId(mergeRequestId),
        )
        const diffFiles = await mapInBatches(
            diffContext.changeEntries,
            DETAILS_BATCH_SIZE,
            async (entry: unknown): Promise<IMergeRequestDiffFileDTO> => {
                return this.buildMergeRequestDiffFile(
                    entry,
                    diffContext.baseVersionDescriptor,
                    diffContext.headVersionDescriptor,
                )
            },
        )

        return [...diffFiles].sort(compareDiffFiles)
    }

    /**
     * Loads repository file tree for a reference.
     *
     * @param ref Branch, tag, or commit reference.
     * @returns File tree nodes.
     */
    public async getFileTree(ref: string): Promise<readonly IFileTreeNode[]> {
        const versionDescriptor = await this.resolveVersionDescriptor(ref)
        const response = await this.executeRequest("getItems", () => {
            return this.client.getItems({
                scopePath: "/",
                recursionLevel: AZURE_DEVOPS_RECURSION_LEVEL.FULL,
                versionDescriptor,
                includeContentMetadata: true,
            })
        })
        const nodes = response
            .map(mapAzureTreeItem)
            .filter((node): node is IFileTreeNode => {
                return node !== null
            })

        return [...nodes].sort(compareFileTreeNode)
    }

    /**
     * Loads repository file content for a reference.
     *
     * @param filePath Repository-relative file path.
     * @param ref Branch, tag, or commit reference.
     * @returns Raw file content.
     */
    public async getFileContentByRef(filePath: string, ref: string): Promise<string> {
        const normalizedPath = normalizeRepositoryPath(filePath)
        const versionDescriptor = await this.resolveVersionDescriptor(ref)
        const item = await this.executeRequest("getItem", () => {
            return this.client.getItem({
                path: normalizedPath,
                versionDescriptor,
                includeContent: true,
                includeContentMetadata: true,
            })
        })
        const snapshot = mapAzureTextFileSnapshot(item)

        if (snapshot.isBinary) {
            throw new Error("Azure DevOps binary file content is not supported")
        }

        return snapshot.content
    }

    /**
     * Fetches repository branches metadata.
     *
     * @returns Branch list with default and protection metadata.
     */
    public async getBranches(): Promise<readonly IBranchInfo[]> {
        const [repository, branches] = await Promise.all([
            this.executeRequest("getRepository", () => {
                return this.client.getRepository()
            }),
            this.executeRequest("getBranches", () => {
                return this.client.getBranches()
            }),
        ])
        const defaultBranchName = normalizeRefName(
            readString(toRecord(repository), ["defaultBranch"]),
            "refs/heads/",
        )
        const mappedBranches = await mapInBatches(
            branches,
            DETAILS_BATCH_SIZE,
            async (branch: unknown): Promise<IBranchInfo> => {
                return this.mapAzureBranch(branch, defaultBranchName)
            },
        )

        return [...mappedBranches].sort(compareBranchInfo)
    }

    /**
     * Fetches commit history for a branch, tag, or commit ref.
     *
     * @param ref Commit SHA, branch name, or tag.
     * @param options Optional history query options.
     * @returns Ordered commit list.
     */
    public async getCommitHistory(
        ref: string,
        options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]> {
        const versionDescriptor = await this.resolveVersionDescriptor(ref)
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const commits = await this.listCommitHistory(
            versionDescriptor,
            normalizedOptions,
        )
        const details = await this.loadCommitDetails(commits, false)

        return details.map((commit): ICommitInfo => {
            return {
                sha: commit.sha,
                message: commit.message,
                authorName: commit.authorName,
                authorEmail: commit.authorEmail,
                date: commit.date,
                filesChanged: commit.diffs.map((diff): string => {
                    return diff.filePath
                }),
            }
        })
    }

    /**
     * Fetches aggregated contributor statistics for a ref.
     *
     * @param ref Commit SHA, branch name, or tag.
     * @param options Optional date/path/limit filters.
     * @returns Contributor statistics with per-file breakdown.
     */
    public async getContributorStats(
        ref: string,
        options?: IContributorStatsOptions,
    ): Promise<readonly IContributorStat[]> {
        const versionDescriptor = await this.resolveVersionDescriptor(ref)
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const commits = await this.listCommitHistory(
            versionDescriptor,
            normalizedOptions,
            "all",
        )
        const details = await this.loadCommitDetails(commits, true)

        return buildContributorStats(details)
    }

    /**
     * Fetches temporal coupling edges derived from co-changed commits.
     *
     * @param ref Commit SHA, branch name, or tag.
     * @param options Optional commit-window and batch file filters.
     * @returns Stable temporal coupling edges.
     */
    public async getTemporalCoupling(
        ref: string,
        options?: ITemporalCouplingOptions,
    ): Promise<readonly ITemporalCouplingEdge[]> {
        const versionDescriptor = await this.resolveVersionDescriptor(ref)
        const normalizedOptions = normalizeTemporalCouplingOptions(options)
        const commits = await this.listCommitHistory(
            versionDescriptor,
            normalizedOptions,
            "all",
        )
        const details = await this.loadCommitDetails(commits, false)

        return buildTemporalCouplingEdges(details, normalizedOptions.filePaths)
    }

    /**
     * Fetches repository tags metadata.
     *
     * @returns Tag list with annotation and associated commit metadata.
     */
    public async getTags(): Promise<readonly ITagInfo[]> {
        const refs = await this.executeRequest("getRefs", () => {
            return this.client.getRefs({
                filter: "tags/",
                peelTags: true,
            })
        })
        const tags = await mapInBatches(
            refs,
            DETAILS_BATCH_SIZE,
            async (refRecord: unknown): Promise<ITagInfo> => {
                return this.mapAzureTag(refRecord)
            },
        )

        return [...tags].sort(compareTagInfo)
    }

    /**
     * Fetches diff between two refs.
     *
     * @param baseRef Base comparison ref.
     * @param headRef Head comparison ref.
     * @returns Diff summary and file-level changes.
     */
    public async getDiffBetweenRefs(baseRef: string, headRef: string): Promise<IRefDiffResult> {
        const normalizedBaseRef = normalizeRequiredText(baseRef, "baseRef")
        const normalizedHeadRef = normalizeRequiredText(headRef, "headRef")

        if (normalizedBaseRef === normalizedHeadRef) {
            return {
                baseRef: normalizedBaseRef,
                headRef: normalizedHeadRef,
                comparisonStatus: GIT_REF_COMPARISON_STATUS.IDENTICAL,
                aheadBy: 0,
                behindBy: 0,
                totalCommits: 0,
                summary: emptyRefDiffSummary(),
                files: [],
            }
        }

        const [baseVersionDescriptor, headVersionDescriptor] = await Promise.all([
            this.resolveVersionDescriptor(normalizedBaseRef),
            this.resolveVersionDescriptor(normalizedHeadRef),
        ])
        const [forward, backward] = await Promise.all([
            this.listCommitDiffChanges(baseVersionDescriptor, headVersionDescriptor),
            this.listCommitDiffChanges(headVersionDescriptor, baseVersionDescriptor),
        ])
        const files = await mapInBatches(
            forward.changes,
            DETAILS_BATCH_SIZE,
            async (change: unknown): Promise<IRefDiffFile> => {
                return this.buildRefDiffFile(
                    change,
                    baseVersionDescriptor,
                    headVersionDescriptor,
                )
            },
        )

        return {
            baseRef: normalizedBaseRef,
            headRef: normalizedHeadRef,
            comparisonStatus: resolveAzureComparisonStatus(
                forward.aheadBy,
                backward.aheadBy,
            ),
            aheadBy: forward.aheadBy,
            behindBy: backward.aheadBy,
            totalCommits: forward.aheadBy,
            summary: summarizeRefDiffFiles(files),
            files,
        }
    }

    /**
     * Azure DevOps SDK and public REST do not expose line blame in a portable way.
     *
     * @param _filePath Repository-relative file path.
     * @param _ref Commit SHA or branch name.
     * @returns Never resolves successfully.
     * @throws {AzureDevOpsProviderError} Always throws unsupported-operation error.
     */
    public getBlameData(
        _filePath: string,
        _ref: string,
    ): Promise<readonly IBlameData[]> {
        return Promise.reject(
            new AzureDevOpsProviderError(
                AZURE_DEVOPS_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION,
                {
                    operation: "getBlameData",
                    capability: "line-blame",
                },
            ),
        )
    }

    /**
     * Azure DevOps SDK and public REST do not expose batch line blame in a portable way.
     *
     * @param _filePaths Repository-relative file paths.
     * @param _ref Commit SHA or branch name.
     * @returns Never resolves successfully.
     * @throws {AzureDevOpsProviderError} Always throws unsupported-operation error.
     */
    public getBlameDataBatch(
        _filePaths: readonly string[],
        _ref: string,
    ): Promise<readonly IFileBlame[]> {
        return Promise.reject(
            new AzureDevOpsProviderError(
                AZURE_DEVOPS_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION,
                {
                    operation: "getBlameDataBatch",
                    capability: "line-blame",
                },
            ),
        )
    }

    /**
     * Posts regular comment to pull request.
     *
     * @param mergeRequestId Pull request identifier.
     * @param body Comment body.
     * @returns Created comment payload.
     */
    public async postComment(
        mergeRequestId: string,
        body: string,
    ): Promise<ICommentDTO> {
        const response = await this.executeRequest("createThread", () => {
            return this.client.createThread({
                pullRequestId: normalizeMergeRequestId(mergeRequestId),
                comments: [
                    {
                        content: normalizeRequiredText(body, "body"),
                        commentType: AZURE_DEVOPS_COMMENT_TYPE.TEXT,
                    },
                ],
                status: AZURE_DEVOPS_COMMENT_THREAD_STATUS.ACTIVE,
            })
        })

        return mapAzureComment(response)
    }

    /**
     * Creates review in sequential fallback mode for Azure DevOps.
     *
     * @param mergeRequestId Pull request identifier.
     * @param review Batch review payload.
     * @returns Created top-level and inline comments mapped to generic comment DTOs.
     */
    public async createReview(
        mergeRequestId: string,
        review: IAzureDevOpsBatchReviewRequest,
    ): Promise<readonly ICommentDTO[]> {
        const createdComments: ICommentDTO[] = []
        const bodyComment = await this.postComment(
            mergeRequestId,
            normalizeRequiredText(review.body, "body"),
        )
        createdComments.push(bodyComment)

        for (const comment of review.comments) {
            const inlineComment = await this.postInlineComment(mergeRequestId, comment)
            createdComments.push(mapInlineCommentToComment(inlineComment))
        }

        return createdComments
    }

    /**
     * Posts inline comment to pull request as tracked thread.
     *
     * @param mergeRequestId Pull request identifier.
     * @param comment Inline comment payload.
     * @returns Created inline comment payload.
     */
    public async postInlineComment(
        mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        const pullRequestId = normalizeMergeRequestId(mergeRequestId)
        const threadContext = await this.buildInlineThreadContext(
            pullRequestId,
            comment,
        )
        const response = await this.executeRequest("createThread", () => {
            return this.client.createThread({
                pullRequestId,
                comments: [
                    {
                        content: normalizeRequiredText(comment.body, "body"),
                        commentType: AZURE_DEVOPS_COMMENT_TYPE.TEXT,
                    },
                ],
                status: AZURE_DEVOPS_COMMENT_THREAD_STATUS.ACTIVE,
                threadContext: threadContext.threadContext,
                pullRequestThreadContext: threadContext.pullRequestThreadContext,
            })
        })

        return mapAzureInlineComment(response, comment)
    }

    /**
     * Creates generic pipeline status via Azure DevOps pull-request statuses.
     *
     * @param input Creation payload.
     * @returns Created pipeline status payload.
     */
    public async createPipelineStatus(
        input: ICreatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeCreatePipelineStatusInput(input)
        const response = await this.executeRequest("createPullRequestStatus", () => {
            return this.client.createPullRequestStatus({
                pullRequestId: normalizeMergeRequestId(normalizedInput.mergeRequestId),
                status: {
                    context: {
                        genre: AZURE_DEVOPS_STATUS_GENRE,
                        name: normalizedInput.name,
                    },
                    state: AZURE_DEVOPS_GIT_STATUS_STATE.PENDING,
                    description: "queued",
                },
            })
        })
        const pipelineStatus = mapAzurePipelineStatus(response)

        this.rememberLegacyPipelineContext(pipelineStatus.id, {
            mergeRequestId: normalizedInput.mergeRequestId,
            name: normalizedInput.name,
        })

        return pipelineStatus
    }

    /**
     * Updates generic pipeline status via Azure DevOps pull-request statuses.
     *
     * @param input Update payload.
     * @returns Updated pipeline status payload.
     */
    public async updatePipelineStatus(
        input: IUpdatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeUpdatePipelineStatusInput(input)
        const response = await this.executeRequest("createPullRequestStatus", () => {
            return this.client.createPullRequestStatus({
                pullRequestId: normalizeMergeRequestId(normalizedInput.mergeRequestId),
                status: {
                    context: {
                        genre: AZURE_DEVOPS_STATUS_GENRE,
                        name: normalizedInput.name,
                    },
                    state: mapPipelineStateToAzureStatus(
                        normalizedInput.status,
                        normalizedInput.conclusion,
                    ),
                    description: normalizedInput.summary,
                },
            })
        })
        const pipelineStatus = mapAzurePipelineStatus(response)

        if (normalizedInput.pipelineId !== undefined) {
            this.rememberLegacyPipelineContext(normalizedInput.pipelineId, {
                mergeRequestId: normalizedInput.mergeRequestId,
                name: normalizedInput.name,
            })
        }
        this.rememberLegacyPipelineContext(pipelineStatus.id, {
            mergeRequestId: normalizedInput.mergeRequestId,
            name: normalizedInput.name,
        })

        return pipelineStatus
    }

    /**
     * Legacy Git-provider compatibility for stage code still using check-run semantics.
     *
     * @param mergeRequestId Pull request identifier.
     * @param name Check name.
     * @returns Created check payload.
     */
    public createCheckRun(
        mergeRequestId: string,
        name: string,
    ): Promise<ICheckRunDTO> {
        return this.createPipelineStatus({
            mergeRequestId,
            name,
        })
    }

    /**
     * Legacy Git-provider compatibility for stage code still using check-run semantics.
     *
     * @param checkId Previously created check identifier.
     * @param status Target status.
     * @param conclusion Target conclusion.
     * @returns Updated check payload.
     */
    public async updateCheckRun(
        checkId: string,
        status: CheckRunStatus,
        conclusion: CheckRunConclusion,
    ): Promise<ICheckRunDTO> {
        const normalizedCheckId = normalizeRequiredText(checkId, "checkId")
        const context = this.legacyPipelineContexts.get(normalizedCheckId)

        if (context === undefined) {
            throw new Error(
                `Azure DevOps check context is not available for ${normalizedCheckId}`,
            )
        }

        return this.updatePipelineStatus({
            pipelineId: normalizedCheckId,
            mergeRequestId: context.mergeRequestId,
            name: context.name,
            status,
            conclusion,
        })
    }

    /**
     * Executes Azure DevOps request with retry semantics for retryable failures.
     *
     * @param operationName Stable operation label.
     * @param operation Deferred API call.
     * @returns Operation result.
     */
    private async executeRequest<T>(
        operationName: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        let attempt = 1

        while (true) {
            try {
                return await operation()
            } catch (error) {
                const normalized = normalizeGitAclError(error)

                if (!shouldRetryGitAclError(error, attempt, this.retryMaxAttempts)) {
                    throw new AzureDevOpsProviderError(
                        AZURE_DEVOPS_PROVIDER_ERROR_CODE.API_REQUEST_FAILED,
                        {
                            operation: operationName,
                            normalized,
                        },
                    )
                }

                await this.sleep(resolveRetryDelayMs(normalized, attempt))
                attempt += 1
            }
        }
    }

    /**
     * Resolves branch, tag, or commit reference to Azure version descriptor.
     *
     * @param ref Raw reference.
     * @returns Azure version descriptor.
     */
    private async resolveVersionDescriptor(ref: string): Promise<IAzureDevOpsVersionDescriptor> {
        const normalizedRef = normalizeRequiredText(ref, "ref")

        if (normalizedRef.startsWith("refs/heads/")) {
            return createVersionDescriptor(
                normalizeRefName(normalizedRef, "refs/heads/"),
                AZURE_DEVOPS_VERSION_TYPE.BRANCH,
            )
        }

        if (normalizedRef.startsWith("refs/tags/")) {
            return createVersionDescriptor(
                normalizeRefName(normalizedRef, "refs/tags/"),
                AZURE_DEVOPS_VERSION_TYPE.TAG,
            )
        }

        if (isCommitSha(normalizedRef)) {
            return createVersionDescriptor(normalizedRef, AZURE_DEVOPS_VERSION_TYPE.COMMIT)
        }

        const branchRefs = await this.executeRequest("getRefs", () => {
            return this.client.getRefs({
                filter: `heads/${normalizedRef}`,
            })
        })
        if (findExactAzureRef(branchRefs, `refs/heads/${normalizedRef}`) !== undefined) {
            return createVersionDescriptor(normalizedRef, AZURE_DEVOPS_VERSION_TYPE.BRANCH)
        }

        const tagRefs = await this.executeRequest("getRefs", () => {
            return this.client.getRefs({
                filter: `tags/${normalizedRef}`,
                peelTags: true,
            })
        })
        if (findExactAzureRef(tagRefs, `refs/tags/${normalizedRef}`) !== undefined) {
            return createVersionDescriptor(normalizedRef, AZURE_DEVOPS_VERSION_TYPE.TAG)
        }

        return createVersionDescriptor(normalizedRef, AZURE_DEVOPS_VERSION_TYPE.BRANCH)
    }

    /**
     * Lists commit history pages until target count is reached.
     *
     * @param versionDescriptor Resolved Azure version descriptor.
     * @param options Normalized history filters.
     * @param mode Pagination strategy when `maxCount` is omitted.
     * @returns Raw commit list from Azure history API.
     */
    private async listCommitHistory(
        versionDescriptor: IAzureDevOpsVersionDescriptor,
        options: INormalizedCommitHistoryOptions,
        mode: "page" | "all" = "page",
    ): Promise<readonly unknown[]> {
        const targetCount = options.maxCount ?? (
            mode === "all" ? Number.MAX_SAFE_INTEGER : AZURE_DEVOPS_PAGE_SIZE
        )
        const commits: unknown[] = []
        let skip = 0

        while (commits.length < targetCount) {
            const remaining = targetCount - commits.length
            const top = options.maxCount === undefined
                ? AZURE_DEVOPS_PAGE_SIZE
                : Math.min(AZURE_DEVOPS_PAGE_SIZE, remaining)
            const response = await this.executeRequest("getCommitsBatch", () => {
                return this.client.getCommitsBatch({
                    versionDescriptor,
                    searchCriteria: {
                        $skip: skip,
                        $top: top,
                        author: options.author,
                        fromDate: options.since,
                        toDate: options.until,
                        itemPath: options.path,
                    },
                })
            })

            commits.push(
                ...response.slice(
                    0,
                    options.maxCount === undefined ? response.length : remaining,
                ),
            )

            if (response.length === 0) {
                break
            }

            skip += response.length
        }

        return commits
    }

    /**
     * Loads detailed commit payloads in bounded batches.
     *
     * @param commits Raw commit list.
     * @param includePatchMetrics Whether line-level patch metrics should be computed.
     * @returns Detailed commit payloads in source order.
     */
    private async loadCommitDetails(
        commits: readonly unknown[],
        includePatchMetrics: boolean,
    ): Promise<readonly IAzureDevOpsCommitDetails[]> {
        return mapInBatches(
            commits,
            DETAILS_BATCH_SIZE,
            async (commit: unknown): Promise<IAzureDevOpsCommitDetails> => {
                return this.loadCommitDetailsEntry(commit, includePatchMetrics)
            },
        )
    }

    /**
     * Loads one detailed commit payload.
     *
     * @param commit Raw commit record.
     * @param includePatchMetrics Whether line-level patch metrics should be computed.
     * @returns Detailed commit payload.
     */
    private async loadCommitDetailsEntry(
        commit: unknown,
        includePatchMetrics: boolean,
    ): Promise<IAzureDevOpsCommitDetails> {
        const commitId = readString(toRecord(commit), ["commitId", "id"])
        const [details, changes] = await Promise.all([
            this.executeRequest("getCommit", () => {
                return this.client.getCommit(commitId)
            }),
            this.listCommitChangeEntries(commitId),
        ])
        const detailsRecord = toRecord(details)
        const parentCommitId = readArray(detailsRecord?.["parents"])
            .find((parent): parent is string => {
                return typeof parent === "string" && parent.length > 0
            })
        const diffs = includePatchMetrics
            ? await mapInBatches(
                changes,
                DETAILS_BATCH_SIZE,
                async (change: unknown): Promise<IParsedAzureDiff> => {
                    return this.buildCommitDiff(
                        change,
                        parentCommitId,
                        commitId,
                    )
                },
            )
            : changes.map(mapAzureChangeWithoutPatch)

        return {
            sha: readString(detailsRecord, ["commitId", "id"]),
            message: readString(detailsRecord, ["comment", "message"]),
            authorName: readNestedString(detailsRecord, ["author", "name"]),
            authorEmail: readNestedString(detailsRecord, ["author", "email"]),
            date: readNestedString(detailsRecord, ["author", "date"]),
            parentCommitId,
            diffs,
        }
    }

    /**
     * Lists all change entries for a commit using skip/top pagination.
     *
     * @param commitId Commit SHA.
     * @returns Raw change entries.
     */
    private async listCommitChangeEntries(commitId: string): Promise<readonly unknown[]> {
        const changes: unknown[] = []
        let skip = 0

        while (true) {
            const response = await this.executeRequest("getCommitChanges", () => {
                return this.client.getCommitChanges({
                    commitId,
                    skip,
                    top: AZURE_DEVOPS_PAGE_SIZE,
                })
            })
            const responseRecord = toRecord(response)
            const pageChanges = readArray(responseRecord?.["changes"])
            changes.push(...pageChanges)

            if (pageChanges.length < AZURE_DEVOPS_PAGE_SIZE) {
                break
            }

            if (readBoolean(responseRecord, ["allChangesIncluded"])) {
                break
            }

            skip += pageChanges.length
        }

        return changes
    }

    /**
     * Lists pull-request diff context required for comments and diff files.
     *
     * @param pullRequestId Pull request identifier.
     * @returns Diff context with versions and change entries.
     */
    private async loadPullRequestDiffContext(
        pullRequestId: number,
    ): Promise<IAzureDevOpsPullRequestDiffContext> {
        const pullRequest = await this.executeRequest("getPullRequest", () => {
            return this.client.getPullRequest(pullRequestId)
        })
        const iterations = await this.executeRequest("getPullRequestIterations", () => {
            return this.client.getPullRequestIterations(pullRequestId)
        })
        const iterationId = resolveLatestIterationId(iterations)
        const changeEntries = iterationId === 0
            ? []
            : await this.listPullRequestChangeEntries(pullRequestId, iterationId)

        return {
            pullRequest: toRecord(pullRequest),
            iterationId,
            changeEntries,
            baseVersionDescriptor: resolvePullRequestBaseVersionDescriptor(pullRequest),
            headVersionDescriptor: resolvePullRequestHeadVersionDescriptor(pullRequest),
        }
    }

    /**
     * Lists all change entries for one pull request iteration.
     *
     * @param pullRequestId Pull request identifier.
     * @param iterationId Iteration identifier.
     * @returns Raw change entries.
     */
    private async listPullRequestChangeEntries(
        pullRequestId: number,
        iterationId: number,
    ): Promise<readonly unknown[]> {
        const changes: unknown[] = []
        let skip = 0
        let top = AZURE_DEVOPS_PAGE_SIZE

        while (true) {
            const response = await this.executeRequest(
                "getPullRequestIterationChanges",
                () => {
                    return this.client.getPullRequestIterationChanges({
                        pullRequestId,
                        iterationId,
                        skip,
                        top,
                    })
                },
            )
            const responseRecord = toRecord(response)
            const pageChanges = readArray(responseRecord?.["changeEntries"])
            changes.push(...pageChanges)

            const nextSkip = readNumber(responseRecord, ["nextSkip"])
            const nextTop = readNumber(responseRecord, ["nextTop"])

            if (pageChanges.length === 0 || nextSkip === 0 || nextSkip <= skip) {
                break
            }

            skip = nextSkip
            top = nextTop > 0 ? nextTop : AZURE_DEVOPS_PAGE_SIZE
        }

        return changes
    }

    /**
     * Builds one merge-request diff file entry.
     *
     * @param changeEntry Raw Azure change entry.
     * @param baseVersionDescriptor Base ref version descriptor.
     * @param headVersionDescriptor Head ref version descriptor.
     * @returns Normalized diff file DTO.
     */
    private async buildMergeRequestDiffFile(
        changeEntry: unknown,
        baseVersionDescriptor: IAzureDevOpsVersionDescriptor,
        headVersionDescriptor: IAzureDevOpsVersionDescriptor,
    ): Promise<IMergeRequestDiffFileDTO> {
        const normalizedChange = normalizeAzureChange(changeEntry)
        const patch = await this.buildPatchResult(
            normalizedChange,
            baseVersionDescriptor,
            headVersionDescriptor,
        )

        return {
            path: normalizedChange.filePath,
            status: normalizedChange.status,
            ...(normalizedChange.oldPath !== undefined &&
            normalizedChange.oldPath !== normalizedChange.filePath
                ? {oldPath: normalizedChange.oldPath}
                : {}),
            patch: patch.patch,
            hunks: patch.hunks,
        }
    }

    /**
     * Builds one commit diff entry with optional line metrics.
     *
     * @param changeEntry Raw Azure change entry.
     * @param parentCommitId Parent commit identifier when available.
     * @param commitId Current commit identifier.
     * @returns Parsed commit diff payload.
     */
    private async buildCommitDiff(
        changeEntry: unknown,
        parentCommitId: string | undefined,
        commitId: string,
    ): Promise<IParsedAzureDiff> {
        const normalizedChange = normalizeAzureChange(changeEntry)
        const patch = await this.buildPatchResult(
            normalizedChange,
            parentCommitId === undefined
                ? undefined
                : createVersionDescriptor(
                    parentCommitId,
                    AZURE_DEVOPS_VERSION_TYPE.COMMIT,
                ),
            createVersionDescriptor(commitId, AZURE_DEVOPS_VERSION_TYPE.COMMIT),
        )

        return {
            filePath: normalizedChange.filePath,
            ...(normalizedChange.oldPath !== undefined &&
            normalizedChange.oldPath !== normalizedChange.filePath
                ? {oldPath: normalizedChange.oldPath}
                : {}),
            status: normalizedChange.status,
            additions: patch.additions,
            deletions: patch.deletions,
            changes: patch.changes,
            patch: patch.patch,
            hunks: patch.hunks,
        }
    }

    /**
     * Builds one ref-diff file entry.
     *
     * @param changeEntry Raw Azure change entry.
     * @param baseVersionDescriptor Base ref version descriptor.
     * @param headVersionDescriptor Head ref version descriptor.
     * @returns Ref diff entry.
     */
    private async buildRefDiffFile(
        changeEntry: unknown,
        baseVersionDescriptor: IAzureDevOpsVersionDescriptor,
        headVersionDescriptor: IAzureDevOpsVersionDescriptor,
    ): Promise<IRefDiffFile> {
        const normalizedChange = normalizeAzureChange(changeEntry)
        const patch = await this.buildPatchResult(
            normalizedChange,
            baseVersionDescriptor,
            headVersionDescriptor,
        )

        return {
            path: normalizedChange.filePath,
            status: normalizedChange.status,
            ...(normalizedChange.oldPath !== undefined &&
            normalizedChange.oldPath !== normalizedChange.filePath
                ? {oldPath: normalizedChange.oldPath}
                : {}),
            additions: patch.additions,
            deletions: patch.deletions,
            changes: patch.changes,
            patch: patch.patch,
            hunks: patch.hunks,
        }
    }

    /**
     * Builds patch and line metrics for one change between two versions.
     *
     * @param change Normalized file change.
     * @param baseVersionDescriptor Optional base version descriptor.
     * @param headVersionDescriptor Optional head version descriptor.
     * @returns Patch payload and line metrics.
     */
    private async buildPatchResult(
        change: IAzureDevOpsNormalizedChange,
        baseVersionDescriptor: IAzureDevOpsVersionDescriptor | undefined,
        headVersionDescriptor: IAzureDevOpsVersionDescriptor | undefined,
    ): Promise<IParsedPatchResult> {
        const oldSnapshot = change.status === MERGE_REQUEST_DIFF_FILE_STATUS.ADDED
            ? EMPTY_TEXT_FILE_SNAPSHOT
            : await this.tryLoadTextFileContent(
                change.oldPath ?? change.filePath,
                baseVersionDescriptor,
            )
        const newSnapshot = change.status === MERGE_REQUEST_DIFF_FILE_STATUS.DELETED
            ? EMPTY_TEXT_FILE_SNAPSHOT
            : await this.tryLoadTextFileContent(change.filePath, headVersionDescriptor)

        if (oldSnapshot.isBinary || newSnapshot.isBinary) {
            return EMPTY_PATCH_RESULT
        }

        return createPatchResult(
            change.oldPath ?? change.filePath,
            change.filePath,
            oldSnapshot.exists ? oldSnapshot.content : "",
            newSnapshot.exists ? newSnapshot.content : "",
        )
    }

    /**
     * Loads text file snapshot and gracefully handles expected not-found cases.
     *
     * @param filePath Repository-relative file path.
     * @param versionDescriptor Optional version descriptor.
     * @returns File snapshot or missing snapshot.
     */
    private async tryLoadTextFileContent(
        filePath: string,
        versionDescriptor: IAzureDevOpsVersionDescriptor | undefined,
    ): Promise<IAzureDevOpsTextFileSnapshot> {
        if (versionDescriptor === undefined) {
            return EMPTY_TEXT_FILE_SNAPSHOT
        }

        try {
            const item = await this.executeRequest("getItem", () => {
                return this.client.getItem({
                    path: normalizeRepositoryPath(filePath),
                    versionDescriptor,
                    includeContent: true,
                    includeContentMetadata: true,
                })
            })

            return mapAzureTextFileSnapshot(item)
        } catch (error) {
            if (
                error instanceof AzureDevOpsProviderError &&
                error.kind === GIT_ACL_ERROR_KIND.NOT_FOUND
            ) {
                return EMPTY_TEXT_FILE_SNAPSHOT
            }

            throw error
        }
    }

    /**
     * Builds inline thread context for Azure tracked comments.
     *
     * @param pullRequestId Pull request identifier.
     * @param comment Inline comment payload.
     * @returns Azure thread and tracking context payload.
     */
    private async buildInlineThreadContext(
        pullRequestId: number,
        comment: IInlineCommentDTO,
    ): Promise<Readonly<Record<string, Readonly<Record<string, unknown>>>>>
    {
        const diffContext = await this.loadPullRequestDiffContext(pullRequestId)
        const normalizedFilePath = normalizeRepositoryRelativeFilePath(comment.filePath)
        const change = diffContext.changeEntries
            .map((entry): IAzureDevOpsNormalizedChange => {
                return normalizeAzureChange(entry)
            })
            .find((entry): boolean => {
                return entry.filePath === normalizedFilePath
            })

        if (change?.changeTrackingId === undefined) {
            throw new Error(
                `Azure DevOps change tracking is unavailable for ${normalizedFilePath}`,
            )
        }

        return createAzureInlineThreadContext(
            comment,
            change,
            diffContext.iterationId,
        )
    }

    /**
     * Maps one Azure branch payload to core DTO.
     *
     * @param branch Raw branch payload.
     * @param defaultBranchName Default branch name.
     * @returns Normalized branch info.
     */
    private async mapAzureBranch(
        branch: unknown,
        defaultBranchName: string,
    ): Promise<IBranchInfo> {
        const branchRecord = toRecord(branch)
        const branchName = normalizeRefName(readString(branchRecord, ["name"]), "refs/heads/")
        const commitRecord = toRecord(branchRecord?.["commit"])
        const sha = readString(commitRecord, ["commitId", "id", "objectId"])
        const commitDate = readNestedString(commitRecord, ["committer", "date"])

        if (commitDate.length > 0) {
            return {
                name: branchName,
                sha,
                isDefault: branchName === defaultBranchName,
                isProtected: false,
                lastCommitDate: commitDate,
            }
        }

        const commit = await this.executeRequest("getCommit", () => {
            return this.client.getCommit(sha)
        })

        return {
            name: branchName,
            sha,
            isDefault: branchName === defaultBranchName,
            isProtected: false,
            lastCommitDate: readNestedString(toRecord(commit), ["author", "date"]),
        }
    }

    /**
     * Maps one Azure tag payload to core DTO.
     *
     * @param ref Raw Azure ref payload.
     * @returns Normalized tag info.
     */
    private async mapAzureTag(ref: unknown): Promise<ITagInfo> {
        const refRecord = toRecord(ref)
        const refName = normalizeRefName(readString(refRecord, ["name"]), "refs/tags/")
        const objectId = readString(refRecord, ["objectId"])
        const peeledObjectId = readString(refRecord, ["peeledObjectId"])

        if (peeledObjectId.length > 0 && peeledObjectId !== objectId) {
            const annotatedTag = await this.executeRequest("getAnnotatedTag", () => {
                return this.client.getAnnotatedTag(objectId)
            })
            const annotatedRecord = toRecord(annotatedTag)
            const taggedObject = toRecord(annotatedRecord?.["taggedObject"])
            const taggedBy = toRecord(annotatedRecord?.["taggedBy"])
            const commitSha = readString(taggedObject, ["objectId"])
            const commit = await this.executeRequest("getCommit", () => {
                return this.client.getCommit(commitSha)
            })
            const commitRecord = toRecord(commit)
            const commitDate = readNestedString(commitRecord, ["author", "date"])

            return {
                name: refName,
                sha: objectId,
                isAnnotated: true,
                annotationMessage: readString(annotatedRecord, ["message"]),
                date: pickLaterIsoDate(
                    readNestedString(taggedBy, ["date"]),
                    commitDate,
                ),
                commit: {
                    sha: commitSha,
                    message: readString(commitRecord, ["comment", "message"]),
                    date: commitDate,
                },
            }
        }

        const commitSha = peeledObjectId.length > 0 ? peeledObjectId : objectId
        const commit = await this.executeRequest("getCommit", () => {
            return this.client.getCommit(commitSha)
        })
        const commitRecord = toRecord(commit)
        const commitDate = readNestedString(commitRecord, ["author", "date"])

        return {
            name: refName,
            sha: commitSha,
            isAnnotated: false,
            date: commitDate,
            commit: {
                sha: commitSha,
                message: readString(commitRecord, ["comment", "message"]),
                date: commitDate,
            },
        }
    }

    /**
     * Lists commit diff changes between two refs using skip/top pagination.
     *
     * @param baseVersionDescriptor Base ref descriptor.
     * @param headVersionDescriptor Head ref descriptor.
     * @returns Diff metadata with ahead count and raw change list.
     */
    private async listCommitDiffChanges(
        baseVersionDescriptor: IAzureDevOpsVersionDescriptor,
        headVersionDescriptor: IAzureDevOpsVersionDescriptor,
    ): Promise<Readonly<{aheadBy: number; changes: readonly unknown[]}>> {
        const changes: unknown[] = []
        let aheadBy = 0
        let skip = 0

        while (true) {
            const response = await this.executeRequest("getCommitDiffs", () => {
                return this.client.getCommitDiffs({
                    baseVersionDescriptor,
                    targetVersionDescriptor: headVersionDescriptor,
                    skip,
                    top: AZURE_DEVOPS_PAGE_SIZE,
                })
            })
            const responseRecord = toRecord(response)
            const pageChanges = readArray(responseRecord?.["changes"])

            if (aheadBy === 0) {
                aheadBy = readNumber(responseRecord, ["aheadCount"])
            }

            changes.push(...pageChanges)

            if (pageChanges.length < AZURE_DEVOPS_PAGE_SIZE) {
                break
            }

            if (readBoolean(responseRecord, ["allChangesIncluded"])) {
                break
            }

            skip += pageChanges.length
        }

        return {
            aheadBy,
            changes,
        }
    }

    /**
     * Stores legacy check context for id-based compatibility updates.
     *
     * @param pipelineId Pipeline identifier returned by provider.
     * @param context Legacy compatibility context.
     */
    private rememberLegacyPipelineContext(
        pipelineId: string,
        context: ILegacyPipelineContext,
    ): void {
        this.legacyPipelineContexts.set(pipelineId, context)
    }
}

interface IAzureDevOpsSdkClient {
    getRepository(repositoryId: string, project?: string): Promise<unknown>
    getPullRequest(
        repositoryId: string,
        pullRequestId: number,
        project?: string,
        maxCommentLength?: number,
        skip?: number,
        top?: number,
        includeCommits?: boolean,
        includeWorkItemRefs?: boolean,
    ): Promise<unknown>
    getPullRequestCommits(
        repositoryId: string,
        pullRequestId: number,
        project?: string,
    ): Promise<readonly unknown[]>
    getPullRequestIterations(
        repositoryId: string,
        pullRequestId: number,
        project?: string,
        includeCommits?: boolean,
    ): Promise<readonly unknown[]>
    getPullRequestIterationChanges(
        repositoryId: string,
        pullRequestId: number,
        iterationId: number,
        project?: string,
        top?: number,
        skip?: number,
        compareTo?: number,
    ): Promise<unknown>
    createThread(
        commentThread: unknown,
        repositoryId: string,
        pullRequestId: number,
        project?: string,
    ): Promise<unknown>
    createPullRequestStatus(
        status: unknown,
        repositoryId: string,
        pullRequestId: number,
        project?: string,
    ): Promise<unknown>
    getItems(
        repositoryId: string,
        project?: string,
        scopePath?: string,
        recursionLevel?: number,
        includeContentMetadata?: boolean,
        latestProcessedChange?: boolean,
        download?: boolean,
        includeLinks?: boolean,
        versionDescriptor?: unknown,
        zipForUnix?: boolean,
    ): Promise<readonly unknown[]>
    getItem(
        repositoryId: string,
        path: string,
        project?: string,
        scopePath?: string,
        recursionLevel?: number,
        includeContentMetadata?: boolean,
        latestProcessedChange?: boolean,
        download?: boolean,
        versionDescriptor?: unknown,
        includeContent?: boolean,
        resolveLfs?: boolean,
        sanitize?: boolean,
    ): Promise<unknown>
    getBranches(
        repositoryId: string,
        project?: string,
        baseVersionDescriptor?: unknown,
    ): Promise<readonly unknown[]>
    getCommitsBatch(
        searchCriteria: unknown,
        repositoryId: string,
        project?: string,
        skip?: number,
        top?: number,
        includeStatuses?: boolean,
    ): Promise<readonly unknown[]>
    getCommit(
        commitId: string,
        repositoryId: string,
        project?: string,
        changeCount?: number,
    ): Promise<unknown>
    getChanges(
        commitId: string,
        repositoryId: string,
        project?: string,
        top?: number,
        skip?: number,
    ): Promise<unknown>
    getRefs(
        repositoryId: string,
        project?: string,
        filter?: string,
        includeLinks?: boolean,
        includeStatuses?: boolean,
        includeMyBranches?: boolean,
        latestStatusesOnly?: boolean,
        peelTags?: boolean,
        filterContains?: string,
    ): Promise<readonly unknown[]>
    getAnnotatedTag(
        project: string,
        repositoryId: string,
        objectId: string,
    ): Promise<unknown>
    getCommitDiffs(
        repositoryId: string,
        project?: string,
        diffCommonCommit?: boolean,
        top?: number,
        skip?: number,
        baseVersionDescriptor?: unknown,
        targetVersionDescriptor?: unknown,
    ): Promise<unknown>
}

const EMPTY_TEXT_FILE_SNAPSHOT: IAzureDevOpsTextFileSnapshot = {
    exists: false,
    isBinary: false,
    content: "",
}

const EMPTY_PATCH_RESULT: IParsedPatchResult = {
    patch: "",
    hunks: [],
    additions: 0,
    deletions: 0,
    changes: 0,
}

/**
 * Creates Azure DevOps client wrapper backed by official SDK.
 *
 * @param options Provider configuration.
 * @returns Wrapped Azure DevOps client.
 */
function createAzureDevOpsClient(
    options: IAzureDevOpsProviderOptions,
): IAzureDevOpsGitClient {
    const organizationUrl = normalizeRequiredText(
        options.organizationUrl,
        "organizationUrl",
    )
    const project = normalizeRequiredText(options.project, "project")
    const repositoryId = normalizeRequiredText(options.repositoryId, "repositoryId")
    const token = normalizeRequiredText(options.token, "token")
    const gitApiPromise = createAzureDevOpsGitApi(organizationUrl, token)

    return {
        getRepository(): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getRepository(repositoryId, project)
            })
        },
        ...createAzureDevOpsPullRequestClient(gitApiPromise, repositoryId, project),
        ...createAzureDevOpsRepositoryClient(gitApiPromise, repositoryId, project),
    }
}

/**
 * Builds pull-request related Azure DevOps client methods.
 *
 * @param gitApiPromise SDK Git API promise.
 * @param repositoryId Repository identifier.
 * @param project Project identifier.
 * @returns Pull-request related client methods.
 */
function createAzureDevOpsPullRequestClient(
    gitApiPromise: Promise<IAzureDevOpsSdkClient>,
    repositoryId: string,
    project: string,
): Pick<
    IAzureDevOpsGitClient,
    | "getPullRequest"
    | "getPullRequestCommits"
    | "getPullRequestIterations"
    | "getPullRequestIterationChanges"
    | "createThread"
    | "createPullRequestStatus"
> {
    return {
        getPullRequest(pullRequestId: number): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getPullRequest(
                    repositoryId,
                    pullRequestId,
                    project,
                    undefined,
                    undefined,
                    undefined,
                    true,
                )
            })
        },
        getPullRequestCommits(pullRequestId: number): Promise<readonly unknown[]> {
            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getPullRequestCommits(repositoryId, pullRequestId, project)
            })
        },
        getPullRequestIterations(pullRequestId: number): Promise<readonly unknown[]> {
            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getPullRequestIterations(
                    repositoryId,
                    pullRequestId,
                    project,
                    false,
                )
            })
        },
        getPullRequestIterationChanges(
            input: IAzureDevOpsPullRequestIterationChangesInput,
        ): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getPullRequestIterationChanges(
                    repositoryId,
                    input.pullRequestId,
                    input.iterationId,
                    project,
                    input.top,
                    input.skip,
                )
            })
        },
        createThread(input: IAzureDevOpsCreateThreadInput): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.createThread(input, repositoryId, input.pullRequestId, project)
            })
        },
        createPullRequestStatus(
            input: IAzureDevOpsCreatePullRequestStatusInput,
        ): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.createPullRequestStatus(
                    input.status,
                    repositoryId,
                    input.pullRequestId,
                    project,
                )
            })
        },
    }
}

/**
 * Builds repository and history related Azure DevOps client methods.
 *
 * @param gitApiPromise SDK Git API promise.
 * @param repositoryId Repository identifier.
 * @param project Project identifier.
 * @returns Repository related client methods.
 */
function createAzureDevOpsRepositoryClient(
    gitApiPromise: Promise<IAzureDevOpsSdkClient>,
    repositoryId: string,
    project: string,
): Pick<
    IAzureDevOpsGitClient,
    | "getItems"
    | "getItem"
    | "getBranches"
    | "getCommitsBatch"
    | "getCommit"
    | "getCommitChanges"
    | "getRefs"
    | "getAnnotatedTag"
    | "getCommitDiffs"
> {
    return {
        ...createAzureDevOpsRepositoryBrowsingClient(
            gitApiPromise,
            repositoryId,
            project,
        ),
        ...createAzureDevOpsHistoryClient(gitApiPromise, repositoryId, project),
    }
}

/**
 * Builds repository browsing Azure DevOps client methods.
 *
 * @param gitApiPromise SDK Git API promise.
 * @param repositoryId Repository identifier.
 * @param project Project identifier.
 * @returns Repository browsing client methods.
 */
function createAzureDevOpsRepositoryBrowsingClient(
    gitApiPromise: Promise<IAzureDevOpsSdkClient>,
    repositoryId: string,
    project: string,
): Pick<
    IAzureDevOpsGitClient,
    | "getItems"
    | "getItem"
    | "getBranches"
    | "getRefs"
    | "getAnnotatedTag"
    | "getCommitDiffs"
> {
    return {
        getItems(input: IAzureDevOpsGetItemsInput): Promise<readonly unknown[]> {
            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getItems(
                    repositoryId,
                    project,
                    input.scopePath,
                    input.recursionLevel,
                    input.includeContentMetadata,
                    false,
                    false,
                    false,
                    input.versionDescriptor,
                )
            })
        },
        getItem(input: IAzureDevOpsGetItemInput): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getItem(
                    repositoryId,
                    input.path,
                    project,
                    undefined,
                    AZURE_DEVOPS_RECURSION_LEVEL.NONE,
                    input.includeContentMetadata,
                    false,
                    false,
                    input.versionDescriptor,
                    input.includeContent,
                )
            })
        },
        getBranches(): Promise<readonly unknown[]> {
            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getBranches(repositoryId, project)
            })
        },
        getRefs(input: IAzureDevOpsGetRefsInput): Promise<readonly unknown[]> {
            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getRefs(
                    repositoryId,
                    project,
                    input.filter,
                    false,
                    false,
                    false,
                    false,
                    input.peelTags,
                )
            })
        },
        getAnnotatedTag(tagObjectId: string): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getAnnotatedTag(project, repositoryId, tagObjectId)
            })
        },
        getCommitDiffs(input: IAzureDevOpsGetCommitDiffsInput): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getCommitDiffs(
                    repositoryId,
                    project,
                    true,
                    input.top,
                    input.skip,
                    input.baseVersionDescriptor,
                    input.targetVersionDescriptor,
                )
            })
        },
    }
}

/**
 * Builds history-related Azure DevOps client methods.
 *
 * @param gitApiPromise SDK Git API promise.
 * @param repositoryId Repository identifier.
 * @param project Project identifier.
 * @returns History client methods.
 */
function createAzureDevOpsHistoryClient(
    gitApiPromise: Promise<IAzureDevOpsSdkClient>,
    repositoryId: string,
    project: string,
): Pick<
    IAzureDevOpsGitClient,
    | "getCommitsBatch"
    | "getCommit"
    | "getCommitChanges"
> {
    return {
        getCommitsBatch(input: IAzureDevOpsGetCommitsBatchInput): Promise<readonly unknown[]> {
            const searchCriteria = {
                ...input.searchCriteria,
                itemVersion: input.versionDescriptor,
            }

            return gitApiPromise.then((api): Promise<readonly unknown[]> => {
                return api.getCommitsBatch(
                    searchCriteria,
                    repositoryId,
                    project,
                    readNumber(toRecord(searchCriteria), ["$skip"]),
                    readNumber(toRecord(searchCriteria), ["$top"]),
                )
            })
        },
        getCommit(commitId: string): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getCommit(commitId, repositoryId, project)
            })
        },
        getCommitChanges(input: IAzureDevOpsGetCommitChangesInput): Promise<unknown> {
            return gitApiPromise.then((api): Promise<unknown> => {
                return api.getChanges(
                    input.commitId,
                    repositoryId,
                    project,
                    input.top,
                    input.skip,
                )
            })
        },
    }
}

/**
 * Creates SDK Git API client promise.
 *
 * @param organizationUrl Azure DevOps organization URL.
 * @param token Personal access token.
 * @returns SDK Git API promise.
 */
function createAzureDevOpsGitApi(
    organizationUrl: string,
    token: string,
): Promise<IAzureDevOpsSdkClient> {
    const webApi = new WebApi(
        organizationUrl,
        getPersonalAccessTokenHandler(token),
    )

    return webApi.getGitApi() as Promise<IAzureDevOpsSdkClient>
}

/**
 * Normalizes required text input.
 *
 * @param value Raw value.
 * @param fieldName Field label.
 * @returns Trimmed non-empty string.
 */
function normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim()

    if (normalized.length === 0) {
        throw new Error(`${fieldName} cannot be empty`)
    }

    return normalized
}

/**
 * Normalizes optional text input.
 *
 * @param value Optional raw value.
 * @param fieldName Field label.
 * @returns Trimmed string or undefined.
 */
function normalizeOptionalText(
    value: string | undefined,
    fieldName: string,
): string | undefined {
    if (value === undefined) {
        return undefined
    }

    return normalizeRequiredText(value, fieldName)
}

/**
 * Normalizes merge request identifier to positive integer.
 *
 * @param value Raw identifier.
 * @returns Pull request identifier.
 */
function normalizeMergeRequestId(value: string): number {
    const normalized = normalizeRequiredText(value, "mergeRequestId")
    const numericValue = Number(normalized)

    if (Number.isInteger(numericValue) === false || numericValue <= 0) {
        throw new Error("mergeRequestId must be positive integer")
    }

    return numericValue
}

/**
 * Normalizes repository-relative file path.
 *
 * @param filePath Raw repository-relative path.
 * @returns Azure API path with leading slash.
 */
function normalizeRepositoryPath(filePath: string): string {
    const normalized = normalizeRequiredText(filePath, "filePath")

    return normalized.startsWith("/") ? normalized : `/${normalized}`
}

/**
 * Removes Azure leading slash from repository path.
 *
 * @param filePath Raw Azure path.
 * @returns Repository-relative path.
 */
function normalizeRepositoryRelativeFilePath(filePath: string): string {
    const normalized = normalizeRequiredText(filePath, "filePath")

    return normalized.startsWith("/") ? normalized.slice(1) : normalized
}

/**
 * Converts unknown to record.
 *
 * @param value Raw value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Reads array-like payload safely.
 *
 * @param value Raw value.
 * @returns Array or empty list.
 */
function readArray(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : []
}

/**
 * Reads string from candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Trimmed string.
 */
function readString(
    record: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = "",
): string {
    for (const key of keys) {
        const value = record?.[key]

        if (typeof value === "string") {
            return value.trim()
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value)
        }
    }

    return fallback
}

/**
 * Reads string from nested record field.
 *
 * @param record Source record.
 * @param path Nested property path.
 * @returns Trimmed string or empty string.
 */
function readNestedString(
    record: Readonly<Record<string, unknown>> | null,
    path: readonly string[],
): string {
    let current: Readonly<Record<string, unknown>> | null = record

    for (let index = 0; index < path.length - 1; index += 1) {
        current = toRecord(current?.[path[index] ?? ""])
        if (current === null) {
            return ""
        }
    }

    const lastKey = path.at(-1)
    return lastKey === undefined ? "" : readString(current, [lastKey])
}

/**
 * Reads number from candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @param fallback Fallback value.
 * @returns Numeric value.
 */
function readNumber(
    record: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
    fallback = 0,
): number {
    for (const key of keys) {
        const value = record?.[key]

        if (typeof value === "number" && Number.isFinite(value)) {
            return value
        }

        if (typeof value === "string") {
            const parsed = Number(value)

            if (Number.isFinite(parsed)) {
                return parsed
            }
        }
    }

    return fallback
}

/**
 * Reads boolean flag from candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @returns Boolean flag.
 */
function readBoolean(
    record: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
): boolean {
    for (const key of keys) {
        if (record?.[key] === true) {
            return true
        }
    }

    return false
}

/**
 * Creates immutable Azure version descriptor.
 *
 * @param version Version value.
 * @param versionType Azure version type.
 * @returns Version descriptor.
 */
function createVersionDescriptor(
    version: string,
    versionType: number,
): IAzureDevOpsVersionDescriptor {
    return {
        version,
        versionType,
    }
}

/**
 * Detects commit-like SHA identifiers.
 *
 * @param value Candidate ref value.
 * @returns True when value looks like commit SHA.
 */
function isCommitSha(value: string): boolean {
    return /^[a-f0-9]{7,40}$/i.test(value)
}

/**
 * Finds exact ref payload by canonical name.
 *
 * @param refs Raw ref payloads.
 * @param refName Canonical ref name.
 * @returns Matching ref payload or undefined.
 */
function findExactAzureRef(
    refs: readonly unknown[],
    refName: string,
): Readonly<Record<string, unknown>> | undefined {
    return refs
        .map((entry): Readonly<Record<string, unknown>> | null => {
            return toRecord(entry)
        })
        .find((record): record is Readonly<Record<string, unknown>> => {
            return record !== null && readString(record, ["name"]) === refName
        })
}

/**
 * Normalizes canonical Azure ref name to short branch or tag name.
 *
 * @param value Raw ref name.
 * @param prefix Canonical prefix.
 * @returns Short ref name.
 */
function normalizeRefName(value: string, prefix: string): string {
    const normalized = value.trim()

    return normalized.startsWith(prefix)
        ? normalized.slice(prefix.length)
        : normalized
}

/**
 * Resolves latest iteration id from Azure iterations payload.
 *
 * @param iterations Raw iteration collection.
 * @returns Latest iteration identifier or zero.
 */
function resolveLatestIterationId(iterations: readonly unknown[]): number {
    return iterations
        .map((iteration): number => {
            return readNumber(toRecord(iteration), ["id"])
        })
        .reduce((latest, candidate): number => {
            return candidate > latest ? candidate : latest
        }, 0)
}

/**
 * Resolves pull request base version descriptor.
 *
 * @param pullRequest Raw pull request payload.
 * @returns Base version descriptor.
 */
function resolvePullRequestBaseVersionDescriptor(
    pullRequest: unknown,
): IAzureDevOpsVersionDescriptor {
    const record = toRecord(pullRequest)
    const baseCommitId = readNestedString(record, ["lastMergeTargetCommit", "commitId"])

    if (baseCommitId.length > 0) {
        return createVersionDescriptor(baseCommitId, AZURE_DEVOPS_VERSION_TYPE.COMMIT)
    }

    return createVersionDescriptor(
        normalizeRefName(
            readString(record, ["targetRefName"]),
            "refs/heads/",
        ),
        AZURE_DEVOPS_VERSION_TYPE.BRANCH,
    )
}

/**
 * Resolves pull request head version descriptor.
 *
 * @param pullRequest Raw pull request payload.
 * @returns Head version descriptor.
 */
function resolvePullRequestHeadVersionDescriptor(
    pullRequest: unknown,
): IAzureDevOpsVersionDescriptor {
    const record = toRecord(pullRequest)
    const headCommitId = readNestedString(record, ["lastMergeSourceCommit", "commitId"])

    if (headCommitId.length > 0) {
        return createVersionDescriptor(headCommitId, AZURE_DEVOPS_VERSION_TYPE.COMMIT)
    }

    return createVersionDescriptor(
        normalizeRefName(
            readString(record, ["sourceRefName"]),
            "refs/heads/",
        ),
        AZURE_DEVOPS_VERSION_TYPE.BRANCH,
    )
}

/**
 * Creates provider-agnostic merge request payload from Azure pull request data.
 *
 * @param pullRequest Raw pull request payload.
 * @param commits Raw pull request commits.
 * @param diffFiles Normalized diff files.
 * @returns Provider-agnostic merge request payload.
 */
function createAzureMergeRequestPayload(
    pullRequest: unknown,
    commits: readonly unknown[],
    diffFiles: readonly IMergeRequestDiffFileDTO[],
): IExternalGitMergeRequest {
    const record = toRecord(pullRequest)
    const author = toRecord(record?.["createdBy"])

    return {
        id: readString(record, ["pullRequestId"]),
        number: readNumber(record, ["pullRequestId"]),
        title: readString(record, ["title"]),
        description: readString(record, ["description"]),
        sourceBranch: normalizeRefName(
            readString(record, ["sourceRefName"]),
            "refs/heads/",
        ),
        targetBranch: normalizeRefName(
            readString(record, ["targetRefName"]),
            "refs/heads/",
        ),
        state: mapAzurePullRequestState(readNumber(record, ["status"])),
        author: {
            id: readString(author, ["id", "descriptor"]),
            username: readString(author, ["uniqueName", "displayName"]),
            displayName: readString(author, ["displayName", "uniqueName"]),
        },
        commits: commits.map((commit): Readonly<Record<string, unknown>> => {
            const commitRecord = toRecord(commit) ?? {}

            return {
                id: readString(commitRecord, ["commitId", "id"]),
                message: readString(commitRecord, ["comment", "message"]),
                author: readNestedString(commitRecord, ["author", "name"]),
                timestamp: readNestedString(commitRecord, ["author", "date"]),
            }
        }),
        diffFiles,
    }
}

/**
 * Maps Azure pull request status code to DTO state label.
 *
 * @param status Azure pull request status code.
 * @returns Stable lowercase state label.
 */
function mapAzurePullRequestState(status: number): string {
    if (status === AZURE_DEVOPS_PULL_REQUEST_STATUS.COMPLETED) {
        return "completed"
    }

    if (status === AZURE_DEVOPS_PULL_REQUEST_STATUS.ABANDONED) {
        return "abandoned"
    }

    return "active"
}

/**
 * Maps Azure Git item to file-tree DTO or null for unsupported entries.
 *
 * @param item Raw Azure item payload.
 * @returns File-tree node or null.
 */
function mapAzureTreeItem(item: unknown): IFileTreeNode | null {
    const record = toRecord(item)
    const rawPath = readString(record, ["path"])
    const normalizedPath = normalizeRefName(rawPath, "/")

    if (normalizedPath.length === 0) {
        return null
    }

    if (readBoolean(record, ["isFolder"])) {
        return {
            path: normalizedPath,
            type: FILE_TREE_NODE_TYPE.TREE,
            size: 0,
            sha: readString(record, ["objectId", "commitId"]),
        }
    }

    const objectType = readNumber(record, ["gitObjectType"])
    if (objectType !== AZURE_DEVOPS_GIT_OBJECT_TYPE.BLOB) {
        return null
    }

    return {
        path: normalizedPath,
        type: FILE_TREE_NODE_TYPE.BLOB,
        size: readNumber(record, ["size"]),
        sha: readString(record, ["objectId", "commitId"]),
    }
}

/**
 * Maps Azure item payload to normalized text file snapshot.
 *
 * @param item Raw Azure item payload.
 * @returns Text file snapshot.
 */
function mapAzureTextFileSnapshot(item: unknown): IAzureDevOpsTextFileSnapshot {
    const record = toRecord(item)
    const metadata = toRecord(record?.["contentMetadata"])
    const isBinary = readBoolean(metadata, ["isBinary", "isImage"])

    return {
        exists: true,
        isBinary,
        content: isBinary ? "" : readString(record, ["content"]),
    }
}

/**
 * Maps Azure change entry to normalized change model.
 *
 * @param changeEntry Raw Azure change entry.
 * @returns Normalized change model.
 */
function normalizeAzureChange(changeEntry: unknown): IAzureDevOpsNormalizedChange {
    const record = toRecord(changeEntry)
    const item = toRecord(record?.["item"])
    const rawPath = readString(item, ["path"])
    const filePath = normalizeRepositoryRelativeFilePath(rawPath)
    const originalPath = readString(record, ["originalPath", "sourceServerItem"])
    const normalizedOldPath = originalPath.length > 0
        ? normalizeRepositoryRelativeFilePath(originalPath)
        : undefined

    return {
        filePath,
        oldPath: normalizedOldPath,
        status: mapAzureChangeTypeToDiffStatus(readNumber(record, ["changeType"])),
        changeTrackingId: readNumber(record, ["changeTrackingId"]) || undefined,
    }
}

/**
 * Maps Azure change entry to parsed diff without line-level patch enrichment.
 *
 * @param changeEntry Raw Azure change entry.
 * @returns Parsed diff payload.
 */
function mapAzureChangeWithoutPatch(changeEntry: unknown): IParsedAzureDiff {
    const change = normalizeAzureChange(changeEntry)

    return {
        filePath: change.filePath,
        ...(change.oldPath !== undefined && change.oldPath !== change.filePath
            ? {oldPath: change.oldPath}
            : {}),
        status: change.status,
        additions: 0,
        deletions: 0,
        changes: 0,
        patch: "",
        hunks: [],
    }
}

/**
 * Maps Azure bitmask change type to generic diff status.
 *
 * @param changeType Azure change type bitmask.
 * @returns Generic diff status.
 */
function mapAzureChangeTypeToDiffStatus(
    changeType: number,
): IMergeRequestDiffFileDTO["status"] {
    if ((changeType & AZURE_DEVOPS_CHANGE_TYPE.ADD) !== 0) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.ADDED
    }

    if ((changeType & AZURE_DEVOPS_CHANGE_TYPE.DELETE) !== 0) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.DELETED
    }

    if (
        (changeType & AZURE_DEVOPS_CHANGE_TYPE.RENAME) !== 0 ||
        (changeType & AZURE_DEVOPS_CHANGE_TYPE.SOURCE_RENAME) !== 0 ||
        (changeType & AZURE_DEVOPS_CHANGE_TYPE.TARGET_RENAME) !== 0
    ) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED
    }

    return MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED
}

/**
 * Creates unified diff patch and line metrics from two text snapshots.
 *
 * @param oldPath Previous repository-relative path.
 * @param newPath Current repository-relative path.
 * @param oldContent Previous text content.
 * @param newContent Current text content.
 * @returns Patch payload with parsed metrics.
 */
function createPatchResult(
    oldPath: string,
    newPath: string,
    oldContent: string,
    newContent: string,
): IParsedPatchResult {
    const patch = createTwoFilesPatch(oldPath, newPath, oldContent, newContent, "", "")
    const hunkLines = extractPatchHunks(patch)

    if (hunkLines.length === 0) {
        return EMPTY_PATCH_RESULT
    }

    let additions = 0
    let deletions = 0

    for (const line of patch.split("\n")) {
        if (line.startsWith("+++ ") || line.startsWith("--- ")) {
            continue
        }

        if (line.startsWith("+")) {
            additions += 1
            continue
        }

        if (line.startsWith("-")) {
            deletions += 1
        }
    }

    return {
        patch,
        hunks: hunkLines,
        additions,
        deletions,
        changes: additions + deletions,
    }
}

/**
 * Extracts non-empty hunk strings from unified diff patch.
 *
 * @param patch Unified diff patch.
 * @returns Non-empty hunk blocks.
 */
function extractPatchHunks(patch: string): readonly string[] {
    const lines = patch.split("\n")
    const hunks: string[] = []
    let currentHunk: string[] = []

    for (const line of lines) {
        if (line.startsWith("@@")) {
            if (currentHunk.length > 0) {
                hunks.push(currentHunk.join("\n").trim())
            }

            currentHunk = [line]
            continue
        }

        if (currentHunk.length > 0) {
            currentHunk.push(line)
        }
    }

    if (currentHunk.length > 0) {
        hunks.push(currentHunk.join("\n").trim())
    }

    return hunks.filter((hunk): boolean => {
        return hunk.length > 0
    })
}

/**
 * Builds Azure inline thread context payload.
 *
 * @param comment Inline comment payload.
 * @param change Normalized change model.
 * @param iterationId Latest iteration identifier.
 * @returns Azure thread context payload.
 */
function createAzureInlineThreadContext(
    comment: IInlineCommentDTO,
    change: IAzureDevOpsNormalizedChange,
    iterationId: number,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
    const filePath = normalizeRepositoryPath(change.filePath)
    const leftPosition = comment.side === INLINE_COMMENT_SIDE.LEFT
        ? {
            leftFileStart: {line: comment.line, offset: 1},
            leftFileEnd: {line: comment.line, offset: 1},
        }
        : {}
    const rightPosition = comment.side === INLINE_COMMENT_SIDE.RIGHT
        ? {
            rightFileStart: {line: comment.line, offset: 1},
            rightFileEnd: {line: comment.line, offset: 1},
        }
        : {}

    return {
        threadContext: {
            filePath,
            ...leftPosition,
            ...rightPosition,
        },
        pullRequestThreadContext: {
            changeTrackingId: change.changeTrackingId,
            iterationContext: {
                firstComparingIteration: iterationId > 1 ? iterationId - 1 : 1,
                secondComparingIteration: iterationId > 0 ? iterationId : 1,
            },
        },
    }
}

/**
 * Maps Azure thread payload to generic comment DTO.
 *
 * @param thread Raw thread payload.
 * @returns Generic comment DTO.
 */
function mapAzureComment(thread: unknown): ICommentDTO {
    const threadRecord = toRecord(thread)
    const firstComment = toRecord(readArray(threadRecord?.["comments"])[0])

    return {
        id: readString(firstComment, ["id"], readString(threadRecord, ["id"])),
        body: readString(firstComment, ["content"]),
        author: readNestedString(firstComment, ["author", "displayName"]),
        createdAt: readString(firstComment, ["publishedDate", "lastUpdatedDate"]),
    }
}

/**
 * Maps Azure thread payload to generic inline comment DTO.
 *
 * @param thread Raw thread payload.
 * @param originalComment Original inline comment request payload.
 * @returns Generic inline comment DTO.
 */
function mapAzureInlineComment(
    thread: unknown,
    originalComment: IInlineCommentDTO,
): IInlineCommentDTO {
    const comment = mapAzureComment(thread)

    return {
        ...comment,
        filePath: normalizeRepositoryRelativeFilePath(originalComment.filePath),
        line: originalComment.line,
        side: originalComment.side,
    }
}

/**
 * Maps generic inline comment DTO to generic top-level comment DTO.
 *
 * @param comment Inline comment payload.
 * @returns Generic comment DTO.
 */
function mapInlineCommentToComment(comment: IInlineCommentDTO): ICommentDTO {
    return {
        id: comment.id,
        body: comment.body,
        author: comment.author,
        createdAt: comment.createdAt,
    }
}

/**
 * Maps Azure pull request status payload to generic pipeline status DTO.
 *
 * @param payload Raw Azure status payload.
 * @returns Generic pipeline status DTO.
 */
function mapAzurePipelineStatus(payload: unknown): IPipelineStatusDTO {
    const record = toRecord(payload)
    const context = toRecord(record?.["context"])
    const state = readNumber(record, ["state"])

    return {
        id: readString(record, ["id"]),
        name: readString(context, ["name"], "CodeNautic Review"),
        status: mapAzureStatusToPipelineStatus(state),
        conclusion: mapAzureStatusToPipelineConclusion(state),
        summary: normalizeOptionalText(readString(record, ["description"]), "summary"),
    }
}

/**
 * Maps generic pipeline state/conclusion to Azure status state.
 *
 * @param status Generic pipeline lifecycle state.
 * @param conclusion Generic pipeline conclusion.
 * @returns Azure status state code.
 */
function mapPipelineStateToAzureStatus(
    status: CheckRunStatus,
    conclusion: CheckRunConclusion,
): number {
    if (status === CHECK_RUN_STATUS.QUEUED) {
        return AZURE_DEVOPS_GIT_STATUS_STATE.PENDING
    }

    if (status === CHECK_RUN_STATUS.IN_PROGRESS) {
        return AZURE_DEVOPS_GIT_STATUS_STATE.PENDING
    }

    if (conclusion === CHECK_RUN_CONCLUSION.SUCCESS) {
        return AZURE_DEVOPS_GIT_STATUS_STATE.SUCCEEDED
    }

    if (conclusion === CHECK_RUN_CONCLUSION.FAILURE) {
        return AZURE_DEVOPS_GIT_STATUS_STATE.FAILED
    }

    if (conclusion === CHECK_RUN_CONCLUSION.CANCELLED) {
        return AZURE_DEVOPS_GIT_STATUS_STATE.NOT_APPLICABLE
    }

    return AZURE_DEVOPS_GIT_STATUS_STATE.PARTIALLY_SUCCEEDED
}

/**
 * Maps Azure status state code to generic pipeline lifecycle state.
 *
 * @param state Azure status state code.
 * @returns Generic pipeline status.
 */
function mapAzureStatusToPipelineStatus(state: number): CheckRunStatus {
    if (state === AZURE_DEVOPS_GIT_STATUS_STATE.PENDING) {
        return CHECK_RUN_STATUS.QUEUED
    }

    return CHECK_RUN_STATUS.COMPLETED
}

/**
 * Maps Azure status state code to generic pipeline conclusion.
 *
 * @param state Azure status state code.
 * @returns Generic pipeline conclusion.
 */
function mapAzureStatusToPipelineConclusion(state: number): CheckRunConclusion {
    if (state === AZURE_DEVOPS_GIT_STATUS_STATE.SUCCEEDED) {
        return CHECK_RUN_CONCLUSION.SUCCESS
    }

    if (
        state === AZURE_DEVOPS_GIT_STATUS_STATE.FAILED ||
        state === AZURE_DEVOPS_GIT_STATUS_STATE.ERROR
    ) {
        return CHECK_RUN_CONCLUSION.FAILURE
    }

    if (state === AZURE_DEVOPS_GIT_STATUS_STATE.NOT_APPLICABLE) {
        return CHECK_RUN_CONCLUSION.CANCELLED
    }

    return CHECK_RUN_CONCLUSION.NEUTRAL
}

/**
 * Normalizes commit history query options with backward-compatible path support.
 *
 * @param options Optional history query options.
 * @returns Normalized history options.
 */
function normalizeCommitHistoryOptions(
    options?: ICommitHistoryOptions,
): INormalizedCommitHistoryOptions {
    return {
        author: normalizeOptionalText(options?.author, "author"),
        since: options?.since,
        until: options?.until,
        maxCount: options?.maxCount,
        path: resolveNormalizedHistoryPath(options),
    }
}

/**
 * Resolves normalized history path from backward-compatible option aliases.
 *
 * @param options Optional history query options.
 * @returns Normalized repository path or undefined.
 */
function resolveNormalizedHistoryPath(
    options?: ICommitHistoryOptions,
): string | undefined {
    const normalizedPath = normalizeOptionalText(options?.path, "path")

    if (normalizedPath !== undefined) {
        return normalizeRepositoryPath(normalizedPath)
    }

    const normalizedFilePath = normalizeOptionalText(options?.filePath, "filePath")
    return normalizedFilePath === undefined
        ? undefined
        : normalizeRepositoryPath(normalizedFilePath)
}

/**
 * Normalizes temporal coupling query options with file batch filter.
 *
 * @param options Optional coupling query options.
 * @returns Normalized temporal coupling options.
 */
function normalizeTemporalCouplingOptions(
    options?: ITemporalCouplingOptions,
): INormalizedTemporalCouplingOptions {
    return {
        ...normalizeCommitHistoryOptions(options),
        filePaths: normalizeOptionalTextList(options?.filePaths, "filePaths"),
    }
}

/**
 * Normalizes pipeline-status creation payload.
 *
 * @param input Raw creation payload.
 * @returns Normalized creation payload.
 */
function normalizeCreatePipelineStatusInput(
    input: ICreatePipelineStatusInput,
): ICreatePipelineStatusInput {
    return {
        mergeRequestId: normalizeRequiredText(input.mergeRequestId, "mergeRequestId"),
        name: normalizeRequiredText(input.name, "name"),
        headCommitId: normalizeOptionalText(input.headCommitId, "headCommitId"),
    }
}

/**
 * Normalizes pipeline-status update payload.
 *
 * @param input Raw update payload.
 * @returns Normalized update payload.
 */
function normalizeUpdatePipelineStatusInput(
    input: IUpdatePipelineStatusInput,
): IUpdatePipelineStatusInput {
    return {
        pipelineId: normalizeOptionalText(input.pipelineId, "pipelineId"),
        mergeRequestId: normalizeRequiredText(input.mergeRequestId, "mergeRequestId"),
        name: normalizeRequiredText(input.name, "name"),
        status: input.status,
        conclusion: input.conclusion,
        summary: normalizeOptionalText(input.summary, "summary"),
        headCommitId: normalizeOptionalText(input.headCommitId, "headCommitId"),
    }
}

/**
 * Normalizes optional text list while preserving order and uniqueness.
 *
 * @param values Optional raw text list.
 * @param fieldName Field label.
 * @returns Deduplicated normalized list or undefined.
 */
function normalizeOptionalTextList(
    values: readonly string[] | undefined,
    fieldName: string,
): readonly string[] | undefined {
    if (values === undefined) {
        return undefined
    }

    const normalizedValues: string[] = []
    const seenValues = new Set<string>()

    for (const value of values) {
        const normalizedValue = normalizeRepositoryRelativeFilePath(
            normalizeRequiredText(value, fieldName),
        )

        if (seenValues.has(normalizedValue)) {
            continue
        }

        seenValues.add(normalizedValue)
        normalizedValues.push(normalizedValue)
    }

    return normalizedValues.length > 0 ? normalizedValues : undefined
}

/**
 * Orders file-tree nodes deterministically.
 *
 * @param left Left node.
 * @param right Right node.
 * @returns Sort comparison result.
 */
function compareFileTreeNode(left: IFileTreeNode, right: IFileTreeNode): number {
    if (left.path !== right.path) {
        return left.path.localeCompare(right.path)
    }

    return left.type.localeCompare(right.type)
}

/**
 * Orders branches deterministically with default branch first.
 *
 * @param left Left branch.
 * @param right Right branch.
 * @returns Sort comparison result.
 */
function compareBranchInfo(left: IBranchInfo, right: IBranchInfo): number {
    if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1
    }

    return left.name.localeCompare(right.name)
}

/**
 * Orders merge-request diff files deterministically.
 *
 * @param left Left diff file.
 * @param right Right diff file.
 * @returns Sort comparison result.
 */
function compareDiffFiles(
    left: IMergeRequestDiffFileDTO,
    right: IMergeRequestDiffFileDTO,
): number {
    return left.path.localeCompare(right.path)
}

/**
 * Resolves comparison status from ahead/behind counts.
 *
 * @param aheadBy Number of commits head is ahead.
 * @param behindBy Number of commits head is behind.
 * @returns Generic comparison status.
 */
function resolveAzureComparisonStatus(
    aheadBy: number,
    behindBy: number,
): IRefDiffResult["comparisonStatus"] {
    if (aheadBy > 0 && behindBy > 0) {
        return GIT_REF_COMPARISON_STATUS.DIVERGED
    }

    if (aheadBy > 0) {
        return GIT_REF_COMPARISON_STATUS.AHEAD
    }

    if (behindBy > 0) {
        return GIT_REF_COMPARISON_STATUS.BEHIND
    }

    return GIT_REF_COMPARISON_STATUS.IDENTICAL
}

/**
 * Summarizes per-file diff entries into aggregate stats.
 *
 * @param files File-level diff entries.
 * @returns Aggregate diff summary.
 */
function summarizeRefDiffFiles(files: readonly IRefDiffFile[]): IRefDiffSummary {
    let addedFiles = 0
    let modifiedFiles = 0
    let deletedFiles = 0
    let renamedFiles = 0
    let additions = 0
    let deletions = 0
    let changes = 0

    for (const file of files) {
        additions += file.additions
        deletions += file.deletions
        changes += file.changes

        if (file.status === MERGE_REQUEST_DIFF_FILE_STATUS.ADDED) {
            addedFiles += 1
            continue
        }

        if (file.status === MERGE_REQUEST_DIFF_FILE_STATUS.DELETED) {
            deletedFiles += 1
            continue
        }

        if (file.status === MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED) {
            renamedFiles += 1
            continue
        }

        modifiedFiles += 1
    }

    return {
        changedFiles: files.length,
        addedFiles,
        modifiedFiles,
        deletedFiles,
        renamedFiles,
        additions,
        deletions,
        changes,
    }
}

/**
 * Creates empty ref-diff summary payload.
 *
 * @returns Empty summary.
 */
function emptyRefDiffSummary(): IRefDiffSummary {
    return {
        changedFiles: 0,
        addedFiles: 0,
        modifiedFiles: 0,
        deletedFiles: 0,
        renamedFiles: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
    }
}

/**
 * Aggregates detailed commit payloads into contributor statistics.
 *
 * @param commits Detailed commit payloads.
 * @returns Stable contributor statistics.
 */
function buildContributorStats(
    commits: readonly IAzureDevOpsCommitDetails[],
): readonly IContributorStat[] {
    const contributors = new Map<string, IContributorAggregation>()

    for (const commit of commits) {
        const author = {
            name: commit.authorName.length > 0
                ? commit.authorName
                : (commit.authorEmail.length > 0 ? commit.authorEmail : "unknown"),
            email: commit.authorEmail,
            date: commit.date,
        }
        const key = createContributorAggregationKey(author)
        const contributor =
            contributors.get(key) ?? createContributorAggregation(author)

        contributor.commitCount += 1
        contributor.startedAt = pickEarlierIsoDate(contributor.startedAt, author.date)
        contributor.endedAt = pickLaterIsoDate(contributor.endedAt, author.date)

        for (const diff of commit.diffs) {
            const fileStats =
                contributor.files.get(diff.filePath) ?? createContributorFileAggregation()

            contributor.additions += diff.additions
            contributor.deletions += diff.deletions
            contributor.changes += diff.changes
            fileStats.commitCount += 1
            fileStats.additions += diff.additions
            fileStats.deletions += diff.deletions
            fileStats.changes += diff.changes
            fileStats.lastCommitDate = pickLaterIsoDate(fileStats.lastCommitDate, author.date)
            contributor.files.set(diff.filePath, fileStats)
        }

        contributors.set(key, contributor)
    }

    return Array.from(contributors.values())
        .map(mapContributorAggregation)
        .sort(compareContributorStats)
}

/**
 * Aggregates detailed commit payloads into temporal coupling edge list.
 *
 * @param commits Detailed commit payloads.
 * @param filePaths Optional batch file filter.
 * @returns Stable temporal coupling edge list.
 */
function buildTemporalCouplingEdges(
    commits: readonly IAzureDevOpsCommitDetails[],
    filePaths?: readonly string[],
): readonly ITemporalCouplingEdge[] {
    const fileCommitCounts = new Map<string, number>()
    const couplings = new Map<string, ITemporalCouplingAggregation>()
    const filterSet = filePaths === undefined ? undefined : new Set(filePaths)

    for (const commit of commits) {
        const touchedFiles = extractTemporalCouplingFilePaths(commit)
        incrementTemporalCouplingFileCounts(touchedFiles, fileCommitCounts)

        if (touchedFiles.length < 2) {
            continue
        }

        addTemporalCouplingCommit(touchedFiles, commit.date, couplings)
    }

    return Array.from(couplings.values())
        .filter((coupling): boolean => {
            return shouldIncludeTemporalCoupling(coupling, filterSet)
        })
        .map((coupling): ITemporalCouplingEdge => {
            return mapTemporalCouplingAggregation(coupling, fileCommitCounts)
        })
        .sort(compareTemporalCouplingEdge)
}

/**
 * Extracts sorted unique file paths from one detailed commit payload.
 *
 * @param commit Detailed commit payload.
 * @returns Sorted unique file paths.
 */
function extractTemporalCouplingFilePaths(
    commit: IAzureDevOpsCommitDetails,
): readonly string[] {
    const touchedFiles = new Set<string>()

    for (const diff of commit.diffs) {
        touchedFiles.add(diff.filePath)
    }

    return Array.from(touchedFiles.values()).sort((left, right): number => {
        return left.localeCompare(right)
    })
}

/**
 * Increments per-file commit counters used for coupling normalization.
 *
 * @param touchedFiles Sorted unique file paths from one commit.
 * @param fileCommitCounts Mutable per-file commit counters.
 */
function incrementTemporalCouplingFileCounts(
    touchedFiles: readonly string[],
    fileCommitCounts: Map<string, number>,
): void {
    for (const filePath of touchedFiles) {
        fileCommitCounts.set(filePath, (fileCommitCounts.get(filePath) ?? 0) + 1)
    }
}

/**
 * Adds one co-change commit to coupling aggregation map.
 *
 * @param touchedFiles Sorted unique file paths from one commit.
 * @param commitDate Commit timestamp.
 * @param couplings Mutable coupling map.
 */
function addTemporalCouplingCommit(
    touchedFiles: readonly string[],
    commitDate: string,
    couplings: Map<string, ITemporalCouplingAggregation>,
): void {
    for (let leftIndex = 0; leftIndex < touchedFiles.length - 1; leftIndex += 1) {
        const leftPath = touchedFiles[leftIndex]
        if (leftPath === undefined) {
            continue
        }

        for (let rightIndex = leftIndex + 1; rightIndex < touchedFiles.length; rightIndex += 1) {
            const rightPath = touchedFiles[rightIndex]
            if (rightPath === undefined) {
                continue
            }

            const key = createTemporalCouplingKey(leftPath, rightPath)
            const coupling = couplings.get(key) ?? {
                sourcePath: leftPath,
                targetPath: rightPath,
                sharedCommitCount: 0,
                lastSeenAt: "",
            }

            coupling.sharedCommitCount += 1
            coupling.lastSeenAt = pickLaterIsoDate(coupling.lastSeenAt, commitDate)
            couplings.set(key, coupling)
        }
    }
}

/**
 * Creates deterministic map key for one temporal coupling pair.
 *
 * @param sourcePath Canonical source path.
 * @param targetPath Canonical target path.
 * @returns Stable map key.
 */
function createTemporalCouplingKey(sourcePath: string, targetPath: string): string {
    return `${sourcePath}\n${targetPath}`
}

/**
 * Checks whether coupling edge should remain in batch-filtered result.
 *
 * @param coupling Mutable temporal coupling aggregation.
 * @param filePaths Optional batch filter set.
 * @returns True when coupling should be kept.
 */
function shouldIncludeTemporalCoupling(
    coupling: ITemporalCouplingAggregation,
    filePaths: ReadonlySet<string> | undefined,
): boolean {
    if (filePaths === undefined || filePaths.size === 0) {
        return true
    }

    return filePaths.has(coupling.sourcePath) || filePaths.has(coupling.targetPath)
}

/**
 * Maps mutable temporal coupling aggregation to immutable DTO.
 *
 * @param coupling Mutable coupling aggregation.
 * @param fileCommitCounts Per-file commit occurrence counters.
 * @returns Immutable temporal coupling edge.
 */
function mapTemporalCouplingAggregation(
    coupling: ITemporalCouplingAggregation,
    fileCommitCounts: ReadonlyMap<string, number>,
): ITemporalCouplingEdge {
    const sourceCommitCount = fileCommitCounts.get(coupling.sourcePath) ?? 0
    const targetCommitCount = fileCommitCounts.get(coupling.targetPath) ?? 0

    return {
        sourcePath: coupling.sourcePath,
        targetPath: coupling.targetPath,
        sharedCommitCount: coupling.sharedCommitCount,
        strength: calculateTemporalCouplingStrength(
            coupling.sharedCommitCount,
            sourceCommitCount,
            targetCommitCount,
        ),
        lastSeenAt: coupling.lastSeenAt,
    }
}

/**
 * Calculates normalized temporal coupling strength from pair and file counts.
 *
 * @param sharedCommitCount Number of commits where both files co-changed.
 * @param sourceCommitCount Number of commits touching source file.
 * @param targetCommitCount Number of commits touching target file.
 * @returns Rounded coupling strength.
 */
function calculateTemporalCouplingStrength(
    sharedCommitCount: number,
    sourceCommitCount: number,
    targetCommitCount: number,
): number {
    const unionCommitCount =
        sourceCommitCount + targetCommitCount - sharedCommitCount

    if (unionCommitCount <= 0) {
        return 0
    }

    return roundToPrecision(sharedCommitCount / unionCommitCount, 4)
}

/**
 * Creates stable aggregation key for contributor identity.
 *
 * @param author Contributor identity.
 * @returns Aggregation key.
 */
function createContributorAggregationKey(
    author: Readonly<{name: string; email: string}>,
): string {
    if (author.email.length > 0) {
        return `email:${author.email.toLowerCase()}`
    }

    return `name:${author.name.toLowerCase()}`
}

/**
 * Creates mutable contributor aggregation seed.
 *
 * @param author Contributor identity.
 * @returns Empty aggregation object.
 */
function createContributorAggregation(
    author: Readonly<{name: string; email: string; date: string}>,
): IContributorAggregation {
    return {
        name: author.name,
        email: author.email,
        files: new Map<string, IContributorFileAggregation>(),
        commitCount: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
        startedAt: author.date,
        endedAt: author.date,
    }
}

/**
 * Creates mutable per-file aggregation seed.
 *
 * @returns Empty file aggregation object.
 */
function createContributorFileAggregation(): IContributorFileAggregation {
    return {
        commitCount: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
        lastCommitDate: "",
    }
}

/**
 * Maps mutable contributor aggregation to immutable DTO.
 *
 * @param contributor Mutable contributor aggregation.
 * @returns Immutable contributor stats DTO.
 */
function mapContributorAggregation(
    contributor: IContributorAggregation,
): IContributorStat {
    return {
        name: contributor.name,
        email: contributor.email,
        commitCount: contributor.commitCount,
        additions: contributor.additions,
        deletions: contributor.deletions,
        changes: contributor.changes,
        activePeriod: {
            startedAt: contributor.startedAt,
            endedAt: contributor.endedAt,
        },
        files: Array.from(contributor.files.entries())
            .map(([filePath, file]): IContributorFileStat => {
                return {
                    filePath,
                    commitCount: file.commitCount,
                    additions: file.additions,
                    deletions: file.deletions,
                    changes: file.changes,
                    lastCommitDate: file.lastCommitDate,
                }
            })
            .sort(compareContributorFileStats),
    }
}

/**
 * Orders contributor statistics deterministically.
 *
 * @param left Left contributor stats.
 * @param right Right contributor stats.
 * @returns Sort comparison result.
 */
function compareContributorStats(left: IContributorStat, right: IContributorStat): number {
    if (left.commitCount !== right.commitCount) {
        return right.commitCount - left.commitCount
    }

    if (left.changes !== right.changes) {
        return right.changes - left.changes
    }

    const nameComparison = left.name.localeCompare(right.name)
    if (nameComparison !== 0) {
        return nameComparison
    }

    return left.email.localeCompare(right.email)
}

/**
 * Orders per-file contributor breakdown deterministically.
 *
 * @param left Left file stats.
 * @param right Right file stats.
 * @returns Sort comparison result.
 */
function compareContributorFileStats(
    left: IContributorFileStat,
    right: IContributorFileStat,
): number {
    if (left.changes !== right.changes) {
        return right.changes - left.changes
    }

    if (left.commitCount !== right.commitCount) {
        return right.commitCount - left.commitCount
    }

    return left.filePath.localeCompare(right.filePath)
}

/**
 * Orders temporal coupling edges deterministically.
 *
 * @param left Left temporal coupling edge.
 * @param right Right temporal coupling edge.
 * @returns Sort comparison result.
 */
function compareTemporalCouplingEdge(
    left: ITemporalCouplingEdge,
    right: ITemporalCouplingEdge,
): number {
    if (left.sharedCommitCount !== right.sharedCommitCount) {
        return right.sharedCommitCount - left.sharedCommitCount
    }

    if (left.strength !== right.strength) {
        return right.strength - left.strength
    }

    if (left.lastSeenAt !== right.lastSeenAt) {
        return right.lastSeenAt.localeCompare(left.lastSeenAt)
    }

    const sourceComparison = left.sourcePath.localeCompare(right.sourcePath)
    if (sourceComparison !== 0) {
        return sourceComparison
    }

    return left.targetPath.localeCompare(right.targetPath)
}

/**
 * Orders tags deterministically by effective date descending.
 *
 * @param left Left tag.
 * @param right Right tag.
 * @returns Sort comparison result.
 */
function compareTagInfo(left: ITagInfo, right: ITagInfo): number {
    if (left.date !== right.date) {
        return right.date.localeCompare(left.date)
    }

    const nameComparison = left.name.localeCompare(right.name)
    if (nameComparison !== 0) {
        return nameComparison
    }

    return left.sha.localeCompare(right.sha)
}

/**
 * Picks earlier non-empty ISO timestamp.
 *
 * @param current Current timestamp.
 * @param candidate Candidate timestamp.
 * @returns Earlier non-empty timestamp.
 */
function pickEarlierIsoDate(current: string, candidate: string): string {
    if (candidate.length === 0) {
        return current
    }

    if (current.length === 0 || candidate < current) {
        return candidate
    }

    return current
}

/**
 * Picks later non-empty ISO timestamp.
 *
 * @param current Current timestamp.
 * @param candidate Candidate timestamp.
 * @returns Later non-empty timestamp.
 */
function pickLaterIsoDate(current: string, candidate: string): string {
    if (candidate.length === 0) {
        return current
    }

    if (current.length === 0 || candidate > current) {
        return candidate
    }

    return current
}

/**
 * Rounds floating-point value to fixed precision.
 *
 * @param value Raw floating-point value.
 * @param digits Number of fraction digits.
 * @returns Rounded numeric value.
 */
function roundToPrecision(value: number, digits: number): number {
    const multiplier = 10 ** digits

    return Math.round(value * multiplier) / multiplier
}

/**
 * Normalizes retry attempt cap.
 *
 * @param value Optional retry cap.
 * @returns Positive retry cap.
 */
function normalizeRetryMaxAttempts(value: number | undefined): number {
    if (value === undefined) {
        return DEFAULT_RETRY_MAX_ATTEMPTS
    }

    if (Number.isInteger(value) === false || value <= 0) {
        throw new Error("retryMaxAttempts must be positive integer")
    }

    return value
}

/**
 * Resolves retry delay from normalized error or exponential backoff.
 *
 * @param normalized Normalized ACL error.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function resolveRetryDelayMs(
    normalized: INormalizedGitAclError,
    attempt: number,
): number {
    if (normalized.retryAfterMs !== undefined) {
        return normalized.retryAfterMs
    }

    return DEFAULT_RETRY_BASE_DELAY_MS * (4 ** (attempt - 1))
}

/**
 * Shared sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Sleep promise.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}

/**
 * Maps collection in bounded parallel batches while preserving order.
 *
 * @param values Source values.
 * @param batchSize Maximum number of concurrent operations per batch.
 * @param mapper Async mapper.
 * @returns Mapped values in input order.
 */
async function mapInBatches<TInput, TOutput>(
    values: readonly TInput[],
    batchSize: number,
    mapper: (value: TInput) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
    const results: TOutput[] = []

    for (let index = 0; index < values.length; index += batchSize) {
        const batch = values.slice(index, index + batchSize)
        const mappedBatch = await Promise.all(batch.map(mapper))
        results.push(...mappedBatch)
    }

    return results
}
