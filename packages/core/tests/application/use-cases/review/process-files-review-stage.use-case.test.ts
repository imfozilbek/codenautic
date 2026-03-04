import {describe, expect, test} from "bun:test"

import {Result, ValidationError} from "../../../../src"
import type {
    IChatRequestDTO,
    IChatResponseDTO,
    IGeneratePromptInput,
    ILLMProvider,
    IStreamingChatResponseDTO,
    IUseCase,
} from "../../../../src"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {ProcessFilesReviewStageUseCase} from "../../../../src/application/use-cases/review/process-files-review-stage.use-case"
import type {IReviewFileDefaults} from "../../../../src/application/dto/config/system-defaults.dto"

const fileReviewDefaults: IReviewFileDefaults = {
    model: "gpt-4o-mini",
    maxTokens: 1000,
    timeoutMs: 60_000,
    reviewDepthStrategy: "auto",
    systemPromptName: "code-review-system",
    reviewerPrompt: "Review this file patch and suggest actionable issues.",
}

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
 * In-memory prompt generator stub for stage tests.
 */
class InMemoryGeneratePromptUseCase
    implements IUseCase<IGeneratePromptInput, string, ValidationError>
{
    public readonly calls: IGeneratePromptInput[] = []
    public nextResult: Result<string, ValidationError>

    /**
     * Creates prompt use case stub with failure default.
     */
    public constructor() {
        this.nextResult = Result.ok("TEMPLATE_SYSTEM")
    }

    public execute(
        input: IGeneratePromptInput,
    ): Promise<Result<string, ValidationError>> {
        this.calls.push(input)
        return Promise.resolve(this.nextResult)
    }
}

interface IUseCaseBundle {
    readonly useCase: ProcessFilesReviewStageUseCase
    readonly generatePromptUseCase: InMemoryGeneratePromptUseCase
}

/**
 * Creates process-files-review use case with prompt generator stub.
 *
 * @param llmProvider LLM provider stub.
 * @param promptUseCase Optional prompt use case override.
 * @returns Use case bundle with prompt stub for customization.
 */
