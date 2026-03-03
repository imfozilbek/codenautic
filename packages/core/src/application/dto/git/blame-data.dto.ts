/**
 * Git blame record for a file line range in a specific reference.
 */
export interface IBlameData {
    /**
     * Start line in blame range (1-based).
     */
    readonly lineStart: number

    /**
     * End line in blame range (1-based).
     */
    readonly lineEnd: number

    /**
     * Commit SHA that modified the blamed lines.
     */
    readonly commitSha: string

    /**
     * Author display name for blamed commit.
     */
    readonly authorName: string

    /**
     * Author email for blamed commit.
     */
    readonly authorEmail: string

    /**
     * Commit timestamp in ISO 8601 format.
     */
    readonly date: string
}
