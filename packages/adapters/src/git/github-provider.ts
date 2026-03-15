import {createHmac, timingSafeEqual} from "node:crypto"

import {Octokit, type RestEndpointMethodTypes} from "@octokit/rest"
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
    type IFileBlame,
    type IFileTreeNode,
    type IGitPipelineStatusProvider,
    type IGitProvider,
    type IInlineCommentDTO,
    type ICreatePipelineStatusInput,
    type ITemporalCouplingEdge,
    type ITemporalCouplingOptions,
    type ITagInfo,
    type IRefDiffFile,
    type IRefDiffResult,
    type IRefDiffSummary,
    type IUpdatePipelineStatusInput,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
    type IWebhookEventDTO,
} from "@codenautic/core"

import {
    mapExternalDiffFiles,
    mapExternalMergeRequest,
    reviewCommentToCommentDTO,
    toBatchReviewComments,
    normalizeGitAclError,
    shouldRetryGitAclError,
    type IExternalGitMergeRequest,
    type IExternalGitReviewComment,
    type IGitHubBatchReviewComment,
    type INormalizedGitAclError,
} from "./acl"
import {
    filterFileTreeByGitIgnore,
    isGitIgnoreFilePath,
    type IGitIgnoreFile,
} from "./gitignore-tree-filter"
import {GitHubProviderError} from "./github-provider.error"

type PullGetResponse =
    RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]
type PullListFilesResponseItem =
    RestEndpointMethodTypes["pulls"]["listFiles"]["response"]["data"][number]
type PullListCommitsResponseItem =
    RestEndpointMethodTypes["pulls"]["listCommits"]["response"]["data"][number]
type IssuesCreateCommentResponse =
    RestEndpointMethodTypes["issues"]["createComment"]["response"]["data"]
type PullCreateReviewCommentResponse =
    RestEndpointMethodTypes["pulls"]["createReviewComment"]["response"]["data"]
type PullCreateReviewResponse =
    RestEndpointMethodTypes["pulls"]["createReview"]["response"]["data"]
type PullDeleteReviewCommentResponse =
    RestEndpointMethodTypes["pulls"]["deleteReviewComment"]["response"]["data"]
type PullListCommentsForReviewResponseItem =
    RestEndpointMethodTypes["pulls"]["listCommentsForReview"]["response"]["data"][number]
type ChecksCreateResponse =
    RestEndpointMethodTypes["checks"]["create"]["response"]["data"]
type ChecksUpdateResponse =
    RestEndpointMethodTypes["checks"]["update"]["response"]["data"]
type ReposGetResponse =
    RestEndpointMethodTypes["repos"]["get"]["response"]["data"]
type ReposListBranchesResponseItem =
    RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"][number]
type ReposListTagsResponseItem =
    RestEndpointMethodTypes["repos"]["listTags"]["response"]["data"][number]
type ReposGetContentResponse =
    RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"]
type ReposListCommitsResponseItem =
    RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][number]
type ReposGetCommitResponse =
    RestEndpointMethodTypes["repos"]["getCommit"]["response"]["data"]
type ReposCompareCommitsWithBaseheadResponse =
    RestEndpointMethodTypes["repos"]["compareCommitsWithBasehead"]["response"]["data"]
type ReposCompareCommitsWithBaseheadFile =
    NonNullable<ReposCompareCommitsWithBaseheadResponse["files"]>[number]
type GitGetRefResponse =
    RestEndpointMethodTypes["git"]["getRef"]["response"]["data"]
type GitGetTagResponse =
    RestEndpointMethodTypes["git"]["getTag"]["response"]["data"]
type GitGetTreeResponseItem =
    RestEndpointMethodTypes["git"]["getTree"]["response"]["data"]["tree"][number]

interface IGitHubGraphQlBlameRange {
    readonly startingLine: number
    readonly endingLine: number
    readonly commit?: {
        readonly oid?: string
        readonly author?: {
            readonly name?: string | null
            readonly email?: string | null
            readonly date?: string | null
        } | null
    } | null
}

interface IGitHubGraphQlBlameResponse {
    readonly repository?: {
        readonly object?: {
            readonly blame?: {
                readonly ranges?: readonly IGitHubGraphQlBlameRange[]
            } | null
        } | null
    } | null
}

interface IGitHubCheckRunPayload {
    readonly id: number
    readonly name: string
    readonly status: string
    readonly conclusion: string | null
    readonly output?: {
        readonly summary?: string | null
    } | null
    readonly details_url?: string | null
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

/**
 * Minimal subset of Octokit methods used by GitHub provider.
 */
export interface IGitHubOctokitClient {
    /**
     * Pull-request methods.
     */
    readonly pulls: {
        readonly get: (
            params: RestEndpointMethodTypes["pulls"]["get"]["parameters"],
        ) => Promise<{readonly data: PullGetResponse}>
        readonly listFiles: (
            params: RestEndpointMethodTypes["pulls"]["listFiles"]["parameters"],
        ) => Promise<{readonly data: readonly PullListFilesResponseItem[]}>
        readonly listCommits: (
            params: RestEndpointMethodTypes["pulls"]["listCommits"]["parameters"],
        ) => Promise<{readonly data: readonly PullListCommitsResponseItem[]}>
        readonly createReviewComment: (
            params: RestEndpointMethodTypes["pulls"]["createReviewComment"]["parameters"],
        ) => Promise<{readonly data: PullCreateReviewCommentResponse}>
        readonly createReview: (
            params: RestEndpointMethodTypes["pulls"]["createReview"]["parameters"],
        ) => Promise<{readonly data: PullCreateReviewResponse}>
        readonly deleteReviewComment: (
            params: RestEndpointMethodTypes["pulls"]["deleteReviewComment"]["parameters"],
        ) => Promise<{readonly data: PullDeleteReviewCommentResponse}>
        readonly listCommentsForReview: (
            params: RestEndpointMethodTypes["pulls"]["listCommentsForReview"]["parameters"],
        ) => Promise<{readonly data: readonly PullListCommentsForReviewResponseItem[]}>
    }

    /**
     * Issues methods.
     */
    readonly issues: {
        readonly createComment: (
            params: RestEndpointMethodTypes["issues"]["createComment"]["parameters"],
        ) => Promise<{readonly data: IssuesCreateCommentResponse}>
    }

    /**
     * Checks methods.
     */
    readonly checks: {
        readonly create: (
            params: RestEndpointMethodTypes["checks"]["create"]["parameters"],
        ) => Promise<{readonly data: ChecksCreateResponse}>
        readonly update: (
            params: RestEndpointMethodTypes["checks"]["update"]["parameters"],
        ) => Promise<{readonly data: ChecksUpdateResponse}>
    }

