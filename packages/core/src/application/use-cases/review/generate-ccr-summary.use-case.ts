import type {IChatRequestDTO} from "../../dto/llm/chat.dto"
import type {ILLMProvider} from "../../ports/outbound/llm/llm-provider.port"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IGeneratePromptInput} from "../generate-prompt.use-case"
import type {
    CCROldSummaryMode,
    CCRNewCommitsSummaryMode,
    IGenerateCCRSummaryInput,
    IGenerateCCRSummaryOutput,
} from "../../dto/review/ccr-summary.dto"
import {
    CCR_SUMMARY_EXISTING_DESCRIPTION_MODES,
    CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES,
} from "../../dto/review/ccr-summary.dto"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {Result} from "../../../shared/result"
import type {ICcrSummaryDefaults} from "../../dto/config/system-defaults.dto"

/**
 * Dependencies required by CCR summary generation use case.
 */
export interface IGenerateCCRSummaryUseCaseDependencies {
    /**
     * LLM provider for text generation.
     */
    llmProvider: ILLMProvider

    /**
     * Defaults resolved from config-service.
     */
    defaults: ICcrSummaryDefaults

    /**
     * Prompt generator use case.
     */
    generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
}

interface INormalizedGenerateCCRSummaryInput {
    readonly existingSummary: string
    readonly newCommitsSummary: string
    readonly existingDescriptionMode: CCROldSummaryMode
    readonly newCommitsDescriptionMode: CCRNewCommitsSummaryMode
    readonly model: string
    readonly maxTokens: number
}

/**
 * Use case to generate CCR summary with mode-based composition rules.
 */
