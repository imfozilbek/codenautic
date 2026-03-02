import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {
    PipelineCollectionItem,
    ReviewPipelineState,
} from "../../types/review/review-pipeline-state"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {StageError} from "../../../domain/errors/stage.error"
import {deduplicate} from "../../../shared/utils/deduplicate"
import {hash} from "../../../shared/utils/hash"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readObjectField,
} from "./pipeline-stage-state.utils"

const DEFAULT_FILE_REVIEW_MODEL = "gpt-4o-mini"
const DEFAULT_FILE_REVIEW_TIMEOUT_MS = 60000
const DEFAULT_FILE_REVIEW_MAX_TOKENS = 1000

type ParsedJsonPayload = unknown[] | Readonly<Record<string, unknown>>

/**
 * Dependencies for process-files-review stage use case.
 */
export interface IProcessFilesReviewStageDependencies {
    llmProvider: ILLMProvider
    model?: string
}

/**
 * One file analysis result payload.
 */
interface IFileAnalysisResult {
    readonly suggestions: readonly ISuggestionDTO[]
    readonly timedOut: boolean
    readonly failed: boolean
}

/**
 * Stage 11 use case. Runs per-file LLM analysis using context batches with timeout isolation.
 */
export class ProcessFilesReviewStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly llmProvider: ILLMProvider
    private readonly model: string

    /**
     * Creates process-files-review stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IProcessFilesReviewStageDependencies) {
        this.stageId = "process-files-review"
        this.stageName = "Process Files Review"
        this.llmProvider = dependencies.llmProvider
        this.model = dependencies.model ?? DEFAULT_FILE_REVIEW_MODEL
    }

    /**
     * Executes per-file analysis and stores deduplicated suggestions in pipeline state.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const timeoutMs = this.resolveTimeoutMs(input.state.config)
        const batches = this.resolveBatches(input.state)
        const collectedSuggestions: ISuggestionDTO[] = []
        let timedOutFiles = 0
        let failedFiles = 0

        try {
            for (const batch of batches) {
                const batchResults = await Promise.all(
                    batch.map(async (file): Promise<IFileAnalysisResult> => {
                        return this.analyzeSingleFile(file, input.state, timeoutMs)
                    }),
                )

                for (const batchResult of batchResults) {
                    if (batchResult.timedOut) {
                        timedOutFiles += 1
                    }
                    if (batchResult.failed) {
                        failedFiles += 1
                    }
                    collectedSuggestions.push(...batchResult.suggestions)
                }
            }
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to process file-level review stage",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }

        const deduplicatedSuggestions = deduplicate(collectedSuggestions, (suggestion): string => {
            return `${suggestion.filePath}|${suggestion.lineStart}|${suggestion.lineEnd}|${suggestion.message}`
        })

        return Result.ok<IStageTransition, StageError>({
            state: input.state.with({
                suggestions: deduplicatedSuggestions.map((suggestion) => {
                    return {
                        ...suggestion,
                    }
                }),
                externalContext: mergeExternalContext(input.state.externalContext, {
                    fileReviewStats: {
                        batchCount: batches.length,
                        fileCount: batches.flat().length,
                        timedOutFiles,
                        failedFiles,
                        deduplicatedSuggestions: deduplicatedSuggestions.length,
                    },
                }),
            }),
            metadata: {
                checkpointHint: "files-review:processed",
                notes: timedOutFiles > 0 ? `${timedOutFiles} file analyses timed out` : undefined,
            },
        })
    }

    /**
     * Resolves file analysis timeout from config payload.
     *
     * @param config Config payload.
     * @returns Timeout in milliseconds.
     */
    private resolveTimeoutMs(config: Readonly<Record<string, unknown>>): number {
        const rawTimeout = config["fileReviewTimeoutMs"]
        if (typeof rawTimeout !== "number" || Number.isInteger(rawTimeout) === false || rawTimeout < 1) {
            return DEFAULT_FILE_REVIEW_TIMEOUT_MS
        }

        return rawTimeout
    }

    /**
     * Resolves batch plan from state external context or fallback to one batch from files.
     *
     * @param state Current pipeline state.
     * @returns File batches.
     */
    private resolveBatches(state: ReviewPipelineState): readonly (readonly PipelineCollectionItem[])[] {
        if (state.files.length === 0) {
            return [[]]
        }

        const externalContext = state.externalContext
        if (externalContext === null) {
            return [state.files]
        }

        const batches = this.mapRawBatches(externalContext["batches"])
        if (batches.length === 0) {
            return [state.files]
        }

        return batches
    }

    /**
     * Maps external context raw batches payload to typed batches.
     *
     * @param rawBatches Raw batches payload.
     * @returns Typed batches.
     */
    private mapRawBatches(rawBatches: unknown): readonly (readonly PipelineCollectionItem[])[] {
        if (!Array.isArray(rawBatches)) {
            return []
        }

        const batches: Array<readonly PipelineCollectionItem[]> = []
        for (const rawBatch of rawBatches) {
            const mappedBatch = this.mapRawBatch(rawBatch)
            if (mappedBatch.length === 0) {
                continue
            }

            batches.push(mappedBatch)
        }

        return batches
    }

    /**
     * Maps one raw batch payload to typed file items.
     *
     * @param rawBatch Raw batch payload.
     * @returns Typed batch.
     */
    private mapRawBatch(rawBatch: unknown): readonly PipelineCollectionItem[] {
        if (!Array.isArray(rawBatch)) {
            return []
        }

        const batch: PipelineCollectionItem[] = []
        for (const rawFile of rawBatch) {
            if (rawFile === null || typeof rawFile !== "object" || Array.isArray(rawFile)) {
                continue
            }

            batch.push(rawFile as PipelineCollectionItem)
        }

        return batch
    }

    /**
     * Runs one file analysis with timeout isolation.
     *
     * @param file File payload.
     * @param state Current pipeline state.
     * @param timeoutMs Timeout in milliseconds.
     * @returns File analysis result.
     */
    private async analyzeSingleFile(
        file: PipelineCollectionItem,
        state: ReviewPipelineState,
        timeoutMs: number,
    ): Promise<IFileAnalysisResult> {
        const path = file["path"]
        const patch = file["patch"]
        if (typeof path !== "string" || path.trim().length === 0) {
            return {
                suggestions: [],
                timedOut: false,
                failed: true,
            }
        }

        const request = this.buildFileChatRequest(path.trim(), typeof patch === "string" ? patch : "", state)

        try {
            const response = await this.runWithTimeout(this.llmProvider.chat(request), timeoutMs)
            const suggestions = this.parseFileSuggestions(path.trim(), response.content)

            return {
                suggestions,
                timedOut: false,
                failed: false,
            }
        } catch (error: unknown) {
            const timeoutCode = this.readTimeoutCode(error)
            if (timeoutCode) {
                return {
                    suggestions: [],
                    timedOut: true,
                    failed: false,
                }
            }

            return {
                suggestions: [],
                timedOut: false,
                failed: true,
            }
        }
    }

    /**
     * Builds per-file LLM chat request.
     *
     * @param filePath File path.
     * @param patch File patch.
     * @param state Current state.
     * @returns Chat request payload.
     */
    private buildFileChatRequest(
        filePath: string,
        patch: string,
        state: ReviewPipelineState,
    ): IChatRequestDTO {
        const promptOverrides = readObjectField(state.config, "promptOverrides")
        const systemPromptRaw = promptOverrides?.["systemPrompt"]
        const reviewerPromptRaw = promptOverrides?.["reviewerPrompt"]
        const systemPrompt =
            typeof systemPromptRaw === "string" && systemPromptRaw.trim().length > 0
                ? systemPromptRaw.trim()
                : "You are a precise code reviewer. Return JSON suggestions array."
        const reviewerPrompt =
            typeof reviewerPromptRaw === "string" && reviewerPromptRaw.trim().length > 0
                ? reviewerPromptRaw.trim()
                : "Review this file patch and suggest actionable issues."

        return {
            model: this.model,
            maxTokens: DEFAULT_FILE_REVIEW_MAX_TOKENS,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `${reviewerPrompt}\n\nFILE: ${filePath}\nPATCH:\n${patch.slice(0, 5000)}`,
                },
            ],
        }
    }

    /**
     * Parses per-file suggestions from LLM response.
     *
     * @param filePath File path.
     * @param content LLM content.
     * @returns Suggestion list.
     */
    private parseFileSuggestions(filePath: string, content: string): readonly ISuggestionDTO[] {
        const parsed = this.tryParseJson(content)
        if (parsed !== null) {
            const suggestions = this.mapParsedSuggestions(filePath, parsed)
            if (suggestions.length > 0) {
                return suggestions
            }
        }

        const trimmedContent = content.trim()
        if (trimmedContent.length === 0) {
            return []
        }

        return [
            {
                id: `file-${hash(`${filePath}|${trimmedContent}`)}`,
                filePath,
                lineStart: 1,
                lineEnd: 1,
                severity: "MEDIUM",
                category: "code_quality",
                message: trimmedContent,
                committable: true,
                rankScore: 50,
            },
        ]
    }

    /**
     * Parses JSON content safely.
     *
     * @param content Raw content.
     * @returns Parsed payload or null.
     */
    private tryParseJson(content: string): ParsedJsonPayload | null {
        const trimmed = content.trim()
        if (trimmed.length === 0) {
            return null
        }

        try {
            const parsed: unknown = JSON.parse(trimmed)
            if (!this.isParsedJsonPayload(parsed)) {
                return null
            }

            return parsed
        } catch {
            return null
        }
    }

    /**
     * Checks whether parsed JSON can be mapped to per-file suggestions.
     *
     * @param value Candidate payload.
     * @returns True when payload is object or array.
     */
    private isParsedJsonPayload(value: unknown): value is ParsedJsonPayload {
        if (Array.isArray(value)) {
            return true
        }

        return value !== null && typeof value === "object"
    }

    /**
     * Maps parsed payload to per-file suggestions.
     *
     * @param filePath File path.
     * @param payload Parsed payload.
     * @returns Suggestion list.
     */
    private mapParsedSuggestions(filePath: string, payload: ParsedJsonPayload): readonly ISuggestionDTO[] {
        const items = this.resolveSuggestionItems(payload)
        const suggestions: ISuggestionDTO[] = []

        for (const item of items) {
            if (item === null || typeof item !== "object" || Array.isArray(item)) {
                continue
            }

            const suggestion = this.mapParsedSuggestionRecord(
                filePath,
                item as Readonly<Record<string, unknown>>,
            )
            if (suggestion === null) {
                continue
            }

            suggestions.push(suggestion)
        }

        return suggestions
    }

    /**
     * Resolves candidate suggestion items from parsed payload.
     *
     * @param payload Parsed JSON payload.
     * @returns Suggestion candidate items.
     */
    private resolveSuggestionItems(payload: ParsedJsonPayload): readonly unknown[] {
        if (Array.isArray(payload)) {
            return payload
        }

        const nestedSuggestions = payload["suggestions"]
        if (!Array.isArray(nestedSuggestions)) {
            return []
        }

        return nestedSuggestions
    }

    /**
     * Maps one parsed suggestion record to typed suggestion.
     *
     * @param filePath File path.
     * @param record Parsed suggestion record.
     * @returns Typed suggestion or null.
     */
    private mapParsedSuggestionRecord(
        filePath: string,
        record: Readonly<Record<string, unknown>>,
    ): ISuggestionDTO | null {
        const rawMessage = record["message"]
        if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
            return null
        }

        const lineStart = this.readPositiveInteger(record["lineStart"], 1)
        const lineEnd = this.readPositiveInteger(record["lineEnd"], lineStart)
        const message = rawMessage.trim()

        return {
            id: `file-${hash(`${filePath}|${lineStart}|${lineEnd}|${message}`)}`,
            filePath,
            lineStart,
            lineEnd,
            severity: this.readString(record["severity"], "MEDIUM"),
            category: this.readString(record["category"], "code_quality"),
            message,
            codeBlock: this.readCodeBlock(record),
            committable: this.readBoolean(record["committable"], true),
            rankScore: this.readPositiveInteger(record["rankScore"], 50),
        }
    }

    /**
     * Reads string with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns String value.
     */
    private readString(value: unknown, fallback: string): string {
        if (typeof value !== "string" || value.trim().length === 0) {
            return fallback
        }

        return value.trim()
    }

    /**
     * Reads boolean with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns Boolean value.
     */
    private readBoolean(value: unknown, fallback: boolean): boolean {
        if (typeof value !== "boolean") {
            return fallback
        }

        return value
    }

    /**
     * Reads optional trimmed code block.
     *
     * @param source Parsed suggestion record.
     * @returns Trimmed code block when available.
     */
    private readCodeBlock(source: Readonly<Record<string, unknown>>): string | undefined {
        const rawCodeBlock = source["codeBlock"]
        if (typeof rawCodeBlock !== "string") {
            return undefined
        }

        const normalizedCodeBlock = rawCodeBlock.trim()
        if (normalizedCodeBlock.length === 0) {
            return undefined
        }

        return normalizedCodeBlock
    }

    /**
     * Reads positive integer with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns Number value.
     */
    private readPositiveInteger(value: unknown, fallback: number): number {
        if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
            return fallback
        }

        return value
    }

    /**
     * Executes promise with timeout guard.
     *
     * @template T Promise value type.
     * @param promise Source promise.
     * @param timeoutMs Timeout duration.
     * @returns Promise value.
     */
    private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined = undefined
        const timeoutPromise = new Promise<T>((_resolve, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error("TIMEOUT"))
            }, timeoutMs)
        })

        try {
            return await Promise.race([promise, timeoutPromise])
        } finally {
            if (timeoutHandle !== undefined) {
                clearTimeout(timeoutHandle)
            }
        }
    }

    /**
     * Reads timeout code from unknown error.
     *
     * @param error Unknown error value.
     * @returns True when error indicates timeout.
     */
    private readTimeoutCode(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false
        }

        return error.message === "TIMEOUT"
    }

    /**
     * Creates normalized stage error payload.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pinned definition version.
     * @param message Error message.
     * @param recoverable Recoverable flag.
     * @param originalError Optional wrapped error.
     * @returns Stage error.
     */
    private createStageError(
        runId: string,
        definitionVersion: string,
        message: string,
        recoverable: boolean,
        originalError?: Error,
    ): StageError {
        return new StageError({
            runId,
            definitionVersion,
            stageId: this.stageId,
            attempt: INITIAL_STAGE_ATTEMPT,
            recoverable,
            message,
            originalError,
        })
    }
}
