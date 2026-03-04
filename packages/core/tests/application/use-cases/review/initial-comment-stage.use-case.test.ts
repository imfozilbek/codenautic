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
import {InitialCommentStageUseCase} from "../../../../src/application/use-cases/review/initial-comment-stage.use-case"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

const initialCommentDefaults = {
    body: "CodeNautic review started. Preparing analysis...",
}

class InMemoryGitProvider implements IGitProvider {
    public shouldThrowOnComment = false
    public lastCommentBody: string | null = null
    public lastMergeRequestId: string | null = null

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

    public postComment(mergeRequestId: string, body: string): Promise<ICommentDTO> {
        if (this.shouldThrowOnComment) {
            return Promise.reject(new Error("provider unavailable"))
        }

        this.lastMergeRequestId = mergeRequestId
        this.lastCommentBody = body
        return Promise.resolve({
            id: "comment-1",
            body,
            author: "bot",
            createdAt: "2026-03-03T10:00:00.000Z",
        })
    }

    public postInlineComment(
        _mergeRequestId: string,
        _comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        return Promise.reject(new Error("not implemented in test"))
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
 * Creates state for initial-comment stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @param config Config payload.
 * @returns Pipeline state.
 */
function createState(
    mergeRequest: Readonly<Record<string, unknown>>,
    config: Readonly<Record<string, unknown>>,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-initial-comment",
        definitionVersion: "v1",
        mergeRequest,
        config,
    })
}

describe("InitialCommentStageUseCase", () => {
    test("posts initial comment and stores comment id", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new InitialCommentStageUseCase({
            gitProvider,
            defaults: initialCommentDefaults,
        })
        const state = createState(
            {
                id: "mr-30",
            },
            {
                initialCommentBody: "  Review started from config  ",
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("initial-comment:created")
        expect(result.value.state.commentId).toBe("comment-1")
        expect(gitProvider.lastMergeRequestId).toBe("mr-30")
        expect(gitProvider.lastCommentBody).toBe("Review started from config")
    })

    test("returns fail result when merge request id is missing", async () => {
        const useCase = new InitialCommentStageUseCase({
            gitProvider: new InMemoryGitProvider(),
            defaults: initialCommentDefaults,
        })
        const state = createState({}, {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.originalError?.name).toBe("NotFoundError")
    })

    test("returns recoverable error when provider throws", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.shouldThrowOnComment = true

        const useCase = new InitialCommentStageUseCase({
            gitProvider,
            defaults: initialCommentDefaults,
        })
        const state = createState(
            {
                id: "mr-31",
            },
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("Failed to create initial review comment")
    })
})
