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
import {FinalizeCheckStageUseCase} from "../../../../src/application/use-cases/review/finalize-check-stage.use-case"

class InMemoryGitProvider implements IGitProvider {
    public failAttempts = 0
    public updateAttempts = 0
    public lastConclusion: string | null = null

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

    public getDiffBetweenRefs(
        baseRef: string,
        headRef: string,
    ): ReturnType<IGitProvider["getDiffBetweenRefs"]> {
        return Promise.resolve({
            baseRef,
            headRef,
            comparisonStatus: "identical",
            aheadBy: 0,
            behindBy: 0,
            totalCommits: 0,
            summary: {
                changedFiles: 0,
                addedFiles: 0,
                modifiedFiles: 0,
                deletedFiles: 0,
                renamedFiles: 0,
                additions: 0,
                deletions: 0,
                changes: 0,
            },
            files: [],
        })
    }

    public getBranches(): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public getBlameData(_filePath: string, _ref: string): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public getBlameDataBatch(
        _filePaths: readonly string[],
        _ref: string,
    ): Promise<readonly never[]> {
        return Promise.resolve([])
    }

    public postComment(_mergeRequestId: string, body: string): Promise<ICommentDTO> {
        return Promise.resolve({
            id: "comment-1",
            body,
            author: "codenautic-bot",
            createdAt: "2026-03-03T13:00:00.000Z",
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
        checkId: string,
        _status: typeof CHECK_RUN_STATUS[keyof typeof CHECK_RUN_STATUS],
        conclusion: typeof CHECK_RUN_CONCLUSION[keyof typeof CHECK_RUN_CONCLUSION],
    ): Promise<ICheckRunDTO> {
        this.updateAttempts += 1
        this.lastConclusion = conclusion
        if (this.updateAttempts <= this.failAttempts) {
            return Promise.reject(new Error(`update failed ${this.updateAttempts}`))
        }

        return Promise.resolve({
            id: checkId,
            name: "review",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion,
        })
    }
}

/**
 * Creates state for finalize-check stage tests.
 *
 * @param checkId Check run id.
 * @param externalContext External context payload.
 * @returns Pipeline state.
 */
function createState(
    checkId: string | null,
    externalContext: Readonly<Record<string, unknown>> | null,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-finalize-check",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-63",
        },
        config: {},
        checkId,
        externalContext,
    })
}

describe("FinalizeCheckStageUseCase", () => {
    test("finalizes check with success conclusion when review decision is approved", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new FinalizeCheckStageUseCase({
            gitProvider,
        })
        const state = createState("check-63", {
            reviewDecision: {
                decision: "approved",
            },
            summary: {
                text: "All good",
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("check:finalized")
        expect(gitProvider.lastConclusion).toBe(CHECK_RUN_CONCLUSION.SUCCESS)
        const payload = result.value.state.externalContext?.["finalizeCheck"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(payload?.["attempts"]).toBe(1)
        expect(payload?.["conclusion"]).toBe(CHECK_RUN_CONCLUSION.SUCCESS)
    })

    test("retries check update and succeeds on later attempt", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.failAttempts = 2
        const useCase = new FinalizeCheckStageUseCase({
            gitProvider,
        })
        const state = createState("check-63", {
            reviewDecision: {
                decision: "changes_requested",
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(gitProvider.updateAttempts).toBe(3)
        const payload = result.value.state.externalContext?.["finalizeCheck"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(payload?.["attempts"]).toBe(3)
    })

    test("returns fail result when check id is missing", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new FinalizeCheckStageUseCase({
            gitProvider,
        })
        const state = createState(null, null)

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("check id")
    })

    test("returns recoverable stage error when retries are exhausted", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.failAttempts = 3
        const useCase = new FinalizeCheckStageUseCase({
            gitProvider,
        })
        const state = createState("check-63", {
            reviewDecision: {
                decision: "changes_requested",
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("check run")
    })
})
