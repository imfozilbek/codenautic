import type {IBlameData} from "./blame-data.dto"

/**
 * File-level blame payload returned by batch git blame queries.
 */
export interface IFileBlame {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Blame ranges associated with the file.
     */
    readonly blame: readonly IBlameData[]
}