    /**
     * Repository methods.
     */
    readonly repos: {
        readonly get: (
            params: RestEndpointMethodTypes["repos"]["get"]["parameters"],
        ) => Promise<{readonly data: ReposGetResponse}>
        readonly listBranches: (
            params: RestEndpointMethodTypes["repos"]["listBranches"]["parameters"],
        ) => Promise<{readonly data: readonly ReposListBranchesResponseItem[]}>
        readonly listTags: (
            params: RestEndpointMethodTypes["repos"]["listTags"]["parameters"],
        ) => Promise<{readonly data: readonly ReposListTagsResponseItem[]}>
        readonly getContent: (
            params: RestEndpointMethodTypes["repos"]["getContent"]["parameters"],
        ) => Promise<{readonly data: ReposGetContentResponse}>
        readonly listCommits: (
            params: RestEndpointMethodTypes["repos"]["listCommits"]["parameters"],
        ) => Promise<{readonly data: readonly ReposListCommitsResponseItem[]}>
        readonly getCommit: (
            params: RestEndpointMethodTypes["repos"]["getCommit"]["parameters"],
        ) => Promise<{readonly data: ReposGetCommitResponse}>
        readonly compareCommitsWithBasehead: (
            params: RestEndpointMethodTypes["repos"]["compareCommitsWithBasehead"]["parameters"],
        ) => Promise<{readonly data: ReposCompareCommitsWithBaseheadResponse}>
    }

    /**
     * Git data methods.
     */
    readonly git: {
        readonly getRef: (
            params: RestEndpointMethodTypes["git"]["getRef"]["parameters"],
        ) => Promise<{readonly data: GitGetRefResponse}>
        readonly getTag: (
            params: RestEndpointMethodTypes["git"]["getTag"]["parameters"],
        ) => Promise<{readonly data: GitGetTagResponse}>
        readonly getTree: (
            params: RestEndpointMethodTypes["git"]["getTree"]["parameters"],
        ) => Promise<{
            readonly data: {
                readonly tree: readonly GitGetTreeResponseItem[]
            }
        }>
    }

    /**
     * Raw request helper used for GraphQL blame queries.
     */
    readonly request: (
        route: string,
        params: Readonly<Record<string, unknown>>,
    ) => Promise<{readonly data: IGitHubGraphQlBlameResponse}>
}

/**
 * GitHub provider constructor options.
 */
export interface IGitHubProviderOptions {
    /**
     * Repository owner or organization.
     */
    readonly owner: string

    /**
     * Repository name.
     */
    readonly repo: string

    /**
     * Personal access token or GitHub App token.
     */
    readonly token?: string

    /**
     * Optional GitHub Enterprise base URL.
     */
    readonly baseUrl?: string

    /**
     * Optional injected Octokit-compatible client for tests.
     */
    readonly client?: IGitHubOctokitClient

    /**
     * Maximum retry attempts for retryable API failures.
     */
    readonly retryMaxAttempts?: number

    /**
     * Sleep implementation used between retries.
     */
    readonly sleep?: (delayMs: number) => Promise<void>
}

/**
 * Batch review payload used for native GitHub review creation.
 */
export interface IGitHubBatchReviewRequest {
    /**
     * Review body shown in timeline.
     */
    readonly body: string

    /**
     * Inline comments attached to this review.
     */
    readonly comments: readonly IInlineCommentDTO[]
}

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250
const MAX_GITHUB_TEXT_FILE_BYTES = 1024 * 1024
const DETAILS_BATCH_SIZE = 20

interface IResolvedGitHubTagTarget {
    readonly commitSha: string
    readonly date: string
    readonly isAnnotated: boolean
    readonly annotationMessage?: string
}

/**
 * GraphQL query used for blame lookup.
 */
const GITHUB_BLAME_QUERY = `
query GitHubProviderBlame($owner: String!, $repo: String!, $expression: String!) {
  repository(owner: $owner, name: $repo) {
    object(expression: $expression) {
      ... on Blob {
        blame {
          ranges {
            startingLine
            endingLine
            commit {
              oid
              author {
                name
                email
                date
              }
            }
          }
        }
      }
    }
  }
}
`

/**
 * GitHub implementation of the generic git provider contract.
 */
export class GitHubProvider implements IGitProvider, IGitPipelineStatusProvider {
    private readonly client: IGitHubOctokitClient
    private readonly owner: string
    private readonly repo: string
    private readonly retryMaxAttempts: number
    private readonly sleep: (delayMs: number) => Promise<void>

    /**
     * Creates GitHub provider.
     *
     * @param options Provider configuration.
     */
    public constructor(options: IGitHubProviderOptions) {
        this.owner = normalizeRequiredText(options.owner, "owner")
        this.repo = normalizeRequiredText(options.repo, "repo")
        this.client = options.client ?? createOctokitClient(options)
        this.retryMaxAttempts = normalizeRetryMaxAttempts(options.retryMaxAttempts)
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Fetches pull request and normalizes it to merge-request DTO.
     *
     * @param id Pull request number.
     * @returns Merge-request payload.
     */
    public async getMergeRequest(id: string): Promise<IMergeRequestDTO> {
        const pullNumber = normalizePullNumber(id)

        const [pullRequest, commits, files] = await Promise.all([
            this.executeRequest(() => {
                return this.client.pulls.get({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: pullNumber,
                })
            }),
            this.listPullCommits(pullNumber),
            this.listPullFiles(pullNumber),
        ])

        return mapExternalMergeRequest(
            createExternalMergeRequest(pullRequest.data, commits, files),
        )
    }

    /**
     * Fetches changed files for pull request.
     *
     * @param mergeRequestId Pull request number.
     * @returns Diff files.
     */
    public async getChangedFiles(
        mergeRequestId: string,
    ): Promise<readonly IMergeRequestDiffFileDTO[]> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const files = await this.listPullFiles(pullNumber)

        return mapExternalDiffFiles(
            files.map((file) => {
                return {
                    new_path: file.filename,
                    old_path: file.previous_filename,
                    change_type: mapGitHubFileStatus(file.status),
                    diff: file.patch ?? "",
                    hunks: splitHunks(file.patch),
                }
            }),
        )
    }

    /**
     * Loads repository file tree for a reference.
     *
     * @param ref Branch name or commit SHA.
     * @returns Tree nodes.
     */
    public async getFileTree(ref: string): Promise<readonly IFileTreeNode[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const commit = await this.executeRequest(() => {
            return this.client.repos.getCommit({
                owner: this.owner,
                repo: this.repo,
                ref: normalizedRef,
            })
        })

        const treeSha = normalizeRequiredText(
            commit.data.commit.tree.sha,
            "treeSha",
        )
        const tree = await this.executeRequest(() => {
            return this.client.git.getTree({
                owner: this.owner,
                repo: this.repo,
                tree_sha: treeSha,
                recursive: "true",
            })
        })

        const treeNodes = mapGitTreeNodes(tree.data.tree)
        const gitIgnoreFiles = await this.loadGitIgnoreFiles(
            normalizedRef,
            treeNodes,
        )

        return filterFileTreeByGitIgnore(treeNodes, gitIgnoreFiles)
    }

    /**
     * Loads file content for a repository reference.
     *
     * @param filePath File path.
     * @param ref Branch or commit reference.
     * @returns UTF-8 file content.
     */
    public async getFileContentByRef(filePath: string, ref: string): Promise<string> {
        const normalizedPath = normalizeRequiredText(filePath, "filePath")
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const response = await this.executeRequest(() => {
            return this.client.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: normalizedPath,
                ref: normalizedRef,
            })
        })

