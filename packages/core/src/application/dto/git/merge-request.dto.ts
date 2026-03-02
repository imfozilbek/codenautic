/**
 * Supported changed-file statuses for merge request diffs.
 */
export const MERGE_REQUEST_DIFF_FILE_STATUS = {
    ADDED: "added",
    MODIFIED: "modified",
    DELETED: "deleted",
    RENAMED: "renamed",
} as const

/**
 * Merge request diff file status literal type.
 */
export type MergeRequestDiffFileStatus =
    (typeof MERGE_REQUEST_DIFF_FILE_STATUS)[keyof typeof MERGE_REQUEST_DIFF_FILE_STATUS]

/**
 * Author snapshot for merge request payload.
 */
export interface IMergeRequestAuthorDTO {
    readonly id: string
    readonly username: string
    readonly displayName: string
}

/**
 * Commit snapshot for merge request payload.
 */
export interface IMergeRequestCommitDTO {
    readonly id: string
    readonly message: string
    readonly author: string
    readonly timestamp: string
}

/**
 * Changed file snapshot for merge request payload.
 */
export interface IMergeRequestDiffFileDTO {
    readonly path: string
    readonly status: MergeRequestDiffFileStatus
    readonly oldPath?: string
    readonly patch: string
    readonly hunks: readonly string[]
}

/**
 * Platform-agnostic merge request payload.
 */
export interface IMergeRequestDTO {
    readonly id: string
    readonly number: number
    readonly title: string
    readonly description: string
    readonly sourceBranch: string
    readonly targetBranch: string
    readonly author: IMergeRequestAuthorDTO
    readonly state: string
    readonly commits: readonly IMergeRequestCommitDTO[]
    readonly diffFiles: readonly IMergeRequestDiffFileDTO[]
}
