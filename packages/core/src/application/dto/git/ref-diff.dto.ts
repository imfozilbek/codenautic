import type {MergeRequestDiffFileStatus} from "./merge-request.dto"

/**
 * Supported comparison states between two repository references.
 */
export const GIT_REF_COMPARISON_STATUS = {
    IDENTICAL: "identical",
    AHEAD: "ahead",
    BEHIND: "behind",
    DIVERGED: "diverged",
} as const

/**
 * Git ref comparison status literal type.
 */
export type GitRefComparisonStatus =
    (typeof GIT_REF_COMPARISON_STATUS)[keyof typeof GIT_REF_COMPARISON_STATUS]

/**
 * Per-file diff entry returned by ref comparison APIs.
 */
export interface IRefDiffFile {
    /**
     * Current repository-relative file path.
     */
    readonly path: string

    /**
     * Generic diff status for this file.
     */
    readonly status: MergeRequestDiffFileStatus

    /**
     * Previous repository-relative file path for renames.
     */
    readonly oldPath?: string

    /**
     * Number of added lines in the file.
     */
    readonly additions: number

    /**
     * Number of removed lines in the file.
     */
    readonly deletions: number

    /**
     * Total changed lines reported by the provider.
     */
    readonly changes: number

    /**
     * Raw unified diff patch when available.
     */
    readonly patch: string

    /**
     * Parsed non-empty hunk lines derived from patch.
     */
    readonly hunks: readonly string[]
}

/**
 * Aggregated diff statistics for compared refs.
 */
export interface IRefDiffSummary {
    /**
     * Count of changed files in the comparison.
     */
    readonly changedFiles: number

    /**
     * Count of added files.
     */
    readonly addedFiles: number

    /**
     * Count of modified files.
     */
    readonly modifiedFiles: number

    /**
     * Count of deleted files.
     */
    readonly deletedFiles: number

    /**
     * Count of renamed files.
     */
    readonly renamedFiles: number

    /**
     * Sum of added lines across all files.
     */
    readonly additions: number

    /**
     * Sum of removed lines across all files.
     */
    readonly deletions: number

    /**
     * Sum of changed lines across all files.
     */
    readonly changes: number
}

/**
 * Platform-agnostic diff payload between two refs.
 */
export interface IRefDiffResult {
    /**
     * Base repository ref in comparison expression.
     */
    readonly baseRef: string

    /**
     * Head repository ref in comparison expression.
     */
    readonly headRef: string

    /**
     * Provider-normalized comparison state.
     */
    readonly comparisonStatus: GitRefComparisonStatus

    /**
     * Number of commits that head is ahead of base.
     */
    readonly aheadBy: number

    /**
     * Number of commits that head is behind base.
     */
    readonly behindBy: number

    /**
     * Total commits included in the comparison window.
     */
    readonly totalCommits: number

    /**
     * Aggregated diff statistics.
     */
    readonly summary: IRefDiffSummary

    /**
     * File-level diff entries in provider order.
     */
    readonly files: readonly IRefDiffFile[]
}
