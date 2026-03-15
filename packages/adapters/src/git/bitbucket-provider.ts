import {Buffer} from "node:buffer"

import {parsePatch} from "diff"
import {Bitbucket} from "bitbucket"
import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    FILE_TREE_NODE_TYPE,
    GIT_REF_COMPARISON_STATUS,
    INLINE_COMMENT_SIDE,
    MERGE_REQUEST_DIFF_FILE_STATUS,
    type CheckRunConclusion,
    type CheckRunStatus,
    type GitRefComparisonStatus,
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
    type IMergeRequestAuthorDTO,
    type IMergeRequestCommitDTO,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
    type IPipelineStatusDTO,
    type IRefDiffFile,
    type IRefDiffResult,
    type IRefDiffSummary,
    type ITagCommitInfo,
    type ITagInfo,
    type ITemporalCouplingEdge,
    type ITemporalCouplingOptions,
    type IUpdatePipelineStatusInput,
} from "@codenautic/core"

import {
    normalizeGitAclError,
    shouldRetryGitAclError,
    type INormalizedGitAclError,
} from "./acl"
import {
    BITBUCKET_PROVIDER_ERROR_CODE,
    BitbucketProviderError,
} from "./bitbucket-provider.error"

const BITBUCKET_PAGE_SIZE = 100
const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const MAX_BITBUCKET_TEXT_FILE_BYTES = 1024 * 1024
const DETAILS_BATCH_SIZE = 20
const BITBUCKET_PIPELINE_KEY_PREFIX = "codenautic"

const BITBUCKET_ROUTE = {
    REPOSITORY: "GET /repositories/{workspace}/{repo_slug}",
    PULL_REQUEST: "GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}",
    PULL_REQUEST_COMMITS:
        "GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/commits",
    PULL_REQUEST_DIFF_STAT:
        "GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diffstat",
    PULL_REQUEST_PATCH:
        "GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/patch",
    PULL_REQUEST_COMMENTS:
        "POST /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments",
    PULL_REQUEST_COMMENT:
        "DELETE /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}",
    BUILD_STATUS_CREATE:
        "POST /repositories/{workspace}/{repo_slug}/commit/{commit}/statuses/build",
    BUILD_STATUS_UPDATE:
        "PUT /repositories/{workspace}/{repo_slug}/commit/{commit}/statuses/build/{key}",
    SOURCE_ROOT: "GET /repositories/{workspace}/{repo_slug}/src/{commit}",
    SOURCE_PATH: "GET /repositories/{workspace}/{repo_slug}/src/{commit}/{path}",
    BRANCHES: "GET /repositories/{workspace}/{repo_slug}/refs/branches",
    TAGS: "GET /repositories/{workspace}/{repo_slug}/refs/tags",
    COMMITS: "GET /repositories/{workspace}/{repo_slug}/commits/{revision}",
    COMMIT: "GET /repositories/{workspace}/{repo_slug}/commit/{commit}",
    DIFF_STAT: "GET /repositories/{workspace}/{repo_slug}/diffstat/{spec}",
    PATCH: "GET /repositories/{workspace}/{repo_slug}/patch/{spec}",
} as const

const BITBUCKET_BUILD_STATUS = {
    IN_PROGRESS: "INPROGRESS",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    STOPPED: "STOPPED",
} as const

type BitbucketBuildStatus =
    (typeof BITBUCKET_BUILD_STATUS)[keyof typeof BITBUCKET_BUILD_STATUS]

export interface IBitbucketApiResponse<T> {
    readonly data: T
    readonly headers?: Readonly<Record<string, string>>
    readonly status?: number
    readonly url?: string
}

interface IBitbucketRequestParameters {
    readonly [key: string]: unknown
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

interface IBitbucketPatchEntry {
    readonly filePath: string
    readonly oldPath?: string
    readonly patch: string
    readonly hunks: readonly string[]
}

interface IParsedBitbucketDiff {
    readonly filePath: string
    readonly oldPath?: string
    readonly status: IMergeRequestDiffFileDTO["status"]
    readonly additions: number
    readonly deletions: number
    readonly changes: number
    readonly patch: string
    readonly hunks: readonly string[]
}

interface IBitbucketCommitDetails {
    readonly sha: string
    readonly message: string
    readonly authorName: string
    readonly authorEmail: string
    readonly date: string
    readonly diffs: readonly IParsedBitbucketDiff[]
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
    readonly headCommitId?: string
}

interface IBitbucketAuthorParts {
    readonly name: string
    readonly email: string
}

/**
 * Minimal subset of Bitbucket SDK methods used by the adapter.
 */
export interface IBitbucketClient {
    /**
     * Executes one SDK-backed Bitbucket request.
     *
     * @param route Raw SDK route expression.
     * @param parameters Route and query parameters.
     * @returns Raw Bitbucket response payload.
     */
    request<T>(
        route: string,
        parameters?: Readonly<IBitbucketRequestParameters>,
    ): Promise<IBitbucketApiResponse<T>>
}

/**
 * Construction options for Bitbucket provider.
 */
export interface IBitbucketProviderOptions {
    /**
     * Bitbucket workspace slug.
     */
    readonly workspace: string

    /**
     * Bitbucket repository slug.
     */
    readonly repoSlug: string

    /**
     * Bitbucket access token used for default SDK client creation.
     */
    readonly token?: string

    /**
     * Optional preconfigured Bitbucket client for tests and custom runtimes.
     */
    readonly client?: IBitbucketClient

    /**
     * Optional retry attempt cap for retryable ACL failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Optional async sleep override for retry backoff.
     */
    readonly sleep?: (delayMs: number) => Promise<void>

    /**
     * Optional Bitbucket SDK notice flag.
     */
    readonly notice?: boolean
}

/**
 * Sequential batch review payload for Bitbucket fallback flow.
 */
export interface IBitbucketBatchReviewRequest {
    /**
     * Top-level review body posted as pull-request comment.
     */
    readonly body: string

    /**
     * Inline comments posted one-by-one.
     */
    readonly comments: readonly IInlineCommentDTO[]
}

/**
 * Bitbucket Cloud adapter implementing the shared git provider contract.
 */
export class BitbucketProvider implements IGitProvider, IGitPipelineStatusProvider {
    private readonly workspace: string
    private readonly repoSlug: string
    private readonly client: IBitbucketClient
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly legacyPipelineContexts = new Map<string, ILegacyPipelineContext>()

