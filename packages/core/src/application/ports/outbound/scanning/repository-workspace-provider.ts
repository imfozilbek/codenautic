import type {
    IRepositoryWorkspace,
    IRepositoryWorkspaceProgress,
} from "../../../dto/scanning"

/**
 * Progress callback invoked while repository workspace is being prepared.
 *
 * @param progress Current workspace lifecycle progress payload.
 */
export type IRepositoryWorkspaceProgressCallback = (
    progress: IRepositoryWorkspaceProgress,
) => Promise<void> | void

/**
 * Input payload for local repository workspace creation.
 */
export interface ICreateRepositoryWorkspaceInput {
    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repositoryId: string

    /**
     * Branch, tag, or commit reference to checkout.
     */
    readonly ref: string

    /**
     * Requests shallow clone semantics when supported.
     */
    readonly shallow?: boolean

    /**
     * Optional progress callback for clone lifecycle reporting.
     */
    readonly onProgress?: IRepositoryWorkspaceProgressCallback
}

/**
 * Outbound contract for disposable local repository workspaces.
 */
export interface IRepositoryWorkspaceProvider {
    /**
     * Creates local repository workspace ready for file-system based scanning.
     *
     * @param input Workspace creation input.
     * @returns Prepared local workspace metadata.
     */
    createWorkspace(
        input: ICreateRepositoryWorkspaceInput,
    ): Promise<IRepositoryWorkspace>

    /**
     * Cleans up previously created workspace by identifier.
     *
     * @param workspaceId Stable workspace identifier.
     */
    disposeWorkspace(workspaceId: string): Promise<void>
}
