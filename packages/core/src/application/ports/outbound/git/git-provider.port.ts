import type {
    CheckRunConclusion,
    CheckRunStatus,
    ICheckRunDTO,
    ICommentDTO,
    IInlineCommentDTO,
    IBranchInfo,
    ICommitHistoryOptions,
    ICommitInfo,
    IFileTreeNode,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
} from "../../../dto/git"
import type {IGitBlame} from "./git-blame.port"

/**
 * Outbound contract for Git platform integration.
 */
export interface IGitProvider extends IGitBlame {
    /**
     * Fetches merge request by identifier.
     *
     * @param id Merge request identifier.
     * @returns Merge request payload.
     */
    getMergeRequest(id: string): Promise<IMergeRequestDTO>

    /**
     * Fetches changed files for merge request.
     *
     * @param mergeRequestId Merge request identifier.
     * @returns Changed files list.
     */
    getChangedFiles(mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]>

    /**
     * Fetches repository file tree for a commit/branch reference.
     *
     * @param ref Commit SHA or branch name.
     * @returns File tree nodes.
     */
    getFileTree(ref: string): Promise<readonly IFileTreeNode[]>

    /**
     * Fetches file content for a specific reference.
     *
     * @param filePath File path relative to repository root.
     * @param ref Commit SHA or branch name.
     * @returns Raw file content.
     */
    getFileContentByRef(filePath: string, ref: string): Promise<string>

    /**
     * Fetches repository branches metadata.
     *
     * @returns Branch list with default and protection metadata.
     */
    getBranches(): Promise<readonly IBranchInfo[]>

    /**
     * Fetches commit history for a branch or commit reference.
     *
     * @param ref Commit SHA or branch name.
     * @param options Optional history query options.
     * @returns Ordered commit list.
     */
    getCommitHistory(
        ref: string,
        options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]>

    /**
     * Posts regular comment to merge request.
     *
     * @param mergeRequestId Merge request identifier.
     * @param body Comment body.
     * @returns Created comment payload.
     */
    postComment(mergeRequestId: string, body: string): Promise<ICommentDTO>

    /**
     * Posts inline comment to merge request.
     *
     * @param mergeRequestId Merge request identifier.
     * @param comment Inline comment payload.
     * @returns Created inline comment payload.
     */
    postInlineComment(mergeRequestId: string, comment: IInlineCommentDTO): Promise<IInlineCommentDTO>

    /**
     * Creates check run attached to merge request.
     *
     * @param mergeRequestId Merge request identifier.
     * @param name Check run name.
     * @returns Created check run payload.
     */
    createCheckRun(mergeRequestId: string, name: string): Promise<ICheckRunDTO>

    /**
     * Updates check run status and conclusion.
     *
     * @param checkId Check run identifier.
     * @param status Target status.
     * @param conclusion Target conclusion.
     * @returns Updated check run payload.
     */
    updateCheckRun(
        checkId: string,
        status: CheckRunStatus,
        conclusion: CheckRunConclusion,
    ): Promise<ICheckRunDTO>
}
