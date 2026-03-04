/**
 * Result summary for config import operations.
 */
export interface IImportResult {
    /**
     * Total processed items.
     */
    readonly total: number

    /**
     * Newly created items.
     */
    readonly created: number

    /**
     * Updated existing items.
     */
    readonly updated: number

    /**
     * Skipped items (already up-to-date).
     */
    readonly skipped: number

    /**
     * Failed items.
     */
    readonly failed: number
}
