import {FilePath} from "./file-path.value-object"

/**
 * Supported Git diff file statuses.
 */
export const DIFF_FILE_STATUS = {
    ADDED: "added",
    MODIFIED: "modified",
    DELETED: "deleted",
    RENAMED: "renamed",
} as const

/**
 * Literal diff file status type.
 */
export type DiffFileStatus = (typeof DIFF_FILE_STATUS)[keyof typeof DIFF_FILE_STATUS]

/**
 * Input payload for diff file creation.
 */
export interface ICreateDiffFileProps {
    filePath: FilePath
    status: DiffFileStatus
    hunks: readonly string[]
    patch: string
    oldPath?: FilePath
}

/**
 * Immutable value object that represents a changed file in diff.
 */
export class DiffFile {
    private readonly currentPath: FilePath
    private readonly previousPath: FilePath | undefined
    private readonly fileStatus: DiffFileStatus
    private readonly hunkList: readonly string[]
    private readonly patchContent: string

    /**
     * Creates immutable diff file value object.
     *
     * @param props Diff file payload.
     */
    private constructor(props: ICreateDiffFileProps) {
        this.ensureStateIsValid(props)
        this.currentPath = props.filePath
        this.previousPath = props.oldPath
        this.fileStatus = props.status
        this.hunkList = Object.freeze([...props.hunks])
        this.patchContent = props.patch
        Object.freeze(this)
    }

    /**
     * Creates diff file from validated payload.
     *
     * @param props Diff file payload.
     * @returns Immutable diff file value object.
     */
    public static create(props: ICreateDiffFileProps): DiffFile {
        return new DiffFile(props)
    }

    /**
     * Current file path after change.
     *
     * @returns Current file path.
     */
    public get filePath(): FilePath {
        return this.currentPath
    }

    /**
     * Previous file path before rename.
     *
     * @returns Previous file path or undefined.
     */
    public get oldPath(): FilePath | undefined {
        return this.previousPath
    }

    /**
     * Diff file status.
     *
     * @returns Diff status literal.
     */
    public get status(): DiffFileStatus {
        return this.fileStatus
    }

    /**
     * Parsed hunks of file patch.
     *
     * @returns Immutable copy of hunks.
     */
    public get hunks(): readonly string[] {
        return [...this.hunkList]
    }

    /**
     * Raw patch text.
     *
     * @returns Patch content.
     */
    public get patch(): string {
        return this.patchContent
    }

    /**
     * Checks whether file path matches any ignore pattern.
     *
     * @param patterns Glob patterns list.
     * @returns True when current or previous path matches any pattern.
     */
    public matchesIgnorePattern(patterns: readonly string[]): boolean {
        for (const pattern of patterns) {
            if (pattern.trim().length === 0) {
                continue
            }

            if (this.currentPath.matchesGlob(pattern)) {
                return true
            }

            if (this.previousPath !== undefined && this.previousPath.matchesGlob(pattern)) {
                return true
            }
        }

        return false
    }

    /**
     * Stable string representation.
     *
     * @returns Current file path as string.
     */
    public toString(): string {
        return this.currentPath.toString()
    }

    /**
     * Validates input payload.
     *
     * @param props Candidate payload.
     * @throws Error When payload is invalid.
     */
    private ensureStateIsValid(props: ICreateDiffFileProps): void {
        if (!isDiffFileStatus(props.status)) {
            throw new Error(`Unsupported diff file status: ${String(props.status)}`)
        }

        if (props.status === DIFF_FILE_STATUS.RENAMED && props.oldPath === undefined) {
            throw new Error("Renamed diff file requires oldPath")
        }

        if (props.status !== DIFF_FILE_STATUS.RENAMED && props.oldPath !== undefined) {
            throw new Error("oldPath is allowed only for renamed diff files")
        }

        for (const hunk of props.hunks) {
            if (hunk.trim().length === 0) {
                throw new Error("Diff hunk cannot be empty")
            }
        }
    }
}

/**
 * Type guard for diff file status.
 *
 * @param value Candidate value.
 * @returns True when value is supported diff file status.
 */
function isDiffFileStatus(value: string): value is DiffFileStatus {
    return Object.values(DIFF_FILE_STATUS).includes(value as DiffFileStatus)
}
