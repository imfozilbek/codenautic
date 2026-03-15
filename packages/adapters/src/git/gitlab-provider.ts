import {timingSafeEqual} from "node:crypto"

import {Gitlab} from "@gitbeaker/rest"
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
    type IPipelineStatusDTO,
    type IRefDiffFile,
    type IRefDiffResult,
    type IRefDiffSummary,
    type ITagInfo,
    type ITemporalCouplingEdge,
    type ITemporalCouplingOptions,
    type IUpdatePipelineStatusInput,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
} from "@codenautic/core"

import {
    mapExternalDiffFiles,
    mapExternalMergeRequest,
    normalizeGitAclError,
    shouldRetryGitAclError,
    type IExternalGitMergeRequest,
    type INormalizedGitAclError,
} from "./acl"
import {GitLabProviderError} from "./gitlab-provider.error"

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const MAX_GITLAB_TEXT_FILE_BYTES = 1024 * 1024
const DETAILS_BATCH_SIZE = 20
const GITLAB_PAGE_SIZE = 100

const GITLAB_COMMIT_STATUS = {
    PENDING: "pending",
    RUNNING: "running",
    SUCCESS: "success",
    FAILED: "failed",
    CANCELED: "canceled",
    SKIPPED: "skipped",
} as const

type GitLabCommitStatus =
    (typeof GITLAB_COMMIT_STATUS)[keyof typeof GITLAB_COMMIT_STATUS]

interface IGitLabRequester {
    post(
        endpoint: string,
        options?: Readonly<Record<string, unknown>>,
    ): Promise<unknown>
}

interface IGitLabListPageInput {
    readonly page: number
    readonly perPage: number
}

interface IGitLabListTreeInput {
    readonly ref: string
    readonly recursive: boolean
}

interface IGitLabCommitHistoryQuery extends IGitLabListPageInput {
    readonly ref: string
    readonly author?: string
    readonly since?: string
    readonly until?: string
    readonly path?: string
}

interface IGitLabCreateCommitStatusInput {
    readonly sha: string
    readonly state: GitLabCommitStatus
    readonly name: string
    readonly description?: string
}

interface IGitLabMergeRequestDiscussionInput {
    readonly mergeRequestIid: number
    readonly body: string
    readonly position: Readonly<Record<string, unknown>>
}

interface IGitLabDiffRefs {
    readonly baseSha: string
    readonly startSha: string
    readonly headSha: string
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

interface IGitLabCommitDetails {
    readonly sha: string
    readonly message: string
    readonly authorName: string
    readonly authorEmail: string
    readonly date: string
    readonly diffs: readonly IParsedGitLabDiff[]
}

interface IParsedGitLabDiff {
    readonly filePath: string
    readonly oldPath?: string
    readonly status: IMergeRequestDiffFileDTO["status"]
    readonly additions: number
    readonly deletions: number
    readonly changes: number
    readonly patch: string
    readonly hunks: readonly string[]
}

interface ILegacyPipelineContext {
    readonly mergeRequestId: string
    readonly name: string
    readonly headCommitId?: string
}

/**
 * Minimal subset of GitBeaker methods used by the GitLab provider.
 */
export interface IGitLabClient {
    /**
     * Loads project metadata to validate credentials and defaults.
     */
    getProject(): Promise<unknown>

    /**
     * Loads merge request metadata.
     */
    getMergeRequest(mergeRequestIid: number): Promise<unknown>

    /**
     * Loads merge request changes payload.
     */
    getMergeRequestChanges(mergeRequestIid: number): Promise<unknown>

    /**
     * Loads merge request commits.
     */
    getMergeRequestCommits(mergeRequestIid: number): Promise<readonly unknown[]>

    /**
     * Loads merge request diff versions.
     */
    getMergeRequestDiffVersions(mergeRequestIid: number): Promise<readonly unknown[]>

    /**
     * Creates a plain merge request note.
     */
    createMergeRequestNote(
        mergeRequestIid: number,
        body: string,
    ): Promise<unknown>

    /**
     * Deletes one plain merge request note.
     */
    deleteMergeRequestNote(
        mergeRequestIid: number,
        noteId: number,
    ): Promise<void>

    /**
     * Creates an inline merge request discussion.
     */
    createMergeRequestDiscussion(
        input: IGitLabMergeRequestDiscussionInput,
    ): Promise<unknown>

    /**
     * Lists repository tree entries.
     */
    listRepositoryTree(input: IGitLabListTreeInput): Promise<readonly unknown[]>

    /**
     * Loads repository file metadata and encoded content.
     */
    getRepositoryFile(filePath: string, ref: string): Promise<unknown>

    /**
     * Lists branches page.
     */
    listBranches(input: IGitLabListPageInput): Promise<readonly unknown[]>

    /**
     * Lists tags page.
     */
    listTags(input: IGitLabListPageInput): Promise<readonly unknown[]>

    /**
     * Lists commit history page.
     */
    listCommits(input: IGitLabCommitHistoryQuery): Promise<readonly unknown[]>

    /**
     * Loads commit metadata.
     */
    getCommit(sha: string): Promise<unknown>

    /**
     * Loads commit diff entries.
     */
    getCommitDiff(sha: string): Promise<readonly unknown[]>

    /**
     * Loads blame ranges for one file.
     */
    getFileBlame(filePath: string, ref: string): Promise<readonly unknown[]>

    /**
     * Creates commit status for one SHA.
     */
    createCommitStatus(
        input: IGitLabCreateCommitStatusInput,
    ): Promise<unknown>

    /**
     * Compares two refs.
     */
    compareRefs(baseRef: string, headRef: string): Promise<unknown>
}

/**
 * GitLab provider configuration.
 */
export interface IGitLabProviderOptions {
    /**
     * GitLab host.
     */
    readonly host: string

    /**
     * GitLab project identifier or full path.
     */
    readonly projectId: string | number

    /**
     * Personal or project access token.
     */
    readonly token: string

    /**
     * Optional shared webhook token.
     */
    readonly webhookToken?: string

    /**
     * Optional client override for tests.
     */
    readonly client?: IGitLabClient

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
 * Sequential batch review payload for GitLab fallback flow.
 */
export interface IGitLabBatchReviewRequest {
    /**
     * Top-level review body posted as merge request note.
     */
    readonly body: string

    /**
     * Inline comments posted one-by-one as discussions.
     */
    readonly comments: readonly IInlineCommentDTO[]
}

/**
 * GitLab implementation of the generic git provider contract.
 */
export class GitLabProvider implements IGitProvider, IGitPipelineStatusProvider {
    private readonly client: IGitLabClient
    private readonly projectId: string
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>
    private readonly webhookToken?: string
    private readonly legacyPipelineContexts: Map<string, ILegacyPipelineContext>
    private lastMergeRequestIid?: number

    /**
     * Creates GitLab provider.
     *
     * @param options Provider configuration.
     */
    public constructor(options: IGitLabProviderOptions) {
        this.projectId = normalizeProjectId(options.projectId)
        this.client = options.client ?? createGitLabClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
        this.webhookToken = normalizeOptionalText(options.webhookToken, "webhookToken")
        this.legacyPipelineContexts = new Map<string, ILegacyPipelineContext>()
    }

