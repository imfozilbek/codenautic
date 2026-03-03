import {describe, expect, test} from "bun:test"

import type {
    CheckRunConclusion,
    CheckRunStatus,
    ICheckRunDTO,
    ICommentDTO,
    IGitProvider,
    IFileTreeNode,
    IInlineCommentDTO,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
} from "../../../../src"
import {CreateFileCommentsStageUseCase} from "../../../../src/application/use-cases/review/create-file-comments-stage.use-case"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

class InMemoryGitProvider implements IGitProvider {
    public shouldThrowOnInlineComment = false
    public readonly inlineComments: IInlineCommentDTO[] = []

    public getMergeRequest(_id: string): Promise<IMergeRequestDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public getChangedFiles(_mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]> {
        return Promise.resolve([])
    }

    public getFileTree(_ref: string): Promise<readonly IFileTreeNode[]> {
        return Promise.resolve([])
    }

    public getFileContentByRef(_filePath: string, _ref: string): Promise<string> {
        return Promise.resolve("")
    }

    public getCommitHistory(_ref: string): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public getBranches(): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public getBlameData(_filePath: string, _ref: string): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public postComment(_mergeRequestId: string, _body: string): Promise<ICommentDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public postInlineComment(
        _mergeRequestId: string,
        comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        if (this.shouldThrowOnInlineComment) {
            return Promise.reject(new Error("provider unavailable"))
        }

        this.inlineComments.push(comment)
        return Promise.resolve(comment)
    }

    public createCheckRun(_mergeRequestId: string, _name: string): Promise<ICheckRunDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public updateCheckRun(
        _checkId: string,
        _status: CheckRunStatus,
        _conclusion: CheckRunConclusion,
    ): Promise<ICheckRunDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }
}

/**
 * Creates state for create-file-comments stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @param suggestions Suggestions payload.
 * @returns Pipeline state.
 */
function createState(
    mergeRequest: Readonly<Record<string, unknown>>,
    suggestions: readonly Readonly<Record<string, unknown>>[],
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-file-comments",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
        suggestions,
    })
}

describe("CreateFileCommentsStageUseCase", () => {
    test("posts inline comments for normalized suggestions", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new CreateFileCommentsStageUseCase({
            gitProvider,
            now: () => new Date("2026-03-03T12:00:00.000Z"),
        })
        const state = createState(
            {
                id: "mr-60",
            },
            [
                {
                    id: "s1",
                    filePath: "src/a.ts",
                    lineStart: 11,
                    lineEnd: 12,
                    severity: "HIGH",
                    category: "bug",
                    message: "Null check is missing",
                    codeBlock: "if (value === undefined) { return }",
                    committable: true,
                    rankScore: 95,
                },
            ],
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("file-comments:published")
        expect(gitProvider.inlineComments).toHaveLength(1)
        expect(gitProvider.inlineComments[0]?.filePath).toBe("src/a.ts")
        expect(gitProvider.inlineComments[0]?.body.includes("Suggested code")).toBe(true)
        const inlineCommentsMeta = result.value.state.externalContext?.["inlineComments"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(inlineCommentsMeta?.["count"]).toBe(1)
    })

    test("skips when there are no suggestions", async () => {
        const useCase = new CreateFileCommentsStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState(
            {
                id: "mr-61",
            },
            [],
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("file-comments:skipped-empty")
    })

    test("returns fail result when merge request id is missing", async () => {
        const useCase = new CreateFileCommentsStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState(
            {},
            [
                {
                    id: "s1",
                    filePath: "src/a.ts",
                    lineStart: 1,
                    lineEnd: 1,
                    severity: "MEDIUM",
                    category: "code_quality",
                    message: "Message",
                    committable: true,
                    rankScore: 10,
                },
            ],
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.originalError?.name).toBe("NotFoundError")
    })

    test("returns recoverable stage error when provider throws", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.shouldThrowOnInlineComment = true

        const useCase = new CreateFileCommentsStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-62",
            },
            [
                {
                    id: "s1",
                    filePath: "src/a.ts",
                    lineStart: 1,
                    lineEnd: 1,
                    severity: "MEDIUM",
                    category: "code_quality",
                    message: "Message",
                    committable: true,
                    rankScore: 10,
                },
            ],
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("inline comments")
    })
})
