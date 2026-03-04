import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IGitProvider} from "../../ports/outbound/git/git-provider.port"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {IGeneratePromptInput} from "../generate-prompt.use-case"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {StageError} from "../../../domain/errors/stage.error"
import {ValidationError} from "../../../domain/errors/validation.error"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    isPipelineCollectionItem,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"
import type {IReviewSummaryDefaults} from "../../dto/config/system-defaults.dto"

const PROMPT_OVERRIDE_KEY = "summary"

interface ISuggestionStringFields {
    readonly id: string
    readonly filePath: string
    readonly severity: string
    readonly category: string
    readonly message: string
}

interface ISuggestionMetaFields {
    readonly lineStart: number
    readonly lineEnd: number
    readonly committable: boolean
    readonly rankScore: number
}

/**
 * Constructor dependencies for generate-summary stage.
 */
export interface IGenerateSummaryStageDependencies {
    llmProvider: ILLMProvider
    gitProvider: IGitProvider
    generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    defaults: IReviewSummaryDefaults
}

/**
 * Stage 16 use case. Generates CCR summary and publishes summary update comment.
 */
export class GenerateSummaryStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly llmProvider: ILLMProvider
    private readonly gitProvider: IGitProvider
    private readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    private readonly model: string
    private readonly defaults: IReviewSummaryDefaults

    /**
     * Creates generate-summary stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IGenerateSummaryStageDependencies) {
        this.stageId = "generate-summary"
        this.stageName = "Generate Summary"
        this.llmProvider = dependencies.llmProvider
        this.gitProvider = dependencies.gitProvider
        this.generatePromptUseCase = dependencies.generatePromptUseCase
        this.defaults = dependencies.defaults
        this.model = dependencies.defaults.model
    }

    /**
     * Generates review summary and posts it as a merge request comment.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const mergeRequestId = readStringField(input.state.mergeRequest, "id")
        if (mergeRequestId === undefined) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Missing merge request id for summary generation",
                    false,
                    new NotFoundError("MergeRequest", "id"),
                ),
            )
        }

        const systemPrompt = await this.resolveSystemPrompt(
            input.state.runId,
            input.state.definitionVersion,
            input.state.mergeRequest,
        )
        const request = this.buildSummaryRequest(input, systemPrompt)

        try {
            const response = await this.llmProvider.chat(request)
            const summaryText = this.normalizeSummaryText(
                response.content,
                this.buildFallbackSummary(input.state),
            )
            const summaryComment = await this.gitProvider.postComment(
                mergeRequestId,
                this.buildSummaryCommentBody(summaryText, input.state.commentId),
            )

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        summary: {
                            text: summaryText,
                            sourceCommentId: input.state.commentId,
                            summaryCommentId: summaryComment.id,
                        },
                    }),
                }),
                metadata: {
                    checkpointHint: "summary:generated",
                },
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to generate or publish review summary",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Builds summary request for LLM provider.
     *
     * @param input Stage command payload.
     * @returns Chat request payload.
     */
    private buildSummaryRequest(
        input: IStageCommand,
        systemPrompt: string,
    ): IChatRequestDTO {
        const userPrompt = this.defaults.userPrompt
        const suggestions = this.normalizeSuggestions(input.state.suggestions)
        const metrics = input.state.metrics ?? {}
        const context = [
            `RunId: ${input.state.runId}`,
            `IssueCount: ${suggestions.length}`,
            `Metrics: ${JSON.stringify(metrics)}`,
            `TopSuggestions: ${JSON.stringify(suggestions.slice(0, 10))}`,
        ].join("\n")

        return {
            model: this.model,
            maxTokens: this.defaults.maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `${userPrompt}\n\n${context}`,
                },
            ],
        }
    }

    private async resolveSystemPrompt(
        runId: string,
        definitionVersion: string,
        mergeRequest: Readonly<Record<string, unknown>>,
    ): Promise<string> {
        const organizationId = readStringField(mergeRequest, "organizationId")

        try {
            const result = await this.generatePromptUseCase.execute({
                name: PROMPT_OVERRIDE_KEY,
                organizationId: organizationId ?? null,
                runtimeVariables: {},
            })
            if (result.isFail) {
                return this.defaults.systemPrompt
            }

            const normalized = result.value.trim()
            if (normalized.length === 0) {
                return this.defaults.systemPrompt
            }

            return normalized
        } catch {
            return this.defaults.systemPrompt
        }
    }

    /**
     * Builds deterministic fallback summary text.
     *
     * @param state Current pipeline state.
     * @returns Fallback summary text.
     */
    private buildFallbackSummary(state: IStageCommand["state"]): string {
        const suggestions = this.normalizeSuggestions(state.suggestions)
        const issueCount = suggestions.length
        const riskLevel =
            typeof state.metrics?.["riskLevel"] === "string" ? state.metrics["riskLevel"] : "UNKNOWN"

        return `Review summary fallback: ${issueCount} issues detected, risk level ${riskLevel}.`
    }

    /**
     * Normalizes response content into non-empty summary text.
     *
     * @param content Raw summary content.
     * @param fallback Fallback summary text.
     * @returns Final summary text.
     */
    private normalizeSummaryText(content: string, fallback: string): string {
        const normalized = content.trim()
        if (normalized.length === 0) {
            return fallback
        }

        return normalized
    }

    /**
     * Builds markdown body for summary update comment.
     *
     * @param summaryText Summary text.
     * @param sourceCommentId Initial comment id.
     * @returns Comment body.
     */
    private buildSummaryCommentBody(summaryText: string, sourceCommentId: string | null): string {
        const header =
            sourceCommentId === null
                ? "Review Summary Update"
                : `Review Summary Update (source comment: ${sourceCommentId})`

        return `${header}\n\n${summaryText}`
    }

    /**
     * Normalizes raw suggestion list to typed DTO collection.
     *
     * @param source Raw suggestions payload.
     * @returns Typed suggestion list.
     */
    private normalizeSuggestions(source: readonly unknown[]): ISuggestionDTO[] {
        const suggestions: ISuggestionDTO[] = []

        for (const item of source) {
            if (!isPipelineCollectionItem(item)) {
                continue
            }

            const suggestion = this.mapSuggestion(item)
            if (suggestion === null) {
                continue
            }

            suggestions.push(suggestion)
        }

        return suggestions
    }

    /**
     * Maps raw payload to typed suggestion DTO.
     *
     * @param source Raw suggestion payload.
     * @returns Typed suggestion DTO or null.
     */
    private mapSuggestion(source: Readonly<Record<string, unknown>>): ISuggestionDTO | null {
        const stringFields = this.readSuggestionStringFields(source)
        if (stringFields === null) {
            return null
        }

        const metaFields = this.readSuggestionMetaFields(source)
        if (metaFields === null) {
            return null
        }

        return {
            id: stringFields.id,
            filePath: stringFields.filePath,
            lineStart: metaFields.lineStart,
            lineEnd: metaFields.lineEnd,
            severity: stringFields.severity,
            category: stringFields.category,
            message: stringFields.message,
            codeBlock: this.readCodeBlock(source),
            committable: metaFields.committable,
            rankScore: metaFields.rankScore,
        }
    }

    /**
     * Reads required suggestion string fields.
     *
     * @param source Raw suggestion payload.
     * @returns String fields or null.
     */
    private readSuggestionStringFields(
        source: Readonly<Record<string, unknown>>,
    ): ISuggestionStringFields | null {
        const id = readStringField(source, "id")
        const filePath = readStringField(source, "filePath")
        const severity = readStringField(source, "severity")
        const category = readStringField(source, "category")
        const message = readStringField(source, "message")
        if (
            id === undefined ||
            filePath === undefined ||
            severity === undefined ||
            category === undefined ||
            message === undefined
        ) {
            return null
        }

        return {
            id,
            filePath,
            severity,
            category,
            message,
        }
    }

    /**
     * Reads required suggestion numeric/boolean fields.
     *
     * @param source Raw suggestion payload.
     * @returns Metadata fields or null.
     */
    private readSuggestionMetaFields(source: Readonly<Record<string, unknown>>): ISuggestionMetaFields | null {
        const lineStart = source["lineStart"]
        const lineEnd = source["lineEnd"]
        const committable = source["committable"]
        const rankScore = source["rankScore"]
        if (
            typeof lineStart !== "number" ||
            typeof lineEnd !== "number" ||
            typeof committable !== "boolean" ||
            typeof rankScore !== "number"
        ) {
            return null
        }

        return {
            lineStart,
            lineEnd,
            committable,
            rankScore,
        }
    }

    /**
     * Reads optional code block from suggestion payload.
     *
     * @param source Raw suggestion payload.
     * @returns Trimmed code block when present.
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
