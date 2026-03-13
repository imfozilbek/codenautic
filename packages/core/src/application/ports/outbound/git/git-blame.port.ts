import type {
    IBlameData,
    IFileBlame,
} from "../../../dto/git"

/**
 * Outbound contract for git blame lookups.
 */
export interface IGitBlame {
    /**
     * Fetches blame information for one file in the target reference.
     *
     * @param filePath File path relative to repository root.
     * @param ref Commit SHA or branch name.
     * @returns Line-level blame metadata.
     */
    getBlameData(filePath: string, ref: string): Promise<readonly IBlameData[]>

    /**
     * Fetches blame information for many files in the same reference.
     *
     * @param filePaths Repository-relative file paths.
     * @param ref Commit SHA or branch name.
     * @returns File-scoped blame payloads in input order.
     */
    getBlameDataBatch(
        filePaths: readonly string[],
        ref: string,
    ): Promise<readonly IFileBlame[]>
}