        return extractFileContent(response.data)
    }

    /**
     * Lists repository branches.
     *
     * @returns Branch metadata.
     */
    public async getBranches(): Promise<readonly IBranchInfo[]> {
        const [repository, branches] = await Promise.all([
            this.executeRequest(() => {
                return this.client.repos.get({
                    owner: this.owner,
                    repo: this.repo,
                })
            }),
            this.listRepositoryBranches(),
        ])

        const defaultBranch = repository.data.default_branch ?? ""

        return Promise.all(
            branches.map(async (branch): Promise<IBranchInfo> => {
                const branchSha = normalizeRequiredText(branch.commit.sha, "branchSha")
                const details = await this.executeRequest(() => {
                    return this.client.repos.getCommit({
                        owner: this.owner,
                        repo: this.repo,
                        ref: branchSha,
                    })
                })

                return {
                    name: branch.name,
                    sha: branchSha,
                    isDefault: branch.name === defaultBranch,
                    isProtected: branch.protected,
                    lastCommitDate: resolveCommitDate(details.data),
                }
            }),
        )
    }

    /**
     * Lists commit history for a reference.
     *
     * @param ref Branch or commit reference.
     * @param options Optional history filters.
     * @returns Commit metadata.
     */
    public async getCommitHistory(
        ref: string,
        options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const normalizedOptions = normalizeCommitHistoryOptions(options)
        const commits = await this.listCommitHistory(
            normalizedRef,
            normalizedOptions,
        )

        return Promise.all(
            commits.map(async (commit): Promise<ICommitInfo> => {
                const details = await this.executeRequest(() => {
                    return this.client.repos.getCommit({
                        owner: this.owner,
                        repo: this.repo,
                        ref: commit.sha,
                    })
                })

                return {
                    sha: commit.sha,
                    message: details.data.commit.message,
                    authorName: details.data.commit.author?.name ?? "",
                    authorEmail: details.data.commit.author?.email ?? "",
                    date: details.data.commit.author?.date ?? "",
                    filesChanged: details.data.files?.map((file): string => {
                        return file.filename
                    }) ?? [],
                }
            }),
        )
    }

    /**
     * Loads aggregated contributor statistics for a repository reference.
     *
     * @param ref Branch, tag, or commit reference.
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
     * Loads temporal coupling edges from co-changed commit files.
     *
     * @param ref Branch, tag, or commit reference.
     * @param options Optional commit-window and batch file filters.
     * @returns Stable temporal coupling edge list.
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
     * Loads repository tags with annotation and associated commit metadata.
     *
     * @returns Tags sorted by effective tag date descending.
     */
    public async getTags(): Promise<readonly ITagInfo[]> {
        const tags = await this.listRepositoryTags()
        const resolvedTags = await this.loadTagDetails(tags)

        return [...resolvedTags].sort(compareTagInfo)
    }

    /**
     * Loads diff between two repository refs.
     *
     * @param baseRef Base comparison ref.
     * @param headRef Head comparison ref.
     * @returns Aggregated diff payload with file-level changes.
     */
    public async getDiffBetweenRefs(
        baseRef: string,
        headRef: string,
    ): Promise<IRefDiffResult> {
        const normalizedBaseRef = normalizeRequiredText(baseRef, "baseRef")
        const normalizedHeadRef = normalizeRequiredText(headRef, "headRef")
        const response = await this.executeRequest(() => {
            return this.client.repos.compareCommitsWithBasehead({
                owner: this.owner,
                repo: this.repo,
                basehead: `${normalizedBaseRef}...${normalizedHeadRef}`,
            })
        })

        return mapGitHubRefDiff(
            response.data,
            normalizedBaseRef,
            normalizedHeadRef,
        )
    }

    /**
     * Loads blame ranges through GitHub GraphQL.
     *
     * @param filePath File path.
     * @param ref Branch or commit reference.
     * @returns Line blame metadata.
     */
    public async getBlameData(
        filePath: string,
        ref: string,
    ): Promise<readonly IBlameData[]> {
        const normalizedPath = normalizeRequiredText(filePath, "filePath")
        const normalizedRef = normalizeRequiredText(ref, "ref")

        return this.loadBlameData(normalizedPath, normalizedRef)
    }

    /**
     * Loads blame ranges for multiple files through GitHub GraphQL.
     *
     * @param filePaths Repository-relative file paths.
     * @param ref Branch or commit reference.
     * @returns File-scoped blame metadata in input order.
     */
    public async getBlameDataBatch(
        filePaths: readonly string[],
        ref: string,
    ): Promise<readonly IFileBlame[]> {
        const normalizedRef = normalizeRequiredText(ref, "ref")
        const blameByFile = await Promise.all(
            filePaths.map(async (filePath): Promise<IFileBlame> => {
                const normalizedPath = normalizeRequiredText(filePath, "filePath")

                return {
                    filePath: normalizedPath,
                    blame: await this.loadBlameData(normalizedPath, normalizedRef),
                }
            }),
        )

        return blameByFile
    }

    /**
     * Loads blame ranges for normalized file path and reference.
     *
     * @param filePath Normalized repository-relative file path.
     * @param ref Normalized branch or commit reference.
     * @returns Line blame metadata.
     */
    private async loadBlameData(
        filePath: string,
        ref: string,
    ): Promise<readonly IBlameData[]> {
        const response = await this.executeRequest(() => {
            return this.client.request("POST /graphql", {
                query: GITHUB_BLAME_QUERY,
                owner: this.owner,
                repo: this.repo,
                expression: `${ref}:${filePath}`,
            })
        })

        const ranges = response.data.repository?.object?.blame?.ranges ?? []

        return ranges.map(mapGraphQlBlameRange)
    }

    /**
     * Posts regular pull-request comment.
     *
     * @param mergeRequestId Pull request number.
     * @param body Comment body.
     * @returns Comment payload.
     */
    public async postComment(
        mergeRequestId: string,
        body: string,
    ): Promise<ICommentDTO> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const normalizedBody = normalizeRequiredText(body, "body")
        const response = await this.executeRequest(() => {
            return this.client.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                issue_number: pullNumber,
                body: normalizedBody,
            })
        })

        return mapComment(response.data)
    }

    /**
     * Deletes existing pull-request review comment.
     *
     * @param mergeRequestId Pull request number.
     * @param commentId Review comment identifier.
     * @returns Completion promise.
     */
    public async deleteComment(
        mergeRequestId: string,
        commentId: string,
    ): Promise<void> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const normalizedCommentId = normalizeCommentId(commentId)

        await this.executeRequest(() => {
            return this.client.pulls.deleteReviewComment({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
                comment_id: normalizedCommentId,
            })
        })
    }

    /**
     * Creates batch review with inline comments and returns created review comments.
     *
     * @param mergeRequestId Pull request number.
     * @param review Batch review payload.
     * @returns Created review comments mapped to generic comment DTOs.
     */
    public async createReview(
        mergeRequestId: string,
        review: IGitHubBatchReviewRequest,
    ): Promise<readonly ICommentDTO[]> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const normalizedBody = normalizeRequiredText(review.body, "body")
        const draftComments = toBatchReviewComments(review.comments)
        const response = await this.executeRequest(() => {
            return this.client.pulls.createReview({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
                event: "COMMENT",
                body: normalizedBody,
                comments: resolveCreateReviewComments(draftComments),
            })
        })
        const reviewId = normalizeReviewId(response.data.id)
        const reviewComments = await this.listCommentsForReview(pullNumber, reviewId)

        return reviewComments.map((comment): ICommentDTO => {
            return reviewCommentToCommentDTO(comment)
        })
    }

    /**
     * Posts inline review comment to pull request.
     *
     * @param mergeRequestId Pull request number.
     * @param comment Inline comment payload.
     * @returns Inline comment payload.
     */
    public async postInlineComment(
        mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const pullRequest = await this.executeRequest(() => {
            return this.client.pulls.get({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
            })
        })

        const response = await this.executeRequest(() => {
            return this.client.pulls.createReviewComment({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
                body: normalizeRequiredText(comment.body, "body"),
                commit_id: normalizeRequiredText(
                    pullRequest.data.head.sha,
                    "headSha",
                ),
                path: normalizeRequiredText(comment.filePath, "filePath"),
                line: normalizeLine(comment.line),
                side: normalizeInlineSide(comment.side),
            })
        })

        return mapInlineComment(response.data)
    }

    /**
     * Creates GitHub check run for pull request head commit.
     *
     * @param mergeRequestId Pull request number.
     * @param name Check name.
     * @returns Check-run payload.
     */
    public async createCheckRun(
        mergeRequestId: string,
        name: string,
    ): Promise<ICheckRunDTO> {
        const pullNumber = normalizePullNumber(mergeRequestId)
        const normalizedName = normalizeRequiredText(name, "name")
        const pullRequest = await this.executeRequest(() => {
            return this.client.pulls.get({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
            })
        })

        const response = await this.executeRequest(() => {
            return this.client.checks.create({
                owner: this.owner,
                repo: this.repo,
                name: normalizedName,
                head_sha: normalizeRequiredText(
                    pullRequest.data.head.sha,
                    "headSha",
                ),
                status: CHECK_RUN_STATUS.QUEUED,
                output: {
                    title: normalizedName,
                    summary: "",
                },
            })
        })

        return mapCheckRun(response.data)
    }

    /**
     * Creates generic pipeline status by delegating to GitHub checks API.
     *
     * @param input Pipeline status creation payload.
     * @returns Created pipeline status DTO.
     */
    public createPipelineStatus(
        input: ICreatePipelineStatusInput,
    ): Promise<ICheckRunDTO> {
        return this.createCheckRun(input.mergeRequestId, input.name)
    }

    /**
     * Updates existing GitHub check run.
     *
     * @param checkId Check-run identifier.
     * @param status Target status.
     * @param conclusion Target conclusion.
     * @returns Updated check-run payload.
     */
    public async updateCheckRun(
        checkId: string,
        status: CheckRunStatus,
        conclusion: CheckRunConclusion,
    ): Promise<ICheckRunDTO> {
        const normalizedCheckId = normalizeRequiredText(checkId, "checkId")
        const response = await this.executeRequest(() => {
            return this.client.checks.update({
                owner: this.owner,
                repo: this.repo,
                check_run_id: Number(normalizedCheckId),
                status,
                conclusion: status === CHECK_RUN_STATUS.COMPLETED ? conclusion : undefined,
                completed_at: status === CHECK_RUN_STATUS.COMPLETED ? new Date().toISOString() : undefined,
                output: {
                    title: normalizedCheckId,
                    summary: "",
                },
            })
        })

        return mapCheckRun(response.data)
    }

    /**
     * Updates generic pipeline status by delegating to GitHub checks API.
     *
     * @param input Pipeline status update payload.
     * @returns Updated pipeline status DTO.
     */
    public updatePipelineStatus(
        input: IUpdatePipelineStatusInput,
    ): Promise<ICheckRunDTO> {
        const pipelineId = normalizeRequiredText(
            input.pipelineId ?? "",
            "pipelineId",
        )

        return this.updateCheckRun(
            pipelineId,
            input.status,
            input.conclusion,
        )
    }

    /**
     * Formats code block as GitHub suggestion markdown.
     *
     * @param codeBlock Replacement code.
     * @returns GitHub suggestion block.
     */
    public formatSuggestion(codeBlock: string): string {
        const normalizedCodeBlock = normalizeRequiredText(codeBlock, "codeBlock")

        return `\`\`\`suggestion\n${normalizedCodeBlock}\n\`\`\``
    }

    /**
     * Verifies GitHub webhook HMAC signature.
     *
     * @param event Webhook DTO.
     * @param secret Shared webhook secret.
     * @param rawBody Optional raw request body.
     * @returns True when signature matches.
     */
    public verifyWebhookSignature(
        event: IWebhookEventDTO,
        secret: string,
        rawBody?: string,
    ): boolean {
        const normalizedSecret = normalizeRequiredText(secret, "secret")
        const payload = rawBody ?? JSON.stringify(event.payload)
        const expectedSignature = buildGitHubWebhookSignature(payload, normalizedSecret)
        const actualSignature = normalizeRequiredText(event.signature, "signature")

        return safeCompareSignatures(expectedSignature, actualSignature)
    }

    /**
     * Executes GitHub API request with retry semantics for retryable failures.
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
                    throw new GitHubProviderError(normalized)
                }

                await this.sleep(resolveRetryDelayMs(normalized, attempt))
                attempt += 1
            }
        }
    }

    /**
     * Lists pull-request files using GitHub API.
     *
     * @param pullNumber Pull-request number.
     * @returns Raw changed files.
     */
    private async listPullFiles(
        pullNumber: number,
    ): Promise<readonly PullListFilesResponseItem[]> {
        const response = await this.executeRequest(() => {
            return this.client.pulls.listFiles({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
                per_page: 100,
            })
        })

        return response.data
    }

    /**
     * Lists pull-request commits using GitHub API.
     *
     * @param pullNumber Pull-request number.
     * @returns Raw commits.
     */
    private async listPullCommits(
        pullNumber: number,
    ): Promise<readonly PullListCommitsResponseItem[]> {
        const response = await this.executeRequest(() => {
            return this.client.pulls.listCommits({
                owner: this.owner,
                repo: this.repo,
                pull_number: pullNumber,
                per_page: 100,
            })
        })

        return response.data
    }

    /**
     * Lists review comments for one pull-request review across paginated responses.
     *
     * @param pullNumber Pull-request number.
     * @param reviewId Pull-request review identifier.
     * @returns Raw review comments for the review.
     */
    private async listCommentsForReview(
        pullNumber: number,
        reviewId: number,
    ): Promise<readonly IExternalGitReviewComment[]> {
        const comments: IExternalGitReviewComment[] = []
        let page = 1

        while (true) {
            const response = await this.executeRequest(() => {
                return this.client.pulls.listCommentsForReview({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: pullNumber,
                    review_id: reviewId,
                    per_page: 100,
                    page,
                })
            })

            comments.push(...response.data)
            if (response.data.length < 100) {
                break
            }

            page += 1
        }

        return comments
    }

    /**
     * Lists all repository branches across paginated GitHub responses.
     *
     * @returns Raw repository branches.
     */
    private async listRepositoryBranches(): Promise<readonly ReposListBranchesResponseItem[]> {
        const branches: ReposListBranchesResponseItem[] = []
        let page = 1

        while (true) {
            const response = await this.executeRequest(() => {
                return this.client.repos.listBranches({
                    owner: this.owner,
                    repo: this.repo,
                    per_page: 100,
                    page,
                })
            })

            branches.push(...response.data)

            if (response.data.length < 100) {
                break
            }

            page += 1
        }

        return branches
    }

    /**
     * Lists all repository tags across paginated GitHub responses.
     *
     * @returns Raw repository tags.
     */
    private async listRepositoryTags(): Promise<readonly ReposListTagsResponseItem[]> {
        const tags: ReposListTagsResponseItem[] = []
        let page = 1

        while (true) {
            const response = await this.executeRequest(() => {
                return this.client.repos.listTags({
                    owner: this.owner,
                    repo: this.repo,
                    per_page: 100,
                    page,
                })
            })

            tags.push(...response.data)

            if (response.data.length < 100) {
                break
            }

            page += 1
        }

        return tags
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
    ): Promise<readonly ReposListCommitsResponseItem[]> {
        const pageSize = resolveCommitHistoryPerPage(options.maxCount)
        const targetCount = options.maxCount ?? (
            mode === "all" ? Number.MAX_SAFE_INTEGER : pageSize
        )
        const commits: ReposListCommitsResponseItem[] = []
        let page = 1

        while (commits.length < targetCount) {
            const remaining = targetCount - commits.length
            const perPage = options.maxCount === undefined
                ? pageSize
                : Math.min(pageSize, remaining)
            const response = await this.executeRequest(() => {
                return this.client.repos.listCommits({
                    owner: this.owner,
                    repo: this.repo,
                    sha: ref,
                    author: options.author,
                    since: options.since,
                    until: options.until,
                    path: options.path,
                    per_page: perPage,
                    page,
                })
            })

            commits.push(
                ...response.data.slice(
                    0,
                    options.maxCount === undefined ? response.data.length : remaining,
                ),
            )

            if (response.data.length < perPage) {
                break
            }

            page += 1
        }

        return commits
    }

    /**
     * Loads detailed commit payloads in bounded parallel batches.
     *
     * @param commits Raw commit list from GitHub history API.
     * @returns Detailed commit payloads in source order.
     */
    private async loadCommitDetails(
        commits: readonly ReposListCommitsResponseItem[],
    ): Promise<readonly ReposGetCommitResponse[]> {
        const detailedCommits: ReposGetCommitResponse[] = []

        for (let index = 0; index < commits.length; index += DETAILS_BATCH_SIZE) {
            const batch = commits.slice(index, index + DETAILS_BATCH_SIZE)
            const detailedBatch = await Promise.all(
                batch.map(async (commit): Promise<ReposGetCommitResponse> => {
                    const commitSha = normalizeRequiredText(commit.sha, "commitSha")

                    return this.executeRequest(async () => {
                        const response = await this.client.repos.getCommit({
                            owner: this.owner,
                            repo: this.repo,
                            ref: commitSha,
                        })

                        return response.data
                    })
                }),
            )

            detailedCommits.push(...detailedBatch)
        }

        return detailedCommits
    }

    /**
     * Loads tag metadata in bounded parallel batches.
     *
     * @param tags Raw repository tag list.
     * @returns Normalized tag payloads in source order.
     */
    private async loadTagDetails(
        tags: readonly ReposListTagsResponseItem[],
    ): Promise<readonly ITagInfo[]> {
        const resolvedTags: ITagInfo[] = []

        for (let index = 0; index < tags.length; index += DETAILS_BATCH_SIZE) {
            const batch = tags.slice(index, index + DETAILS_BATCH_SIZE)
            const resolvedBatch = await Promise.all(
                batch.map(async (tag): Promise<ITagInfo> => {
                    return this.loadTagDetail(tag)
                }),
            )

            resolvedTags.push(...resolvedBatch)
        }

        return resolvedTags
    }

    /**
     * Loads one tag with annotation and associated commit metadata.
     *
     * @param tag Raw repository tag entry.
     * @returns Normalized tag payload.
     */
    private async loadTagDetail(tag: ReposListTagsResponseItem): Promise<ITagInfo> {
        const tagName = normalizeRequiredText(tag.name, "tagName")
        const refResponse = await this.executeRequest(() => {
            return this.client.git.getRef({
                owner: this.owner,
                repo: this.repo,
                ref: `tags/${tagName}`,
            })
        })
        const tagSha = normalizeRequiredText(refResponse.data.object.sha, "tagSha")
        const target = await this.resolveTagTarget(
            refResponse.data.object.type,
            tagSha,
        )
        const commitResponse = await this.executeRequest(() => {
            return this.client.repos.getCommit({
                owner: this.owner,
                repo: this.repo,
                ref: target.commitSha,
            })
        })
        const commitDate = resolveCommitDate(commitResponse.data)

        return {
            name: tagName,
            sha: tagSha,
            isAnnotated: target.isAnnotated,
            annotationMessage: target.annotationMessage,
            date: target.date.length > 0 ? target.date : commitDate,
            commit: {
                sha: target.commitSha,
                message: commitResponse.data.commit.message,
                date: commitDate,
            },
        }
    }

    /**
     * Resolves tag target metadata from git ref object.
     *
     * @param type Raw git object type.
     * @param sha Git object SHA.
     * @returns Associated commit metadata seed.
     */
    private async resolveTagTarget(
        type: string,
        sha: string,
    ): Promise<IResolvedGitHubTagTarget> {
        const normalizedType = normalizeGitTagObjectType(type)

        if (normalizedType === "commit") {
            return {
                commitSha: sha,
                date: "",
                isAnnotated: false,
            }
        }

        return this.resolveAnnotatedTagTarget(sha, new Set<string>())
    }

    /**
     * Resolves annotated tag chain until commit target is reached.
     *
     * @param tagSha Annotated tag object SHA.
     * @param visitedTagShas Visited tag objects to guard against loops.
     * @returns Resolved annotated tag metadata.
     */
    private async resolveAnnotatedTagTarget(
        tagSha: string,
        visitedTagShas: Set<string>,
    ): Promise<IResolvedGitHubTagTarget> {
        if (visitedTagShas.has(tagSha)) {
            throw new Error(`GitHub tag object cycle detected for ${tagSha}`)
        }

        visitedTagShas.add(tagSha)

        const response = await this.executeRequest(() => {
            return this.client.git.getTag({
                owner: this.owner,
                repo: this.repo,
                tag_sha: tagSha,
            })
        })
        const nextObjectType = normalizeGitTagObjectType(response.data.object.type)
        const nextObjectSha = normalizeRequiredText(
            response.data.object.sha,
            "tagTargetSha",
        )
        const annotationMessage = normalizeOptionalTagMessage(response.data.message)
        const tagDate = normalizeOptionalContributorText(response.data.tagger?.date)

        if (nextObjectType === "commit") {
            return {
                commitSha: nextObjectSha,
                date: tagDate,
                isAnnotated: true,
                annotationMessage,
            }
        }

        const nestedTarget = await this.resolveAnnotatedTagTarget(
            nextObjectSha,
            visitedTagShas,
        )

        return {
            commitSha: nestedTarget.commitSha,
            date: tagDate.length > 0 ? tagDate : nestedTarget.date,
            isAnnotated: true,
            annotationMessage: annotationMessage ?? nestedTarget.annotationMessage,
        }
    }

    /**
     * Loads all `.gitignore` files present in current tree snapshot.
     *
     * @param ref Branch or commit reference.
     * @param treeNodes Repository tree nodes.
     * @returns Loaded `.gitignore` files.
     */
    private async loadGitIgnoreFiles(
        ref: string,
        treeNodes: readonly IFileTreeNode[],
    ): Promise<readonly IGitIgnoreFile[]> {
        const gitIgnoreNodes = treeNodes.filter((node): boolean => {
            return (
                node.type === FILE_TREE_NODE_TYPE.BLOB &&
                isGitIgnoreFilePath(node.path)
            )
        })

        return Promise.all(
            gitIgnoreNodes.map(async (node): Promise<IGitIgnoreFile> => {
                return {
                    path: node.path,
                    content: await this.getFileContentByRef(node.path, ref),
                }
            }),
        )
    }
}