    /**
     * Creates Bitbucket provider.
     *
     * @param options Provider construction options.
     */
    public constructor(options: IBitbucketProviderOptions) {
        this.workspace = normalizeRequiredText(options.workspace, "workspace")
        this.repoSlug = normalizeRequiredText(options.repoSlug, "repoSlug")
        this.client = options.client ?? createBitbucketClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Loads pull request metadata with commits and changed files.
     *
     * @param id Pull request identifier.
     * @returns Platform-agnostic merge-request DTO.
     */
    public async getMergeRequest(id: string): Promise<IMergeRequestDTO> {
        const pullRequestId = normalizeMergeRequestId(id)
        const [pullRequest, commits, diffFiles] = await Promise.all([
            this.requestData<unknown>("getPullRequest", BITBUCKET_ROUTE.PULL_REQUEST, {
                ...this.createBaseRouteParameters(),
                pull_request_id: pullRequestId,
            }),
            this.listPullRequestCommits(pullRequestId),
            this.getChangedFiles(id),
        ])

        return mapBitbucketMergeRequest(pullRequest, commits, diffFiles)
    }

    /**
     * Loads changed files for pull request.
     *
     * @param mergeRequestId Pull request identifier.
     * @returns Platform-agnostic diff entries.
     */
    public async getChangedFiles(
        mergeRequestId: string,
    ): Promise<readonly IMergeRequestDiffFileDTO[]> {
        const pullRequestId = normalizeMergeRequestId(mergeRequestId)
        const [diffStats, patchText] = await Promise.all([
            this.listPullRequestDiffStats(pullRequestId),
            this.requestText(
                "getPullRequestPatch",
                BITBUCKET_ROUTE.PULL_REQUEST_PATCH,
                {
                    ...this.createBaseRouteParameters(),
                    pull_request_id: pullRequestId,
                },
            ),
        ])
        const patchEntries = parseBitbucketPatchEntries(patchText)

        return diffStats.map((entry): IMergeRequestDiffFileDTO => {
            const parsedDiff = mapBitbucketDiff(entry, patchEntries)

            return {
                path: parsedDiff.filePath,
                status: parsedDiff.status,
                oldPath: parsedDiff.oldPath,
                patch: parsedDiff.patch,
                hunks: parsedDiff.hunks,
            }
        })
    }

    /**
     * Loads repository file tree for one ref.
     *
     * @param ref Branch, tag, or commit reference.
     * @returns Recursive tree nodes.
     */
    public async getFileTree(ref: string): Promise<readonly IFileTreeNode[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const nodes: IFileTreeNode[] = []
        const pendingDirectories = [""]

        while (pendingDirectories.length > 0) {
            const currentPath = pendingDirectories.shift()

            if (currentPath === undefined) {
                continue
            }

            const entries = await this.listSourceEntries(normalizedRef, currentPath)
            for (const entry of entries) {
                const node = mapBitbucketTreeNode(entry)
                nodes.push(node)

                if (node.type === FILE_TREE_NODE_TYPE.TREE) {
                    pendingDirectories.push(node.path)
                }
            }
        }

        return [...nodes].sort(compareFileTreeNode)
    }

    /**
     * Loads file content for one repository ref.
     *
     * @param filePath Repository-relative file path.
     * @param ref Branch, tag, or commit reference.
     * @returns UTF-8 text content.
     */
    public async getFileContentByRef(filePath: string, ref: string): Promise<string> {
        const normalizedFilePath = normalizeRequiredText(filePath, "filePath")
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const data = await this.requestData<unknown>(
            "getFileContentByRef",
            BITBUCKET_ROUTE.SOURCE_PATH,
            {
                ...this.createBaseRouteParameters(),
                commit: normalizedRef,
                path: normalizedFilePath,
            },
        )

        return extractBitbucketFileContent(data)
    }

    /**
     * Loads repository branches metadata.
     *
     * @returns Branch list in stable order.
     */
    public async getBranches(): Promise<readonly IBranchInfo[]> {
        const [repository, branches] = await Promise.all([
            this.requestData<unknown>("getRepository", BITBUCKET_ROUTE.REPOSITORY, {
                ...this.createBaseRouteParameters(),
            }),
            this.listPaginatedValues(
                "listBranches",
                BITBUCKET_ROUTE.BRANCHES,
                this.createBaseRouteParameters(),
            ),
        ])
        const defaultBranchName = readNestedString(
            toRecord(repository),
            ["mainbranch", "name"],
        )

        return branches
            .map((entry): IBranchInfo => {
                const record = toRecord(entry)
                const name = readString(record, ["name"])

                return {
                    name,
                    sha: readNestedString(record, ["target", "hash"]),
                    isDefault: name === defaultBranchName,
                    isProtected: readBoolean(record, ["protected"]),
                    lastCommitDate: readNestedString(record, ["target", "date"]),
                }
            })
            .sort(compareBranchInfo)
    }

    /**
     * Loads commit history for one ref.
     *
     * @param ref Branch, tag, or commit reference.
     * @param options Optional filters.
     * @returns Platform-agnostic commit history DTOs.
     */
    public async getCommitHistory(
        ref: string,
        options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const details = await this.loadFilteredCommitDetails(
            normalizedRef,
            normalizedOptions,
            "page",
            false,
        )

        return details.map((detail): ICommitInfo => {
            return {
                sha: detail.sha,
                message: detail.message,
                authorName: detail.authorName,
                authorEmail: detail.authorEmail,
                date: detail.date,
                filesChanged: detail.diffs.map((diff): string => {
                    return diff.filePath
                }),
            }
        })
    }

    /**
     * Loads aggregated contributor statistics for one ref.
     *
     * @param ref Branch, tag, or commit reference.
     * @param options Optional filters.
     * @returns Contributor statistics.
     */
    public async getContributorStats(
        ref: string,
        options?: IContributorStatsOptions,
    ): Promise<readonly IContributorStat[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const details = await this.loadFilteredCommitDetails(
            normalizedRef,
            normalizedOptions,
            "all",
            false,
        )

        return buildContributorStats(details)
    }

    /**
     * Loads temporal coupling edges for one ref.
     *
     * @param ref Branch, tag, or commit reference.
     * @param options Optional filters.
     * @returns Stable temporal coupling edge list.
     */
    public async getTemporalCoupling(
        ref: string,
        options?: ITemporalCouplingOptions,
    ): Promise<readonly ITemporalCouplingEdge[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeTemporalCouplingOptions(options)
        const details = await this.loadFilteredCommitDetails(
            normalizedRef,
            normalizedOptions,
            "all",
            false,
        )

        return buildTemporalCouplingEdges(details, normalizedOptions.filePaths)
    }

    /**
     * Loads repository tags metadata.
     *
     * @returns Tags sorted by effective date descending.
     */
    public async getTags(): Promise<readonly ITagInfo[]> {
        const tags = await this.listPaginatedValues(
            "listTags",
            BITBUCKET_ROUTE.TAGS,
            this.createBaseRouteParameters(),
        )
        const resolvedTags = await mapInBatches(
            tags,
            DETAILS_BATCH_SIZE,
            async (entry: unknown): Promise<ITagInfo> => {
                return this.mapTagInfo(entry)
            },
        )

        return [...resolvedTags].sort(compareTagInfo)
    }

    /**
     * Loads diff between two refs.
     *
     * @param baseRef Base comparison ref.
     * @param headRef Head comparison ref.
     * @returns Ref diff result with summary and file entries.
     */
    public async getDiffBetweenRefs(
        baseRef: string,
        headRef: string,
    ): Promise<IRefDiffResult> {
        const normalizedBaseRef = normalizeRequiredText(baseRef, "baseRef")
        const normalizedHeadRef = normalizeRequiredText(headRef, "headRef")
        const forwardSpec = `${normalizedBaseRef}..${normalizedHeadRef}`
        const [forwardDiffStats, forwardPatch, aheadBy, behindBy] = await Promise.all([
            this.listPaginatedValues(
                "getDiffStat",
                BITBUCKET_ROUTE.DIFF_STAT,
                {
                    ...this.createBaseRouteParameters(),
                    spec: forwardSpec,
                },
            ),
            this.requestText(
                "getPatch",
                BITBUCKET_ROUTE.PATCH,
                {
                    ...this.createBaseRouteParameters(),
                    spec: forwardSpec,
                },
            ),
            this.countCommitWindow(normalizedHeadRef, normalizedBaseRef),
            this.countCommitWindow(normalizedBaseRef, normalizedHeadRef),
        ])
        const patchEntries = parseBitbucketPatchEntries(forwardPatch)
        const files = forwardDiffStats.map((entry): IRefDiffFile => {
            const parsedDiff = mapBitbucketDiff(entry, patchEntries)

            return {
                path: parsedDiff.filePath,
                status: parsedDiff.status,
                oldPath: parsedDiff.oldPath,
                additions: parsedDiff.additions,
                deletions: parsedDiff.deletions,
                changes: parsedDiff.changes,
                patch: parsedDiff.patch,
                hunks: parsedDiff.hunks,
            }
        })

        return {
            baseRef: normalizedBaseRef,
            headRef: normalizedHeadRef,
            comparisonStatus: resolveBitbucketComparisonStatus(aheadBy, behindBy),
            aheadBy,
            behindBy,
            totalCommits: aheadBy,
            summary: summarizeRefDiffFiles(files),
            files,
        }
    }

    /**
     * Bitbucket Cloud does not expose portable line blame in the current API surface.
     *
     * @param _filePath Repository-relative file path.
     * @param _ref Branch, tag, or commit reference.
     * @returns Never resolves successfully.
     * @throws {BitbucketProviderError} Always throws unsupported-operation error.
     */
    public getBlameData(
        _filePath: string,
        _ref: string,
    ): Promise<readonly IBlameData[]> {
        return Promise.reject(
            new BitbucketProviderError(
                BITBUCKET_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION,
                {
                    operation: "getBlameData",
                    capability: "line-blame",
                },
            ),
        )
    }

    /**
     * Bitbucket Cloud does not expose portable batch line blame in the current API surface.
     *
     * @param _filePaths Repository-relative file paths.
     * @param _ref Branch, tag, or commit reference.
     * @returns Never resolves successfully.
     * @throws {BitbucketProviderError} Always throws unsupported-operation error.
     */
    public getBlameDataBatch(
        _filePaths: readonly string[],
        _ref: string,
    ): Promise<readonly IFileBlame[]> {
        return Promise.reject(
            new BitbucketProviderError(
                BITBUCKET_PROVIDER_ERROR_CODE.UNSUPPORTED_OPERATION,
                {
                    operation: "getBlameDataBatch",
                    capability: "line-blame",
                },
            ),
        )
    }

    /**
     * Posts regular pull-request comment.
     *
     * @param mergeRequestId Pull request identifier.
     * @param body Comment body.
     * @returns Created comment DTO.
     */
    public async postComment(
        mergeRequestId: string,
        body: string,
    ): Promise<ICommentDTO> {
        const response = await this.requestData<unknown>(
            "createPullRequestComment",
            BITBUCKET_ROUTE.PULL_REQUEST_COMMENTS,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: normalizeMergeRequestId(mergeRequestId),
                _body: {
                    content: {
                        raw: normalizeRequiredText(body, "body"),
                    },
                },
            },
        )

        return mapBitbucketComment(response)
    }

    /**
     * Deletes existing pull-request comment.
     *
     * @param mergeRequestId Pull request identifier.
     * @param commentId Pull-request comment identifier.
     * @returns Completion promise.
     */
    public async deleteComment(
        mergeRequestId: string,
        commentId: string,
    ): Promise<void> {
        await this.requestData<unknown>(
            "deletePullRequestComment",
            BITBUCKET_ROUTE.PULL_REQUEST_COMMENT,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: normalizeMergeRequestId(mergeRequestId),
                comment_id: normalizeCommentId(commentId),
            },
        )
    }

