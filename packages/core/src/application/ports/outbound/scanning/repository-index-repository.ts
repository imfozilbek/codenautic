import type {
    IRepositoryIndex,
    RepositoryIndexStatus,
} from "../../../dto/scanning"

/**
 * Outbound contract for repository index persistence.
 */
export interface IRepositoryIndexRepository {
    /**
     * Finds repository index by repository identifier.
     *
     * @param repositoryId Repository identifier.
     * @returns Repository index or null when missing.
     */
    getByRepositoryId(repositoryId: string): Promise<IRepositoryIndex | null>

    /**
     * Persists repository index snapshot.
     *
     * @param repositoryIndex Repository index payload.
     */
    save(repositoryIndex: IRepositoryIndex): Promise<void>

    /**
     * Updates repository status.
     *
     * @param repositoryId Repository identifier.
     * @param status New repository index status.
     */
    updateStatus(repositoryId: string, status: RepositoryIndexStatus): Promise<void>

    /**
     * Updates last scan metadata for repository index.
     *
     * @param repositoryId Repository identifier.
     * @param scanId Last scan identifier.
     * @param scannedAt Last scan timestamp (ISO 8601).
     */
    updateLastScan(
        repositoryId: string,
        scanId: string,
        scannedAt: string,
    ): Promise<void>
}