function createUseCaseBundle(
    llmProvider: ILLMProvider,
    promptUseCase?: InMemoryGeneratePromptUseCase,
): IUseCaseBundle {
    const generatePromptUseCase = promptUseCase ?? new InMemoryGeneratePromptUseCase()

    return {
        useCase: new ProcessFilesReviewStageUseCase({
            llmProvider,
            generatePromptUseCase,
            defaults: fileReviewDefaults,
        }),
        generatePromptUseCase,
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

/**
 * Builds a map from reviewed file path to request message texts.
 *
 * @param requests Chat requests.
 * @returns File-to-messages mapping.
 */
function indexRequestsByFile(requests: readonly IChatRequestDTO[]): Map<string, string[]> {
    const requestByFile = new Map<string, string[]>()
    for (const request of requests) {
        const userMessage = request.messages[1]?.content ?? ""
        const filePath = userMessage.includes("FILE: ") === false
            ? ""
            : userMessage.slice(userMessage.indexOf("FILE: ") + 6)

        const lineBreakIndex = filePath.indexOf("\n")
        const currentFile = lineBreakIndex < 0
            ? filePath.trim()
            : filePath.slice(0, lineBreakIndex).trim()

        if (currentFile.length === 0) {
            continue
        }

        requestByFile.set(currentFile, request.messages.map((message) => message.content))
    }

    return requestByFile
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

        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
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
        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
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

        const {useCase} = createUseCaseBundle(llmProvider)
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

    test("prefers prompt template output over prompt overrides when template is available", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/template.ts",
            {
                content: JSON.stringify({
                    message: "Template issue",
                }),
            },
        )

        const {useCase, generatePromptUseCase} = createUseCaseBundle(llmProvider)
        generatePromptUseCase.nextResult = Result.ok("TEMPLATE_SYSTEM")

        const state = createState(
            [
                {
                    path: "src/template.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import a from \"x\"\n",
                    status: "modified",
                },
            ],
            {
                promptOverrides: {
                    categories: {
                        descriptions: {
                            bug: "OVERRIDE_BUG",
                        },
                    },
                },
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(generatePromptUseCase.calls).toHaveLength(1)
        expect(generatePromptUseCase.calls[0]?.name).toBe("code-review-system")
        const systemPrompt = llmProvider.requests.at(0)?.messages.at(0)?.content ?? ""
        expect(systemPrompt).toBe("TEMPLATE_SYSTEM")
        expect(systemPrompt).not.toContain("OVERRIDE_BUG")
    })

    test("fails stage when prompt template is missing", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const {useCase, generatePromptUseCase} = createUseCaseBundle(llmProvider)
        generatePromptUseCase.nextResult = Result.fail(
            new ValidationError("Generate prompt failed", [{
                field: "name",
                message: "Template not found",
            }]),
        )

        const state = createState(
            [
                {
                    path: "src/missing.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import a from \"x\"\n",
                    status: "modified",
                },
            ],
            {},
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.recoverable).toBe(false)
        expect(result.error.message).toContain("Missing prompt template")
        expect(llmProvider.requests).toHaveLength(0)
    })

    test("applies matching directory overrides for heavy strategy and system prompt", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/core/index.ts",
            {
                content: JSON.stringify({
                    message: "Core issue",
                }),
            },
        )

        const {useCase} = createUseCaseBundle(llmProvider)
        const state = createState(
            [
                {
                    path: "src/core/index.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import a from \"x\"\n",
                    fullFileContent: "export const value = 1",
                    status: "modified",
                },
                {
                    path: "src/app.ts",
                    patch: "@@ -1,1 +1,1 @@\n-console\n+result\n",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-light",
                directories: [
                    {
                        path: "src/core",
                        config: {
                            reviewDepthStrategy: "always-heavy",
                        },
                    },
                ],
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const coreRequest = llmProvider.requests.at(0)
        const requestMessages = coreRequest?.messages

        const systemPrompt = requestMessages?.at(0)?.content ?? ""
        const userPrompt = requestMessages?.at(1)?.content ?? ""
        expect(systemPrompt).toBe("TEMPLATE_SYSTEM")
        expect(userPrompt).toContain("FULL_FILE:")
        expect(userPrompt).toContain("Review this file patch")
    })

    test("keeps global prompts and light strategy for non-matching file", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/app.ts",
            {
                content: JSON.stringify({
                    message: "App issue",
                }),
            },
        )

        const {useCase} = createUseCaseBundle(llmProvider)
        const state = createState(
            [
                {
                    path: "src/app.ts",
                    patch: "@@ -1,1 +1,1 @@\n-console\n+result\n",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-light",
                directories: [
                    {
                        path: "src/core",
                        config: {
                            reviewDepthStrategy: "always-heavy",
                        },
                    },
                ],
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        const appRequest = llmProvider.requests.at(0)
        const requestMessages = appRequest?.messages

        const systemPrompt = requestMessages?.at(0)?.content ?? ""
        const userPrompt = requestMessages?.at(1)?.content ?? ""
        expect(systemPrompt).toBe("TEMPLATE_SYSTEM")
        expect(userPrompt).toContain("Review this file patch")
        expect(userPrompt).not.toContain("FULL_FILE:")

        const stats = result.value.state.externalContext?.["fileReviewStats"] as
            | Readonly<Record<string, unknown>>
            | undefined
        expect(stats?.["modeSummary"]).toMatchObject({
            requested: {
                light: 1,
                heavy: 0,
            },
        })
    })

    test("chooses more specific directory config when multiple patterns match", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/core/index.ts",
            {
                content: JSON.stringify({
                    message: "Core issue",
                }),
            },
        )

        const {useCase} = createUseCaseBundle(llmProvider)
        const state = createState(
            [
                {
                    path: "src/core/index.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import a from \"x\"\n",
                    fullFileContent: "export const value = 1",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-light",
                directories: [
                    {
                        path: "src",
                        config: {
                            reviewDepthStrategy: "always-light",
                        },
                    },
                    {
                        path: "src/core",
                        config: {
                            reviewDepthStrategy: "always-heavy",
                        },
                    },
                ],
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
        expect(stats?.["modeSummary"]).toMatchObject({
            requested: {
                light: 0,
                heavy: 1,
            },
        })
        const systemPrompt = llmProvider.requests.at(0)?.messages.at(0)?.content ?? ""
        expect(systemPrompt).toBe("TEMPLATE_SYSTEM")
    })

    test("supports glob pattern override and keeps light mode for non-matching files", async () => {
        const llmProvider = new InMemoryLLMProvider()
        llmProvider.replies.set(
            "src/core/index.ts",
            {
                content: JSON.stringify({
                    message: "Root file issue",
                }),
            },
        )
        llmProvider.replies.set(
            "src/core/utils/helper.ts",
            {
                content: JSON.stringify({
                    message: "Nested file issue",
                }),
            },
        )
        llmProvider.replies.set(
            "src/core/utils/inner/nested.ts",
            {
                content: JSON.stringify({
                    message: "Nested inner issue",
                }),
            },
        )

        const {useCase} = createUseCaseBundle(llmProvider)
        const state = createState(
            [
                {
                    path: "src/core/index.ts",
                    patch: "@@ -1,1 +1,1 @@\n+import a from \"x\"\n",
                    fullFileContent: "export const value = 1",
                    status: "modified",
                },
                {
                    path: "src/core/utils/helper.ts",
                    patch: "@@ -1,1 +1,1 @@\n+export const b = 2\n",
                    status: "modified",
                },
                {
                    path: "src/core/utils/inner/nested.ts",
                    patch: "@@ -1,1 +1,1 @@\n+export const c = 3\n",
                    fullFileContent: "export const c = 3",
                    status: "modified",
                },
            ],
            {
                reviewDepthStrategy: "always-light",
                directories: [
                    {
                        path: "./src/core/*.ts",
                        config: {
                            reviewDepthStrategy: "always-heavy",
                        },
                    },
                ],
            },
            null,
        )

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(llmProvider.requests).toHaveLength(3)
        const requestByFile = indexRequestsByFile(llmProvider.requests)

        expect(requestByFile.has("src/core/index.ts")).toBe(true)
        expect(requestByFile.has("src/core/utils/helper.ts")).toBe(true)
        expect(requestByFile.has("src/core/utils/inner/nested.ts")).toBe(true)

        const indexRequest = requestByFile.get("src/core/index.ts")
        const helperRequest = requestByFile.get("src/core/utils/helper.ts")
        const nestedRequest = requestByFile.get("src/core/utils/inner/nested.ts")
        expect(indexRequest).toBeDefined()
        expect(helperRequest).toBeDefined()
        expect(nestedRequest).toBeDefined()

        const hasGlobalSystem = (messages: string[] | undefined): boolean => {
            return messages?.at(0)?.includes("TEMPLATE_SYSTEM") ?? false
        }
        const hasFullFile = (messages: string[] | undefined): boolean => {
            return messages?.at(1)?.includes("FULL_FILE:") ?? false
        }

        expect(hasGlobalSystem(indexRequest)).toBe(true)
        expect(hasFullFile(indexRequest)).toBe(true)

        expect(hasGlobalSystem(helperRequest)).toBe(true)
        expect(hasFullFile(helperRequest)).toBe(false)

        expect(hasGlobalSystem(nestedRequest)).toBe(true)
        expect(hasFullFile(nestedRequest)).toBe(false)
    })

    test("returns recoverable stage error when unexpected internal failure escapes analyzer", async () => {
        const llmProvider = new InMemoryLLMProvider()
        const {useCase} = createUseCaseBundle(llmProvider)
        const internals = useCase as unknown as {
            analyzeSingleFile: (
                file: Readonly<Record<string, unknown>>,
                config: Readonly<Record<string, unknown>>,
                timeoutMs: number,
                reviewDepthStrategy: string,
                templateSystemPrompt: string | undefined,
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
