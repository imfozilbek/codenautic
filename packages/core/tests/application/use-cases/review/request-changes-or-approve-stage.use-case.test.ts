import {describe, expect, test} from "bun:test"

import type {
    ICheckRunDTO,
    ICommentDTO,
    IGitProvider,
    IFileTreeNode,
    IInlineCommentDTO,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
} from "../../../../src"
import {CHECK_RUN_CONCLUSION, CHECK_RUN_STATUS} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {RequestChangesOrApproveStageUseCase} from "../../../../src/application/use-cases/review/request-changes-or-approve-stage.use-case"

class InMemoryGitProvider implements IGitProvider {
    public postedComments: string[] = []

    public getMergeRequest(_id: string): Promise<IMergeRequestDTO> {
        return Promise.reject(new Error("not implemented for test"))
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
        this.postedComments.push(body)
        return Promise.resolve({
            id: `decision-${this.postedComments.length}`,
            body,
            author: "codenautic-bot",
            createdAt: "2026-03-03T12:30:00.000Z",
        })
    }

    public postInlineComment(
        _mergeRequestId: string,
        _comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        return Promise.reject(new Error("not implemented for test"))
    }

    public createCheckRun(_mergeRequestId: string, _name: string): Promise<ICheckRunDTO> {
        return Promise.resolve({
            id: "check-1",
            name: "review",
            status: CHECK_RUN_STATUS.IN_PROGRESS,
            conclusion: CHECK_RUN_CONCLUSION.NEUTRAL,
        })
    }

    public updateCheckRun(
        _checkId: string,
        _status: typeof CHECK_RUN_STATUS[keyof typeof CHECK_RUN_STATUS],
        _conclusion: typeof CHECK_RUN_CONCLUSION[keyof typeof CHECK_RUN_CONCLUSION],
    ): Promise<ICheckRunDTO> {
        return Promise.resolve({
            id: "check-1",
            name: "review",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion: CHECK_RUN_CONCLUSION.SUCCESS,
        })
    }
}

/**
 * Creates state for request-changes-or-approve stage tests.
 *
 * @param config Config payload.
 * @param suggestions Suggestions payload.
 * @param mergeRequest Merge request payload.
 * @returns Pipeline state.
 */
function createState(
    config: Readonly<Record<string, unknown>>,
    suggestions: readonly Readonly<Record<string, unknown>>[],
    mergeRequest: Readonly<Record<string, unknown>>,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-review-decision",
        definitionVersion: "v1",
        mergeRequest,
        config,
        suggestions,
    })
}

function createSuggestion(severity: string): Readonly<Record<string, unknown>> {
    return {
        id: `s-${severity}`,
        filePath: "src/a.ts",
        lineStart: 4,
        lineEnd: 4,
        severity,
        category: "quality",
        message: `${severity} issue`,
        committable: true,
        rankScore: 60,
    }
}

describe("RequestChangesOrApproveStageUseCase", () => {
    test("approves review when autoApprove is enabled and no blocking issues exist", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new RequestChangesOrApproveStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                autoApprove: true,
            },
            [createSuggestion("LOW"), createSuggestion("MEDIUM")],
            {
                id: "mr-62",
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("review-decision:approved")
        const decision = result.value.state.externalContext?.["reviewDecision"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(decision?.["decision"]).toBe("approved")
        expect(decision?.["blockingIssues"]).toBe(0)
    })

    test("requests changes when blocking severity exists", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new RequestChangesOrApproveStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                autoApprove: true,
            },
            [createSuggestion("HIGH"), createSuggestion("LOW")],
            {
                id: "mr-62",
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("review-decision:changes_requested")
        const decision = result.value.state.externalContext?.["reviewDecision"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(decision?.["decision"]).toBe("changes_requested")
        expect(decision?.["blockingIssues"]).toBe(1)
    })

    test("returns fail result when merge request id is missing", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new RequestChangesOrApproveStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                autoApprove: false,
            },
            [createSuggestion("LOW")],
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("merge request id")
    })
})