/**
 * Maps GitHub tree payload into generic repository tree nodes.
 *
 * @param items Raw GitHub tree entries.
 * @returns Normalized file tree nodes.
 */
function mapGitTreeNodes(
    items: readonly GitGetTreeResponseItem[],
): readonly IFileTreeNode[] {
    return items
        .filter((item): boolean => {
            return (
                (item.type === FILE_TREE_NODE_TYPE.BLOB ||
                    item.type === FILE_TREE_NODE_TYPE.TREE) &&
                typeof item.path === "string" &&
                item.path.trim().length > 0
            )
        })
        .map((item): IFileTreeNode => {
            return {
                path: item.path,
                type:
                    item.type === FILE_TREE_NODE_TYPE.TREE
                        ? FILE_TREE_NODE_TYPE.TREE
                        : FILE_TREE_NODE_TYPE.BLOB,
                size: typeof item.size === "number" ? item.size : 0,
                sha: item.sha ?? "",
            }
        })
}

/**
 * Creates Octokit client when custom client is not supplied.
 *
 * @param options Provider options.
 * @returns Octokit-compatible client.
 */
function createOctokitClient(options: IGitHubProviderOptions): IGitHubOctokitClient {
    const token = normalizeRequiredText(options.token ?? "", "token")

    return new Octokit({
        auth: token,
        baseUrl: options.baseUrl,
    }) as unknown as IGitHubOctokitClient
}

