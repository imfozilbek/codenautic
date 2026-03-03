import {describe, expect, test} from "bun:test"

import type {
    IChatRequestDTO,
    IChatResponseDTO,
    ILLMProvider,
    IStreamingChatResponseDTO,
} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {ProcessFilesReviewStageUseCase} from "../../../../src/application/use-cases/review/process-files-review-stage.use-case"

interface IFileReply {
    readonly content: string
    readonly delayMs?: number
    readonly shouldThrow?: boolean
}

class InMemoryLLMProvider implements ILLMProvider {
    public readonly requests: IChatRequestDTO[] = []
    public readonly replies = new Map<string, IFileReply>()
    public readonly seenFiles: string[] = []

    public async chat(request: IChatRequestDTO): Promise<IChatResponseDTO> {
        this.requests.push(request)
        const userMessage = request.messages[1]?.content ?? ""
        const filePath = this.extractFilePath(userMessage)
        this.seenFiles.push(filePath)
        const reply = this.replies.get(filePath)

        if (reply?.delayMs !== undefined && reply.delayMs > 0) {
            await new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve()
                }, reply.delayMs)
            })
        }

        if (reply?.shouldThrow === true) {
            return Promise.reject(new Error("llm failure"))
        }

        return Promise.resolve({
            content: reply?.content ?? "",
            usage: {
                input: 8,
                output: 4,
                total: 12,
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

    /**
     * Extracts file path marker from user prompt.
     *
     * @param content User message content.
     * @returns File path marker.
     */
    private extractFilePath(content: string): string {
        const filePrefix = "FILE: "
        const startIndex = content.indexOf(filePrefix)
        if (startIndex < 0) {
            return "unknown"
        }

        const sliced = content.slice(startIndex + filePrefix.length)
        const lineBreakIndex = sliced.indexOf("\n")
        if (lineBreakIndex < 0) {
            return sliced.trim()
        }

        return sliced.slice(0, lineBreakIndex).trim()
    }
}

/**
 * Creates state for process-files-review stage tests.
 *
 * @param files Files payload.
 * @param config Config payload.
 * @param externalContext External context payload.
 * @returns Pipeline state.
 */
function createState(
    files: readonly Readonly<Record<string, unknown>>[],
    config: Readonly<Record<string, unknown>>,
    externalContext: Readonly<Record<string, unknown>> | null,
): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-files-review",
        definitionVersion: "v1",
        mergeRequest: {
            id: "mr-41",
        },
        config,
        files,
        externalContext,
    })
}

describe("ProcessFilesReviewStageUseCase", () => {
    test("processes files by batches and deduplicates collected suggestions", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/a.ts",
            {
                content: JSON.stringify([
                    {
                        message: "Duplicate issue",
                        severity: "HIGH",
                        category: "bug",
                        lineStart: 5,
                        lineEnd: 5,
                        committable: true,
                        rankScore: 90,
                    },
                ]),
            },
        )
        llmProvider.replies.set(
            "src/b.ts",
            {
                content: JSON.stringify({
                    suggestions: [
                        {
                            message: "Duplicate issue",
                            severity: "HIGH",
                            category: "bug",
                            lineStart: 5,
                            lineEnd: 5,
                            committable: true,
                            rankScore: 90,
                        },
                    ],
                }),
            },
        )

        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [{path: "src/a.ts", patch: "@@"}, {path: "src/b.ts", patch: "@@"}],
            {},
            {
                batches: [[{path: "src/a.ts", patch: "@@"}], [{path: "src/b.ts", patch: "@@"}]],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("files-review:processed")
        expect(result.value.state.suggestions).toHaveLength(2)
        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["batchCount"]).toBe(2)
        expect(stats?.["timedOutFiles"]).toBe(0)
        expect(stats?.["failedFiles"]).toBe(0)
    })

    test("does not fail whole stage when one file times out", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/slow.ts",
            {
                content: "slow",
                delayMs: 20,
            },
        )
        llmProvider.replies.set(
            "src/fast.ts",
            {
                content: "Quick suggestion",
            },
        )

        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [{path: "src/slow.ts", patch: "@@"}, {path: "src/fast.ts", patch: "@@"}],
            {
                fileReviewTimeoutMs: 5,
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["timedOutFiles"]).toBe(1)
        expect(result.value.metadata?.notes?.includes("timed out")).toBe(true)
        expect(result.value.state.suggestions).toHaveLength(1)
    })

    test("marks failed files when llm throws and keeps stage successful", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/fail.ts",
            {
                content: "",
                shouldThrow: true,
            },
        )

        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [{path: "src/fail.ts", patch: "@@"}],
            {},
            {
                batches: [[{path: "src/fail.ts", patch: "@@"}]],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["failedFiles"]).toBe(1)
        expect(result.value.state.suggestions).toHaveLength(0)
    })

    test("handles malformed batches and malformed file entries", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/good.ts",
            {
                content: "",
            },
        )
        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [{path: "src/good.ts", patch: "@@"}, {wrong: "x"}],
            {},
            {
                batches: ["invalid", [{wrong: "x"}]],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["batchCount"]).toBe(1)
        expect(stats?.["failedFiles"]).toBe(1)
    })

    test("falls back to light mode when strategy requires heavy but file content is unavailable", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/heavy.ts",
            {
                content: JSON.stringify({
                    message: "Needs heavy review",
                }),
            },
        )

        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [
                {
                    path: "src/heavy.ts",
                    patch:
                        "+export class Example {}\n@@ -1,1 +1,1 @@\n-const old = 1\n+const new = 2",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-heavy",
            },
            {
                batches: [[{path: "src/heavy.ts", patch: "+export class Example {}"}]],
            },
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["modeSummary"]).toMatchObject({
            requested: {
                heavy: 1,
                light: 0,
            },
            effective: {
                heavy: 0,
                light: 1,
            },
            fallbackToLight: 1,
        })
        expect(result.value.state.suggestions).toHaveLength(1)
    })

    test("uses FULL_FILE prompt for heavy mode when full file content is available", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/heavy.ts",
            {
                content: JSON.stringify({
                    message: "Needs deep review",
                }),
            },
        )

        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const state = createState(
            [
                {
                    path: "src/heavy.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import x from \"a\"\n",
                    fullFileContent: "export const value = 1",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-heavy",
                batchSize: 1,
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const lastRequest = llmProvider.requests.at(-1)
        const userMessage = lastRequest?.messages?.[1]?.content
        expect(userMessage).toContain("FULL_FILE:")
        expect(userMessage).toContain("export const value = 1")
    })

    test("returns recoverable stage error when unexpected internal failure escapes analyzer", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const useCase = new ProcessFilesReviewStageUseCase({
            llmProvider,
        })
        const internals = useCase as unknown as {
            analyzeSingleFile: (
                file: Readonly<Record<string, unknown>>,
                config: Readonly<Record<string, unknown>>,
                timeoutMs: number,
                reviewDepthStrategy: string,
            ) => Promise<unknown>
        }
        internals.analyzeSingleFile = (): Promise<unknown> => {
            return Promise.reject(new Error("unexpected analyzer failure"))
        }

        const state = createState([{path: "src/a.ts", patch: "@@"}], {}, null)

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(true)
        expect(result.error.message).toContain("file-level review stage")
    })
})
