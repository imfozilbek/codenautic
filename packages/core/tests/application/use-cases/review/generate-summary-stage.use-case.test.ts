import {describe, expect, test} from "bun:test"

import type {
    IChatRequestDTO,
    IChatResponseDTO,
    ICheckRunDTO,
    ICommentDTO,
    IGitProvider,
    IFileTreeNode,
    IInlineCommentDTO,
    ILLMProvider,
    IMergeRequestDTO,
    IMergeRequestDiffFileDTO,
    IStreamingChatResponseDTO,
} from "../../../../src"
import {CHECK_RUN_CONCLUSION, CHECK_RUN_STATUS} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {GenerateSummaryStageUseCase} from "../../../../src/application/use-cases/review/generate-summary-stage.use-case"

const summaryDefaults = {
    model: "gpt-4o-mini",
    maxTokens: 700,
    systemPrompt: "You are a senior reviewer assistant. Produce concise markdown summary.",
    userPrompt: "Summarize key review findings, risk, and next actions.",
}

class InMemoryLLMProvider implements ILLMProvider {
    public shouldThrow = false
    public responseText = ""

    public chat(_request: IChatRequestDTO): Promise<IChatResponseDTO> {
        if (this.shouldThrow) {
            return Promise.reject(new Error("llm unavailable"))
        }

        return Promise.resolve({
            content: this.responseText,
            usage: {
                input: 12,
                output: 8,
                total: 20,
            },
        })
    }

    public stream(_request: IChatRequestDTO): IStreamingChatResponseDTO {
        return {
            [Symbol.asyncIterator](): AsyncIterator<{delta: string}> {
                return {
                    next(): Promise<IteratorResult<{delta: string}>> {
                        return Promise.resolve({
                            done: true,
                            value: {
                                delta: "",
                            },
                        })
                    },
                }
            },
        }
    }

    public embed(_texts: readonly string[]): Promise<readonly number[][]> {
        return Promise.resolve([[0.1]])
    }
}

class InMemoryGitProvider implements IGitProvider {
    public shouldThrowOnPost = false
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
        if (this.shouldThrowOnPost) {
            return Promise.reject(new Error("cannot post comment"))
        }

        this.postedComments.push(body)
        return Promise.resolve({
            id: `comment-${this.postedComments.length}`,
            body,
            author: "codenautic-bot",
            createdAt: "2026-03-03T12:00:00.000Z",
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
            name: "check",
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
            name: "check",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion: CHECK_RUN_CONCLUSION.SUCCESS,
        })
    }
}

/**
 * Creates state for generate-summary stage tests.
 *
 * @param mergeRequest Merge request payload.
 * @returns Pipeline state.
 */
function createState(mergeRequest: Readonly<Record<string, unknown>>): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-generate-summary",
        definitionVersion: "v1",
        mergeRequest,
        config: {},
        commentId: "comment-initial-1",
        suggestions: [
            {
                id: "s1",
                filePath: "src/a.ts",
                lineStart: 4,
                lineEnd: 4,
                severity: "HIGH",
                category: "bug",
                message: "Fix null check",
                committable: true,
                rankScore: 80,
            },
        ],
        metrics: {
            issueCount: 1,
            riskLevel: "HIGH",
        },
    })
}

describe("GenerateSummaryStageUseCase", () => {
    test("generates summary and publishes summary comment", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.responseText = "Summary: one high issue remains in core module."
        const gitProvider = new InMemoryGitProvider()
        const useCase = new GenerateSummaryStageUseCase({
            llmProvider,
            gitProvider,
            defaults: summaryDefaults,
        })
        const state = createState({
            id: "mr-61",
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("summary:generated")
        expect(gitProvider.postedComments).toHaveLength(1)
        expect(gitProvider.postedComments[0]?.includes("source comment: comment-initial-1")).toBe(true)
        const summary = result.value.state.externalContext?.["summary"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(summary?.["text"]).toContain("Summary:")
        expect(summary?.["summaryCommentId"]).toBe("comment-1")
    })

    test("returns fail result when merge request id is missing", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const gitProvider = new InMemoryGitProvider()
        const useCase = new GenerateSummaryStageUseCase({
            llmProvider,
            gitProvider,
            defaults: summaryDefaults,
        })
        const state = createState({})

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("merge request id")
    })

    test("returns recoverable stage error when llm generation fails", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.shouldThrow = true
        const gitProvider = new InMemoryGitProvider()
        const useCase = new GenerateSummaryStageUseCase({
            llmProvider,
            gitProvider,
            defaults: summaryDefaults,
        })
        const state = createState({
            id: "mr-61",
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("generate or publish review summary")
    })
})