    /**
     * Fetches merge request and normalizes it to merge-request DTO.
     *
     * @param id Merge request IID.
     * @returns Merge-request payload.
     */
    public async getMergeRequest(id: string): Promise<IMergeRequestDTO> {
        const mergeRequestIid = normalizeMergeRequestIid(id)

        const [mergeRequest, changes, commits] = await Promise.all([
            this.executeRequest(() => {
                return this.client.getMergeRequest(mergeRequestIid)
            }),
            this.executeRequest(() => {
                return this.client.getMergeRequestChanges(mergeRequestIid)
            }),
            this.executeRequest(() => {
                return this.client.getMergeRequestCommits(mergeRequestIid)
            }),
        ])

        const mergeRequestRecord = toRecord(mergeRequest) ?? {}

        return mapExternalMergeRequest({
            ...mergeRequestRecord,
            changes: resolveGitLabMergeRequestChanges(changes),
            commits,
        } as IExternalGitMergeRequest)
    }

    /**
     * Fetches changed files for merge request.
     *
     * @param mergeRequestId Merge request IID.
     * @returns Diff files.
     */
    public async getChangedFiles(
        mergeRequestId: string,
    ): Promise<readonly IMergeRequestDiffFileDTO[]> {
        const mergeRequestIid = normalizeMergeRequestIid(mergeRequestId)
        const changes = await this.executeRequest(() => {
            return this.client.getMergeRequestChanges(mergeRequestIid)
        })

        return mapExternalDiffFiles(resolveGitLabMergeRequestChanges(changes))
    }

    /**
     * Loads repository file tree for a reference.
     *
     * @param ref Branch name or commit SHA.
     * @returns Tree nodes.
     */
    public async getFileTree(ref: string): Promise<readonly IFileTreeNode[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const response = await this.executeRequest(() => {
            return this.client.listRepositoryTree({
                ref: normalizedRef,
                recursive: true,
            })
        })
        const items = response
            .map(mapGitLabTreeEntry)
            .filter((entry): entry is IFileTreeNode => {
                return entry !== null
            })

        return [...items].sort(compareFileTreeNode)
    }

    /**
     * Loads repository file content for a reference.
     *
     * @param filePath Repository-relative file path.
     * @param ref Branch name or commit SHA.
     * @returns Raw file content.
     */
    public async getFileContentByRef(filePath: string, ref: string): Promise<string> {
        const normalizedPath = normalizeRequiredText(filePath, "filePath")
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const response = await this.executeRequest(() => {
            return this.client.getRepositoryFile(normalizedPath, normalizedRef)
        })

        return extractGitLabFileContent(response)
    }

    /**
     * Fetches repository branches metadata.
     *
     * @returns Branch list with default and protection metadata.
     */
    public async getBranches(): Promise<readonly IBranchInfo[]> {
        const branches: IBranchInfo[] = []
        let page = 1

        while (true) {
            const response = await this.executeRequest(() => {
                return this.client.listBranches({
                    page,
                    perPage: GITLAB_PAGE_SIZE,
                })
            })

            branches.push(...response.map(mapGitLabBranch))

            if (response.length < GITLAB_PAGE_SIZE) {
                break
            }

            page += 1
        }

        return branches.sort(compareBranchInfo)
    }

