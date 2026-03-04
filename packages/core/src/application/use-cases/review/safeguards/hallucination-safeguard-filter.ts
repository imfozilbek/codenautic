import type {IChatRequestDTO} from "../../../dto/llm/chat.dto"
import type {ISuggestionDTO} from "../../../dto/review/suggestion.dto"
import type {IDiscardedSuggestionDTO} from "../../../dto/review/discarded-suggestion.dto"
import type {ReviewPipelineState} from "../../../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../../../types/review/safeguard-filter.contract"
import type {IUseCase} from "../../../ports/inbound/use-case.port"
import type {ILLMProvider} from "../../../ports/outbound/llm/llm-provider.port"
import {createDiscardedSuggestion, isCodeBlockInFile} from "./safeguard-filter.utils"
import type {IHallucinationSafeguardDefaults} from "../../../dto/config/system-defaults.dto"
import type {IGeneratePromptInput} from "../../generate-prompt.use-case"
import {ValidationError} from "../../../../domain/errors/validation.error"
import {readStringField} from "../pipeline-stage-state.utils"

const FILTER_NAME = "hallucination"
const DISCARD_REASON = "hallucination"
const LLM_VALIDATION_CACHE_PREFIX = "hallucination-validation"
const PROMPT_TEMPLATE_NAME = "hallucination-check"
const DEFAULT_SYSTEM_PROMPT =
    "You are a strict static review validator. Return only compact JSON: " +
    '{"isSupported": true|false}. ' +
    "isSupported must be true when suggestion is clearly grounded in patch."

interface IHallucinationPromptContext {
    readonly filePath: string
    readonly message: string
    readonly codeBlock?: string
    readonly fileText: string
    readonly lineStart: number
    readonly lineEnd: number
}

/**
 * SafeGuard filter validating suggestions against changed file context with optional LLM.
 */
export interface IHallucinationSafeguardFilterDependencies {
    readonly llmProvider: ILLMProvider
    readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    readonly defaults: IHallucinationSafeguardDefaults
}

/**
 * SafeGuard filter that removes suggestions not grounded in file diff context.
 */
export class HallucinationSafeguardFilter implements ISafeGuardFilter {
    public readonly name = FILTER_NAME

    private readonly llmProvider: ILLMProvider
    private readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    private readonly model: string
    private readonly defaults: IHallucinationSafeguardDefaults
    private readonly cache = new Map<string, boolean>()

    /**
     * Creates filter instance with LLM validator.
     *
     * @param dependencies Filter dependencies.
     */
    public constructor(dependencies: IHallucinationSafeguardFilterDependencies) {
        this.llmProvider = dependencies.llmProvider
        this.generatePromptUseCase = dependencies.generatePromptUseCase
        this.defaults = dependencies.defaults
        this.model = dependencies.defaults.model
    }

    /**
     * Runs code-grounding validation and removes likely hallucinations.
     *
     * @param suggestions Input suggestions.
     * @param context Pipeline context.
     * @returns Passed and discarded suggestions.
     */
    public async filter(
        suggestions: readonly ISuggestionDTO[],
        context: ReviewPipelineState,
    ): Promise<{
        readonly passed: readonly ISuggestionDTO[]
        readonly discarded: readonly IDiscardedSuggestionDTO[]
    }> {
        const systemPrompt = await this.resolveSystemPrompt(context)
        const accepted: ISuggestionDTO[] = []
        const discarded: IDiscardedSuggestionDTO[] = []

        for (const suggestion of suggestions) {
            const supported = await this.isSuggestionSupported(
                suggestion,
                context,
                systemPrompt,
            )
            if (supported) {
                accepted.push(suggestion)
                continue
            }

            discarded.push(createDiscardedSuggestion(suggestion, this.name, DISCARD_REASON))
        }

        return {
            passed: accepted,
            discarded,
        }
    }

    /**
     * Determines whether suggestion can be grounded in current file context.
     *
     * @param suggestion Suggestion candidate.
     * @param context Pipeline context.
     * @returns True if suggestion is grounded.
     */
    private async isSuggestionSupported(
        suggestion: ISuggestionDTO,
        context: ReviewPipelineState,
        systemPrompt: string,
    ): Promise<boolean> {
        const filePayload = this.resolveFilePayload(context.files, suggestion.filePath)
        if (filePayload === null) {
            return true
        }

        const filePath = suggestion.filePath.trim()
        const fileText = this.renderFileText(filePayload)
        const codeBlock = this.normalizeCodeBlock(suggestion.codeBlock)

        if (
            codeBlock.length > 0 &&
            isCodeBlockInFile(
                filePayload,
                codeBlock,
            )
        ) {
            return true
        }

        const cacheKey = this.resolveCacheKey({
            filePath,
            message: suggestion.message,
            codeBlock,
            fileText,
            lineStart: suggestion.lineStart,
            lineEnd: suggestion.lineEnd,
        })

        const cached = this.cache.get(cacheKey)
        if (cached !== undefined) {
            return cached
        }

        const request = this.buildValidationRequest(
            systemPrompt,
            filePath,
            suggestion,
            fileText,
        )
        const response = await this.llmProvider.chat(request)
        const result = this.parseValidationResponse(response.content)

        const supportResult = result ?? true
        this.cache.set(cacheKey, supportResult)

        return supportResult
    }

