import {describe, expect, test} from "bun:test"

import type {
    CheckRunConclusion,
    CheckRunStatus,
    ICheckRunDTO,
    ICommentDTO,
    IGitProvider,
    IInlineCommentDTO,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
} from "../../../../src"
import {CreateCheckStageUseCase} from "../../../../src/application/use-cases/review/create-check-stage.use-case"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

class InMemoryGitProvider implements IGitProvider {
    public lastMergeRequestId: string | null = null
    public lastCheckName: string | null = null
    public shouldThrowOnCreateCheck = false

    public getMergeRequest(_id: string): Promise<IMergeRequestDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public getChangedFiles(_mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]> {
        return Promise.resolve([])
    }

    public postComment(_mergeRequestId: string, _body: string): Promise<ICommentDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public postInlineComment(
        _mergeRequestId: string,
        _comment: IInlineCommentDTO,
    ): Promise<IInlineCommentDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public createCheckRun(mergeRequestId: string, name: string): Promise<ICheckRunDTO> {
        if (this.shouldThrowOnCreateCheck) {
            return Promise.reject(new Error("provider unavailable"))
        }

        this.lastMergeRequestId = mergeRequestId
        this.lastCheckName = name
        return Promise.resolve({
            id: "check-1",
            name,
            status: "queued" as CheckRunStatus,
            conclusion: "neutral" as CheckRunConclusion,
        })
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
 * Creates state for create-check stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @returns Pipeline state.
 */
function createState(mergeRequest: Readonly<Record<string, unknown>>): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-create-check",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
    })
}

describe("CreateCheckStageUseCase", () => {
    test("creates pending check and stores check id in state", async () => {
        const gitProvider = new InMemoryGitProvider()
        const useCase = new CreateCheckStageUseCase({
            gitProvider,
        })
        const state = createState({
            id: "mr-10",
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.checkId).toBe("check-1")
        expect(result.value.metadata?.checkpointHint).toBe("check:created")
        expect(gitProvider.lastMergeRequestId).toBe("mr-10")
        expect(gitProvider.lastCheckName).toBe("CodeNautic Review")
    })

    test("returns fail result when merge request id is missing", async () => {
        const useCase = new CreateCheckStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState({})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.originalError?.name).toBe("NotFoundError")
    })

    test("returns recoverable stage error when provider throws", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.shouldThrowOnCreateCheck = true

        const useCase = new CreateCheckStageUseCase({
            gitProvider,
            checkRunName: "Custom Check Name",
        })
        const state = createState({
            id: "mr-10",
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("Failed to create check run")
    })
})
