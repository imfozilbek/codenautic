/**
 * Repository workspace lifecycle phases reported by clone providers.
 */
export const REPOSITORY_WORKSPACE_PHASE = {
    CLONING: "CLONING",
    CHECKING_OUT: "CHECKING_OUT",
    READY: "READY",
    CLEANING_UP: "CLEANING_UP",
} as const

/**
 * Repository workspace phase union.
 */
export type RepositoryWorkspacePhase =
    (typeof REPOSITORY_WORKSPACE_PHASE)[keyof typeof REPOSITORY_WORKSPACE_PHASE]

/**
 * Disposable local workspace prepared for repository scanning.
 */
export interface IRepositoryWorkspace {
    /**
     * Stable workspace identifier used for cleanup.
     */
    readonly workspaceId: string

    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repositoryId: string

    /**
     * Checked out branch, tag, or commit reference.
     */
    readonly ref: string

    /**
     * Absolute filesystem path to prepared workspace root.
     */
    readonly workspacePath: string

    /**
     * Indicates whether workspace was created using shallow clone semantics.
     */
    readonly isShallow: boolean

    /**
     * Creation timestamp in ISO 8601 format.
     */
    readonly createdAt: string
}

/**
 * Clone progress payload emitted while workspace is being prepared or cleaned.
 */
export interface IRepositoryWorkspaceProgress {
    /**
     * Workspace lifecycle phase.
     */
    readonly phase: RepositoryWorkspacePhase

    /**
     * Human-readable progress message when available.
     */
    readonly message?: string

    /**
     * Number of received git objects when provider can expose it.
     */
    readonly receivedObjects?: number

    /**
     * Total git objects expected when provider can expose it.
     */
    readonly totalObjects?: number

    /**
     * Total received bytes when provider can expose it.
     */
    readonly receivedBytes?: number
}
