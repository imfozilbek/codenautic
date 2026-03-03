import type {ILanguageStat} from "./scan-result.dto"

/**
 * Repository indexing status values.
 */
export const REPOSITORY_INDEX_STATUS = {
    NOT_INDEXED: "NOT_INDEXED",
    INDEXING: "INDEXING",
    INDEXED: "INDEXED",
    STALE: "STALE",
} as const

/**
 * Repository indexing status union.
 */
export type RepositoryIndexStatus =
    (typeof REPOSITORY_INDEX_STATUS)[keyof typeof REPOSITORY_INDEX_STATUS]

/**
 * Aggregated repository index state.
 */
export interface IRepositoryIndex {
    /**
     * Repository identifier.
     */
    readonly repositoryId: string

    /**
     * Repository default branch name.
     */
    readonly defaultBranch: string

    /**
     * Last scan identifier.
     */
    readonly lastScanId?: string

    /**
     * Last scan completion timestamp (ISO 8601).
     */
    readonly lastScanAt?: string

    /**
     * Total number of files in repository.
     */
    readonly totalFiles: number

    /**
     * Total lines of code in repository.
     */
    readonly totalLoc: number

    /**
     * Language statistics attached to repository index.
     */
    readonly languages: readonly ILanguageStat[]

    /**
     * Repository indexing state.
     */
    readonly status: RepositoryIndexStatus
}