/**
 * Creates external merge-request payload for existing ACL mapper.
 *
 * @param pullRequest Pull-request response.
 * @param commits Commit list.
 * @param files Changed file list.
 * @returns External payload understood by ACL mapper.
 */
function createExternalMergeRequest(
    pullRequest: PullGetResponse,
    commits: readonly PullListCommitsResponseItem[],
    files: readonly PullListFilesResponseItem[],
): IExternalGitMergeRequest {
    return {
        id: pullRequest.id,
        number: pullRequest.number,
        title: pullRequest.title,
        description: pullRequest.body ?? "",
        source_branch: pullRequest.head.ref,
        target_branch: pullRequest.base.ref,
        state: pullRequest.state,
        author: {
            id: pullRequest.user?.id ?? "unknown",
            username: pullRequest.user?.login ?? "unknown",
            display_name: pullRequest.user?.login ?? "unknown",
        },
        commits: commits.map((commit) => {
            return {
                sha: commit.sha,
                message: commit.commit.message,
                author_name: commit.commit.author?.name ?? "",
                created_at: commit.commit.author?.date ?? "",
            }
        }),
        changes: files.map((file) => {
            return {
                new_path: file.filename,
                old_path: file.previous_filename,
                change_type: mapGitHubFileStatus(file.status),
                diff: file.patch ?? "",
                hunks: splitHunks(file.patch),
            }
        }),
    }
}

