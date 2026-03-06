import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IGeneratePromptInput} from "../use-cases/generate-prompt.use-case"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../dto/rules/get-enabled-rules.dto"
import type {ILibraryRuleRepository} from "../ports/outbound/rule/library-rule-repository.port"
import type {IExpertPanelRepository} from "../ports/outbound/expert-panel-repository.port"
import type {LibraryRule} from "../../domain/entities/library-rule.entity"
import type {ValidationError} from "../../domain/errors/validation.error"
import {RuleContextFormatterService} from "../../domain/services/rule-context-formatter.service"
import {Result} from "../../shared/result"

type IRuleContextFormatter = Pick<RuleContextFormatterService, "formatForPrompt">

/**
 * Prompt resolution failure reason.
 */
export type PromptResolutionFailureReason = "missing" | "empty" | "exception"

/**
 * Prompt resolution error.
 */
export class PromptResolutionError extends Error {
    public readonly reason: PromptResolutionFailureReason
    public readonly originalError?: Error

    /**
     * Creates prompt resolution error.
     *
     * @param reason Failure reason.
     * @param originalError Optional underlying error.
     */
    public constructor(reason: PromptResolutionFailureReason, originalError?: Error) {
        super(buildPromptResolutionMessage(reason))
        this.name = "PromptResolutionError"
        this.reason = reason
        this.originalError = originalError
    }
}

/**
 * Input for resolving system prompt via template use case.
 */
export interface IPromptResolutionConfig {
    readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>
    readonly promptName: string
    readonly organizationId?: string | null
    readonly runtimeVariables?: Record<string, unknown>
    readonly expertPanelRepository?: IExpertPanelRepository
    readonly expertPanelName?: string
    readonly defaultPrompt?: string
}

/**
 * Rule context resolution failure reason.
 */
export type RuleContextResolutionFailureReason = "enabled-rules" | "rules-load"

/**
 * Rule context resolution error.
 */
export class RuleContextResolutionError extends Error {
    public readonly reason: RuleContextResolutionFailureReason
    public readonly originalError?: Error

    /**
     * Creates rule context resolution error.
     *
     * @param reason Failure reason.
     * @param originalError Optional underlying error.
     */
    public constructor(reason: RuleContextResolutionFailureReason, originalError?: Error) {
        super(buildRuleContextResolutionMessage(reason))
        this.name = "RuleContextResolutionError"
        this.reason = reason
        this.originalError = originalError
    }
}

/**
 * Input for resolving prompt rule context payload.
 */
export interface IResolveRuleContextInput {
    readonly organizationId?: string | null
    readonly teamId?: string | null
    readonly globalRuleIds?: readonly string[]
    readonly organizationRuleIds?: readonly string[]
    readonly getEnabledRulesUseCase: IUseCase<IGetEnabledRulesInput, IGetEnabledRulesOutput, ValidationError>
    readonly libraryRuleRepository: ILibraryRuleRepository
    readonly ruleContextFormatterService: IRuleContextFormatter
}

/**
 * Resolves system prompt from prompt templates.
 *
 * @param input Resolution input.
 * @returns Prompt resolution result.
 */
export async function resolveSystemPrompt(
    input: IPromptResolutionConfig,
): Promise<Result<string, PromptResolutionError>> {
    try {
        const runtimeVariables = await resolvePromptRuntimeVariables(input)
        const result = await input.generatePromptUseCase.execute({
            name: input.promptName,
            organizationId: input.organizationId ?? null,
            runtimeVariables,
        })
        if (result.isFail) {
            return resolveFallbackPrompt(
                input.defaultPrompt,
                new PromptResolutionError("missing", result.error),
            )
        }

        const normalized = result.value.trim()
        if (normalized.length === 0) {
            return resolveFallbackPrompt(
                input.defaultPrompt,
                new PromptResolutionError("empty"),
            )
        }

        return Result.ok<string, PromptResolutionError>(normalized)
    } catch (error: unknown) {
        return resolveFallbackPrompt(
            input.defaultPrompt,
            new PromptResolutionError(
                "exception",
                error instanceof Error ? error : undefined,
            ),
        )
    }
}

async function resolvePromptRuntimeVariables(
    input: IPromptResolutionConfig,
): Promise<Record<string, unknown>> {
    const runtimeVariables: Record<string, unknown> = {
        ...(input.runtimeVariables ?? {}),
    }

    const expertPanel = await resolveExpertPanelValue(
        input.expertPanelRepository,
        input.expertPanelName,
    )
    if (expertPanel !== undefined && runtimeVariables["expertPanel"] === undefined) {
        runtimeVariables["expertPanel"] = expertPanel
    }

    return runtimeVariables
}