    /**
     * Creates review in sequential fallback mode for Bitbucket.
     *
     * @param mergeRequestId Pull request identifier.
     * @param review Batch review payload.
     * @returns Created top-level and inline comments mapped to generic comment DTOs.
     */
    public async createReview(
        mergeRequestId: string,
        review: IBitbucketBatchReviewRequest,
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
     * Posts inline pull-request comment.
     *
     * @param mergeRequestId Pull request identifier.
     * @param comment Inline comment payload.
     * @returns Created inline comment DTO.
     */
    public async postInlineComment(
        mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        const normalizedComment = normalizeInlineComment(comment)
        const response = await this.requestData<unknown>(
            "createPullRequestComment",
            BITBUCKET_ROUTE.PULL_REQUEST_COMMENTS,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: normalizeMergeRequestId(mergeRequestId),
                _body: {
                    content: {
                        raw: normalizedComment.body,
                    },
                    inline: createBitbucketInlinePayload(normalizedComment),
                },
            },
        )

        return mapBitbucketInlineComment(response, normalizedComment)
    }

    /**
     * Creates generic pipeline status via Bitbucket build-status API.
     *
     * @param input Creation payload.
     * @returns Created pipeline status DTO.
     */
    public async createPipelineStatus(
        input: ICreatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeCreatePipelineStatusInput(input)
        const headCommitId = await this.resolveHeadCommitId(
            normalizedInput.mergeRequestId,
            normalizedInput.headCommitId,
        )
        const pipelineKey = buildBitbucketPipelineKey(normalizedInput.name)
        const response = await this.requestData<unknown>(
            "createCommitBuildStatus",
            BITBUCKET_ROUTE.BUILD_STATUS_CREATE,
            {
                ...this.createBaseRouteParameters(),
                commit: headCommitId,
                _body: {
                    key: pipelineKey,
                    name: normalizedInput.name,
                    state: BITBUCKET_BUILD_STATUS.IN_PROGRESS,
                    description: "queued",
                },
            },
        )
        const pipelineStatus = mapBitbucketPipelineStatus(response)

        this.rememberLegacyPipelineContext(pipelineStatus.id, {
            mergeRequestId: normalizedInput.mergeRequestId,
            name: normalizedInput.name,
            headCommitId,
        })

        return pipelineStatus
    }

    /**
     * Updates generic pipeline status via Bitbucket build-status API.
     *
     * @param input Update payload.
     * @returns Updated pipeline status DTO.
     */
    public async updatePipelineStatus(
        input: IUpdatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeUpdatePipelineStatusInput(input)
        const headCommitId = await this.resolveHeadCommitId(
            normalizedInput.mergeRequestId,
            normalizedInput.headCommitId,
        )
        const pipelineKey = normalizedInput.pipelineId ?? buildBitbucketPipelineKey(
            normalizedInput.name,
        )
        const response = await this.requestData<unknown>(
            "updateCommitBuildStatus",
            BITBUCKET_ROUTE.BUILD_STATUS_UPDATE,
            {
                ...this.createBaseRouteParameters(),
                commit: headCommitId,
                key: pipelineKey,
                _body: {
                    key: pipelineKey,
                    name: normalizedInput.name,
                    state: mapPipelineStateToBitbucketStatus(
                        normalizedInput.status,
                        normalizedInput.conclusion,
                    ),
                    description: normalizedInput.summary,
                },
            },
        )
        const pipelineStatus = mapBitbucketPipelineStatus(response)

        if (normalizedInput.pipelineId !== undefined) {
            this.rememberLegacyPipelineContext(normalizedInput.pipelineId, {
                mergeRequestId: normalizedInput.mergeRequestId,
                name: normalizedInput.name,
                headCommitId,
            })
        }

        this.rememberLegacyPipelineContext(pipelineStatus.id, {
            mergeRequestId: normalizedInput.mergeRequestId,
            name: normalizedInput.name,
            headCommitId,
        })

        return pipelineStatus
    }

    /**
     * Legacy check-run compatibility wrapper.
     *
     * @param mergeRequestId Pull request identifier.
     * @param name Check name.
     * @returns Created check DTO.
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
     * Legacy check-run compatibility wrapper.
     *
     * @param checkId Previously created check identifier.
     * @param status Target lifecycle state.
     * @param conclusion Target conclusion.
     * @returns Updated check DTO.
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
                `Bitbucket check context is not available for ${normalizedCheckId}`,
            )
        }

        return this.updatePipelineStatus({
            pipelineId: normalizedCheckId,
            mergeRequestId: context.mergeRequestId,
            name: context.name,
            headCommitId: context.headCommitId,
            status,
            conclusion,
        })
    }

    /**
     * Executes Bitbucket request with retry semantics for retryable ACL failures.
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
                    throw new BitbucketProviderError(
                        BITBUCKET_PROVIDER_ERROR_CODE.API_REQUEST_FAILED,
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
     * Executes one SDK-backed Bitbucket request and unwraps response data.
     *
     * @param operationName Stable operation label.
     * @param route Raw SDK route expression.
     * @param parameters Route and query parameters.
     * @returns Raw response payload.
     */
    private async requestData<T>(
        operationName: string,
        route: string,
        parameters: Readonly<IBitbucketRequestParameters>,
    ): Promise<T> {
        const response = await this.executeRequest(
            operationName,
            async (): Promise<IBitbucketApiResponse<T>> => {
                return this.client.request<T>(route, parameters)
            },
        )

        return response.data
    }

    /**
     * Executes one Bitbucket request and normalizes textual response payloads.
     *
     * @param operationName Stable operation label.
     * @param route Raw SDK route expression.
     * @param parameters Route and query parameters.
     * @returns Text payload.
     */
    private async requestText(
        operationName: string,
        route: string,
        parameters: Readonly<IBitbucketRequestParameters>,
    ): Promise<string> {
        const data = await this.requestData<unknown>(operationName, route, parameters)
        return normalizeBitbucketTextPayload(data)
    }

    /**
     * Lists paginated values from one Bitbucket collection endpoint.
     *
     * @param operationName Stable operation label.
     * @param route Raw SDK route expression.
     * @param parameters Route and query parameters.
     * @param targetCount Optional max item count.
     * @returns Flattened page values.
     */
    private async listPaginatedValues(
        operationName: string,
        route: string,
        parameters: Readonly<IBitbucketRequestParameters>,
        targetCount = Number.MAX_SAFE_INTEGER,
    ): Promise<readonly unknown[]> {
        const values: unknown[] = []
        let page = 1

        while (values.length < targetCount) {
            const remaining = targetCount - values.length
            const pageSize = Math.min(BITBUCKET_PAGE_SIZE, remaining)
            const response = await this.requestData<unknown>(operationName, route, {
                ...parameters,
                page,
                pagelen: pageSize,
            })
            const responseRecord = toRecord(response)
            const pageValues = readArray(responseRecord?.["values"])

            values.push(
                ...pageValues.slice(
                    0,
                    remaining,
                ),
            )

            if (hasBitbucketNextPage(responseRecord) === false) {
                break
            }

            page += 1
        }

        return values
    }

