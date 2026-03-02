/**
 * Supported Git provider labels for ACL contracts.
 */
export const GIT_PROVIDER = {
    GITLAB: "gitlab",
} as const

/**
 * Supported Git provider value.
 */
export type GitProvider = (typeof GIT_PROVIDER)[keyof typeof GIT_PROVIDER]

/**
 * File status values normalized for merge request diffs.
 */
export const GIT_FILE_CHANGE_STATUS = {
    ADDED: "added",
    MODIFIED: "modified",
    DELETED: "deleted",
} as const

/**
 * Normalized file status value.
 */
export type GitFileChangeStatus = (typeof GIT_FILE_CHANGE_STATUS)[keyof typeof GIT_FILE_CHANGE_STATUS]

/**
 * Author DTO for merge request contracts.
 */
export interface IGitMergeRequestAuthorDto {
    readonly externalId: string
    readonly username: string
    readonly displayName: string
}

/**
 * Diff refs DTO with immutable base/head commits.
 */
export interface IGitMergeRequestDiffRefsDto {
    readonly baseSha: string
    readonly headSha: string
}

/**
 * Changed file DTO used by review pipeline.
 */
export interface IGitMergeRequestChangedFileDto {
    readonly path: string
    readonly status: GitFileChangeStatus
    readonly additions: number
    readonly deletions: number
}

/**
 * Stable merge request contract exported by Git ACL adapters.
 */
export interface IGitMergeRequestDto {
    readonly provider: GitProvider
    readonly repositoryExternalId: string
    readonly mergeRequestExternalId: string
    readonly title: string
    readonly description: string
    readonly sourceBranch: string
    readonly targetBranch: string
    readonly webUrl: string
    readonly author: IGitMergeRequestAuthorDto
    readonly diffRefs: IGitMergeRequestDiffRefsDto
    readonly changedFiles: readonly IGitMergeRequestChangedFileDto[]
}

/**
 * Fetch request descriptor used for idempotency keys.
 */
export interface IGitMergeRequestFetchRequest {
    readonly provider: GitProvider
    readonly projectExternalId: string
    readonly mergeRequestExternalId: string
    readonly includeChanges: boolean
}