    /**
     * Fetches commit history for a branch or commit reference.
     *
     * @param ref Commit SHA or branch name.
     * @param options Optional history query options.
     * @returns Ordered commit list.
     */
    public async getCommitHistory(
        ref: string,
        options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const commits = await this.listCommitHistory(normalizedRef, normalizedOptions)
        const details = await this.loadCommitDetails(commits)

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
     * Fetches aggregated contributor statistics for a branch, tag, or commit ref.
     *
     * @param ref Commit SHA, branch name, or tag.
     * @param options Optional date/path/limit filters.
     * @returns Contributor statistics with per-file breakdown.
     */
    public async getContributorStats(
        ref: string,
        options?: IContributorStatsOptions,
    ): Promise<readonly IContributorStat[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const commits = await this.listCommitHistory(
            normalizedRef,
            normalizedOptions,
            "all",
        )
        const details = await this.loadCommitDetails(commits)

        return buildContributorStats(details)
    }

    /**
     * Fetches temporal coupling edges derived from co-changed commits.
     *
     * @param ref Commit SHA, branch name, or tag.
     * @param options Optional commit-window and batch file filters.
     * @returns Temporal coupling edges in stable provider order.
     */
    public async getTemporalCoupling(
        ref: string,
        options?: ITemporalCouplingOptions,
    ): Promise<readonly ITemporalCouplingEdge[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeTemporalCouplingOptions(options)
        const commits = await this.listCommitHistory(
            normalizedRef,
            normalizedOptions,
            "all",
        )
        const details = await this.loadCommitDetails(commits)

        return buildTemporalCouplingEdges(details, normalizedOptions.filePaths)
    }

    /**
     * Fetches repository tags metadata.
     *
     * @returns Tag list with annotation and commit metadata.
     */
    public async getTags(): Promise<readonly ITagInfo[]> {
        const tags: ITagInfo[] = []
        let page = 1

        while (true) {
            const response = await this.executeRequest(() => {
                return this.client.listTags({
                    page,
                    perPage: GITLAB_PAGE_SIZE,
                })
            })

            const mappedBatch = await Promise.all(
                response.map(async (tag): Promise<ITagInfo> => {
                    return this.mapGitLabTag(tag)
                }),
            )
            tags.push(...mappedBatch)

            if (response.length < GITLAB_PAGE_SIZE) {
                break
            }

            page += 1
        }

        return tags.sort(compareTagInfo)
    }

    /**
     * Fetches diff between two commit, branch, or tag refs.
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

        const [forward, backward] = await Promise.all([
            this.executeRequest(() => {
                return this.client.compareRefs(normalizedBaseRef, normalizedHeadRef)
            }),
            this.executeRequest(() => {
                return this.client.compareRefs(normalizedHeadRef, normalizedBaseRef)
            }),
        ])

        return mapGitLabRefDiff(
            forward,
            backward,
            normalizedBaseRef,
            normalizedHeadRef,
        )
    }

    /**
     * Fetches blame data for one file.
     *
     * @param filePath Repository-relative file path.
     * @param ref Commit SHA or branch name.
     * @returns Line blame metadata.
     */
    public async getBlameData(
        filePath: string,
        ref: string,
    ): Promise<readonly IBlameData[]> {
        const normalizedPath = normalizeRequiredText(filePath, "filePath")
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const response = await this.executeRequest(() => {
            return this.client.getFileBlame(normalizedPath, normalizedRef)
        })

        return mapGitLabBlameRanges(response)
    }

    /**
     * Fetches blame data for multiple files in input order.
     *
     * @param filePaths Repository-relative file paths.
     * @param ref Commit SHA or branch name.
     * @returns File-scoped blame metadata.
     */
    public async getBlameDataBatch(
        filePaths: readonly string[],
        ref: string,
    ): Promise<readonly IFileBlame[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")

        return Promise.all(
            filePaths.map(async (filePath): Promise<IFileBlame> => {
                const normalizedPath = normalizeRequiredText(filePath, "filePath")

                return {
                    filePath: normalizedPath,
                    blame: await this.getBlameData(normalizedPath, normalizedRef),
                }
            }),
        )
    }

    /**
     * Posts regular comment to merge request.
     *
     * @param mergeRequestId Merge request IID.
     * @param body Comment body.
     * @returns Created comment payload.
     */
    public async postComment(
        mergeRequestId: string,
        body: string,
    ): Promise<ICommentDTO> {
        const mergeRequestIid = normalizeMergeRequestIid(mergeRequestId)
        this.lastMergeRequestIid = mergeRequestIid
        const normalizedBody = normalizeRequiredText(body, "body")
        const response = await this.executeRequest(() => {
            return this.client.createMergeRequestNote(
                mergeRequestIid,
                normalizedBody,
            )
        })

        return mapGitLabComment(response)
    }

    /**
     * Deletes existing merge-request note comment.
     *
     * @param mergeRequestId Merge request IID.
     * @param commentId Merge request note identifier.
     * @returns Completion promise.
     */
    public async deleteComment(
        mergeRequestId: string,
        commentId: string,
    ): Promise<void> {
        const mergeRequestIid = normalizeMergeRequestIid(mergeRequestId)
        const noteId = normalizeNoteId(commentId)

        await this.executeRequest(() => {
            return this.client.deleteMergeRequestNote(mergeRequestIid, noteId)
        })
    }

    /**
     * Creates review in sequential fallback mode for GitLab.
     *
     * @param mergeRequestId Merge request IID.
     * @param review Batch review payload.
     * @returns Created note and inline comments mapped to generic comment DTOs.
     */
    public async createReview(
        mergeRequestId: string,
        review: IGitLabBatchReviewRequest,
    ): Promise<readonly ICommentDTO[]> {
        const mergeRequestIid = normalizeMergeRequestIid(mergeRequestId)
        this.lastMergeRequestIid = mergeRequestIid

        const createdComments: ICommentDTO[] = []
        const bodyComment = await this.postComment(
            mergeRequestId,
            normalizeRequiredText(review.body, "body"),
        )
        createdComments.push(bodyComment)

        for (const comment of review.comments) {
            this.assertLastMergeRequestIid(mergeRequestIid)
            const inlineComment = await this.postInlineComment(mergeRequestId, comment)
            createdComments.push(mapInlineCommentToComment(inlineComment))
        }

        return createdComments
    }

    /**
     * Posts inline comment to merge request as a discussion thread.
     *
     * @param mergeRequestId Merge request IID.
     * @param comment Inline comment payload.
     * @returns Created inline comment payload.
     */
    public async postInlineComment(
        mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        const mergeRequestIid = normalizeMergeRequestIid(mergeRequestId)
        this.lastMergeRequestIid = mergeRequestIid
        const diffRefs = await this.resolveDiffRefs(mergeRequestIid)
        const position = createGitLabDiscussionPosition(comment, diffRefs)
        const response = await this.executeRequest(() => {
            return this.client.createMergeRequestDiscussion({
                mergeRequestIid,
                body: normalizeRequiredText(comment.body, "body"),
                position,
            })
        })

        return mapGitLabInlineComment(response, comment)
    }

    /**
     * Verifies merge request context stability for sequential review fallback.
     *
     * @param mergeRequestIid Target merge request IID.
     * @returns Nothing.
     */
    private assertLastMergeRequestIid(mergeRequestIid: number): void {
        if (
            this.lastMergeRequestIid !== undefined &&
            this.lastMergeRequestIid !== mergeRequestIid
        ) {
            throw new Error("lastMergeRequestIid guard failed")
        }
    }

    /**
     * Creates generic pipeline status via GitLab commit-status API.
     *
     * @param input Creation payload.
     * @returns Created pipeline status payload.
     */
    public async createPipelineStatus(
        input: ICreatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeCreatePipelineStatusInput(input)
        const headCommitId = await this.resolveHeadCommitId(
            normalizedInput.mergeRequestId,
            normalizedInput.headCommitId,
        )
        const response = await this.executeRequest(() => {
            return this.client.createCommitStatus({
                sha: headCommitId,
                state: GITLAB_COMMIT_STATUS.PENDING,
                name: normalizedInput.name,
            })
        })
        const pipelineStatus = mapGitLabPipelineStatus(response)

        this.rememberLegacyPipelineContext(pipelineStatus.id, {
            mergeRequestId: normalizedInput.mergeRequestId,
            name: normalizedInput.name,
            headCommitId,
        })

        return pipelineStatus
    }

    /**
     * Updates generic pipeline status via GitLab commit-status API.
     *
     * @param input Update payload.
     * @returns Updated pipeline status payload.
     */
    public async updatePipelineStatus(
        input: IUpdatePipelineStatusInput,
    ): Promise<IPipelineStatusDTO> {
        const normalizedInput = normalizeUpdatePipelineStatusInput(input)
        const headCommitId = await this.resolveHeadCommitId(
            normalizedInput.mergeRequestId,
            normalizedInput.headCommitId,
        )
        const response = await this.executeRequest(() => {
            return this.client.createCommitStatus({
                sha: headCommitId,
                state: mapPipelineStateToGitLabStatus(
                    normalizedInput.status,
                    normalizedInput.conclusion,
                ),
                name: normalizedInput.name,
                description: normalizedInput.summary,
            })
        })
        const pipelineStatus = mapGitLabPipelineStatus(response)

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
     * Legacy Git-provider compatibility for stage code still using check-run semantics.
     *
     * @param mergeRequestId Merge request IID.
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
            throw new Error(`GitLab check context is not available for ${normalizedCheckId}`)
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
     * Verifies shared GitLab webhook token with timing-safe comparison.
     *
     * @param token Received webhook token.
     * @returns True when token matches configured secret.
     */
    public verifyWebhookToken(token: string): boolean {
        if (this.webhookToken === undefined) {
            return false
        }

        return safeCompareTokens(
            this.webhookToken,
            normalizeRequiredText(token, "token"),
        )
    }

    /**
     * Executes GitLab API request with retry semantics for retryable failures.
     *
     * @param operation Deferred API call.
     * @returns Operation result.
     */
    private async executeRequest<T>(operation: () => Promise<T>): Promise<T> {
        let attempt = 1

        while (true) {
            try {
                return await operation()
            } catch (error) {
                const normalized = normalizeGitAclError(error)

                if (!shouldRetryGitAclError(error, attempt, this.retryMaxAttempts)) {
                    throw new GitLabProviderError(normalized)
                }

                await this.sleep(resolveRetryDelayMs(normalized, attempt))
                attempt += 1
            }
        }
    }

    /**
     * Lists repository history pages until the requested max count is reached.
     *
     * @param ref Normalized branch or commit reference.
     * @param options Normalized history filters.
     * @param mode Pagination strategy when `maxCount` is omitted.
     * @returns Raw commit list from repository history.
     */
    private async listCommitHistory(
        ref: string,
        options: INormalizedCommitHistoryOptions,
        mode: "page" | "all" = "page",
    ): Promise<readonly unknown[]> {
        const pageSize = resolveCommitHistoryPerPage(options.maxCount)
        const targetCount = options.maxCount ?? (
            mode === "all" ? Number.MAX_SAFE_INTEGER : pageSize
        )
        const commits: unknown[] = []
        let page = 1

        while (commits.length < targetCount) {
            const remaining = targetCount - commits.length
            const perPage = options.maxCount === undefined
                ? pageSize
                : Math.min(pageSize, remaining)
            const response = await this.executeRequest(() => {
                return this.client.listCommits({
                    ref,
                    author: options.author,
                    since: options.since,
                    until: options.until,
                    path: options.path,
                    page,
                    perPage,
                })
            })

            commits.push(
                ...response.slice(
                    0,
                    options.maxCount === undefined ? response.length : remaining,
                ),
            )

            if (response.length < perPage) {
                break
            }

            page += 1
        }

        return commits
    }

    /**
     * Loads detailed commit payloads in bounded parallel batches.
     *
     * @param commits Raw commit list from GitLab history API.
     * @returns Detailed commit payloads in source order.
     */
    private async loadCommitDetails(
        commits: readonly unknown[],
    ): Promise<readonly IGitLabCommitDetails[]> {
        const detailedCommits: IGitLabCommitDetails[] = []

        for (let index = 0; index < commits.length; index += DETAILS_BATCH_SIZE) {
            const batch = commits.slice(index, index + DETAILS_BATCH_SIZE)
            const detailedBatch = await Promise.all(
                batch.map(async (commit): Promise<IGitLabCommitDetails> => {
                    const commitSha = readString(
                        toRecord(commit),
                        ["id", "sha"],
                    )
                    const [details, diffs] = await Promise.all([
                        this.executeRequest(() => {
                            return this.client.getCommit(commitSha)
                        }),
                        this.executeRequest(() => {
                            return this.client.getCommitDiff(commitSha)
                        }),
                    ])

                    return mapGitLabCommitDetails(details, diffs)
                }),
            )

            detailedCommits.push(...detailedBatch)
        }

        return detailedCommits
    }

    /**
     * Resolves merge-request head commit identifier.
     *
     * @param mergeRequestId Merge request identifier.
     * @param explicitHeadCommitId Optional explicit head commit identifier.
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

        const mergeRequest = await this.executeRequest(() => {
            return this.client.getMergeRequest(
                normalizeMergeRequestIid(mergeRequestId),
            )
        })

        return resolveGitLabHeadCommitId(mergeRequest)
    }

    /**
     * Resolves diff refs for inline discussions.
     *
     * @param mergeRequestIid Merge request IID.
     * @returns Diff refs for the latest visible version.
     */
    private async resolveDiffRefs(mergeRequestIid: number): Promise<IGitLabDiffRefs> {
        const mergeRequest = await this.executeRequest(() => {
            return this.client.getMergeRequest(mergeRequestIid)
        })
        const mergeRequestRefs = readDiffRefs(toRecord(mergeRequest))

        if (mergeRequestRefs !== undefined) {
            return mergeRequestRefs
        }

        const versions = await this.executeRequest(() => {
            return this.client.getMergeRequestDiffVersions(mergeRequestIid)
        })
        const latestVersion = versions
            .map((version): Readonly<Record<string, unknown>> | null => {
                return toRecord(version)
            })
            .filter((version): version is Readonly<Record<string, unknown>> => {
                return version !== null
            })
            .sort(compareDiffVersion)
            .at(0)

        const versionRefs = readDiffRefs(latestVersion)
        if (versionRefs === undefined) {
            throw new Error("GitLab merge request diff refs are unavailable")
        }

        return versionRefs
    }

    /**
     * Maps one GitLab tag payload to core DTO.
     *
     * @param tag Raw GitLab tag payload.
     * @returns Normalized tag DTO.
     */
    private async mapGitLabTag(tag: unknown): Promise<ITagInfo> {
        const record = toRecord(tag)
        const tagName = readString(record, ["name"])
        const tagSha = readString(record, ["target"])
        const annotationMessage = normalizeOptionalRecordText(record, ["message"])
        const commitRecord = toRecord(record?.["commit"])

        if (commitRecord !== null) {
            const commitDate = resolveGitLabCommitDate(commitRecord)

            return {
                name: tagName,
                sha: tagSha,
                isAnnotated: annotationMessage !== undefined,
                annotationMessage,
                date: commitDate,
                commit: {
                    sha: readString(commitRecord, ["id", "sha"]),
                    message: readString(commitRecord, ["message"]),
                    date: commitDate,
                },
            }
        }

        const commit = await this.executeRequest(() => {
            return this.client.getCommit(tagSha)
        })
        const commitRecordFallback = toRecord(commit)
        const commitDate = resolveGitLabCommitDate(commitRecordFallback)

        return {
            name: tagName,
            sha: tagSha,
            isAnnotated: annotationMessage !== undefined,
            annotationMessage,
            date: commitDate,
            commit: {
                sha: readString(commitRecordFallback, ["id", "sha"]),
                message: readString(commitRecordFallback, ["message"]),
                date: commitDate,
            },
        }
    }

    /**
     * Stores legacy check context for id-based compatibility updates.
     *
     * @param pipelineId Pipeline identifier returned by provider.
     * @param context Legacy compatibility context.
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
 * Creates GitLab client wrapper backed by GitBeaker.
 *
 * @param options Provider configuration.
 * @returns Wrapped GitLab client.
 */
function createGitLabClient(options: IGitLabProviderOptions): IGitLabClient {
    const host = normalizeRequiredText(options.host, "host")
    const token = normalizeRequiredText(options.token, "token")
    const projectId = normalizeProjectId(options.projectId)
    const encodedProjectId = encodeURIComponent(projectId)
    const client = new Gitlab({
        host,
        token,
    })

    return {
        ...createGitLabMergeRequestClient(client, projectId, encodedProjectId),
        ...createGitLabRepositoryClient(client, projectId),
    }
}

/**
 * Builds merge-request and discussion-related GitLab client methods.
 *
 * @param client GitBeaker client.
 * @param projectId Normalized project identifier.
 * @param encodedProjectId URL-encoded project identifier.
 * @returns Partial GitLab client implementation.
 */
function createGitLabMergeRequestClient(
    client: Gitlab,
    projectId: string,
    encodedProjectId: string,
): Pick<
    IGitLabClient,
    | "getProject"
    | "getMergeRequest"
    | "getMergeRequestChanges"
    | "getMergeRequestCommits"
    | "getMergeRequestDiffVersions"
    | "createMergeRequestNote"
    | "deleteMergeRequestNote"
    | "createMergeRequestDiscussion"
> {
    return {
        getProject(): Promise<unknown> {
            return client.Projects.show(projectId) as Promise<unknown>
        },
        getMergeRequest(mergeRequestIid: number): Promise<unknown> {
            return client.MergeRequests.show(projectId, mergeRequestIid) as Promise<unknown>
        },
        getMergeRequestChanges(mergeRequestIid: number): Promise<unknown> {
            return client.MergeRequests.showChanges(projectId, mergeRequestIid) as Promise<unknown>
        },
        getMergeRequestCommits(mergeRequestIid: number): Promise<readonly unknown[]> {
            return client.MergeRequests.allCommits(
                projectId,
                mergeRequestIid,
            ) as Promise<readonly unknown[]>
        },
        getMergeRequestDiffVersions(mergeRequestIid: number): Promise<readonly unknown[]> {
            return client.MergeRequests.allDiffVersions(
                projectId,
                mergeRequestIid,
            ) as Promise<readonly unknown[]>
        },
        createMergeRequestNote(mergeRequestIid: number, body: string): Promise<unknown> {
            return client.MergeRequestNotes.create(
                projectId,
                mergeRequestIid,
                body,
            ) as Promise<unknown>
        },
        deleteMergeRequestNote(mergeRequestIid: number, noteId: number): Promise<void> {
            return client.MergeRequestNotes.remove(
                projectId,
                mergeRequestIid,
                noteId,
            )
        },
        createMergeRequestDiscussion(
            input: IGitLabMergeRequestDiscussionInput,
        ): Promise<unknown> {
            return getGitLabRequester(client.MergeRequestDiscussions).post(
                `projects/${encodedProjectId}/merge_requests/${input.mergeRequestIid}/discussions`,
                {
                    body: {
                        body: input.body,
                        position: input.position,
                    },
                },
            )
        },
    }
}

/**
 * Builds repository and commit-related GitLab client methods.
 *
 * @param client GitBeaker client.
 * @param projectId Normalized project identifier.
 * @returns Partial GitLab client implementation.
 */
function createGitLabRepositoryClient(
    client: Gitlab,
    projectId: string,
): Pick<
    IGitLabClient,
    | "listRepositoryTree"
    | "getRepositoryFile"
    | "listBranches"
    | "listTags"
    | "listCommits"
    | "getCommit"
    | "getCommitDiff"
    | "getFileBlame"
    | "createCommitStatus"
    | "compareRefs"
> {
    return {
        listRepositoryTree(input: IGitLabListTreeInput): Promise<readonly unknown[]> {
            return client.Repositories.allRepositoryTrees(projectId, {
                ref: input.ref,
                recursive: input.recursive,
            }) as Promise<readonly unknown[]>
        },
        getRepositoryFile(filePath: string, ref: string): Promise<unknown> {
            return client.RepositoryFiles.show(
                projectId,
                filePath,
                ref,
            ) as Promise<unknown>
        },
        listBranches(input: IGitLabListPageInput): Promise<readonly unknown[]> {
            return client.Branches.all(projectId, {
                page: input.page,
                perPage: input.perPage,
            }) as Promise<readonly unknown[]>
        },
        listTags(input: IGitLabListPageInput): Promise<readonly unknown[]> {
            return client.Tags.all(projectId, {
                page: input.page,
                perPage: input.perPage,
            }) as Promise<readonly unknown[]>
        },
        listCommits(input: IGitLabCommitHistoryQuery): Promise<readonly unknown[]> {
            return client.Commits.all(projectId, {
                refName: input.ref,
                author: input.author,
                since: input.since,
                until: input.until,
                path: input.path,
                page: input.page,
                perPage: input.perPage,
            }) as Promise<readonly unknown[]>
        },
        getCommit(sha: string): Promise<unknown> {
            return client.Commits.show(projectId, sha) as Promise<unknown>
        },
        getCommitDiff(sha: string): Promise<readonly unknown[]> {
            return client.Commits.showDiff(projectId, sha) as Promise<readonly unknown[]>
        },
        getFileBlame(filePath: string, ref: string): Promise<readonly unknown[]> {
            return client.RepositoryFiles.allFileBlames(
                projectId,
                filePath,
                ref,
            ) as Promise<readonly unknown[]>
        },
        createCommitStatus(input: IGitLabCreateCommitStatusInput): Promise<unknown> {
            return client.Commits.editStatus(
                projectId,
                input.sha,
                mapSafeGitLabCommitStatus(input.state),
                {
                    name: input.name,
                    description: input.description,
                },
            ) as Promise<unknown>
        },
        compareRefs(baseRef: string, headRef: string): Promise<unknown> {
            return client.Repositories.compare(
                projectId,
                baseRef,
                headRef,
            ) as Promise<unknown>
        },
    }
}

/**
 * Resolves low-level GitBeaker requester from resource object.
 *
 * @param resource GitBeaker resource instance.
 * @returns Low-level requester.
 */
function getGitLabRequester(resource: unknown): IGitLabRequester {
    const record = toRecord(resource)
    const requester = record?.["requester"]
    const requesterRecord = toRecord(requester)
    const post = requesterRecord?.["post"]

    if (typeof post !== "function") {
        throw new Error("GitLab requester.post is unavailable")
    }

    return {
        post: post as IGitLabRequester["post"],
    }
}

/**
 * Normalizes merge-request identifier to numeric IID.
 *
 * @param value Raw merge-request identifier.
 * @returns Merge-request IID.
 */
function normalizeMergeRequestIid(value: string): number {
    const normalized = normalizeRequiredText(value, "mergeRequestId")
    const numericValue = Number(normalized)

    if (Number.isInteger(numericValue) === false || numericValue <= 0) {
        throw new Error("mergeRequestId must be positive integer")
    }

    return numericValue
}

/**
 * Normalizes merge-request note identifier.
 *
 * @param value Raw note identifier.
 * @returns Merge-request note identifier.
 */
function normalizeNoteId(value: string): number {
    const normalized = normalizeRequiredText(value, "commentId")
    const numericValue = Number(normalized)

    if (Number.isInteger(numericValue) === false || numericValue <= 0) {
        throw new Error("commentId must be positive integer")
    }

    return numericValue
}

/**
 * Normalizes project identifier or path.
 *
 * @param value Raw project identifier.
 * @returns Normalized project identifier string.
 */
function normalizeProjectId(value: string | number): string {
    if (typeof value === "number") {
        if (Number.isInteger(value) === false || value <= 0) {
            throw new Error("projectId must be positive integer or non-empty string")
        }

        return String(value)
    }

    return normalizeRequiredText(value, "projectId")
}

/**
 * Normalizes required text inputs.
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
 * Normalizes optional text inputs.
 *
 * @param value Optional raw text.
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
 * Normalizes commit history query options with backward-compatible path support.
 *
 * @param options Optional history query options.
 * @returns Normalized history query options.
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
        maxCount: options?.maxCount,
        path: normalizedPath ?? normalizedFilePath,
    }
}

/**
 * Normalizes temporal coupling query options with commit window and batch paths.
 *
 * @param options Optional temporal coupling filters.
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
 * Normalizes pipeline-status creation input.
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
 * Normalizes pipeline-status update input.
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
 * Normalizes optional string list while preserving input order and uniqueness.
 *
 * @param values Optional raw string list.
 * @param fieldName Field label used in validation errors.
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
 * Converts unknown to record.
 *
 * @param value Raw value.
 * @returns Record or null.
 */
function toRecord(value: unknown): Readonly<Record<string, unknown>> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null
    }

    return value as Readonly<Record<string, unknown>>
}

/**
 * Reads required string from one of the candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @param fallback Optional fallback.
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
 * Reads optional trimmed string from one of the candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @returns Trimmed string or undefined.
 */
function normalizeOptionalRecordText(
    record: Readonly<Record<string, unknown>> | null,
    keys: readonly string[],
): string | undefined {
    const value = readString(record, keys)

    return value.length > 0 ? value : undefined
}

/**
 * Reads boolean flag from one of the candidate keys.
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
        const value = record?.[key]
        if (typeof value === "boolean") {
            return value
        }
    }

    return false
}

/**
 * Reads number from one of the candidate keys.
 *
 * @param record Source record.
 * @param keys Candidate keys.
 * @param fallback Optional fallback.
 * @returns Number value.
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

        if (typeof value === "string" && value.trim().length > 0) {
            const numericValue = Number(value)
            if (Number.isFinite(numericValue)) {
                return numericValue
            }
        }
    }

    return fallback
}

/**
 * Maps raw GitLab merge-request changes payload to diff list.
 *
 * @param payload Raw changes payload.
 * @returns Diff collection.
 */
function resolveGitLabMergeRequestChanges(payload: unknown): readonly unknown[] {
    const record = toRecord(payload)
    const changes = record?.["changes"]

    return Array.isArray(changes) ? changes : []
}

/**
 * Maps raw GitLab tree entry to file-tree DTO.
 *
 * @param entry Raw GitLab tree entry.
 * @returns File-tree DTO or null for unsupported entries.
 */
function mapGitLabTreeEntry(entry: unknown): IFileTreeNode | null {
    const record = toRecord(entry)
    const type = readString(record, ["type"])

    if (type !== FILE_TREE_NODE_TYPE.BLOB && type !== FILE_TREE_NODE_TYPE.TREE) {
        return null
    }

    return {
        path: readString(record, ["path"]),
        type,
        size: readNumber(record, ["size"]),
        sha: readString(record, ["id", "sha"]),
    }
}

/**
 * Compares tree nodes deterministically.
 *
 * @param left Left node.
 * @param right Right node.
 * @returns Sort comparison result.
 */
function compareFileTreeNode(left: IFileTreeNode, right: IFileTreeNode): number {
    return left.path.localeCompare(right.path)
}

/**
 * Extracts file content from GitLab repository-file payload.
 *
 * @param payload GitLab file payload.
 * @returns Decoded text content.
 */
function extractGitLabFileContent(payload: unknown): string {
    const record = toRecord(payload)
    const fileSize = readNumber(record, ["size"])
    if (fileSize > MAX_GITLAB_TEXT_FILE_BYTES) {
        throw new Error(
            `GitLab file content exceeds size limit of ${MAX_GITLAB_TEXT_FILE_BYTES} bytes`,
        )
    }

    const encoding = normalizeFileContentEncoding(readString(record, ["encoding"]))
    if (encoding === "none") {
        throw new Error("GitLab binary file content is not supported")
    }

    const content = readString(record, ["content"])
    const decodedContent = decodeFileContent(content, encoding ?? "utf8")
    if (isBinaryBuffer(decodedContent)) {
        throw new Error("GitLab binary file content is not supported")
    }

    return decodedContent.toString("utf8")
}

/**
 * Normalizes GitLab file encoding label.
 *
 * @param encoding Raw encoding value.
 * @returns Supported normalized encoding or undefined.
 */
function normalizeFileContentEncoding(
    encoding: string,
): "base64" | "utf8" | "none" | undefined {
    const normalized = encoding.trim().toLowerCase()
    if (normalized.length === 0) {
        return undefined
    }

    if (normalized === "base64") {
        return "base64"
    }

    if (normalized === "utf8" || normalized === "utf-8") {
        return "utf8"
    }

    if (normalized === "none") {
        return "none"
    }

    throw new Error(`GitLab file content uses unsupported encoding: ${encoding}`)
}

/**
 * Decodes file content into raw bytes.
 *
 * @param content Raw encoded content.
 * @param encoding Normalized encoding.
 * @returns Decoded byte buffer.
 */
function decodeFileContent(
    content: string,
    encoding: "base64" | "utf8",
): Buffer {
    const normalizedContent = encoding === "base64"
        ? content.replace(/\n/g, "")
        : content

    return Buffer.from(normalizedContent, encoding)
}

/**
 * Detects likely binary data using control-byte heuristics.
 *
 * @param content Raw decoded bytes.
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
 * Maps raw GitLab branch payload to branch-info DTO.
 *
 * @param branch Raw branch payload.
 * @returns Branch-info DTO.
 */
function mapGitLabBranch(branch: unknown): IBranchInfo {
    const record = toRecord(branch)
    const commit = toRecord(record?.["commit"])

    return {
        name: readString(record, ["name"]),
        sha: readString(commit, ["id", "sha"]),
        isDefault: readBoolean(record, ["default"]),
        isProtected: readBoolean(record, ["protected"]),
        lastCommitDate: resolveGitLabCommitDate(commit),
    }
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
 * Maps raw GitLab commit details and diff list to normalized aggregation shape.
 *
 * @param details Raw GitLab commit details.
 * @param diffs Raw GitLab diff list.
 * @returns Normalized commit details.
 */
function mapGitLabCommitDetails(
    details: unknown,
    diffs: readonly unknown[],
): IGitLabCommitDetails {
    const record = toRecord(details)

    return {
        sha: readString(record, ["id", "sha"]),
        message: readString(record, ["message", "title"]),
        authorName: readString(record, ["author_name", "committer_name"]),
        authorEmail: readString(record, ["author_email", "committer_email"]),
        date: resolveGitLabCommitDate(record),
        diffs: diffs.map(mapGitLabDiff),
    }
}

/**
 * Maps one GitLab diff record to normalized diff payload.
 *
 * @param diff Raw GitLab diff record.
 * @returns Parsed diff payload.
 */
function mapGitLabDiff(diff: unknown): IParsedGitLabDiff {
    const record = toRecord(diff)
    const filePath = readString(record, ["new_path", "path"])
    const oldPath = normalizeOptionalRecordText(record, ["old_path"])
    const status = resolveGitLabDiffStatus(record, oldPath, filePath)
    const patch = readString(record, ["diff"])
    const stats = calculatePatchStats(patch)

    return {
        filePath,
        oldPath,
        status,
        additions: stats.additions,
        deletions: stats.deletions,
        changes: stats.additions + stats.deletions,
        patch,
        hunks: splitHunks(patch),
    }
}

/**
 * Resolves diff status from GitLab diff flags.
 *
 * @param record Raw diff record.
 * @param oldPath Optional previous path.
 * @param filePath Current path.
 * @returns Normalized diff status.
 */
function resolveGitLabDiffStatus(
    record: Readonly<Record<string, unknown>> | null,
    oldPath: string | undefined,
    filePath: string,
): IMergeRequestDiffFileDTO["status"] {
    if (readBoolean(record, ["new_file"])) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.ADDED
    }

    if (readBoolean(record, ["deleted_file"])) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.DELETED
    }