export class GenerateCCRSummaryUseCase
    implements
        IUseCase<IGenerateCCRSummaryInput, IGenerateCCRSummaryOutput, ValidationError>
{
    private readonly llmProvider: ILLMProvider
    private readonly model: string
    private readonly maxTokens: number
    private readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    private readonly defaults: ICcrSummaryDefaults

    /**
     * Creates use case for CCR summary generation.
     *
     * @param dependencies Case dependencies.
     */
    public constructor(dependencies: IGenerateCCRSummaryUseCaseDependencies) {
        this.llmProvider = dependencies.llmProvider
        this.defaults = dependencies.defaults
        this.model = dependencies.defaults.model
        this.maxTokens = dependencies.defaults.maxTokens
        this.generatePromptUseCase = dependencies.generatePromptUseCase
    }

    /**
     * Generates deterministic config-seeded final CCR summary.
     *
     * @param input Use case input.
     * @returns Generated summary result.
     */
    public async execute(
        input: IGenerateCCRSummaryInput,
    ): Promise<Result<IGenerateCCRSummaryOutput, ValidationError>> {
        const normalizedInputResult = this.normalizeInput(input)
        if (normalizedInputResult.isFail) {
            return Result.fail<IGenerateCCRSummaryOutput, ValidationError>(
                normalizedInputResult.error,
            )
        }

        const normalized = normalizedInputResult.value
        const systemPromptResult = await this.resolveSystemPrompt(normalized.existingDescriptionMode)
        if (systemPromptResult.isFail) {
            return Result.fail<IGenerateCCRSummaryOutput, ValidationError>(systemPromptResult.error)
        }

        const request = this.buildRequest(normalized, systemPromptResult.value)

        try {
            const response = await this.llmProvider.chat(request)
            return Result.ok<IGenerateCCRSummaryOutput, ValidationError>({
                summary: this.normalizeSummaryText(
                    response.content,
                    this.composeSeedSummary(normalized),
                ),
            })
        } catch (error: unknown) {
            return Result.fail<IGenerateCCRSummaryOutput, ValidationError>(
                new ValidationError("Failed to generate CCR summary", [
                    {
                        field: "llmProvider",
                        message:
                            error instanceof Error ? error.message : "LLM provider failed to respond",
                    },
                ], error instanceof Error ? error : undefined),
            )
        }
    }

    /**
     * Validates payload and applies defaults.
     *
     * @param input Raw payload.
     * @returns Normalized payload or validation result.
     */
    private normalizeInput(
        input: IGenerateCCRSummaryInput,
    ): Result<INormalizedGenerateCCRSummaryInput, ValidationError> {
        const fields: IValidationErrorField[] = []

        const existingDescriptionMode = this.normalizeExistingDescriptionMode(
            input.existingDescriptionMode,
        )
        const newCommitsDescriptionMode = this.normalizeNewCommitsDescriptionMode(
            input.newCommitsDescriptionMode,
        )

        const existingSummary = this.normalizeSummary(input.existingSummary, "existingSummary", false)
        const shouldRequireNewSummary = newCommitsDescriptionMode.value !== "NONE"
        const newCommitsSummary = this.normalizeSummary(
            input.newCommitsSummary,
            "newCommitsSummary",
            shouldRequireNewSummary,
        )

        if (existingSummary.error !== undefined) {
            fields.push(existingSummary.error)
        }
        if (newCommitsSummary.error !== undefined) {
            fields.push(newCommitsSummary.error)
        }

        if (existingDescriptionMode.error !== undefined) {
            fields.push(existingDescriptionMode.error)
        }
        if (newCommitsDescriptionMode.error !== undefined) {
            fields.push(newCommitsDescriptionMode.error)
        }
        if (fields.length > 0) {
            return Result.fail<INormalizedGenerateCCRSummaryInput, ValidationError>(
                new ValidationError("Generate CCR summary validation failed", fields),
            )
        }

        return Result.ok<INormalizedGenerateCCRSummaryInput, ValidationError>({
            existingSummary: existingSummary.value,
            newCommitsSummary: newCommitsSummary.value,
            existingDescriptionMode: existingDescriptionMode.value,
            newCommitsDescriptionMode: newCommitsDescriptionMode.value,
            model: this.model,
            maxTokens: this.maxTokens,
        })
    }

    /**
     * Builds chat request for LLM.
     *
     * @param input Normalized input.
     * @returns LLM request.
     */
    private buildRequest(
        input: INormalizedGenerateCCRSummaryInput,
        systemPrompt: string,
    ): IChatRequestDTO {
        const userPrompt = [
            "Apply requested composition modes and return one markdown summary.",
            `Existing description mode: ${input.existingDescriptionMode}`,
            `New commits description mode: ${input.newCommitsDescriptionMode}`,
            "Seed summary to transform:",
            this.composeSeedSummary(input),
        ].join("\n\n")

        return {
            model: input.model,
            maxTokens: input.maxTokens,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
        }
    }

    /**
     * Creates deterministic config seed summary for fallback.
     *
     * @param input Normalized input.
     * @returns Composed deterministic config seed summary.
     */
    private composeSeedSummary(input: INormalizedGenerateCCRSummaryInput): string {
        const existingContribution = this.applyExistingMode(
            input.existingSummary,
            input.existingDescriptionMode,
        )

        if (input.newCommitsDescriptionMode === "NONE") {
            return existingContribution.length === 0
                ? "No existing summary provided."
                : existingContribution
        }

        if (input.newCommitsDescriptionMode === "REPLACE") {
            const replaced = this.applyExistingMode(
                input.newCommitsSummary,
                input.existingDescriptionMode,
            )

            return replaced.length === 0
                ? "No new-commits summary provided."
                : replaced
        }

        if (existingContribution.length === 0) {
            return input.newCommitsSummary
        }

        return `${existingContribution}\n\n${input.newCommitsSummary}`
    }

    /**
     * Applies existing-description mode to existing summary.
     *
     * @param value Existing summary.
     * @param mode Existing mode.
     * @returns Mode-adjusted value.
     */
    private applyExistingMode(value: string, mode: CCROldSummaryMode): string {
        if (value.length === 0) {
            return ""
        }

        if (mode === "COMPLEMENT") {
            return `Existing summary context: ${value}`
        }

        if (mode === "CONCATENATE") {
            return `Existing summary: ${value}`
        }

        return value
    }

    /**
     * Normalizes summary text.
     *
     * @param value Candidate value.
     * @param field Target field name.
     * @param required Is value mandatory.
     * @returns Normalized value with possible validation error.
     */
    private normalizeSummary(
        value: string | undefined,
        field: string,
        required: boolean,
    ): {readonly value: string; readonly error?: IValidationErrorField} {
        if (value === undefined) {
            return required
                ? {value: "", error: {field, message: `${field} is required`}}
                : {value: ""}
        }

        if (typeof value !== "string") {
            return {value: "", error: {field, message: `${field} must be a string`}}
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return required
                ? {value: "", error: {field, message: `${field} cannot be empty`}}
                : {value: ""}
        }

        return {value: normalized}
    }

    /**
     * Validates existing summary composition mode.
     *
     * @param value Raw mode value.
     * @returns Valid value or field error.
     */
    private normalizeExistingDescriptionMode(
        value: string | undefined,
    ):
        | {readonly value: CCROldSummaryMode; readonly error?: undefined}
        | {readonly value: CCROldSummaryMode; readonly error: IValidationErrorField} {
        if (value === undefined) {
            return {value: "REPLACE"}
        }

        if (typeof value !== "string") {
            return {
                value: "REPLACE",
                error: {
                    field: "existingDescriptionMode",
                    message: "must be one of REPLACE, COMPLEMENT, CONCATENATE",
                },
            }
        }

        const normalized = value.trim().toUpperCase()
        if (isValidCcrOldSummaryMode(normalized) === false) {
            return {
                value: "REPLACE",
                error: {
                    field: "existingDescriptionMode",
                    message: "must be one of REPLACE, COMPLEMENT, CONCATENATE",
                },
            }
        }

        return {value: normalized}
    }

    /**
     * Validates new commits description mode.
     *
     * @param value Raw mode value.
     * @returns Valid value or field error.
     */
    private normalizeNewCommitsDescriptionMode(
        value: string | undefined,
    ):
        | {
              readonly value: CCRNewCommitsSummaryMode
              readonly error?: undefined
          }
        | {readonly value: CCRNewCommitsSummaryMode; readonly error: IValidationErrorField} {
        if (value === undefined) {
            return {value: "NONE"}
        }

        if (typeof value !== "string") {
            return {
                value: "NONE",
                error: {
                    field: "newCommitsDescriptionMode",
                    message: "must be one of NONE, REPLACE, CONCATENATE",
                },
            }
        }

        const normalized = value.trim().toUpperCase()
        if (isValidCcrNewCommitsSummaryMode(normalized) === false) {
            return {
                value: "NONE",
                error: {
                    field: "newCommitsDescriptionMode",
                    message: "must be one of NONE, REPLACE, CONCATENATE",
                },
            }
        }

        return {value: normalized}
    }

    /**
     * Returns fallback text when provider returns blank response.
     *
     * @param value LLM response content.
     * @param fallback Deterministic fallback.
     * @returns Normalized summary.
     */
    private normalizeSummaryText(value: string, fallback: string): string {
        const normalized = value.trim()
        if (normalized.length === 0) {
            return fallback
        }

        return normalized
    }

    private async resolveSystemPrompt(
        existingDescriptionMode: CCROldSummaryMode,
    ): Promise<Result<string, ValidationError>> {
        const promptName =
            existingDescriptionMode === "COMPLEMENT"
                ? this.defaults.complementSystemPromptName
                : this.defaults.defaultSystemPromptName

        return this.generatePromptUseCase.execute({
            name: promptName,
            organizationId: null,
            runtimeVariables: {},
        })
    }
}

/**
 * Checks whether value is valid existing summary mode.
 *
 * @param value Candidate mode.
 * @returns True when known mode.
 */
function isValidCcrOldSummaryMode(value: string): value is CCROldSummaryMode {
    return CCR_SUMMARY_EXISTING_DESCRIPTION_MODES.includes(
        value as CCROldSummaryMode,
    )
}

/**
 * Checks whether value is valid new commits summary mode.
 *
 * @param value Candidate mode.
 * @returns True when known mode.
 */
function isValidCcrNewCommitsSummaryMode(value: string): value is CCRNewCommitsSummaryMode {
    return CCR_SUMMARY_NEW_COMMITS_DESCRIPTION_MODES.includes(
        value as CCRNewCommitsSummaryMode,
    )
}