    /**
     * Builds request for LLM validation.
     *
     * @param filePath Suggestion file path.
     * @param suggestion Suggestion data.
     * @param fileText File text.
     * @returns LLM request.
     */
    private buildValidationRequest(
        systemPrompt: string,
        filePath: string,
        suggestion: ISuggestionDTO,
        fileText: string,
    ): IChatRequestDTO {
        const codeBlock = this.normalizeCodeBlock(suggestion.codeBlock)
        const evidenceBlock =
            codeBlock.length > 0 ? `Code block:\n${codeBlock}\n` : "Code block is missing.\n"
        const diffPreview = fileText.length > 5000 ? fileText.slice(0, 5000) : fileText

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
                    content:
                        `File: ${filePath}\n` +
                        `Lines: ${suggestion.lineStart}-${suggestion.lineEnd}\n` +
                        `Message: ${suggestion.message}\n` +
                        evidenceBlock +
                        `Diff preview:\n${diffPreview}`,
                },
            ],
        }
    }

    private async resolveSystemPrompt(context: ReviewPipelineState): Promise<string> {
        const organizationId = readStringField(context.mergeRequest, "organizationId")

        try {
            const result = await this.generatePromptUseCase.execute({
                name: PROMPT_TEMPLATE_NAME,
                organizationId: organizationId ?? null,
                runtimeVariables: {},
            })
            if (result.isFail) {
                return DEFAULT_SYSTEM_PROMPT
            }

            const normalized = result.value.trim()
            if (normalized.length === 0) {
                return DEFAULT_SYSTEM_PROMPT
            }

            return normalized
        } catch {
            return DEFAULT_SYSTEM_PROMPT
        }
    }

    /**
     * Parses validation response.
     *
     * @param content LLM text.
     * @returns Parsed boolean support indicator.
     */
    private parseValidationResponse(content: string): boolean | null {
        const normalized = content.trim()
        if (normalized.length === 0) {
            return null
        }

        const parsed = this.tryParseJson(normalized)
        if (parsed !== undefined) {
            return this.resolveBooleanFromPayload(parsed)
        }

        if (/"isSupported"\s*:\s*true/i.test(normalized)) {
            return true
        }

        if (/"isSupported"\s*:\s*false/i.test(normalized)) {
            return false
        }

        return null
    }

    /**
     * Tries parse raw response as JSON payload.
     *
     * @param raw Raw JSON text.
     * @returns Parsed object or undefined.
     */
    private tryParseJson(raw: string): unknown {
        try {
            return JSON.parse(raw)
        } catch {
            return undefined
        }
    }

    /**
     * Extracts boolean support flag from parsed JSON payload.
     *
     * @param payload Parsed payload.
     * @returns Boolean or null.
     */
    private resolveBooleanFromPayload(payload: unknown): boolean | null {
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
            return null
        }

        const record = payload as Readonly<Record<string, unknown>>
        const raw = record["isSupported"]
        if (typeof raw === "boolean") {
            return raw
        }

        const altRaw = record["supported"]
        if (typeof altRaw === "boolean") {
            return altRaw
        }

        return null
    }

    /**
     * Resolves file payload by path.
     *
     * @param files Pipeline files.
     * @param filePath Search path.
     * @returns File payload or null.
     */
    private resolveFilePayload(
        files: readonly Readonly<Record<string, unknown>>[],
        filePath: string,
    ): Readonly<Record<string, unknown>> | null {
        const normalized = filePath.trim()
        if (normalized.length === 0) {
            return null
        }

        const candidate = files.find((file): boolean => {
            const path = file["path"]
            return typeof path === "string" && path.trim() === normalized
        })

        if (candidate === undefined) {
            return null
        }

        return candidate
    }

    /**
     * Builds stable cache key from suggestion context.
     *
     * @param source Context source.
     * @returns Cache key.
     */
    private resolveCacheKey(source: IHallucinationPromptContext): string {
        const codePart = source.codeBlock ?? ""
        return `${LLM_VALIDATION_CACHE_PREFIX}|${source.filePath}|` +
            `${source.lineStart}-${source.lineEnd}|${source.message}|${source.fileText}|${codePart}`
    }

    /**
     * Renders file patch/hunks text for LLM.
     *
     * @param file File payload.
     * @returns Patch text.
     */
    private renderFileText(file: Readonly<Record<string, unknown>>): string {
        const patch = typeof file["patch"] === "string" ? file["patch"] : ""
        const rawHunks = file["hunks"]
        const hunks: string[] = Array.isArray(rawHunks)
            ? rawHunks.filter((hunk): hunk is string => {
                return typeof hunk === "string"
            })
            : []

        return `${patch}\n${hunks.join("\n\n")}`.trim()
    }

    /**
     * Normalizes optional code block.
     *
     * @param source Suggestion code block.
     * @returns Normalized string.
     */
    private normalizeCodeBlock(source: string | undefined): string {
        if (source === undefined) {
            return ""
        }

        const normalized = source.trim()
        if (normalized.length === 0) {
            return ""
        }

        return normalized
    }
}