    if (readBoolean(record, ["renamed_file"])) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED
    }

    if (oldPath !== undefined && oldPath.length > 0 && oldPath !== filePath) {
        return MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED
    }

    return MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED
}

/**
 * Calculates additions and deletions from unified diff text.
 *
 * @param patch Raw unified diff.
 * @returns Diff line counters.
 */
function calculatePatchStats(
    patch: string,
): Readonly<{additions: number; deletions: number}> {
    if (patch.trim().length === 0) {
        return {
            additions: 0,
            deletions: 0,
        }
    }

    let additions = 0
    let deletions = 0

    for (const line of patch.split("\n")) {
        if (line.startsWith("+++")) {
            continue
        }

        if (line.startsWith("---")) {
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
        additions,
        deletions,
    }
}

/**
 * Splits patch string into non-empty hunk lines.
 *
 * @param patch Raw patch string.
 * @returns Hunk segments.
 */
function splitHunks(patch: string | undefined): readonly string[] {
    if (patch === undefined || patch.length === 0) {
        return []
    }

    return patch.split("\n").filter((line): boolean => {
        return line.length > 0
    })
}

/**
 * Aggregates detailed commit payloads into contributor statistics.
 *
 * @param commits Detailed commit payloads.
 * @returns Stable contributor statistics ordered by impact.
 */
function buildContributorStats(
    commits: readonly IGitLabCommitDetails[],
): readonly IContributorStat[] {
    const contributors = new Map<string, IContributorAggregation>()

    for (const commit of commits) {
        const author = {
            name: commit.authorName.length > 0 ? commit.authorName : (
                commit.authorEmail.length > 0 ? commit.authorEmail : "unknown"
            ),
            email: commit.authorEmail,
            date: commit.date,
        }
        const key = createContributorAggregationKey(author)
        const existing = contributors.get(key)
        const contributor = existing ?? createContributorAggregation(author)

        contributor.commitCount += 1
        contributor.startedAt = pickEarlierIsoDate(contributor.startedAt, author.date)
        contributor.endedAt = pickLaterIsoDate(contributor.endedAt, author.date)

        for (const diff of commit.diffs) {
            const existingFile = contributor.files.get(diff.filePath)
            const fileStats = existingFile ?? createContributorFileAggregation()

            contributor.additions += diff.additions
            contributor.deletions += diff.deletions
            contributor.changes += diff.changes
            fileStats.commitCount += 1
            fileStats.additions += diff.additions
            fileStats.deletions += diff.deletions
            fileStats.changes += diff.changes
            fileStats.lastCommitDate = pickLaterIsoDate(
                fileStats.lastCommitDate,
                author.date,
            )
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
 * @returns Stable temporal coupling edges ordered by strength and recency.
 */
function buildTemporalCouplingEdges(
    commits: readonly IGitLabCommitDetails[],
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
 * @returns Sorted unique repository-relative file paths.
 */
function extractTemporalCouplingFilePaths(
    commit: IGitLabCommitDetails,
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
 * @returns Nothing.
 */
function incrementTemporalCouplingFileCounts(
    touchedFiles: readonly string[],
    fileCommitCounts: Map<string, number>,
): void {
    for (const filePath of touchedFiles) {
        const currentCount = fileCommitCounts.get(filePath) ?? 0
        fileCommitCounts.set(filePath, currentCount + 1)
    }
}

/**
 * Aggregates one commit into pairwise temporal coupling counters.
 *
 * @param touchedFiles Sorted unique file paths from one commit.
 * @param commitDate Commit timestamp used for `lastSeenAt`.
 * @param couplings Mutable pairwise coupling aggregations.
 * @returns Nothing.
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

        for (
            let rightIndex = leftIndex + 1;
            rightIndex < touchedFiles.length;
            rightIndex += 1
        ) {
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
            coupling.lastSeenAt = pickLaterIsoDate(
                coupling.lastSeenAt,
                commitDate,
            )
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
 * Checks whether coupling edge should remain in the batch-filtered result.
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
 * @param sourceCommitCount Number of commits touching the source file.
 * @param targetCommitCount Number of commits touching the target file.
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
 * @returns Immutable contributor statistics DTO.
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
 * Orders contributor statistics deterministically for stable consumers.
 *
 * @param left Left contributor stats.
 * @param right Right contributor stats.
 * @returns Sort comparison result.
 */
function compareContributorStats(
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
 * Orders temporal coupling edges deterministically for stable consumers.
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
 * Resolves GitLab commit date from known fields.
 *
 * @param record Source commit-like record.
 * @returns Commit date string.
 */
function resolveGitLabCommitDate(record: Readonly<Record<string, unknown>> | null): string {
    return readString(record, [
        "committed_date",
        "created_at",
        "authored_date",
        "date",
    ])
}

/**
 * Resolves GitLab head commit identifier from merge-request payload.
 *
 * @param payload Raw merge-request payload.
 * @returns Head commit identifier.
 */
function resolveGitLabHeadCommitId(payload: unknown): string {
    const record = toRecord(payload)
    const directHead = readString(record, ["sha"])

    if (directHead.length > 0) {
        return directHead
    }

    const diffRefs = readDiffRefs(record)
    if (diffRefs !== undefined) {
        return diffRefs.headSha
    }

    throw new Error("GitLab merge request head commit is unavailable")
}

/**
 * Reads diff refs from merge-request or diff-version payload.
 *
 * @param record Merge-request or version record.
 * @returns Diff refs or undefined.
 */
function readDiffRefs(
    record: Readonly<Record<string, unknown>> | null | undefined,
): IGitLabDiffRefs | undefined {
    const source = toRecord(record?.["diff_refs"]) ?? record ?? null
    const baseSha = readString(source, ["base_sha"])
    const startSha = readString(source, ["start_sha"])
    const headSha = readString(source, ["head_sha"])

    if (baseSha.length === 0 || startSha.length === 0 || headSha.length === 0) {
        return undefined
    }

    return {
        baseSha,
        startSha,
        headSha,
    }
}

/**
 * Compares diff-version entries with newest first ordering.
 *
 * @param left Left version record.
 * @param right Right version record.
 * @returns Sort comparison result.
 */
function compareDiffVersion(
    left: Readonly<Record<string, unknown>>,
    right: Readonly<Record<string, unknown>>,
): number {
    const leftId = readNumber(left, ["id"])
    const rightId = readNumber(right, ["id"])

    return rightId - leftId
}

/**
 * Builds GitLab discussion position payload from inline comment and diff refs.
 *
 * @param comment Inline comment DTO.
 * @param diffRefs Diff refs.
 * @returns GitLab discussion position payload.
 */
function createGitLabDiscussionPosition(
    comment: IInlineCommentDTO,
    diffRefs: IGitLabDiffRefs,
): Readonly<Record<string, unknown>> {
    const filePath = normalizeRequiredText(comment.filePath, "filePath")
    const line = normalizeInlineLine(comment.line)
    const basePosition = {
        position_type: "text",
        base_sha: diffRefs.baseSha,
        start_sha: diffRefs.startSha,
        head_sha: diffRefs.headSha,
    }

    if (comment.side === INLINE_COMMENT_SIDE.LEFT) {
        return {
            ...basePosition,
            old_path: filePath,
            old_line: line,
        }
    }

    return {
        ...basePosition,
        new_path: filePath,
        new_line: line,
    }
}

/**
 * Normalizes inline-comment line value.
 *
 * @param line Raw line number.
 * @returns Positive integer line number.
 */
function normalizeInlineLine(line: number): number {
    if (Number.isInteger(line) === false || line <= 0) {
        throw new Error("line must be positive integer")
    }

    return line
}

/**
 * Maps GitLab note payload to generic comment DTO.
 *
 * @param payload Raw GitLab note payload.
 * @returns Generic comment DTO.
 */
function mapGitLabComment(payload: unknown): ICommentDTO {
    const record = toRecord(payload)
    const author = toRecord(record?.["author"])

    return {
        id: readString(record, ["id"]),
        body: readString(record, ["body"]),
        author: readString(author, ["username", "name"], "unknown"),
        createdAt: readString(record, ["created_at"]),
    }
}

/**
 * Maps GitLab discussion payload to generic inline comment DTO.
 *
 * @param payload Raw GitLab discussion payload.
 * @param fallback Original inline comment payload.
 * @returns Inline comment DTO.
 */
function mapGitLabInlineComment(
    payload: unknown,
    fallback: IInlineCommentDTO,
): IInlineCommentDTO {
    const record = toRecord(payload)
    const firstNote = readArray(record?.["notes"]).at(0)
    const noteRecord = toRecord(firstNote)
    const position = toRecord(noteRecord?.["position"])
    const oldPath = normalizeOptionalRecordText(position, ["old_path"])
    const newPath = normalizeOptionalRecordText(position, ["new_path"])
    const oldLine = readNumber(position, ["old_line"])
    const newLine = readNumber(position, ["new_line"])
    const side = oldPath !== undefined ? INLINE_COMMENT_SIDE.LEFT : INLINE_COMMENT_SIDE.RIGHT

    return {
        id: readString(noteRecord, ["id"], fallback.id),
        body: readString(noteRecord, ["body"], fallback.body),
        author: readString(toRecord(noteRecord?.["author"]), ["username", "name"], fallback.author),
        createdAt: readString(noteRecord, ["created_at"], fallback.createdAt),
        filePath: oldPath ?? newPath ?? fallback.filePath,
        line: oldLine > 0 ? oldLine : (newLine > 0 ? newLine : fallback.line),
        side,
    }
}

/**
 * Converts inline comment payload to generic comment DTO.
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
 * Maps GitLab commit-status payload to generic pipeline-status DTO.
 *
 * @param payload Raw GitLab status payload.
 * @returns Generic pipeline-status DTO.
 */
function mapGitLabPipelineStatus(payload: unknown): IPipelineStatusDTO {
    const record = toRecord(payload)
    const status = readString(record, ["status", "state"])

    return {
        id: readString(record, ["id"]),
        name: readString(record, ["name"], "CodeNautic Review"),
        status: mapGitLabStatusToPipelineStatus(status),
        conclusion: mapGitLabStatusToPipelineConclusion(status),
        summary: normalizeOptionalRecordText(record, ["description"]),
        detailsUrl: normalizeOptionalRecordText(record, ["target_url", "targetUrl"]),
    }
}

/**
 * Maps generic pipeline state/conclusion to GitLab commit-status state.
 *
 * @param status Generic pipeline lifecycle state.
 * @param conclusion Generic pipeline conclusion.
 * @returns GitLab commit-status state.
 */
function mapPipelineStateToGitLabStatus(
    status: CheckRunStatus,
    conclusion: CheckRunConclusion,
): GitLabCommitStatus {
    if (status === CHECK_RUN_STATUS.QUEUED) {
        return GITLAB_COMMIT_STATUS.PENDING
    }

    if (status === CHECK_RUN_STATUS.IN_PROGRESS) {
        return GITLAB_COMMIT_STATUS.RUNNING
    }

    if (conclusion === CHECK_RUN_CONCLUSION.SUCCESS) {
        return GITLAB_COMMIT_STATUS.SUCCESS
    }

    if (conclusion === CHECK_RUN_CONCLUSION.FAILURE) {
        return GITLAB_COMMIT_STATUS.FAILED
    }

    if (conclusion === CHECK_RUN_CONCLUSION.CANCELLED) {
        return GITLAB_COMMIT_STATUS.CANCELED
    }

    return GITLAB_COMMIT_STATUS.SUCCESS
}

/**
 * Maps GitLab status literal to generic pipeline lifecycle state.
 *
 * @param status Raw GitLab status.
 * @returns Generic pipeline lifecycle state.
 */
function mapGitLabStatusToPipelineStatus(status: string): CheckRunStatus {
    const normalized = status.trim().toLowerCase()

    if (normalized === GITLAB_COMMIT_STATUS.PENDING) {
        return CHECK_RUN_STATUS.QUEUED
    }

    if (normalized === GITLAB_COMMIT_STATUS.RUNNING) {
        return CHECK_RUN_STATUS.IN_PROGRESS
    }

    return CHECK_RUN_STATUS.COMPLETED
}

/**
 * Maps GitLab status literal to generic pipeline conclusion.
 *
 * @param status Raw GitLab status.
 * @returns Generic pipeline conclusion.
 */
function mapGitLabStatusToPipelineConclusion(status: string): CheckRunConclusion {
    const normalized = status.trim().toLowerCase()

    if (normalized === GITLAB_COMMIT_STATUS.SUCCESS) {
        return CHECK_RUN_CONCLUSION.SUCCESS
    }

    if (normalized === GITLAB_COMMIT_STATUS.FAILED) {
        return CHECK_RUN_CONCLUSION.FAILURE
    }

    if (normalized === GITLAB_COMMIT_STATUS.CANCELED) {
        return CHECK_RUN_CONCLUSION.CANCELLED
    }

    return CHECK_RUN_CONCLUSION.NEUTRAL
}

/**
 * Maps GitLab compare payloads to generic ref-diff DTO.
 *
 * @param forward Forward compare payload.
 * @param backward Reverse compare payload.
 * @param baseRef Base ref.
 * @param headRef Head ref.
 * @returns Generic ref-diff DTO.
 */
function mapGitLabRefDiff(
    forward: unknown,
    backward: unknown,
    baseRef: string,
    headRef: string,
): IRefDiffResult {
    const forwardRecord = toRecord(forward)
    const backwardRecord = toRecord(backward)
    const forwardCommits = readArray(forwardRecord?.["commits"])
    const backwardCommits = readArray(backwardRecord?.["commits"])
    const files = readArray(forwardRecord?.["diffs"]).map((diff): IRefDiffFile => {
        return mapGitLabRefDiffFile(diff)
    })

    return {
        baseRef,
        headRef,
        comparisonStatus: resolveGitLabComparisonStatus(
            forwardCommits.length,
            backwardCommits.length,
        ),
        aheadBy: forwardCommits.length,
        behindBy: backwardCommits.length,
        totalCommits: forwardCommits.length,
        summary: summarizeRefDiffFiles(files),
        files,
    }
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
 * Resolves generic comparison status from forward/backward commit counts.
 *
 * @param aheadBy Forward commit count.
 * @param behindBy Reverse commit count.
 * @returns Generic comparison status.
 */
function resolveGitLabComparisonStatus(
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
 * Maps one GitLab compare diff payload to generic diff-file DTO.
 *
 * @param diff Raw GitLab diff payload.
 * @returns Generic ref-diff file DTO.
 */
function mapGitLabRefDiffFile(diff: unknown): IRefDiffFile {
    const parsedDiff = mapGitLabDiff(diff)

    return {
        path: parsedDiff.filePath,
        oldPath: parsedDiff.oldPath,
        status: parsedDiff.status,
        additions: parsedDiff.additions,
        deletions: parsedDiff.deletions,
        changes: parsedDiff.changes,
        patch: parsedDiff.patch,
        hunks: parsedDiff.hunks,
    }
}

/**
 * Builds aggregated diff statistics from file-level entries.
 *
 * @param files File-level diff entries.
 * @returns Aggregated summary payload.
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
 * Maps GitLab blame ranges to generic blame DTOs.
 *
 * @param ranges Raw blame range payload.
 * @returns Generic blame DTOs.
 */
function mapGitLabBlameRanges(ranges: readonly unknown[]): readonly IBlameData[] {
    const blame: IBlameData[] = []
    let currentLine = 1

    for (const range of ranges) {
        const record = toRecord(range)
        const commit = toRecord(record?.["commit"])
        const lines = readArray(record?.["lines"])
        const lineCount = Math.max(lines.length, 1)

        blame.push({
            lineStart: currentLine,
            lineEnd: currentLine + lineCount - 1,
            commitSha: readString(commit, ["id", "sha"]),
            authorName: readString(commit, ["author_name", "committer_name"]),
            authorEmail: readString(commit, ["author_email", "committer_email"]),
            date: resolveGitLabCommitDate(commit),
        })

        currentLine += lineCount
    }

    return blame
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
 * Compares two tokens using timing-safe comparison.
 *
 * @param expected Expected token.
 * @param actual Actual token.
 * @returns True when values match.
 */
function safeCompareTokens(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected)
    const actualBuffer = Buffer.from(actual)

    if (expectedBuffer.length !== actualBuffer.length) {
        return false
    }

    return timingSafeEqual(expectedBuffer, actualBuffer)
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
 * @param normalized Normalized git error.
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
 * Resolves per-page value for commit history requests.
 *
 * @param maxCount Optional max count.
 * @returns Positive per-page limit.
 */
function resolveCommitHistoryPerPage(maxCount: number | undefined): number {
    if (maxCount === undefined) {
        return GITLAB_PAGE_SIZE
    }

    if (Number.isInteger(maxCount) === false || maxCount <= 0) {
        throw new Error("maxCount must be positive integer")
    }

    return Math.min(maxCount, GITLAB_PAGE_SIZE)
}

/**
 * Rounds floating-point values to a stable decimal precision.
 *
 * @param value Raw numeric value.
 * @param digits Decimal digits to keep.
 * @returns Rounded value.
 */
function roundToPrecision(value: number, digits: number): number {
    const multiplier = 10 ** digits

    return Math.round(value * multiplier) / multiplier
}

/**
 * Narrows GitLab status to the subset accepted by GitBeaker typings.
 *
 * @param status Raw GitLab status.
 * @returns Status literal accepted by the SDK.
 */
function mapSafeGitLabCommitStatus(
    status: GitLabCommitStatus,
): Exclude<GitLabCommitStatus, "skipped"> {
    if (status === GITLAB_COMMIT_STATUS.SKIPPED) {
        return GITLAB_COMMIT_STATUS.SUCCESS
    }

    return status
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
