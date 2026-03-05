import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
import type {IToolCallDTO} from "../../dto/llm/message.dto"
import type {ISuggestionDTO} from "../../dto/review/suggestion.dto"
import type {IGeneratePromptInput} from "../generate-prompt.use-case"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {
    IPipelineStageUseCase,
    IStageCommand,
    IStageTransition,
} from "../../types/review/pipeline-stage.contract"
import type {ValidationError} from "../../../domain/errors/validation.error"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../../dto/rules/get-enabled-rules.dto"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import {enrichSuggestions} from "../../shared/suggestion-enrichment"
import {SUGGESTION_TOOL} from "../../shared/suggestion-tool"
import {
    appendRuleContext,
    resolveRuleContext,
    resolveSystemPrompt,
} from "../../shared/prompt-resolution"
import type {IReviewStageDeps} from "../../shared/review-stage-deps"
import {
    extractJsonArray,
    parseSuggestions,
    type ParsedJsonPayload,
} from "../../shared/suggestion-parsing"
import {RuleContextFormatterService} from "../../../domain/services/rule-context-formatter.service"
import {StageError} from "../../../domain/errors/stage.error"
import {hash} from "../../../shared/utils/hash"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"
import type {IReviewCcrDefaults} from "../../dto/config/system-defaults.dto"

/**
 * Stage 10 use case. Runs cross-file CCR-level analysis through LLM provider.
 */
export class ProcessCcrLevelReviewStageUseCase implements IPipelineStageUseCase {
    public readonly stageId: string
    public readonly stageName: string

    private readonly llmProvider: ILLMProvider
    private readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    private readonly getEnabledRulesUseCase: IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
    private readonly libraryRuleRepository: ILibraryRuleRepository
    private readonly ruleContextFormatterService: RuleContextFormatterService
    private readonly model: string
    private readonly defaults: IReviewCcrDefaults

    /**
     * Creates process-ccr-level-review stage use case.
     *
     * @param dependencies Stage dependencies.
     */
    public constructor(dependencies: IReviewStageDeps<IReviewCcrDefaults>) {
        this.stageId = "process-ccr-level-review"
        this.stageName = "Process CCR Level Review"
        this.llmProvider = dependencies.llmProvider
        this.generatePromptUseCase = dependencies.generatePromptUseCase
        this.getEnabledRulesUseCase = dependencies.getEnabledRulesUseCase
        this.libraryRuleRepository = dependencies.libraryRuleRepository
        this.ruleContextFormatterService = dependencies.ruleContextFormatterService
        this.defaults = dependencies.defaults
        this.model = dependencies.defaults.model
    }

    /**
     * Executes CCR-level cross-file analysis and stores structured suggestions in external context.
     *
     * @param input Stage command payload.
     * @returns Updated stage transition or stage error.
     */
    public async execute(input: IStageCommand): Promise<Result<IStageTransition, StageError>> {
        const fileSummaries = this.buildFileSummaries(input.state.files)
        const systemPromptResult = await this.resolveTemplateSystemPrompt(
            input.state.runId,
            input.state.definitionVersion,
            input.state.mergeRequest,
            fileSummaries,
            input.state.config,
        )
        if (systemPromptResult.isFail) {
            return Result.fail<IStageTransition, StageError>(systemPromptResult.error)
        }

        const request = this.buildChatRequest(systemPromptResult.value, fileSummaries)

        try {
            const response = await this.llmProvider.chat(request)
            const ccrSuggestions = this.parseCcrSuggestions(
                response.content,
                response.toolCalls,
            )

            return Result.ok<IStageTransition, StageError>({
                state: input.state.with({
                    externalContext: mergeExternalContext(input.state.externalContext, {
                        ccrSuggestions,
                        ccrTokenUsage: {
                            input: response.usage.input,
                            output: response.usage.output,
                            total: response.usage.total,
                        },
                    }),
                }),
                metadata: {
                    checkpointHint: "ccr-level-review:processed",
                },
            })
        } catch (error: unknown) {
            return Result.fail<IStageTransition, StageError>(
                this.createStageError(
                    input.state.runId,
                    input.state.definitionVersion,
                    "Failed to process CCR-level review via LLM provider",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Builds LLM chat request for CCR-level review.
     *
     * @param systemPrompt System prompt from template.
     * @param fileSummaries File summaries payload.
     * @returns Chat request.
     */
    private buildChatRequest(
        systemPrompt: string,
        fileSummaries: string,
    ): IChatRequestDTO {
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
                    content: fileSummaries,
                },
            ],
        }
    }

    /**
     * Resolves template-based system prompt for CCR-level review.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pipeline definition version.
     * @param mergeRequest Merge request payload.
     * @param fileSummaries File summaries payload.
     * @returns Rendered system prompt or stage error.
     */
    private async resolveTemplateSystemPrompt(
        runId: string,
        definitionVersion: string,
        mergeRequest: Readonly<Record<string, unknown>>,
        fileSummaries: string,
        config: Readonly<Record<string, unknown>>,
    ): Promise<Result<string, StageError>> {
        const organizationId = readStringField(mergeRequest, "organizationId")
        const teamId = readStringField(mergeRequest, "teamId")
        const rulesContextResult = await resolveRuleContext({
            organizationId,
            teamId,
            globalRuleIds: config["globalRuleIds"] as readonly string[] | undefined,
            organizationRuleIds: config["organizationRuleIds"] as readonly string[] | undefined,
            getEnabledRulesUseCase: this.getEnabledRulesUseCase,
            libraryRuleRepository: this.libraryRuleRepository,
            ruleContextFormatterService: this.ruleContextFormatterService,
        })
        if (rulesContextResult.isFail) {
            const reason = rulesContextResult.error.reason
            const message = reason === "enabled-rules"
                ? "Failed to resolve enabled rules for CCR review stage"
                : "Failed to resolve rules for CCR review stage"
            return Result.fail<string, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    message,
                    reason !== "enabled-rules",
                    rulesContextResult.error.originalError,
                ),
            )
        }