    /**
     * Lists pull-request commits.
     *
     * @param pullRequestId Pull request identifier.
     * @returns Raw commit records.
     */
    private async listPullRequestCommits(
        pullRequestId: number,
    ): Promise<readonly unknown[]> {
        return this.listPaginatedValues(
            "listPullRequestCommits",
            BITBUCKET_ROUTE.PULL_REQUEST_COMMITS,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: pullRequestId,
            },
        )
    }

    /**
     * Lists pull-request diff-stat entries.
     *
     * @param pullRequestId Pull request identifier.
     * @returns Raw diff-stat records.
     */
    private async listPullRequestDiffStats(
        pullRequestId: number,
    ): Promise<readonly unknown[]> {
        return this.listPaginatedValues(
            "getPullRequestDiffStat",
            BITBUCKET_ROUTE.PULL_REQUEST_DIFF_STAT,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: pullRequestId,
            },
        )
    }

    /**
     * Lists tree entries for one ref and directory path.
     *
     * @param ref Branch, tag, or commit reference.
     * @param path Repository-relative directory path.
     * @returns Raw tree entries.
     */
    private async listSourceEntries(
        ref: string,
        path: string,
    ): Promise<readonly unknown[]> {
        const normalizedPath = normalizeOptionalPath(path)
        const route = normalizedPath === undefined
            ? BITBUCKET_ROUTE.SOURCE_ROOT
            : BITBUCKET_ROUTE.SOURCE_PATH
        const parameters: IBitbucketRequestParameters = normalizedPath === undefined
            ? {
                ...this.createBaseRouteParameters(),
                commit: ref,
                format: "meta",
            }
            : {
                ...this.createBaseRouteParameters(),
                commit: ref,
                path: normalizedPath,
                format: "meta",
            }

        return this.listPaginatedValues(
            "listSourceEntries",
            route,
            parameters,
        )
    }

    /**
     * Loads filtered detailed commit payloads for history-style APIs.
     *
     * @param ref Branch, tag, or commit reference.
     * @param options Normalized history filters.
     * @param mode Pagination mode when max count is absent.
     * @param includePatch Whether patch text should be loaded for diff details.
     * @returns Detailed commit payloads in provider order.
     */
    private async loadFilteredCommitDetails(
        ref: string,
        options: INormalizedCommitHistoryOptions,
        mode: "page" | "all",
        includePatch: boolean,
    ): Promise<readonly IBitbucketCommitDetails[]> {
        const targetCount = options.maxCount ?? (
            mode === "all" ? Number.MAX_SAFE_INTEGER : BITBUCKET_PAGE_SIZE
        )
        const filteredDetails: IBitbucketCommitDetails[] = []
        let page = 1

        while (filteredDetails.length < targetCount) {
            const pageData = await this.requestData<unknown>(
                "listCommits",
                BITBUCKET_ROUTE.COMMITS,
                {
                    ...this.createBaseRouteParameters(),
                    revision: ref,
                    page,
                    pagelen: BITBUCKET_PAGE_SIZE,
                },
            )
            const pageRecord = toRecord(pageData)
            const pageValues = readArray(pageRecord?.["values"])
            const metadataFiltered = pageValues.filter((entry): boolean => {
                return matchesBitbucketCommitMetadata(entry, options)
            })

            const detailedBatch = await this.loadCommitDetails(
                metadataFiltered,
                includePatch,
            )

            for (const detail of detailedBatch) {
                if (!matchesCommitPathFilter(detail, options.path)) {
                    continue
                }

                filteredDetails.push(detail)

                if (filteredDetails.length >= targetCount) {
                    break
                }
            }

            if (hasBitbucketNextPage(pageRecord) === false) {
                break
            }

            page += 1
        }

        return filteredDetails
    }

    /**
     * Loads detailed commit payloads in bounded batches.
     *
     * @param commits Raw commit records.
     * @param includePatch Whether patch text should be loaded.
     * @returns Detailed commit payloads in source order.
     */
    private async loadCommitDetails(
        commits: readonly unknown[],
        includePatch: boolean,
    ): Promise<readonly IBitbucketCommitDetails[]> {
        return mapInBatches(
            commits,
            DETAILS_BATCH_SIZE,
            async (commit: unknown): Promise<IBitbucketCommitDetails> => {
                return this.loadCommitDetailsEntry(commit, includePatch)
            },
        )
    }

    /**
     * Loads one detailed commit payload.
     *
     * @param commit Raw commit record.
     * @param includePatch Whether patch text should be loaded.
     * @returns Detailed commit payload.
     */
    private async loadCommitDetailsEntry(
        commit: unknown,
        includePatch: boolean,
    ): Promise<IBitbucketCommitDetails> {
        const record = toRecord(commit)
        const commitSha = readString(record, ["hash"])
        const [diffStats, patchText] = await Promise.all([
            this.listPaginatedValues(
                "getCommitDiffStat",
                BITBUCKET_ROUTE.DIFF_STAT,
                {
                    ...this.createBaseRouteParameters(),
                    spec: commitSha,
                },
            ),
            includePatch
                ? this.requestText(
                    "getCommitPatch",
                    BITBUCKET_ROUTE.PATCH,
                    {
                        ...this.createBaseRouteParameters(),
                        spec: commitSha,
                    },
                )
                : Promise.resolve(""),
        ])
        const patchEntries = includePatch
            ? parseBitbucketPatchEntries(patchText)
            : []
        const author = resolveBitbucketAuthor(record)

        return {
            sha: commitSha,
            message: readString(record, ["message", "summary"]),
            authorName: author.name,
            authorEmail: author.email,
            date: readString(record, ["date"]),
            diffs: diffStats.map((entry): IParsedBitbucketDiff => {
                return mapBitbucketDiff(entry, patchEntries)
            }),
        }
    }

    /**
     * Counts commits reachable from one ref and excluded by another ref.
     *
     * @param revision Included revision.
     * @param excludeRevision Optional excluded revision.
     * @returns Commit count.
     */
    private async countCommitWindow(
        revision: string,
        excludeRevision?: string,
    ): Promise<number> {
        let count = 0
        let page = 1

        while (true) {
            const response = await this.requestData<unknown>(
                "listCommits",
                BITBUCKET_ROUTE.COMMITS,
                {
                    ...this.createBaseRouteParameters(),
                    revision,
                    exclude: excludeRevision,
                    page,
                    pagelen: BITBUCKET_PAGE_SIZE,
                },
            )
            const responseRecord = toRecord(response)
            const values = readArray(responseRecord?.["values"])

            count += values.length

            if (hasBitbucketNextPage(responseRecord) === false) {
                break
            }

            page += 1
        }

        return count
    }

    /**
     * Loads tag details and associated commit payload.
     *
     * @param entry Raw tag record.
     * @returns Tag DTO.
     */
    private async mapTagInfo(entry: unknown): Promise<ITagInfo> {
        const record = toRecord(entry)
        const target = toRecord(record?.["target"])
        const commitSha = readString(target, ["hash"])
        const commitDate = readString(target, ["date"])
        const commit = await this.requestData<unknown>(
            "getCommit",
            BITBUCKET_ROUTE.COMMIT,
            {
                ...this.createBaseRouteParameters(),
                commit: commitSha,
            },
        )

        return {
            name: readString(record, ["name"]),
            sha: commitSha,
            isAnnotated: false,
            date: commitDate.length > 0
                ? commitDate
                : readString(toRecord(commit), ["date"]),
            commit: mapBitbucketTagCommit(commit),
        }
    }

    /**
     * Resolves head commit identifier for pipeline-status operations.
     *
     * @param mergeRequestId Pull request identifier.
     * @param explicitHeadCommitId Optional explicit commit identifier.
     * @returns Head commit identifier.
     */
    private async resolveHeadCommitId(
        mergeRequestId: string,
        explicitHeadCommitId?: string,
    ): Promise<string> {
        const normalizedExplicitHeadCommitId = normalizeOptionalText(
            explicitHeadCommitId,
            "headCommitId",
        )

        if (normalizedExplicitHeadCommitId !== undefined) {
            return normalizedExplicitHeadCommitId
        }

        const pullRequest = await this.requestData<unknown>(
            "getPullRequest",
            BITBUCKET_ROUTE.PULL_REQUEST,
            {
                ...this.createBaseRouteParameters(),
                pull_request_id: normalizeMergeRequestId(mergeRequestId),
            },
        )
        const headCommitId = readNestedString(
            toRecord(pullRequest),
            ["source", "commit", "hash"],
        )

        if (headCommitId.length === 0) {
            throw new Error("Bitbucket pull request head commit is unavailable")
        }

        return headCommitId
    }

    /**
     * Creates reusable route parameters for workspace/repository scoped endpoints.
     *
     * @returns Base route parameter object.
     */
    private createBaseRouteParameters(): Readonly<IBitbucketRequestParameters> {
        return {
            workspace: this.workspace,
            repo_slug: this.repoSlug,
        }
    }

    /**
     * Stores legacy context for check-run compatibility wrappers.
     *
     * @param pipelineId Stable provider pipeline identifier.
     * @param context Legacy context payload.
     * @returns Nothing.
     */
    private rememberLegacyPipelineContext(
        pipelineId: string,
        context: ILegacyPipelineContext,
    ): void {
        this.legacyPipelineContexts.set(pipelineId, context)
    }
}

/**
 * Creates default Bitbucket SDK client from provider options.
 *
 * @param options Provider options.
 * @returns SDK-backed Bitbucket client.
 */
function createBitbucketClient(
    options: IBitbucketProviderOptions,
): IBitbucketClient {
    const token = normalizeRequiredText(options.token ?? "", "token")
    const sdk = new Bitbucket({
        auth: {
            token,
        },
        notice: options.notice ?? false,
    })

    return {
        request<T>(
            route: string,
            parameters?: Readonly<IBitbucketRequestParameters>,
        ): Promise<IBitbucketApiResponse<T>> {
            return sdk.request(route, parameters) as Promise<IBitbucketApiResponse<T>>
        },
    }
}

/**
 * Maps raw Bitbucket pull-request payload to generic merge-request DTO.
 *
 * @param payload Raw pull-request payload.
 * @param commits Raw pull-request commits.
 * @param diffFiles Normalized diff files.
 * @returns Platform-agnostic merge-request DTO.
 */
function mapBitbucketMergeRequest(
    payload: unknown,
    commits: readonly unknown[],
    diffFiles: readonly IMergeRequestDiffFileDTO[],
): IMergeRequestDTO {
    const record = toRecord(payload)

    return {
        id: readString(record, ["id"]),
        number: readNumber(record, ["id"]),
        title: readString(record, ["title"]),
        description: readString(record, ["description"]),
        sourceBranch: readNestedString(record, ["source", "branch", "name"]),
        targetBranch: readNestedString(record, ["destination", "branch", "name"]),
        author: mapBitbucketMergeRequestAuthor(record?.["author"]),
        state: readString(record, ["state"], "unknown"),
        commits: commits.map((commit): IMergeRequestCommitDTO => {
            return mapBitbucketMergeRequestCommit(commit)
        }),
        diffFiles,
    }
}

/**
 * Maps raw Bitbucket author payload to generic merge-request author DTO.
 *
 * @param payload Raw author payload.
 * @returns Author DTO.
 */
