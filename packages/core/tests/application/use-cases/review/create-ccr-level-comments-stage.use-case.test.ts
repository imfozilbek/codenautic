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
import {CreateCcrLevelCommentsStageUseCase} from "../../../../src/application/use-cases/review/create-ccr-level-comments-stage.use-case"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

class InMemoryGitProvider implements IGitProvider {
    public shouldThrowOnComment = false
    public readonly postedBodies: string[] = []

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

    public postComment(_mergeRequestId: string, body: string): Promise<ICommentDTO> {
        if (this.shouldThrowOnComment) {
            return Promise.reject(new Error("provider unavailable"))
        }

        this.postedBodies.push(body)
        return Promise.resolve({
            id: `comment-${this.postedBodies.length}`,
            body,
            author: "bot",
            createdAt: "2026-03-03T11:00:00.000Z",
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
 * Creates state for create-ccr-level-comments stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @param externalContext External context payload.
 * @returns Pipeline state.
 */
function createState(
    mergeRequest: Readonly<Record<string, unknown>>,
    externalContext: Readonly<Record<string, unknown>> | null,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-ccr-comments",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
        externalContext,
    })
}

describe("CreateCcrLevelCommentsStageUseCase", () => {
    test("groups suggestions by category and posts one comment per category", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new CreateCcrLevelCommentsStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-50",
            },
            {
                ccrSuggestions: [
                    {
                        id: "s1",
                        filePath: "GLOBAL",
                        lineStart: 1,
                        lineEnd: 1,
                        severity: "HIGH",
                        category: "architecture",
                        message: "Reduce coupling between modules",
                        committable: false,
                        rankScore: 90,
                    },
                    {
                        id: "s2",
                        filePath: "GLOBAL",
                        lineStart: 1,
                        lineEnd: 1,
                        severity: "MEDIUM",
                        category: "tests",
                        message: "Add integration tests",
                        committable: false,
                        rankScore: 70,
                    },
                ],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("ccr-comments:published")
        expect(gitProvider.postedBodies).toHaveLength(2)
        const ccrComments = result.value.state.externalContext?.["ccrComments"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(ccrComments?.["count"]).toBe(2)
    })

    test("skips when no ccr suggestions are available", async () => {
        const useCase = new CreateCcrLevelCommentsStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState(
            {
                id: "mr-51",
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("ccr-comments:skipped-empty")
    })

    test("returns fail result when merge request id is missing", async () => {
        const useCase = new CreateCcrLevelCommentsStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState({}, {ccrSuggestions: []})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.originalError?.name).toBe("NotFoundError")
    })

    test("returns recoverable stage error when posting comment fails", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.shouldThrowOnComment = true

        const useCase = new CreateCcrLevelCommentsStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-52",
            },
            {
                ccrSuggestions: [
                    {
                        id: "s3",
                        filePath: "GLOBAL",
                        lineStart: 1,
                        lineEnd: 1,
                        severity: "HIGH",
                        category: "architecture",
                        message: "Handle rollback path",
                        committable: false,
                        rankScore: 80,
                    },
                ],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("publish CCR-level comments")
    })
})