/**
 * Maps GitHub file status to generic ACL value.
 *
 * @param status Raw GitHub file status.
 * @returns Generic diff status.
 */
function mapGitHubFileStatus(
    status: string,
): IMergeRequestDiffFileDTO["status"] {
    if (status === "added" || status === "removed" || status === "modified" || status === "renamed") {
        return status === "removed" ? "deleted" : status
    }

    return "modified"
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
 * Maps GitHub compare response to generic ref-diff DTO.
 *
 * @param payload Raw GitHub compare payload.
 * @param baseRef Normalized base ref.
 * @param headRef Normalized head ref.
 * @returns Generic ref-diff payload.
 */
function mapGitHubRefDiff(
    payload: ReposCompareCommitsWithBaseheadResponse,
    baseRef: string,
    headRef: string,
): IRefDiffResult {
    const files = (payload.files ?? []).map(mapGitHubRefDiffFile)

    return {
        baseRef,
        headRef,
        comparisonStatus: mapGitHubComparisonStatus(payload.status),
        aheadBy: typeof payload.ahead_by === "number" ? payload.ahead_by : 0,
        behindBy: typeof payload.behind_by === "number" ? payload.behind_by : 0,
        totalCommits:
            typeof payload.total_commits === "number" ? payload.total_commits : 0,
        summary: summarizeRefDiffFiles(files),
        files,
    }
}

/**
 * Maps one GitHub compare file payload to generic diff-file DTO.
 *
 * @param file Raw GitHub compare file payload.
 * @returns Generic diff-file payload.
 */
function mapGitHubRefDiffFile(
    file: ReposCompareCommitsWithBaseheadFile,
): IRefDiffFile {
    const status = mapGitHubFileStatus(
        typeof file.status === "string" ? file.status : "modified",
    )

    return {
        path: normalizeRequiredText(file.filename, "filePath"),
        status,
        oldPath: resolveGitHubPreviousFilePath(file, status),
        additions: typeof file.additions === "number" ? file.additions : 0,
        deletions: typeof file.deletions === "number" ? file.deletions : 0,
        changes: typeof file.changes === "number" ? file.changes : 0,
        patch: file.patch ?? "",
        hunks: splitHunks(file.patch),
    }
}

/**
 * Resolves previous path for renamed compare files.
 *
 * @param file Raw GitHub compare file payload.
 * @param status Normalized diff status.
 * @returns Previous file path for rename entries.
 */
function resolveGitHubPreviousFilePath(
    file: ReposCompareCommitsWithBaseheadFile,
    status: IMergeRequestDiffFileDTO["status"],
): string | undefined {
    if (status !== MERGE_REQUEST_DIFF_FILE_STATUS.RENAMED) {
        return undefined
    }

    return normalizeRequiredText(file.previous_filename ?? "", "oldPath")
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
 * Normalizes GitHub compare status to core literal.
 *
 * @param status Raw GitHub comparison status.
 * @returns Core comparison status.
 */
function mapGitHubComparisonStatus(
    status: string | undefined,
): GitRefComparisonStatus {
    if (status === GIT_REF_COMPARISON_STATUS.IDENTICAL) {
        return GIT_REF_COMPARISON_STATUS.IDENTICAL
    }

    if (status === GIT_REF_COMPARISON_STATUS.AHEAD) {
        return GIT_REF_COMPARISON_STATUS.AHEAD
    }

    if (status === GIT_REF_COMPARISON_STATUS.BEHIND) {
        return GIT_REF_COMPARISON_STATUS.BEHIND
    }

    return GIT_REF_COMPARISON_STATUS.DIVERGED
}

/**
 * Aggregates detailed commit payloads into contributor statistics.
 *
 * @param commits Detailed commit payloads.
 * @returns Stable contributor statistics ordered by impact.
 */
function buildContributorStats(
    commits: readonly ReposGetCommitResponse[],
): readonly IContributorStat[] {
    const contributors = new Map<string, IContributorAggregation>()

    for (const commit of commits) {
        const author = resolveContributorIdentity(commit)
        const key = createContributorAggregationKey(author)
        const existing = contributors.get(key)
        const contributor = existing ?? createContributorAggregation(author)

        contributor.commitCount += 1
        contributor.startedAt = pickEarlierIsoDate(
            contributor.startedAt,
            author.date,
        )
        contributor.endedAt = pickLaterIsoDate(
            contributor.endedAt,
            author.date,
        )

        for (const file of commit.files ?? []) {
            const filePath = normalizeRequiredText(file.filename, "filePath")
            const additions = normalizeNumericCount(file.additions)
            const deletions = normalizeNumericCount(file.deletions)
            const changes = normalizeNumericCount(file.changes)
            const existingFile = contributor.files.get(filePath)
            const fileStats = existingFile ?? createContributorFileAggregation()

            contributor.additions += additions
            contributor.deletions += deletions
            contributor.changes += changes
            fileStats.commitCount += 1
            fileStats.additions += additions
            fileStats.deletions += deletions
            fileStats.changes += changes
            fileStats.lastCommitDate = pickLaterIsoDate(
                fileStats.lastCommitDate,
                author.date,
            )
            contributor.files.set(filePath, fileStats)
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
    commits: readonly ReposGetCommitResponse[],
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

        addTemporalCouplingCommit(
            touchedFiles,
            resolveCommitDate(commit),
            couplings,
        )
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
 * Extracts sorted unique file paths from one detailed commit payload.
 *
 * @param commit Detailed commit payload.
 * @returns Sorted unique repository-relative file paths.
 */
function extractTemporalCouplingFilePaths(
    commit: ReposGetCommitResponse,
): readonly string[] {
    const touchedFiles = new Set<string>()

    for (const file of commit.files ?? []) {
        const filePath = normalizeRequiredText(file.filename, "filePath")
        touchedFiles.add(filePath)
    }

    return Array.from(touchedFiles.values()).sort((left, right): number => {
        return left.localeCompare(right)
    })
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

    return (
        filePaths.has(coupling.sourcePath) ||
        filePaths.has(coupling.targetPath)
    )
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
 * Uses Jaccard similarity so the metric stays within `[0, 1]` and naturally
 * rewards files that change together consistently across the selected window.
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
 * Resolves normalized contributor identity from detailed commit payload.
 *
 * @param commit Detailed commit payload.
 * @returns Contributor identity fields used for aggregation.
 */
function resolveContributorIdentity(
    commit: ReposGetCommitResponse,
): Readonly<{name: string; email: string; date: string}> {
    const author = commit.commit.author ?? commit.commit.committer
    const email = normalizeOptionalContributorText(author?.email)
    const resolvedName = normalizeOptionalContributorText(author?.name)

    return {
        name: resolvedName.length > 0 ? resolvedName : (
            email.length > 0 ? email : "unknown"
        ),
        email,
        date: normalizeOptionalContributorText(author?.date),
    }
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
 * Normalizes optional contributor text fields without throwing on blanks.
 *
 * @param value Raw optional field.
 * @returns Trimmed string or empty string.
 */
function normalizeOptionalContributorText(
    value: string | null | undefined,
): string {
    return typeof value === "string" ? value.trim() : ""
}

/**
 * Normalizes GitHub numeric counters.
 *
 * @param value Raw counter value.
 * @returns Safe numeric counter.
 */
function normalizeNumericCount(value: number | undefined): number {
    return typeof value === "number" ? value : 0
}

/**
 * Normalizes optional annotated tag message.
 *
 * @param value Raw annotation message.
 * @returns Trimmed annotation message or undefined.
 */
function normalizeOptionalTagMessage(
    value: string | null | undefined,
): string | undefined {
    const normalized = normalizeOptionalContributorText(value)

    return normalized.length > 0 ? normalized : undefined
}

/**
 * Extracts file content from GitHub content API payload.
 *
 * @param data GitHub content response.
 * @returns Decoded text content.
 */
function extractFileContent(data: ReposGetContentResponse): string {
    if (Array.isArray(data)) {
        throw new Error("GitHub content response points to directory, not file")
    }

    if (data.type !== "file") {
        throw new Error("GitHub content response points to non-file node")
    }

    const fileSize = typeof data.size === "number" ? data.size : 0
    if (fileSize > MAX_GITHUB_TEXT_FILE_BYTES) {
        throw new Error(
            `GitHub file content exceeds size limit of ${MAX_GITHUB_TEXT_FILE_BYTES} bytes`,
        )
    }

    const encoding = normalizeFileContentEncoding(data.encoding)
    if (encoding === "none") {
        throw new Error("GitHub binary file content is not supported")
    }

    if (typeof data.content !== "string") {
        return ""
    }

    const decodedContent = decodeFileContent(
        data.content,
        encoding ?? "utf8",
    )
    if (isBinaryBuffer(decodedContent)) {
        throw new Error("GitHub binary file content is not supported")
    }

    return decodedContent.toString("utf8")
}

/**
 * Normalizes GitHub content encoding label.
 *
 * @param encoding Raw GitHub encoding value.
 * @returns Supported normalized encoding or undefined.
 */
function normalizeFileContentEncoding(
    encoding: string | undefined,
): "base64" | "utf8" | "none" | undefined {
    if (encoding === undefined) {
        return undefined
    }

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

    throw new Error(`GitHub content response uses unsupported file encoding: ${encoding}`)
}

/**
 * Decodes GitHub file content into raw bytes.
 *
 * @param content Raw GitHub content field.
 * @param encoding Normalized content encoding.
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
 * Maps GitHub issue comment payload to generic DTO.
 *
 * @param data GitHub comment response.
 * @returns Generic comment DTO.
 */
function mapComment(data: IssuesCreateCommentResponse): ICommentDTO {
    return {
        id: String(data.id),
        body: data.body ?? "",
        author: data.user?.login ?? "",
        createdAt: data.created_at,
    }
}

/**
 * Maps GitHub review comment payload to generic DTO.
 *
 * @param data GitHub review comment response.
 * @returns Generic inline comment DTO.
 */
function mapInlineComment(
    data: PullCreateReviewCommentResponse,
): IInlineCommentDTO {
    return {
        id: String(data.id),
        body: data.body ?? "",
        author: data.user?.login ?? "",
        createdAt: data.created_at,
        filePath: data.path,
        line: data.line ?? 0,
        side: data.side === INLINE_COMMENT_SIDE.LEFT ? INLINE_COMMENT_SIDE.LEFT : INLINE_COMMENT_SIDE.RIGHT,
    }
}

/**
 * Maps GitHub GraphQL blame range to generic DTO.
 *
 * @param range GraphQL blame range.
 * @returns Generic blame DTO.
 */
function mapGraphQlBlameRange(range: IGitHubGraphQlBlameRange): IBlameData {
    const author = mapGraphQlBlameAuthor(range)

    return {
        lineStart: range.startingLine,
        lineEnd: range.endingLine,
        commitSha: mapGraphQlBlameCommitSha(range),
        authorName: author.authorName,
        authorEmail: author.authorEmail,
        date: author.date,
    }
}

/**
 * Extracts blame commit sha from GraphQL payload.
 *
 * @param range GraphQL blame range.
 * @returns Commit sha or empty string.
 */
function mapGraphQlBlameCommitSha(range: IGitHubGraphQlBlameRange): string {
    return range.commit?.oid ?? ""
}

/**
 * Extracts blame author metadata from GraphQL payload.
 *
 * @param range GraphQL blame range.
 * @returns Author metadata object.
 */
function mapGraphQlBlameAuthor(
    range: IGitHubGraphQlBlameRange,
): Readonly<{authorName: string; authorEmail: string; date: string}> {
    return {
        authorName: range.commit?.author?.name ?? "",
        authorEmail: range.commit?.author?.email ?? "",
        date: range.commit?.author?.date ?? "",
    }
}

/**
 * Maps GitHub check-run payload to generic DTO.
 *
 * @param data GitHub check-run response.
 * @returns Generic check-run DTO.
 */
function mapCheckRun(data: IGitHubCheckRunPayload): ICheckRunDTO {
    return {
        id: String(data.id),
        name: data.name,
        status: normalizeCheckRunStatus(data.status),
        conclusion: normalizeCheckRunConclusion(data.conclusion),
        summary: data.output?.summary ?? undefined,
        detailsUrl: data.details_url ?? undefined,
    }
}

/**
 * Resolves commit timestamp from detailed commit payload.
 *
 * @param payload Detailed commit payload.
 * @returns Commit timestamp or empty string when upstream omits it.
 */
function resolveCommitDate(payload: ReposGetCommitResponse): string {
    return payload.commit.committer?.date ?? payload.commit.author?.date ?? ""
}

/**
 * Normalizes supported git object types used by tag refs.
 *
 * @param value Raw git object type.
 * @returns Supported git object type.
 */
function normalizeGitTagObjectType(value: string): "commit" | "tag" {
    if (value === "commit" || value === "tag") {
        return value
    }

    throw new Error(`GitHub tag ref points to unsupported object type: ${value}`)
}

/**
 * Normalizes GitHub check-run status to core literal.
 *
 * @param status Raw GitHub status.
 * @returns Core check-run status.
 */
function normalizeCheckRunStatus(status: string): CheckRunStatus {
    if (status === CHECK_RUN_STATUS.QUEUED || status === CHECK_RUN_STATUS.IN_PROGRESS) {
        return status
    }

    return CHECK_RUN_STATUS.COMPLETED
}

/**
 * Normalizes GitHub check-run conclusion to core literal.
 *
 * @param conclusion Raw GitHub conclusion.
 * @returns Core check-run conclusion.
 */
function normalizeCheckRunConclusion(
    conclusion: string | null | undefined,
): CheckRunConclusion {
    if (
        conclusion === CHECK_RUN_CONCLUSION.SUCCESS ||
        conclusion === CHECK_RUN_CONCLUSION.FAILURE ||
        conclusion === CHECK_RUN_CONCLUSION.NEUTRAL ||
        conclusion === CHECK_RUN_CONCLUSION.CANCELLED
    ) {
        return conclusion
    }

    return CHECK_RUN_CONCLUSION.NEUTRAL
}

/**
 * Normalizes review identifier from GitHub response.
 *
 * @param reviewId Raw review identifier.
 * @returns Positive integer review id.
 */
function normalizeReviewId(reviewId: number | undefined): number {
    if (typeof reviewId !== "number" || Number.isInteger(reviewId) === false || reviewId <= 0) {
        throw new Error("reviewId must be positive integer")
    }

    return reviewId
}

/**
 * Resolves optional create-review comments parameter.
 *
 * @param comments Normalized review draft comments.
 * @returns Undefined for empty list or the full comments array.
 */
function resolveCreateReviewComments(
    comments: readonly IGitHubBatchReviewComment[],
): IGitHubBatchReviewComment[] | undefined {
    return comments.length === 0 ? undefined : [...comments]
}

/**
 * Converts raw line number to positive integer.
 *
 * @param line Raw line number.
 * @returns Normalized line.
 */
function normalizeLine(line: number): number {
    if (Number.isInteger(line) === false || line <= 0) {
        throw new Error("line must be positive integer")
    }

    return line
}

/**
 * Normalizes pull-request identifier to numeric value.
 *
 * @param value Raw pull-request identifier.
 * @returns Pull-request number.
 */
function normalizePullNumber(value: string): number {
    const normalized = normalizeRequiredText(value, "mergeRequestId")
    const numericValue = Number(normalized)

    if (Number.isInteger(numericValue) === false || numericValue <= 0) {
        throw new Error("mergeRequestId must be positive integer")
    }

    return numericValue
}

/**
 * Normalizes comment identifier to numeric value.
 *
 * @param value Raw comment identifier.
 * @returns Numeric comment identifier.
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
 * Normalizes inline comment side to GitHub API literal.
 *
 * @param side Raw side.
 * @returns GitHub API side.
 */
function normalizeInlineSide(
    side: IInlineCommentDTO["side"],
): "LEFT" | "RIGHT" {
    return side === INLINE_COMMENT_SIDE.LEFT ? "LEFT" : "RIGHT"
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
 * Creates GitHub webhook HMAC signature for request body.
 *
 * @param payload Raw request body.
 * @param secret Shared secret.
 * @returns GitHub signature header value.
 */
function buildGitHubWebhookSignature(payload: string, secret: string): string {
    const digest = createHmac("sha256", secret).update(payload).digest("hex")

    return `sha256=${digest}`
}

/**
 * Compares two signature values using timing-safe comparison.
 *
 * @param expected Expected signature.
 * @param actual Actual signature.
 * @returns True when signatures match.
 */
function safeCompareSignatures(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected)
    const actualBuffer = Buffer.from(actual)

    if (expectedBuffer.length !== actualBuffer.length) {
        return false
    }

    return timingSafeEqual(expectedBuffer, actualBuffer)
}

/**
 * Resolves per-page value for commit history requests.
 *
 * @param maxCount Optional max count.
 * @returns Positive per-page limit.
 */
function resolveCommitHistoryPerPage(maxCount: number | undefined): number {
    if (maxCount === undefined) {
        return 100
    }

    if (Number.isInteger(maxCount) === false || maxCount <= 0) {
        throw new Error("maxCount must be positive integer")
    }

    return Math.min(maxCount, 100)
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
