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
import {FetchChangedFilesStageUseCase} from "../../../../src/application/use-cases/review/fetch-changed-files-stage.use-case"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

class InMemoryGitProvider implements IGitProvider {
    public shouldThrowOnFetch = false
    public files: readonly IMergeRequestDiffFileDTO[] = []

    public getMergeRequest(_id: string): Promise<IMergeRequestDTO> {
        return Promise.reject(new Error("not implemented in test"))
    }

    public getChangedFiles(_mergeRequestId: string): Promise<readonly IMergeRequestDiffFileDTO[]> {
        if (this.shouldThrowOnFetch) {
            return Promise.reject(new Error("provider unavailable"))
        }

        return Promise.resolve(this.files)
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
 * Creates state for fetch-changed-files stage tests.
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
        runId: "run-fetch-files",
        definitionVersion: "v1",
        mergeRequest,
        config,
    })
}

describe("FetchChangedFilesStageUseCase", () => {
    test("fetches files and applies ignore paths filtering", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.files = [
            {
                path: "src/main.ts",
                status: "modified",
                patch: "@@",
                hunks: ["@@"],
            },
            {
                path: "dist/bundle.js",
                status: "modified",
                patch: "@@",
                hunks: ["@@"],
            },
        ]

        const useCase = new FetchChangedFilesStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-20",
            },
            {
                ignorePaths: ["dist/**"],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("files:fetched")
        expect(result.value.state.files).toHaveLength(1)
        expect(result.value.state.files[0]?.["path"]).toBe("src/main.ts")
    })

    test("returns all files when ignorePaths are not configured", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.files = [
            {
                path: "src/main.ts",
                status: "modified",
                patch: "@@",
                hunks: ["@@"],
            },
        ]

        const useCase = new FetchChangedFilesStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-21",
            },
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.state.files).toHaveLength(1)
    })

    test("returns fail result when merge request id is missing", async () => {
        const useCase = new FetchChangedFilesStageUseCase({
            gitProvider: new InMemoryGitProvider(),
        })
        const state = createState({}, {})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.originalError?.name).toBe("NotFoundError")
    })

    test("returns recoverable stage error when provider throws", async () => {
        const gitProvider = new InMemoryGitProvider()
        gitProvider.shouldThrowOnFetch = true

        const useCase = new FetchChangedFilesStageUseCase({
            gitProvider,
        })
        const state = createState(
            {
                id: "mr-22",
            },
            {},
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("Failed to fetch changed files")
    })
})