function mapBitbucketMergeRequestAuthor(payload: unknown): IMergeRequestAuthorDTO {
    const record = toRecord(payload)
    const displayName = readString(record, ["display_name", "nickname", "username"])
    const username = readString(record, ["nickname", "username"], displayName)

    return {
        id: readString(record, ["account_id", "uuid", "nickname"], "unknown"),
        username,
        displayName,
    }
}

/**
 * Maps raw Bitbucket commit payload to generic merge-request commit DTO.
 *
 * @param payload Raw commit payload.
 * @returns Commit DTO.
 */
function mapBitbucketMergeRequestCommit(payload: unknown): IMergeRequestCommitDTO {
    const record = toRecord(payload)
    const author = resolveBitbucketAuthor(record)

    return {
        id: readString(record, ["hash"]),
        message: readString(record, ["message", "summary"]),
        author: author.name,
        timestamp: readString(record, ["date"]),
    }
}

/**
 * Maps one raw Bitbucket diff-stat entry and optional patch into generic diff metadata.
 *
 * @param payload Raw diff-stat payload.
 * @param patchEntries Parsed patch entries.
 * @returns Parsed diff payload.
 */
function mapBitbucketDiff(
    payload: unknown,
    patchEntries: readonly IBitbucketPatchEntry[],
): IParsedBitbucketDiff {
    const record = toRecord(payload)
    const newPath = readNestedString(record, ["new", "path"])
    const oldPath = normalizeOptionalText(
        readNestedString(record, ["old", "path"]),
        "oldPath",
    )
    const filePath = newPath.length > 0 ? newPath : (oldPath ?? "")
    const patchEntry = findBitbucketPatchEntry(patchEntries, filePath, oldPath)
    const additions = readNumber(record, ["lines_added"])
    const deletions = readNumber(record, ["lines_removed"])

    return {
        filePath,
        oldPath,
        status: normalizeBitbucketDiffStatus(readString(record, ["status"])),
        additions,
        deletions,
        changes: additions + deletions,
        patch: patchEntry?.patch ?? "",
        hunks: patchEntry?.hunks ?? [],
    }
}

/**
 * Maps raw Bitbucket tree entry to generic tree node DTO.
 *
 * @param payload Raw tree entry payload.
 * @returns Tree node DTO.
 */
function mapBitbucketTreeNode(payload: unknown): IFileTreeNode {
    const record = toRecord(payload)

    return {
        path: readString(record, ["path"]),
        type: normalizeBitbucketTreeNodeType(readString(record, ["type"])),
        size: readNumber(record, ["size"]),
        sha: readNestedString(record, ["commit", "hash"]),
    }
}

/**
 * Extracts file content from Bitbucket source endpoint payload.
 *
 * @param payload Raw source payload.
 * @returns UTF-8 text content.
 */
function extractBitbucketFileContent(payload: unknown): string {
    const record = toRecord(payload)
    const directoryValues = readArray(record?.["values"])

    if (directoryValues.length > 0) {
        throw new Error("Bitbucket source response points to directory, not file")
    }

    if (typeof payload === "string") {
        const buffer = Buffer.from(payload, "utf8")
        validateTextBufferSize(buffer)
        if (isBinaryBuffer(buffer)) {
            throw new Error("Bitbucket binary file content is not supported")
        }

        return payload
    }

    if (payload instanceof ArrayBuffer) {
        return decodeBitbucketBuffer(Buffer.from(payload))
    }

    if (ArrayBuffer.isView(payload)) {
        return decodeBitbucketBuffer(Buffer.from(payload.buffer))
    }

    throw new Error("Bitbucket file content response is unsupported")
}

/**
 * Decodes Bitbucket binary-ish payload into UTF-8 text or throws for unsupported content.
 *
 * @param buffer Raw payload buffer.
 * @returns UTF-8 text content.
 */
function decodeBitbucketBuffer(buffer: Buffer): string {
    validateTextBufferSize(buffer)

    if (isBinaryBuffer(buffer)) {
        throw new Error("Bitbucket binary file content is not supported")
    }

    return buffer.toString("utf8")
}

/**
 * Validates text payload byte-size limit.
 *
 * @param buffer Raw payload buffer.
 * @returns Nothing.
 */
function validateTextBufferSize(buffer: Uint8Array): void {
    if (buffer.byteLength > MAX_BITBUCKET_TEXT_FILE_BYTES) {
        throw new Error(
            `Bitbucket file content exceeds size limit of ${MAX_BITBUCKET_TEXT_FILE_BYTES} bytes`,
        )
    }
}

/**
 * Detects likely binary data using control-byte heuristics.
 *
 * @param content Raw payload bytes.
 * @returns True when payload looks binary.
 */
function isBinaryBuffer(content: Uint8Array): boolean {
    if (content.length === 0) {
        return false
    }

    const sampleSize = Math.min(content.length, 512)
    let suspiciousBytes = 0

    for (let index = 0; index < sampleSize; index += 1) {
        const byte = content[index]

        if (byte === undefined) {
            continue
        }

        if (byte === 0 || byte < 7 || (byte > 13 && byte < 32)) {
            suspiciousBytes += 1
        }
    }

    return suspiciousBytes / sampleSize > 0.1
}

/**
 * Maps Bitbucket comment payload to generic comment DTO.
 *
 * @param payload Raw Bitbucket comment payload.
 * @returns Comment DTO.
 */
function mapBitbucketComment(payload: unknown): ICommentDTO {
    const record = toRecord(payload)

    return {
        id: readString(record, ["id"]),
        body: readNestedString(record, ["content", "raw"]),
        author: readNestedString(record, ["user", "display_name"]),
        createdAt: readString(record, ["created_on"]),
    }
}

/**
 * Maps Bitbucket inline comment payload to generic inline comment DTO.
 *
 * @param payload Raw Bitbucket comment payload.
 * @param fallback Original inline comment payload.
 * @returns Inline comment DTO.
 */
