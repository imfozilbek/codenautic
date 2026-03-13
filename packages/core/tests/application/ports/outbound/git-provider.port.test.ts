import {describe, expect, test} from "bun:test"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    INLINE_COMMENT_SIDE,
    MERGE_REQUEST_DIFF_FILE_STATUS,
    type CheckRunConclusion,
    type CheckRunStatus,
    type ICheckRunDTO,
    type ICommentDTO,
    type IFileBlame,
    type IGitProvider,
    type IInlineCommentDTO,
    type ICommitHistoryOptions,
    type ICommitInfo,
    type IFileTreeNode,
    type IBlameData,
    type IMergeRequestDTO,
    type IMergeRequestDiffFileDTO,
    type IBranchInfo,
} from "../../../../src"

class InMemoryGitProvider implements IGitProvider {
    public getMergeRequest(id: string): Promise<IMergeRequestDTO> {
        return Promise.resolve({
            id,
            number: 10,
            title: "Improve contract coverage",
            description: "Add missing adapter contract tests",
            sourceBranch: "feature/contracts",
            targetBranch: "main",
            author: {
                id: "user-1",
                username: "alice",
                displayName: "Alice",
            },
            state: "opened",
            commits: [
                {
                    id: "abc123",
                    message: "add contracts",
                    author: "Alice",
                    timestamp: "2026-03-03T08:00:00.000Z",
                },
            ],
            diffFiles: [
                {
                    path: "src/contracts.ts",
                    status: MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED,
                    patch: "@@ -1,1 +1,2 @@",
                    hunks: ["@@ -1,1 +1,2 @@"],
                },
            ],
        })
    }

    public getChangedFiles(_mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]> {
        return Promise.resolve([
            {
                path: "src/contracts.ts",
                status: MERGE_REQUEST_DIFF_FILE_STATUS.MODIFIED,
                patch: "@@ -1,1 +1,2 @@",
                hunks: ["@@ -1,1 +1,2 @@"],
            },
        ])
    }

    public getFileTree(_ref: string): Promise<readonly IFileTreeNode[]> {
        return Promise.resolve([])
    }

    public getFileContentByRef(_filePath: string, _ref: string): Promise<string> {
        return Promise.resolve("mock file content")
    }

    public getCommitHistory(
        _ref: string,
        _options?: ICommitHistoryOptions,
    ): Promise<readonly ICommitInfo[]> {
        return Promise.resolve([
            {
                sha: "commit-1",
                message: "Initial scaffold",
                authorName: "Alice",
                authorEmail: "alice@example.com",
                date: "2026-03-03T08:00:00.000Z",
                filesChanged: ["src/index.ts"],
            },
            {
                sha: "commit-2",
                message: "Refactor review pipeline",
                authorName: "Bob",
                authorEmail: "bob@example.com",
                date: "2026-03-03T10:00:00.000Z",
                filesChanged: ["src/pipeline.ts"],
            },
        ])
    }

    public getBranches(): Promise<readonly IBranchInfo[]> {
        return Promise.resolve([
            {
                name: "main",
                sha: "abc123",
                isDefault: true,
                isProtected: true,
            },
            {
                name: "develop",
                sha: "def456",
                isDefault: false,
                isProtected: false,
            },
        ])
    }

    public getBlameData(_filePath: string, _ref: string): Promise<readonly IBlameData[]> {
        return Promise.resolve([
            {
                lineStart: 10,
                lineEnd: 20,
                commitSha: "abc123",
                authorName: "Alice",
                authorEmail: "alice@example.com",
                date: "2026-03-03T10:00:00.000Z",
            },
            {
                lineStart: 30,
                lineEnd: 30,
                commitSha: "def456",
                authorName: "Bob",
                authorEmail: "bob@example.com",
                date: "2026-03-03T11:00:00.000Z",
            },
        ])
    }

    public getBlameDataBatch(
        filePaths: readonly string[],
        ref: string,
    ): Promise<readonly IFileBlame[]> {
        return Promise.resolve(
            filePaths.map((filePath): IFileBlame => {
                return {
                    filePath,
                    blame: [
                        {
                            lineStart: 10,
                            lineEnd: 20,
                            commitSha: `${ref}-${filePath}-commit`,
                            authorName: "Alice",
                            authorEmail: "alice@example.com",
                            date: "2026-03-03T10:00:00.000Z",
                        },
                    ],
                }
            }),
        )
    }

