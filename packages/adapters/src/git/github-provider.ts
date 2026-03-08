import {createHmac, timingSafeEqual} from "node:crypto"

import {Octokit, type RestEndpointMethodTypes} from "@octokit/rest"
import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    FILE_TREE_NODE_TYPE,
    INLINE_COMMENT_SIDE,
    type CheckRunConclusion,
    type CheckRunStatus,
    type IBlameData,
    type IBranchInfo,
    type ICheckRunDTO,
    type ICommentDTO,
    type ICommitHistoryOptions,
    type ICommitInfo,
    type IFileTreeNode,
    type IGitProvider,
    type IInlineCommentDTO,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
    type IWebhookEventDTO,
} from "@codenautic/core"

import {
    mapExternalDiffFiles,
    mapExternalMergeRequest,
    normalizeGitAclError,
    shouldRetryGitAclError,
    type IExternalGitMergeRequest,
    type INormalizedGitAclError,
} from "./acl"
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
type ChecksCreateResponse =
    RestEndpointMethodTypes["checks"]["create"]["response"]["data"]
type ChecksUpdateResponse =
    RestEndpointMethodTypes["checks"]["update"]["response"]["data"]
type ReposGetResponse =
    RestEndpointMethodTypes["repos"]["get"]["response"]["data"]
type ReposListBranchesResponseItem =
    RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"][number]
type ReposGetContentResponse =
    RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"]
type ReposListCommitsResponseItem =
    RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][number]
type ReposGetCommitResponse =
    RestEndpointMethodTypes["repos"]["getCommit"]["response"]["data"]
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
        readonly getContent: (
            params: RestEndpointMethodTypes["repos"]["getContent"]["parameters"],
        ) => Promise<{readonly data: ReposGetContentResponse}>
        readonly listCommits: (
            params: RestEndpointMethodTypes["repos"]["listCommits"]["parameters"],
        ) => Promise<{readonly data: readonly ReposListCommitsResponseItem[]}>
        readonly getCommit: (
            params: RestEndpointMethodTypes["repos"]["getCommit"]["parameters"],
        ) => Promise<{readonly data: ReposGetCommitResponse}>
    }

    /**
     * Git data methods.
     */
    readonly git: {
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

const DEFAULT_RETRY_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

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
export class GitHubProvider implements IGitProvider {
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

        return tree.data.tree
            .filter((item): boolean => {
                return item.type === FILE_TREE_NODE_TYPE.BLOB || item.type === FILE_TREE_NODE_TYPE.TREE
            })
            .map((item): IFileTreeNode => {
                return {
                    path: item.path ?? "",
                    type: item.type === "tree" ? FILE_TREE_NODE_TYPE.TREE : FILE_TREE_NODE_TYPE.BLOB,
                    size: typeof item.size === "number" ? item.size : 0,
                    sha: item.sha ?? "",
                }
            })
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
            this.executeRequest(() => {
                return this.client.repos.listBranches({
                    owner: this.owner,
                    repo: this.repo,
                    per_page: 100,
                })
            }),
        ])

        const defaultBranch = repository.data.default_branch ?? ""

        return branches.data.map((branch): IBranchInfo => {
            return {
                name: branch.name,
                sha: branch.commit.sha,
                isDefault: branch.name === defaultBranch,
                isProtected: branch.protected,
            }
        })
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
        const commits = await this.executeRequest(() => {
            return this.client.repos.listCommits({
                owner: this.owner,
                repo: this.repo,
                sha: normalizedRef,
                since: options?.since,
                until: options?.until,
                path: options?.filePath,
                per_page: resolveCommitHistoryPerPage(options?.maxCount),
            })
        })

        const maxCount = options?.maxCount
        const limitedCommits = commits.data.slice(0, maxCount)

        return Promise.all(
            limitedCommits.map(async (commit): Promise<ICommitInfo> => {
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

        const response = await this.executeRequest(() => {
            return this.client.request("POST /graphql", {
                query: GITHUB_BLAME_QUERY,
                owner: this.owner,
                repo: this.repo,
                expression: `${normalizedRef}:${normalizedPath}`,
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
        for (let attempt = 1; attempt <= this.retryMaxAttempts; attempt += 1) {
            try {
                return await operation()
            } catch (error) {
                const normalized = normalizeGitAclError(error)

                if (!shouldRetryGitAclError(error, attempt, this.retryMaxAttempts)) {
                    throw new GitHubProviderError(normalized)
                }

                await this.sleep(resolveRetryDelayMs(normalized, attempt))
            }
        }

        throw new GitHubProviderError(
            createUnknownNormalizedError("GitHub request failed after retries"),
        )
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
function mapGitHubFileStatus(status: string): string {
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

    if (typeof data.content !== "string") {
        return ""
    }

    const normalized = data.content.replace(/\n/g, "")

    return Buffer.from(normalized, data.encoding === "base64" ? "base64" : "utf8").toString("utf8")
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
 * Builds stable fallback normalized error.
 *
 * @param message Public error message.
 * @returns Normalized error payload.
 */
function createUnknownNormalizedError(message: string): INormalizedGitAclError {
    return {
        kind: normalizeGitAclError({}).kind,
        message,
        isRetryable: false,
        statusCode: undefined,
    }
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