async function resolveExpertPanelValue(
    repository: IExpertPanelRepository | undefined,
    name: string | undefined,
): Promise<string | undefined> {
    if (repository === undefined || name === undefined || name.trim().length === 0) {
        return undefined
    }

    const panel = await repository.findByName(name)
    if (panel === null) {
        return undefined
    }

    return panel.formatForPrompt()
}

/**
 * Resolves rules context payload for prompt injection.
 *
 * @param input Resolution input.
 * @returns Rule context payload or undefined.
 */
export async function resolveRuleContext(
    input: IResolveRuleContextInput,
): Promise<Result<string | undefined, RuleContextResolutionError>> {
    const organizationId = input.organizationId
    if (organizationId === undefined || organizationId === null) {
        return Result.ok<string | undefined, RuleContextResolutionError>(undefined)
    }

    try {
        const enabledRulesResult = await input.getEnabledRulesUseCase.execute({
            organizationId,
            globalRuleIds: input.globalRuleIds,
            organizationRuleIds: input.organizationRuleIds,
            teamId: input.teamId ?? undefined,
        })
        if (enabledRulesResult.isFail) {
            return Result.fail<string | undefined, RuleContextResolutionError>(
                new RuleContextResolutionError("enabled-rules", enabledRulesResult.error),
            )
        }

        const rules = await loadRulesByIds(
            input.libraryRuleRepository,
            enabledRulesResult.value.ruleIds,
        )
        if (rules.length === 0) {
            return Result.ok<string | undefined, RuleContextResolutionError>(undefined)
        }

        return Result.ok<string | undefined, RuleContextResolutionError>(
            input.ruleContextFormatterService.formatForPrompt(rules),
        )
    } catch (error: unknown) {
        return Result.fail<string | undefined, RuleContextResolutionError>(
            new RuleContextResolutionError(
                "rules-load",
                error instanceof Error ? error : undefined,
            ),
        )
    }
}

/**
 * Appends rules context payload into runtime variables.
 *
 * @param runtimeVariables Runtime variables for prompt rendering.
 * @param rulesContext Optional rules payload.
 * @returns Extended runtime variables.
 */
export function appendRuleContext(
    runtimeVariables: Readonly<Record<string, unknown>>,
    rulesContext: string | undefined,
): Record<string, unknown> {
    if (rulesContext === undefined) {
        return {
            ...runtimeVariables,
        }
    }

    return {
        ...runtimeVariables,
        rules: rulesContext,
    }
}

/**
 * Loads library rules by identifiers.
 *
 * @param repository Rule repository.
 * @param ruleIds Rule identifiers.
 * @returns Resolved rules list.
 */
async function loadRulesByIds(
    repository: ILibraryRuleRepository,
    ruleIds: readonly string[],
): Promise<readonly LibraryRule[]> {
    if (ruleIds.length === 0) {
        return []
    }

    const rules = await Promise.all(
        ruleIds.map(async (ruleId): Promise<LibraryRule | null> => {
            return repository.findByUuid(ruleId)
        }),
    )

    return rules.filter((rule): rule is LibraryRule => rule !== null)
}

/**
 * Builds prompt resolution error message.
 *
 * @param reason Resolution failure reason.
 * @returns Error message.
 */
function buildPromptResolutionMessage(reason: PromptResolutionFailureReason): string {
    switch (reason) {
        case "missing":
            return "Prompt template is missing"
        case "empty":
            return "Prompt template content is empty"
        case "exception":
            return "Prompt template resolution failed"
        default:
            return "Prompt template resolution failed"
    }
}

/**
 * Builds rule context resolution error message.
 *
 * @param reason Resolution failure reason.
 * @returns Error message.
 */
function buildRuleContextResolutionMessage(reason: RuleContextResolutionFailureReason): string {
    switch (reason) {
        case "enabled-rules":
            return "Enabled rules resolution failed"
        case "rules-load":
            return "Rule context resolution failed"
        default:
            return "Rule context resolution failed"
    }
}

/**
 * Resolves fallback prompt when supplied.
 *
 * @param defaultPrompt Optional default prompt.
 * @param baseError Original prompt resolution error.
 * @returns Default prompt result or original error.
 */
function resolveFallbackPrompt(
    defaultPrompt: string | undefined,
    baseError: PromptResolutionError,
): Result<string, PromptResolutionError> {
    if (defaultPrompt === undefined) {
        return Result.fail<string, PromptResolutionError>(baseError)
    }

    const normalized = defaultPrompt.trim()
    if (normalized.length === 0) {
        return Result.fail<string, PromptResolutionError>(
            new PromptResolutionError("empty"),
        )
    }

    return Result.ok<string, PromptResolutionError>(normalized)
}