    public postComment(_mergeRequestId: string, body: string): Promise<ICommentDTO> {
        return Promise.resolve({
            id: "comment-1",
            body,
            author: "review-bot",
            createdAt: "2026-03-03T08:10:00.000Z",
        })
    }

    public postInlineComment(
        _mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        return Promise.resolve(comment)
    }

    public createCheckRun(_mergeRequestId: string, name: string): Promise<ICheckRunDTO> {
        return Promise.resolve({
            id: "check-1",
            name,
            status: CHECK_RUN_STATUS.QUEUED,
            conclusion: CHECK_RUN_CONCLUSION.NEUTRAL,
        })
    }

    public updateCheckRun(
        checkId: string,
        status: CheckRunStatus,
        conclusion: CheckRunConclusion,
    ): Promise<ICheckRunDTO> {
        return Promise.resolve({
            id: checkId,
            name: "CodeNautic Review",
            status,
            conclusion,
        })
    }
}

describe("IGitProvider contract", () => {
    test("provides merge request payload and changed files", async () => {
        const provider = new InMemoryGitProvider()

        const mergeRequest = await provider.getMergeRequest("mr-1")
        const files = await provider.getChangedFiles("mr-1")

        expect(mergeRequest.id).toBe("mr-1")
        expect(mergeRequest.diffFiles).toHaveLength(1)
        expect(files[0]?.status).toBe("modified")
    })

    test("posts comments and manages check runs", async () => {
        const provider = new InMemoryGitProvider()

        const comment = await provider.postComment("mr-1", "Looks good")
        const inlineComment = await provider.postInlineComment("mr-1", {
            id: "inline-1",
            body: "Null-check is required here",
            author: "review-bot",
            createdAt: "2026-03-03T08:11:00.000Z",
            filePath: "src/main.ts",
            line: 17,
            side: INLINE_COMMENT_SIDE.RIGHT,
        })
        const createdCheck = await provider.createCheckRun("mr-1", "CodeNautic Review")
        const updatedCheck = await provider.updateCheckRun(
            createdCheck.id,
            CHECK_RUN_STATUS.COMPLETED,
            CHECK_RUN_CONCLUSION.SUCCESS,
        )

        expect(comment.body).toBe("Looks good")
        expect(inlineComment.side).toBe("RIGHT")
        expect(createdCheck.status).toBe("queued")
        expect(updatedCheck.status).toBe("completed")
        expect(updatedCheck.conclusion).toBe("success")
    })

    test("gets file content by ref", async () => {
        const provider = new InMemoryGitProvider()
        const fileContent = await provider.getFileContentByRef("src/contracts.ts", "feature/contracts")

        expect(fileContent).toBe("mock file content")
    })

    test("returns commit history", async () => {
        const provider = new InMemoryGitProvider()
        const commits = await provider.getCommitHistory("main", {
            maxCount: 2,
            since: "2026-01-01T00:00:00.000Z",
        })

        expect(commits).toHaveLength(2)
        expect(commits[0]?.sha).toBe("commit-1")
        expect(commits[1]?.sha).toBe("commit-2")
        expect(commits[0]?.filesChanged).toHaveLength(1)
        expect(commits[1]?.filesChanged[0]).toBe("src/pipeline.ts")
    })

    test("gets branch metadata", async () => {
        const provider = new InMemoryGitProvider()
        const branches = await provider.getBranches()

        expect(branches).toHaveLength(2)
        expect(branches[0]?.name).toBe("main")
        expect(branches[0]?.isDefault).toBe(true)
        expect(branches[1]?.isProtected).toBe(false)
    })

    test("returns blame data by file reference", async () => {
        const provider = new InMemoryGitProvider()

        const blame = await provider.getBlameData("src/index.ts", "main")

        expect(blame).toHaveLength(2)
        expect(blame[0]?.lineStart).toBe(10)
        expect(blame[1]?.commitSha).toBe("def456")
        expect(blame[1]?.authorName).toBe("Bob")
    })

    test("returns batch blame data in input order", async () => {
        const provider = new InMemoryGitProvider()

        const blame = await provider.getBlameDataBatch(
            ["src/index.ts", "src/pipeline.ts"],
            "main",
        )

        expect(blame).toHaveLength(2)
        expect(blame[0]?.filePath).toBe("src/index.ts")
        expect(blame[0]?.blame[0]?.commitSha).toBe("main-src/index.ts-commit")
        expect(blame[1]?.filePath).toBe("src/pipeline.ts")
    })
})
