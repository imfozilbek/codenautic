/**
 * Scan status lifecycle values.
 */
export const SCAN_STATUS = {
    PENDING: "PENDING",
    SCANNING_FILES: "SCANNING_FILES",
    BUILDING_GRAPH: "BUILDING_GRAPH",
    COMPUTING_METRICS: "COMPUTING_METRICS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const

/**
 * Scan status union.
 */
export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS]

/**
 * Scan phase values.
 */
export const SCAN_PHASE = {
    FILE_DISCOVERY: "FILE_DISCOVERY",
    FILE_PARSING: "FILE_PARSING",
    GRAPH_BUILDING: "GRAPH_BUILDING",
    METRICS_COMPUTATION: "METRICS_COMPUTATION",
    FINALIZATION: "FINALIZATION",
} as const

/**
 * Scan phase union.
 */
export type ScanPhase = (typeof SCAN_PHASE)[keyof typeof SCAN_PHASE]

/**
 * Snapshot of repository scan progress.
 */
export interface IScanProgress {
    /**
     * Unique scan operation identifier.
     */
    readonly scanId: string

    /**
     * Repository identifier in scope.
     */
    readonly repositoryId: string

    /**
     * Current scan lifecycle status.
     */
    readonly status: ScanStatus

    /**
     * Total number of files planned for scan.
     */
    readonly totalFiles: number

    /**
     * Number of files processed so far.
     */
    readonly processedFiles: number

    /**
     * Current operational phase inside the scan.
     */
    readonly currentPhase: ScanPhase

    /**
     * Scan start timestamp in ISO 8601 format.
     */
    readonly startedAt: string

    /**
     * Last progress update timestamp in ISO 8601 format.
     */
    readonly updatedAt: string

    /**
     * Failure reason when status == FAILED.
     */
    readonly errorMessage?: string
}