function mapBitbucketInlineComment(
    payload: unknown,
    fallback: IInlineCommentDTO,
): IInlineCommentDTO {
    const record = toRecord(payload)
    const inline = toRecord(record?.["inline"])
    const fromLine = readNumber(inline, ["from"])
    const toLine = readNumber(inline, ["to"])
    const side = fromLine > 0 ? INLINE_COMMENT_SIDE.LEFT : INLINE_COMMENT_SIDE.RIGHT

    return {
        id: readString(record, ["id"], fallback.id),
        body: readNestedString(record, ["content", "raw"]) || fallback.body,
        author: readNestedString(record, ["user", "display_name"]) || fallback.author,
        createdAt: readString(record, ["created_on"], fallback.createdAt),
        filePath: readString(inline, ["path"], fallback.filePath),
        line: fromLine > 0 ? fromLine : (toLine > 0 ? toLine : fallback.line),
        side,
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
 * Maps raw Bitbucket build-status payload to generic pipeline-status DTO.
 *
 * @param payload Raw build-status payload.
 * @returns Pipeline-status DTO.
 */
function mapBitbucketPipelineStatus(payload: unknown): IPipelineStatusDTO {
    const record = toRecord(payload)
    const state = readString(record, ["state"])

    return {
        id: readString(record, ["key", "uuid", "id"]),
        name: readString(record, ["name", "key"], "CodeNautic Review"),
        status: mapBitbucketStatusToPipelineStatus(state),
        conclusion: mapBitbucketStatusToPipelineConclusion(state),
        summary: normalizeOptionalText(readString(record, ["description"]), "summary"),
        detailsUrl: normalizeOptionalText(readString(record, ["url"]), "detailsUrl"),
    }
}

/**
 * Maps raw Bitbucket commit payload to associated tag commit DTO.
 *
 * @param payload Raw commit payload.
 * @returns Tag commit DTO.
 */
function mapBitbucketTagCommit(payload: unknown): ITagCommitInfo {
    const record = toRecord(payload)

    return {
        sha: readString(record, ["hash"]),
        message: readString(record, ["message", "summary"]),
        date: readString(record, ["date"]),
    }
}

/**
 * Resolves Bitbucket author metadata from one commit-like payload.
 *
 * @param record Commit-like payload.
 * @returns Author name and email.
 */
function resolveBitbucketAuthor(
    record: Readonly<Record<string, unknown>> | null,
): IBitbucketAuthorParts {
    const authorRecord = toRecord(record?.["author"])
    const rawAuthor = readString(authorRecord, ["raw"])
    const parsedRawAuthor = parseBitbucketRawAuthor(rawAuthor)
    const name = parsedRawAuthor.name.length > 0
        ? parsedRawAuthor.name
        : readNestedString(authorRecord, ["user", "display_name"])
    const email = parsedRawAuthor.email

    return {
        name,
        email,
    }
}

/**
 * Parses Bitbucket raw author string like `Name <email>`.
 *
 * @param value Raw author string.
 * @returns Parsed name/email pair.
 */
function parseBitbucketRawAuthor(value: string): IBitbucketAuthorParts {
    const normalized = value.trim()
    const match = /^(.*?)(?:\s*<([^>]+)>)?$/.exec(normalized)

    if (match === null) {
        return {
            name: normalized,
            email: "",
        }
    }

    return {
        name: (match[1] ?? "").trim(),
        email: (match[2] ?? "").trim(),
    }
}

/**
 * Normalizes Bitbucket diff status to generic diff-file status.
 *
 * @param status Raw Bitbucket status literal.
 * @returns Generic diff-file status.
 */
function normalizeBitbucketDiffStatus(
    status: string,
): IMergeRequestDiffFileDTO["status"] {
    const normalized = status.trim().toLowerCase()

    if (normalized === "added" || normalized === "new") {
        return MERGE_REQUEST_DIFF_FILE_STATUS.ADDED
    }

    if (normalized === "removed" || normalized === "deleted") {
        return MERGE_REQUEST_DIFF_FILE_STATUS.DELETED
    }

    if (normalized === "renamed" || normalized === "rename") {
        return MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED
    }

    return MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED
}

/**
 * Normalizes Bitbucket tree entry type to generic tree node type.
 *
 * @param value Raw Bitbucket type.
 * @returns Generic tree node type.
 */
function normalizeBitbucketTreeNodeType(value: string): IFileTreeNode["type"] {
    const normalized = value.trim().toLowerCase()

    return normalized.includes("directory")
        ? FILE_TREE_NODE_TYPE.TREE
        : FILE_TREE_NODE_TYPE.BLOB
}

/**
 * Creates Bitbucket inline-comment body payload.
 *
 * @param comment Normalized inline comment DTO.
 * @returns Bitbucket inline payload.
 */
function createBitbucketInlinePayload(
    comment: IInlineCommentDTO,
): Readonly<Record<string, unknown>> {
    if (comment.side === INLINE_COMMENT_SIDE.LEFT) {
        return {
            path: comment.filePath,
            from: comment.line,
        }
    }

    return {
        path: comment.filePath,
        to: comment.line,
    }
}

/**
 * Normalizes inline comment payload.
 *
 * @param comment Raw inline comment DTO.
 * @returns Normalized inline comment DTO.
 */
function normalizeInlineComment(comment: IInlineCommentDTO): IInlineCommentDTO {
    return {
        ...comment,
        body: normalizeRequiredText(comment.body, "body"),
        filePath: normalizeRequiredText(comment.filePath, "filePath"),
        line: normalizeLine(comment.line),
    }
}

/**
 * Normalizes one Bitbucket textual payload.
 *
 * @param payload Raw Bitbucket payload.
 * @returns Text payload.
 */
function normalizeBitbucketTextPayload(payload: unknown): string {
    if (typeof payload === "string") {
        return payload
    }

    if (payload instanceof ArrayBuffer) {
        return Buffer.from(payload).toString("utf8")
    }

    if (ArrayBuffer.isView(payload)) {
        return Buffer.from(payload.buffer).toString("utf8")
    }

    return ""
}

/**
 * Parses unified patch text into per-file patch entries.
 *
 * @param patchText Raw unified patch text.
 * @returns Parsed patch entries.
 */
function parseBitbucketPatchEntries(
    patchText: string,
): readonly IBitbucketPatchEntry[] {
    const normalizedPatch = patchText.trim()

    if (normalizedPatch.length === 0) {
        return []
    }

    return (parsePatch(normalizedPatch) as readonly unknown[])
        .map((entry): IBitbucketPatchEntry | null => {
            const record = toRecord(entry)
            const oldPath = normalizePatchPath(readString(record, ["oldFileName"]))
            const filePath = normalizePatchPath(readString(record, ["newFileName"])) ?? oldPath

            if (filePath === undefined) {
                return null
            }

            const hunks = readArray(record?.["hunks"])
            const patch = hunks.map((hunk): string => {
                return mapBitbucketPatchHunk(hunk)
            }).join("\n")

            return {
                filePath,
                oldPath,
                patch: patch.length > 0 ? `@@ ${patch}` : "",
                hunks: splitHunks(hunks.map((hunk): string => {
                    const hunkRecord = toRecord(hunk)
                    const header = `@@ -${readNumber(hunkRecord, ["oldStart"])},${readNumber(hunkRecord, ["oldLines"])} +${readNumber(hunkRecord, ["newStart"])},${readNumber(hunkRecord, ["newLines"])} @@`
                    const lines = readArray(hunkRecord?.["lines"])
                        .filter((line): line is string => {
                            return typeof line === "string"
                        })
                        .join("\n")

                    return `${header}\n${lines}`
                }).join("\n")),
            }
        })
        .filter((entry): entry is IBitbucketPatchEntry => {
            return entry !== null
        })
}

/**
 * Maps one parsed patch hunk payload to stable hunk body text.
 *
 * @param payload Raw parsed patch hunk.
 * @returns Stable hunk body text.
 */
function mapBitbucketPatchHunk(payload: unknown): string {
    const record = toRecord(payload)
    const lines = readArray(record?.["lines"])
        .filter((line): line is string => {
            return typeof line === "string"
        })
        .join("\n")

    return `${readNumber(record, ["oldStart"])},${readNumber(record, ["oldLines"])} ${readNumber(record, ["newStart"])},${readNumber(record, ["newLines"])}\n${lines}`
}

/**
 * Finds parsed patch entry matching one diff-stat payload.
 *
 * @param entries Parsed patch entries.
 * @param filePath Current repository-relative file path.
 * @param oldPath Previous repository-relative file path.
 * @returns Matching patch entry or undefined.
 */
function findBitbucketPatchEntry(
    entries: readonly IBitbucketPatchEntry[],
    filePath: string,
    oldPath?: string,
): IBitbucketPatchEntry | undefined {
    return entries.find((entry): boolean => {
        if (entry.filePath === filePath && entry.oldPath === oldPath) {
            return true
        }

        if (entry.filePath === filePath) {
            return true
        }

        return oldPath !== undefined && entry.oldPath === oldPath
    })
}

/**
 * Normalizes patch file paths by trimming diff prefixes.
 *
 * @param value Raw patch filename.
 * @returns Repository-relative path or undefined.
 */
function normalizePatchPath(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined
    }

    const normalized = value.trim()

    if (
        normalized.length === 0 ||
        normalized === "/dev/null" ||
        normalized === "dev/null"
    ) {
        return undefined
    }

    if (normalized.startsWith("a/") || normalized.startsWith("b/")) {
        return normalized.slice(2)
    }

    return normalized
}

/**
 * Splits unified patch into trimmed hunk chunks.
 *
 * @param patch Raw patch body.
 * @returns Non-empty hunk strings.
 */
function splitHunks(patch: string): readonly string[] {
    const normalizedPatch = patch.trim()

    if (normalizedPatch.length === 0) {
        return []
    }

    const lines = normalizedPatch.split("\n")
    const hunks: string[] = []
    let currentHunk: string[] = []

    for (const line of lines) {
        if (line.startsWith("@@ ")) {
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
 * Normalizes generic pipeline lifecycle state/conclusion to Bitbucket build status.
 *
 * @param status Generic lifecycle status.
 * @param conclusion Generic conclusion.
 * @returns Bitbucket build-status state.
 */
function mapPipelineStateToBitbucketStatus(
    status: CheckRunStatus,
    conclusion: CheckRunConclusion,
): BitbucketBuildStatus {
    if (status === CHECK_RUN_STATUS.QUEUED || status === CHECK_RUN_STATUS.IN_PROGRESS) {
        return BITBUCKET_BUILD_STATUS.IN_PROGRESS
    }

    if (conclusion === CHECK_RUN_CONCLUSION.SUCCESS) {
        return BITBUCKET_BUILD_STATUS.SUCCESSFUL
    }

    if (conclusion === CHECK_RUN_CONCLUSION.CANCELLED) {
        return BITBUCKET_BUILD_STATUS.STOPPED
    }

    if (
        conclusion === CHECK_RUN_CONCLUSION.FAILURE ||
        conclusion === CHECK_RUN_CONCLUSION.NEUTRAL
    ) {
        return BITBUCKET_BUILD_STATUS.FAILED
    }

    return BITBUCKET_BUILD_STATUS.SUCCESSFUL
}

/**
 * Maps Bitbucket build-status state to generic lifecycle state.
 *
 * @param state Raw Bitbucket build-status state.
 * @returns Generic lifecycle state.
 */
function mapBitbucketStatusToPipelineStatus(state: string): CheckRunStatus {
    const normalized = state.trim().toUpperCase()

    if (normalized === BITBUCKET_BUILD_STATUS.IN_PROGRESS) {
        return CHECK_RUN_STATUS.IN_PROGRESS
    }

    return CHECK_RUN_STATUS.COMPLETED
}

/**
 * Maps Bitbucket build-status state to generic conclusion.
 *
 * @param state Raw Bitbucket build-status state.
 * @returns Generic conclusion.
 */
function mapBitbucketStatusToPipelineConclusion(state: string): CheckRunConclusion {
    const normalized = state.trim().toUpperCase()

    if (normalized === BITBUCKET_BUILD_STATUS.SUCCESSFUL) {
        return CHECK_RUN_CONCLUSION.SUCCESS
    }

    if (normalized === BITBUCKET_BUILD_STATUS.FAILED) {
        return CHECK_RUN_CONCLUSION.FAILURE
    }

    if (normalized === BITBUCKET_BUILD_STATUS.STOPPED) {
        return CHECK_RUN_CONCLUSION.CANCELLED
    }

    return CHECK_RUN_CONCLUSION.NEUTRAL
}

/**
 * Resolves generic comparison status from ahead/behind counts.
 *
 * @param aheadBy Forward commit count.
 * @param behindBy Reverse commit count.
 * @returns Generic comparison status.
 */
function resolveBitbucketComparisonStatus(
    aheadBy: number,
    behindBy: number,
): GitRefComparisonStatus {
    if (aheadBy === 0 && behindBy === 0) {
        return GIT_REF_COMPARISON_STATUS.IDENTICAL
    }

    if (aheadBy > 0 && behindBy === 0) {
        return GIT_REF_COMPARISON_STATUS.AHEAD
    }

    if (aheadBy === 0 && behindBy > 0) {
        return GIT_REF_COMPARISON_STATUS.BEHIND
    }

    return GIT_REF_COMPARISON_STATUS.DIVERGED
}

/**
 * Builds contributor statistics from detailed commit payloads.
 *
 * @param details Detailed commit payloads.
 * @returns Stable contributor statistics.
 */
function buildContributorStats(
    details: readonly IBitbucketCommitDetails[],
): readonly IContributorStat[] {
    const aggregations = new Map<string, IContributorAggregation>()

    for (const detail of details) {
        const aggregationKey = buildContributorAggregationKey(
            detail.authorName,
            detail.authorEmail,
        )
        const aggregation = aggregations.get(aggregationKey) ?? createContributorAggregation(
            detail.authorName,
            detail.authorEmail,
        )

        aggregation.commitCount += 1
        aggregation.startedAt = pickEarlierIsoDate(aggregation.startedAt, detail.date)
        aggregation.endedAt = pickLaterIsoDate(aggregation.endedAt, detail.date)

        for (const diff of detail.diffs) {
            aggregation.additions += diff.additions
            aggregation.deletions += diff.deletions
            aggregation.changes += diff.changes

            const fileAggregation = aggregation.files.get(diff.filePath) ?? {
                commitCount: 0,
                additions: 0,
                deletions: 0,
                changes: 0,
                lastCommitDate: "",
            }

            fileAggregation.commitCount += 1
            fileAggregation.additions += diff.additions
            fileAggregation.deletions += diff.deletions
            fileAggregation.changes += diff.changes
            fileAggregation.lastCommitDate = pickLaterIsoDate(
                fileAggregation.lastCommitDate,
                detail.date,
            )

            aggregation.files.set(diff.filePath, fileAggregation)
        }

        aggregations.set(aggregationKey, aggregation)
    }

    return [...aggregations.values()]
        .map((aggregation): IContributorStat => {
            return {
                name: aggregation.name,
                email: aggregation.email,
                commitCount: aggregation.commitCount,
                additions: aggregation.additions,
                deletions: aggregation.deletions,
                changes: aggregation.changes,
                activePeriod: {
                    startedAt: aggregation.startedAt,
                    endedAt: aggregation.endedAt,
                },
                files: [...aggregation.files.entries()]
                    .map(([filePath, fileAggregation]): IContributorFileStat => {
                        return {
                            filePath,
                            commitCount: fileAggregation.commitCount,
                            additions: fileAggregation.additions,
                            deletions: fileAggregation.deletions,
                            changes: fileAggregation.changes,
                            lastCommitDate: fileAggregation.lastCommitDate,
                        }
                    })
                    .sort(compareContributorFileStat),
            }
        })
        .sort(compareContributorStat)
}

/**
 * Creates mutable contributor aggregation.
 *
 * @param name Contributor display name.
 * @param email Contributor email.
 * @returns Mutable aggregation.
 */
function createContributorAggregation(
    name: string,
    email: string,
): IContributorAggregation {
    return {
        name,
        email,
        files: new Map<string, IContributorFileAggregation>(),
        commitCount: 0,
        additions: 0,
        deletions: 0,
        changes: 0,
        startedAt: "",
        endedAt: "",
    }
}

/**
 * Builds stable contributor aggregation key.
 *
 * @param name Contributor display name.
 * @param email Contributor email.
 * @returns Stable aggregation key.
 */
function buildContributorAggregationKey(name: string, email: string): string {
    return `${name}\u0000${email}`
}

/**
 * Builds temporal coupling edges from detailed commit payloads.
 *
 * @param details Detailed commit payloads.
 * @param filterPaths Optional file batch filter.
 * @returns Stable temporal coupling edges.
 */
function buildTemporalCouplingEdges(
    details: readonly IBitbucketCommitDetails[],
    filterPaths?: readonly string[],
): readonly ITemporalCouplingEdge[] {
    const fileCommitCounts = new Map<string, number>()
    const couplings = new Map<string, ITemporalCouplingAggregation>()

    for (const detail of details) {
        const changedFiles = deduplicateChangedFiles(detail.diffs)

        for (const filePath of changedFiles) {
            fileCommitCounts.set(filePath, (fileCommitCounts.get(filePath) ?? 0) + 1)
        }

        for (let leftIndex = 0; leftIndex < changedFiles.length; leftIndex += 1) {
            const leftFilePath = changedFiles[leftIndex]

            if (leftFilePath === undefined) {
                continue
            }

            for (
                let rightIndex = leftIndex + 1;
                rightIndex < changedFiles.length;
                rightIndex += 1
            ) {
                const rightFilePath = changedFiles[rightIndex]

                if (rightFilePath === undefined) {
                    continue
                }

                const [sourcePath, targetPath] = orderTemporalCouplingPair(
                    leftFilePath,
                    rightFilePath,
                )
                const couplingKey = createTemporalCouplingKey(sourcePath, targetPath)
                const coupling = couplings.get(couplingKey) ?? {
                    sourcePath,
                    targetPath,
                    sharedCommitCount: 0,
                    lastSeenAt: "",
                }

                coupling.sharedCommitCount += 1
                coupling.lastSeenAt = pickLaterIsoDate(coupling.lastSeenAt, detail.date)

                couplings.set(couplingKey, coupling)
            }
        }
    }

    return [...couplings.values()]
        .filter((coupling): boolean => {
            return matchesTemporalCouplingFilter(coupling, filterPaths)
        })
        .map((coupling): ITemporalCouplingEdge => {
            const sourceCommitCount = fileCommitCounts.get(coupling.sourcePath) ?? 0
            const targetCommitCount = fileCommitCounts.get(coupling.targetPath) ?? 0

            return {
                sourcePath: coupling.sourcePath,
                targetPath: coupling.targetPath,
                sharedCommitCount: coupling.sharedCommitCount,
                lastSeenAt: coupling.lastSeenAt,
                strength: calculateTemporalCouplingStrength(
                    coupling.sharedCommitCount,
                    sourceCommitCount,
                    targetCommitCount,
                ),
            }
        })
        .sort(compareTemporalCouplingEdge)
}

/**
 * Deduplicates changed files within one commit while preserving order.
 *
 * @param diffs Parsed diffs.
 * @returns Unique file paths.
 */
function deduplicateChangedFiles(
    diffs: readonly IParsedBitbucketDiff[],
): readonly string[] {
    const seen = new Set<string>()
    const filePaths: string[] = []

    for (const diff of diffs) {
        if (seen.has(diff.filePath)) {
            continue
        }

        seen.add(diff.filePath)
        filePaths.push(diff.filePath)
    }

    return filePaths
}

/**
 * Creates deterministic temporal-coupling map key.
 *
 * @param sourcePath Deterministic source path.
 * @param targetPath Deterministic target path.
 * @returns Stable map key.
 */
function createTemporalCouplingKey(
    sourcePath: string,
    targetPath: string,
): string {
    return `${sourcePath}\u0000${targetPath}`
}

/**
 * Orders one temporal-coupling file pair lexicographically.
 *
 * @param leftFilePath Left file path.
 * @param rightFilePath Right file path.
 * @returns Ordered file-path tuple.
 */
function orderTemporalCouplingPair(
    leftFilePath: string,
    rightFilePath: string,
): readonly [string, string] {
    return leftFilePath.localeCompare(rightFilePath) <= 0
        ? [leftFilePath, rightFilePath]
        : [rightFilePath, leftFilePath]
}

/**
 * Filters temporal-coupling edge by optional batch path list.
 *
 * @param coupling Mutable temporal coupling aggregation.
 * @param filterPaths Optional filter paths.
 * @returns True when coupling should be kept.
 */
function matchesTemporalCouplingFilter(
    coupling: ITemporalCouplingAggregation,
    filterPaths?: readonly string[],
): boolean {
    if (filterPaths === undefined) {
        return true
    }

    return filterPaths.some((filePath): boolean => {
        return coupling.sourcePath === filePath || coupling.targetPath === filePath
    })
}

/**
 * Calculates normalized temporal-coupling strength.
 *
 * @param sharedCommitCount Shared commit count.
 * @param sourceCommitCount Source-file commit count.
 * @param targetCommitCount Target-file commit count.
 * @returns Rounded strength in the `[0, 1]` range.
 */
function calculateTemporalCouplingStrength(
    sharedCommitCount: number,
    sourceCommitCount: number,
    targetCommitCount: number,
): number {
    const unionCommitCount = sourceCommitCount + targetCommitCount - sharedCommitCount

    if (unionCommitCount <= 0) {
        return 0
    }

    return roundToPrecision(sharedCommitCount / unionCommitCount, 4)
}

/**
 * Builds aggregated diff summary from file-level diff entries.
 *
 * @param files File-level diff entries.
 * @returns Aggregated diff summary.
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
 * Filters commit details by optional file or directory path.
 *
 * @param detail Detailed commit payload.
 * @param path Optional path filter.
 * @returns True when commit matches the path filter.
 */
function matchesCommitPathFilter(
    detail: IBitbucketCommitDetails,
    path?: string,
): boolean {
    if (path === undefined) {
        return true
    }

    return detail.diffs.some((diff): boolean => {
        return matchesPathFilter(diff.filePath, path)
    })
}

/**
 * Filters raw commit metadata by author/date constraints.
 *
 * @param payload Raw commit payload.
 * @param options Normalized history filters.
 * @returns True when commit passes metadata filters.
 */
function matchesBitbucketCommitMetadata(
    payload: unknown,
    options: INormalizedCommitHistoryOptions,
): boolean {
    const record = toRecord(payload)
    const author = resolveBitbucketAuthor(record)
    const date = readString(record, ["date"])

    if (options.author !== undefined) {
        const normalizedAuthorFilter = options.author.toLowerCase()
        const authorCandidates = [
            author.name,
            author.email,
            readNestedString(record, ["author", "user", "display_name"]),
            readNestedString(record, ["author", "user", "nickname"]),
            readNestedString(record, ["author", "user", "account_id"]),
            readNestedString(record, ["author", "raw"]),
        ].map((value): string => {
            return value.toLowerCase()
        })

        if (
            authorCandidates.some((candidate): boolean => {
                return candidate.includes(normalizedAuthorFilter)
            }) === false
        ) {
            return false
        }
    }

    if (options.since !== undefined && date.length > 0 && date < options.since) {
        return false
    }

    if (options.until !== undefined && date.length > 0 && date > options.until) {
        return false
    }

    return true
}

/**
 * Matches exact file or directory path filter.
 *
 * @param filePath Repository-relative file path.
 * @param filterPath Requested file or directory path.
 * @returns True when path matches.
 */
function matchesPathFilter(filePath: string, filterPath: string): boolean {
    return filePath === filterPath || filePath.startsWith(`${filterPath}/`)
}

/**
 * Normalizes required text values.
 *
 * @param value Raw text.
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
 * Normalizes optional text values.
 *
 * @param value Raw optional text.
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
 * Normalizes optional directory path.
 *
 * @param value Raw optional path.
 * @returns Trimmed path or undefined.
 */
function normalizeOptionalPath(value: string): string | undefined {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

/**
 * Normalizes merge-request identifier.
 *
 * @param value Raw merge-request identifier.
 * @returns Positive integer identifier.
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
 * Normalizes pull-request comment identifier.
 *
 * @param value Raw comment identifier.
 * @returns Positive integer comment identifier.
 */
function normalizeCommentId(value: string): number {
    const normalized = normalizeRequiredText(value, "commentId")
    const numericValue = Number(normalized)

    if (Number.isInteger(numericValue) === false || numericValue <= 0) {
        throw new Error("commentId must be positive integer")
    }

    return numericValue
}

/**
 * Normalizes line number for inline comments.
 *
 * @param line Raw line number.
 * @returns Positive integer line number.
 */
function normalizeLine(line: number): number {
    if (Number.isInteger(line) === false || line <= 0) {
        throw new Error("line must be positive integer")
    }

    return line
}

/**
 * Normalizes commit-history query options.
 *
 * @param options Optional history options.
 * @returns Normalized history options.
 */
function normalizeCommitHistoryOptions(
    options?: ICommitHistoryOptions,
): INormalizedCommitHistoryOptions {
    const normalizedPath = normalizeOptionalText(options?.path, "path")
    const normalizedFilePath = normalizeOptionalText(options?.filePath, "filePath")

    return {
        author: normalizeOptionalText(options?.author, "author"),
        since: options?.since,
        until: options?.until,
        maxCount: normalizeOptionalMaxCount(options?.maxCount),
        path: normalizedPath ?? normalizedFilePath,
    }
}

/**
 * Normalizes temporal-coupling query options.
 *
 * @param options Optional temporal-coupling options.
 * @returns Normalized temporal-coupling options.
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
 * Normalizes optional string list while preserving order and uniqueness.
 *
 * @param values Raw optional string list.
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
        const normalizedValue = normalizeRequiredText(value, fieldName)

        if (seenValues.has(normalizedValue)) {
            continue
        }

        seenValues.add(normalizedValue)
        normalizedValues.push(normalizedValue)
    }

    return normalizedValues.length > 0 ? normalizedValues : undefined
}

/**
 * Normalizes optional positive max-count value.
 *
 * @param value Raw max count.
 * @returns Positive max count or undefined.
 */
function normalizeOptionalMaxCount(value: number | undefined): number | undefined {
    if (value === undefined) {
        return undefined
    }

    if (Number.isInteger(value) === false || value <= 0) {
        throw new Error("maxCount must be positive integer")
    }

    return value
}

/**
 * Normalizes retry attempt cap.
 *
 * @param value Raw retry max attempts.
 * @returns Positive retry attempt cap.
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
 * Normalizes create-pipeline-status input.
 *
 * @param input Raw create input.
 * @returns Normalized create input.
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
 * Normalizes update-pipeline-status input.
 *
 * @param input Raw update input.
 * @returns Normalized update input.
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
 * Builds stable Bitbucket pipeline-status key from one check name.
 *
 * @param name Check or pipeline name.
 * @returns Stable build-status key.
 */
function buildBitbucketPipelineKey(name: string): string {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 72)

    return `${BITBUCKET_PIPELINE_KEY_PREFIX}-${slug.length > 0 ? slug : "review"}`
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
 * Reads nested string from one record path.
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
 * Converts raw unknown value to plain record or null.
 *
 * @param value Raw unknown value.
 * @returns Plain record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Checks whether paginated Bitbucket payload exposes next-page URL.
 *
 * @param record Page payload record.
 * @returns True when another page exists.
 */
function hasBitbucketNextPage(
    record: Readonly<Record<string, unknown>> | null,
): boolean {
    return readString(record, ["next"]).length > 0
}

/**
 * Compares branch DTOs deterministically.
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
 * Compares tree nodes deterministically.
 *
 * @param left Left node.
 * @param right Right node.
 * @returns Sort comparison result.
 */
function compareFileTreeNode(left: IFileTreeNode, right: IFileTreeNode): number {
    const pathComparison = left.path.localeCompare(right.path)

    if (pathComparison !== 0) {
        return pathComparison
    }

    return left.type.localeCompare(right.type)
}

/**
 * Compares contributor file stats deterministically.
 *
 * @param left Left file stat.
 * @param right Right file stat.
 * @returns Sort comparison result.
 */
function compareContributorFileStat(
    left: IContributorFileStat,
    right: IContributorFileStat,
): number {
    if (left.commitCount !== right.commitCount) {
        return right.commitCount - left.commitCount
    }

    if (left.lastCommitDate !== right.lastCommitDate) {
        return right.lastCommitDate.localeCompare(left.lastCommitDate)
    }

    return left.filePath.localeCompare(right.filePath)
}

/**
 * Compares contributor stats deterministically.
 *
 * @param left Left contributor stat.
 * @param right Right contributor stat.
 * @returns Sort comparison result.
 */
function compareContributorStat(
    left: IContributorStat,
    right: IContributorStat,
): number {
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
 * Compares temporal-coupling edges deterministically.
 *
 * @param left Left edge.
 * @param right Right edge.
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
 * @returns Earlier timestamp.
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
 * @returns Later timestamp.
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
 * Resolves retry delay from normalized ACL error or exponential backoff.
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

    return DEFAULT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
}

/**
 * Rounds floating-point values to stable precision.
 *
 * @param value Raw numeric value.
 * @param digits Decimal digits.
 * @returns Rounded numeric value.
 */
function roundToPrecision(value: number, digits: number): number {
    const multiplier = 10 ** digits

    return Math.round(value * multiplier) / multiplier
}

/**
 * Maps values in bounded async batches.
 *
 * @param values Source values.
 * @param batchSize Batch size.
 * @param mapper Async mapper.
 * @returns Flattened mapped values.
 */
async function mapInBatches<TInput, TOutput>(
    values: readonly TInput[],
    batchSize: number,
    mapper: (value: TInput) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
    const outputs: TOutput[] = []

    for (let index = 0; index < values.length; index += batchSize) {
        const batch = values.slice(index, index + batchSize)
        const mappedBatch = await Promise.all(
            batch.map(async (value): Promise<TOutput> => {
                return mapper(value)
            }),
        )

        outputs.push(...mappedBatch)
    }

    return outputs
}

/**
 * Default async sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after timeout.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, delayMs)
    })
}
