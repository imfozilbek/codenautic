import type {DiffFile} from "./diff-file.value-object"

export const REVIEW_DEPTH_MODE = {
    LIGHT: "light",
    HEAVY: "heavy",
} as const

/**
 * Review context size mode for per-file analysis.
 */
export type ReviewDepthMode = (typeof REVIEW_DEPTH_MODE)[keyof typeof REVIEW_DEPTH_MODE]

/**
 * Evaluates heuristics for per-file review depth selection.
 */
export class ReviewDepthModeResolver {
    private static readonly IMPORT_CHANGE_PATTERN =
        /^\+(?:\s*(?:import|export)\b.*\bfrom\b|\s*import\s*\()/
    private static readonly PUBLIC_API_CHANGE_PATTERN =
        /^\+(?:\s*export\b|\s*type\s+|\s*interface\s+|\s*enum\s+|\s*class\s+|\s*function\s+|\s*abstract\s+class\s+|\s*namespace\s+)/

    /**
     * Resolves review depth mode for a single diff file.
     *
     * @param file Diff file payload.
     * @returns `heavy` for high-impact diffs, otherwise `light`.
     */
    public static fromFileChange(file: DiffFile): ReviewDepthMode {
        if (this.hasImportChanges(file)) {
            return REVIEW_DEPTH_MODE.HEAVY
        }

        if (this.hasPublicApiChanges(file)) {
            return REVIEW_DEPTH_MODE.HEAVY
        }

        if (this.isLargeChange(file)) {
            return REVIEW_DEPTH_MODE.HEAVY
        }

        return REVIEW_DEPTH_MODE.LIGHT
    }

    /**
     * Detects changed import lines in patch.
     *
     * @param file Diff file payload.
     * @returns True when imports changed.
     */
    private static hasImportChanges(file: DiffFile): boolean {
        for (const line of this.resolveAddedOrRemovedLines(file.patch)) {
            if (this.IMPORT_CHANGE_PATTERN.test(line) === true) {
                return true
            }
        }

        return false
    }

    /**
     * Detects added public API declarations in patch.
     *
     * @param file Diff file payload.
     * @returns True when public API declaration changed.
     */
    private static hasPublicApiChanges(file: DiffFile): boolean {
        for (const line of this.resolveAddedOrRemovedLines(file.patch)) {
            if (this.PUBLIC_API_CHANGE_PATTERN.test(line) === true) {
                return true
            }
        }

        return false
    }

    /**
     * Detects large-change diff segments.
     *
     * @param file Diff file payload.
     * @returns True when change ratio crosses 50%.
     */
    private static isLargeChange(file: DiffFile): boolean {
        const changedLines = this.countChangedLines(file.patch)
        const estimatedTotalLines = this.estimateTotalChangedArea(file.hunks)

        if (estimatedTotalLines <= 0) {
            return changedLines > 50
        }

        return changedLines / estimatedTotalLines > 0.5
    }

    /**
     * Collects only added/removed diff lines (excluding hunk and file headers).
     *
     * @param patch Patch text.
     * @returns Added/removed lines.
     */
    private static resolveAddedOrRemovedLines(patch: string): readonly string[] {
        return patch
            .split("\n")
            .filter((line): line is string => {
                return (
                    (line.startsWith("+") && line.startsWith("+++") === false) ||
                    (line.startsWith("-") && line.startsWith("---") === false)
                )
            })
    }

    /**
     * Counts changed lines in patch payload.
     *
     * @param patch Patch text.
     * @returns Number of added and removed lines.
     */
    private static countChangedLines(patch: string): number {
        return this.resolveAddedOrRemovedLines(patch).length
    }

    /**
     * Estimate impacted file lines using hunk headers.
     *
     * @param hunks Diff hunks.
     * @returns Estimated total file size touched in hunk headers.
     */
    private static estimateTotalChangedArea(hunks: readonly string[]): number {
        let estimated = 0

        for (const hunk of hunks) {
            const estimatedLines = this.parseHunkRange(hunk)
            if (estimatedLines === undefined) {
                continue
            }

            estimated += estimatedLines
        }

        return estimated
    }

    /**
     * Parses unified-diff hunk header and returns max(oldCount, newCount).
     *
     * @param hunk Hunk header line.
     * @returns Estimated span.
     */
    private static parseHunkRange(hunk: string): number | undefined {
        const trimmed = hunk.trim()
        if (trimmed.startsWith("@@") === false) {
            return undefined
        }

        const match = trimmed.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
        if (match === null) {
            return undefined
        }

        const oldCount = this.extractCount(match[2], match[2] === "0")
        const newCount = this.extractCount(match[4], match[4] === "0")
        if (oldCount === undefined || newCount === undefined) {
            return undefined
        }

        return oldCount > newCount ? oldCount : newCount
    }

    /**
     * Normalizes extracted hunk span count.
     *
     * @param rawCount Raw hunk count capture.
     * @param isExplicitZero True when original counter explicitly declared as zero.
     * @returns Number of changed lines or undefined.
     */
    private static extractCount(rawCount: string | undefined, isExplicitZero: boolean): number | undefined {
        if (rawCount === undefined) {
            return isExplicitZero ? 0 : 1
        }

        const parsedCount = Number.parseInt(rawCount, 10)
        if (Number.isInteger(parsedCount) === false || parsedCount < 0) {
            return undefined
        }

        return parsedCount
    }
}
