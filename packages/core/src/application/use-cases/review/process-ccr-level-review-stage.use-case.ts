import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
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
import {RuleContextFormatterService} from "../../../domain/services/rule-context-formatter.service"
import {StageError} from "../../../domain/errors/stage.error"
import type {LibraryRule} from "../../../domain/entities/library-rule.entity"
import {hash} from "../../../shared/utils/hash"
import {Result} from "../../../shared/result"
import {
    INITIAL_STAGE_ATTEMPT,
    mergeExternalContext,
    readStringField,
} from "./pipeline-stage-state.utils"
import type {IReviewCcrDefaults} from "../../dto/config/system-defaults.dto"

type ParsedJsonPayload = unknown[] | Readonly<Record<string, unknown>>

/**
 * Dependencies for process-ccr-level-review stage use case.
 */
export interface IProcessCcrLevelReviewStageDependencies {
    llmProvider: ILLMProvider
    generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    getEnabledRulesUseCase: IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
    libraryRuleRepository: ILibraryRuleRepository
    ruleContextFormatterService: RuleContextFormatterService
    defaults: IReviewCcrDefaults
}

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
    public constructor(dependencies: IProcessCcrLevelReviewStageDependencies) {
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
            const ccrSuggestions = this.parseCcrSuggestions(response.content)

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
        const rulesContextResult = await this.resolveRulesContext(
            runId,
            definitionVersion,
            mergeRequest,
            config,
        )
        if (rulesContextResult.isFail) {
            return Result.fail<string, StageError>(rulesContextResult.error)
        }
        const rulesContext = rulesContextResult.value

        try {
            const runtimeVariables: Record<string, unknown> = {
                files: fileSummaries,
            }
            if (rulesContext !== undefined) {
                runtimeVariables.rules = rulesContext
            }

            const result = await this.generatePromptUseCase.execute({
                name: this.defaults.promptName,
                organizationId: organizationId ?? null,
                runtimeVariables,
            })
            if (result.isFail) {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Missing prompt template '${this.defaults.promptName}' for CCR review stage`,
                        false,
                        result.error,
                    ),
                )
            }

            const normalized = result.value.trim()
            if (normalized.length === 0) {
                return Result.fail<string, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        `Empty prompt template '${this.defaults.promptName}' for CCR review stage`,
                        false,
                    ),
                )
            }

            return Result.ok<string, StageError>(normalized)
        } catch (error: unknown) {
            return Result.fail<string, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    "Failed to resolve prompt template for CCR review stage",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
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
    private parseCcrSuggestions(content: string): readonly ISuggestionDTO[] {
        const parsedJson = this.tryParseJson(content)
        if (parsedJson !== null) {
            const suggestions = this.mapJsonSuggestions(parsedJson)
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
     * Parses JSON content safely.
     *
     * @param content Input content.
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
     * Checks that parsed JSON payload can be mapped to suggestions.
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
     * Maps parsed JSON payload to suggestion DTO list.
     *
     * @param payload Parsed payload.
     * @returns Mapped suggestions.
     */
    private mapJsonSuggestions(payload: unknown): readonly ISuggestionDTO[] {
        const sourceArray = this.resolveSuggestionArray(payload)
        const suggestions: ISuggestionDTO[] = []

        for (const item of sourceArray) {
            if (item === null || typeof item !== "object" || Array.isArray(item)) {
                continue
            }

            const record = item as Readonly<Record<string, unknown>>
            const rawMessage = record["message"]
            if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
                continue
            }

            const category = this.readEnumString(record["category"], "architecture")
            const severity = this.readEnumString(record["severity"], "MEDIUM")
            const filePath = this.readEnumString(record["filePath"], "GLOBAL")
            const lineStart = this.readPositiveInteger(record["lineStart"], 1)
            const lineEnd = this.readPositiveInteger(record["lineEnd"], lineStart)
            const rankScore = this.readPositiveInteger(record["rankScore"], 50)
            const committable = this.readBoolean(record["committable"], false)
            const codeBlock =
                typeof record["codeBlock"] === "string" && record["codeBlock"].trim().length > 0
                    ? record["codeBlock"].trim()
                    : undefined
            const normalizedMessage = rawMessage.trim()

            suggestions.push({
                id: `ccr-${hash(`${category}|${filePath}|${lineStart}|${lineEnd}|${normalizedMessage}`)}`,
                filePath,
                lineStart,
                lineEnd,
                severity,
                category,
                message: normalizedMessage,
                codeBlock,
                committable,
                rankScore,
            })
        }

        return suggestions
    }

    /**
     * Resolves suggestion array from parsed payload.
     *
     * @param payload Parsed payload.
     * @returns Suggestion-like array.
     */
    private resolveSuggestionArray(payload: unknown): readonly unknown[] {
        if (Array.isArray(payload)) {
            return payload
        }

        if (payload === null || typeof payload !== "object") {
            return []
        }

        const record = payload as Readonly<Record<string, unknown>>
        const rawSuggestions = record["suggestions"]
        if (!Array.isArray(rawSuggestions)) {
            return []
        }

        return rawSuggestions
    }

    /**
     * Reads normalized string with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns Normalized string.
     */
    private readEnumString(value: unknown, fallback: string): string {
        if (typeof value !== "string") {
            return fallback
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return fallback
        }

        return normalized
    }

    /**
     * Reads positive integer with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns Positive integer.
     */
    private readPositiveInteger(value: unknown, fallback: number): number {
        if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
            return fallback
        }

        return value
    }

    /**
     * Reads boolean with fallback.
     *
     * @param value Candidate value.
     * @param fallback Fallback value.
     * @returns Boolean.
     */
    private readBoolean(value: unknown, fallback: boolean): boolean {
        if (typeof value !== "boolean") {
            return fallback
        }

        return value
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

    /**
     * Resolves rules context payload for prompt injection.
     *
     * @param runId Pipeline run id.
     * @param definitionVersion Pipeline definition version.
     * @param mergeRequest Merge request payload.
     * @param config Review config payload.
     * @returns JSON rules payload or undefined.
     */
    private async resolveRulesContext(
        runId: string,
        definitionVersion: string,
        mergeRequest: Readonly<Record<string, unknown>>,
        config: Readonly<Record<string, unknown>>,
    ): Promise<Result<string | undefined, StageError>> {
        const organizationId = readStringField(mergeRequest, "organizationId")
        if (organizationId === undefined) {
            return Result.ok<string | undefined, StageError>(undefined)
        }

        try {
            const enabledRulesResult = await this.getEnabledRulesUseCase.execute({
                organizationId,
                globalRuleIds: config["globalRuleIds"] as readonly string[] | undefined,
                organizationRuleIds: config["organizationRuleIds"] as readonly string[] | undefined,
                teamId: readStringField(mergeRequest, "teamId"),
            })
            if (enabledRulesResult.isFail) {
                return Result.fail<string | undefined, StageError>(
                    this.createStageError(
                        runId,
                        definitionVersion,
                        "Failed to resolve enabled rules for CCR review stage",
                        false,
                        enabledRulesResult.error,
                    ),
                )
            }

            const rules = await this.loadRulesByIds(enabledRulesResult.value.ruleIds)
            if (rules.length === 0) {
                return Result.ok<string | undefined, StageError>(undefined)
            }

            return Result.ok<string | undefined, StageError>(
                this.ruleContextFormatterService.formatForPrompt(rules),
            )
        } catch (error: unknown) {
            return Result.fail<string | undefined, StageError>(
                this.createStageError(
                    runId,
                    definitionVersion,
                    "Failed to resolve rules for CCR review stage",
                    true,
                    error instanceof Error ? error : undefined,
                ),
            )
        }
    }

    /**
     * Loads library rules by identifiers.
     *
     * @param ruleIds Rule identifiers.
     * @returns Resolved library rules.
     */
    private async loadRulesByIds(ruleIds: readonly string[]): Promise<readonly LibraryRule[]> {
        if (ruleIds.length === 0) {
            return []
        }

        const rules = await Promise.all(
            ruleIds.map(async (ruleId): Promise<LibraryRule | null> => {
                return this.libraryRuleRepository.findByUuid(ruleId)
            }),
        )

        return rules.filter((rule): rule is LibraryRule => rule !== null)
    }
}