        const runtimeVariables = appendRuleContext({
            files: fileSummaries,
        }, rulesContextResult.value)
        const promptResult = await resolveSystemPrompt({
            generatePromptUseCase: this.generatePromptUseCase,
            promptName: this.defaults.promptName,
            organizationId: organizationId ?? null,
            runtimeVariables,
        })
        if (promptResult.isFail) {
            const reason = promptResult.error.reason
            if (reason === "missing") {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Missing prompt template '${this.defaults.promptName}' for CCR review stage`,
                        false,
                        promptResult.error.originalError,
                    ),
                )
            }

            if (reason === "empty") {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Empty prompt template '${this.defaults.promptName}' for CCR review stage`,
                        false,
                    ),
                )
            }

            return Result.fail<string, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    "Failed to resolve prompt template for CCR review stage",
                    true,
                    promptResult.error.originalError,
                ),
            )
        }

        return Result.ok<string, StageError>(promptResult.value)
    }

    /**
     * Builds CCR-level file summaries payload for prompt context.
     *
     * @param files File payload list.
     * @returns Joined file summaries string.
     */
    private buildFileSummaries(files: readonly Readonly<Record<string, unknown>>[]): string {
        return files
            .map((file) => {
                const path = file["path"]
                const patch = file["patch"]
                if (typeof path !== "string" || typeof patch !== "string") {
                    return null
                }

                return `FILE: ${path}\nPATCH:\n${patch.slice(0, 1200)}`
            })
            .filter((value): value is string => {
                return value !== null
            })
            .join("\n\n")
    }

    /**
     * Parses CCR suggestions from LLM response content.
     *
     * @param content LLM response content.
     * @returns Structured suggestions.
     */
    private parseCcrSuggestions(
        content: string,
        toolCalls: readonly IToolCallDTO[] | undefined,
    ): readonly ISuggestionDTO[] {
        const parsed = parseSuggestions({
            content,
            toolCalls,
            toolNames: [SUGGESTION_TOOL],
        })
        if (parsed.length > 0) {
            const suggestions = this.mapJsonSuggestions(parsed)
            if (suggestions.length > 0) {
                return suggestions
            }
        }

        const fallbackSuggestion: ISuggestionDTO = {
            id: `ccr-${hash(content)}`,
            filePath: "GLOBAL",
            lineStart: 1,
            lineEnd: 1,
            severity: "MEDIUM",
            category: "architecture",
            message: content.trim().length === 0 ? "No CCR-level suggestions returned" : content.trim(),
            committable: false,
            rankScore: 50,
        }

        return [fallbackSuggestion]
    }

    /**
     * Maps parsed JSON payload to suggestion DTO list.
     *
     * @param payload Parsed payload.
     * @returns Mapped suggestions.
     */
    private mapJsonSuggestions(payload: ParsedJsonPayload): readonly ISuggestionDTO[] {
        return enrichSuggestions(extractJsonArray(payload), {
            idPrefix: "ccr",
            idComponents: ["category", "filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "GLOBAL",
            defaultLineStart: 1,
            defaults: {
                category: "architecture",
                severity: "MEDIUM",
                committable: false,
                rankScore: 50,
            },
        })
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
