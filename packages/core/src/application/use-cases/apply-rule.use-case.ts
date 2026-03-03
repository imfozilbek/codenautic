import type {IChatRequestDTO, IChatResponseDTO} from "../dto/llm/chat.dto"
import type {IMessageDTO} from "../dto/llm/message.dto"
import {MESSAGE_ROLE} from "../dto/llm/message.dto"
import type {
    IDiscardedSuggestionDTO,
} from "../dto/review/discarded-suggestion.dto"
import type {ISuggestionDTO} from "../dto/review/suggestion.dto"
import type {
    PipelineCollectionItem,
    ReviewPipelineState,
} from "../types/review/review-pipeline-state"
import type {ISafeGuardFilter} from "../types/review/safeguard-filter.contract"
import type {IUseCase} from "../ports/inbound/use-case.port"
import type {ILLMProvider} from "../ports/outbound/llm/llm-provider.port"
import type {
    ICustomRuleAstEvaluator,
    ICustomRuleAstMatch,
    ICustomRuleAstTarget,
} from "../ports/outbound/rule/custom-rule-ast-evaluator.port"
import {
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_STATUS,
    CUSTOM_RULE_TYPE,
    type CustomRule,
    type CustomRuleScope,
} from "../../domain/entities/custom-rule.entity"
import type {IValidationErrorField} from "../../domain/errors/validation.error"
import {ValidationError} from "../../domain/errors/validation.error"
import {RuleValidationService} from "../../domain/services/rule-validation.service"
import {type SeverityLevel, SEVERITY_LEVEL} from "../../domain/value-objects/severity.value-object"
import {Result} from "../../shared/result"
import {deduplicate} from "../../shared/utils/deduplicate"
import {hash} from "../../shared/utils/hash"
import {readBooleanField} from "./review/pipeline-stage-state.utils"

type RuleTarget = {
    readonly filePath: string
    readonly content: string
}

type ParsedJsonPayload = readonly unknown[] | Readonly<Record<string, unknown>>
type SuggestionRecord = Readonly<Record<string, unknown>>

interface ISuggestionStringFields {
    readonly id: string
    readonly filePath: string
    readonly severity: string
    readonly category: string
    readonly message: string
}

interface ISuggestionNumericFields {
    readonly lineStart: number
    readonly lineEnd: number
    readonly committable: boolean
    readonly rankScore: number
}

const CUSTOM_RULE_CATEGORY = "custom_rule"
const APPLY_FILTERS_FLAG = "applyFiltersToCustomRules"
const DEFAULT_PROMPT_MODEL = "gpt-4o-mini"
const DEFAULT_PROMPT_MAX_TOKENS = 1200
const DEFAULT_PROMPT_RANK_SCORE = 60
const DEFAULT_REGEX_RANK_SCORE = 55
const DEFAULT_RULE_SEVERITY: SeverityLevel = "MEDIUM"
const GLOBAL_FILE_PATH = "GLOBAL"

/**
 * Input for custom rule application use case.
 */
export interface IApplyRuleUseCaseInput {
    /**
     * Custom rules list from repository and seed data.
     */
    readonly rules: readonly CustomRule[]

    /**
     * Rule scope to execute (FILE/CCR).
     */
    readonly scope: CustomRuleScope

    /**
     * Changed files payload for FILE scope.
     */
    readonly files?: readonly PipelineCollectionItem[]

    /**
     * Aggregated CCR text for CCR scope.
     */
    readonly ccrText?: string

    /**
     * Runtime review config snapshot.
     */
    readonly config: Readonly<Record<string, unknown>>

    /**
     * Pipeline context for SafeGuard.
     */
    readonly filterContext?: ReviewPipelineState
}

/**
 * Output of custom rule application use case.
 */
export interface IApplyRuleUseCaseOutput {
    /**
     * Suggestions produced by custom rules.
     */
    readonly suggestions: readonly ISuggestionDTO[]

    /**
     * Suggestions rejected by SafeGuard filters.
     */
    readonly discardedSuggestions: readonly IDiscardedSuggestionDTO[]
}

/**
 * Dependencies for apply rule use case.
 */
export interface IApplyRuleUseCaseDependencies {
    /**
     * LLM integration for PROMPT rules.
     */
    readonly llmProvider: ILLMProvider

    /**
     * Optional SafeGuard filters.
     */
    readonly filters?: readonly ISafeGuardFilter[]

    /**
     * Optional AST evaluator for AST custom rules.
     */
    readonly astEvaluator?: ICustomRuleAstEvaluator

    /**
     * Optional validation service override.
     */
    readonly ruleValidationService?: RuleValidationService
}

/**
 * Applies custom rules to changed files or CCR payload.
 */
export class ApplyRuleUseCase implements
    IUseCase<IApplyRuleUseCaseInput, IApplyRuleUseCaseOutput, ValidationError>
{
    private readonly llmProvider: ILLMProvider
    private readonly filters: readonly ISafeGuardFilter[]
    private readonly astEvaluator: ICustomRuleAstEvaluator | undefined
    private readonly ruleValidationService: RuleValidationService

    /**
     * Creates apply rule use case.
     *
     * @param dependencies External dependencies.
     */
    public constructor(dependencies: IApplyRuleUseCaseDependencies) {
        this.llmProvider = dependencies.llmProvider
        this.filters = dependencies.filters ?? []
        this.astEvaluator = dependencies.astEvaluator
        this.ruleValidationService = dependencies.ruleValidationService ?? new RuleValidationService()
    }

    /**
     * Executes active custom rules for selected scope.
     *
     * @param input Use-case payload.
     * @returns Suggestions and discarded suggestions.
     */
    public async execute(
        input: IApplyRuleUseCaseInput,
    ): Promise<Result<IApplyRuleUseCaseOutput, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.isFail) {
            return Result.fail<IApplyRuleUseCaseOutput, ValidationError>(validation.error)
        }

        const activeRules = this.selectActiveRules(input.rules, input.scope)
        const suggestionsResult = await this.applyRules(input, activeRules)
        if (suggestionsResult.isFail) {
            return Result.fail<IApplyRuleUseCaseOutput, ValidationError>(suggestionsResult.error)
        }

        return this.applySafeGuardIfNeeded(suggestionsResult.value, input.config, input.filterContext)
    }

    /**
     * Validates required input constraints.
     *
     * @param input Input payload.
     * @returns Validation result.
     */
    private validateInput(
        input: IApplyRuleUseCaseInput,
    ): Result<IApplyRuleUseCaseInput, ValidationError> {
        const fields: IValidationErrorField[] = []
        fields.push(...this.validateRuleCollection(input.rules))
        fields.push(...this.validateConfig(input.config))
        fields.push(...this.validateRuleScope(input.scope))
        fields.push(...this.validateScopePayload(input))

        if (fields.length > 0) {
            return Result.fail<IApplyRuleUseCaseInput, ValidationError>(
                new ValidationError("Apply rule input validation failed", fields),
            )
        }

        return Result.ok<IApplyRuleUseCaseInput, ValidationError>(input)
    }

    /**
     * Validates that rules are an array.
     *
     * @param rules Rule collection.
     * @returns Field-level errors.
     */
    private validateRuleCollection(rules: unknown): readonly IValidationErrorField[] {
        if (Array.isArray(rules) === false) {
            return [
                {
                    field: "rules",
                    message: "must be an array",
                },
            ]
        }

        return []
    }

    /**
     * Validates config shape.
     *
     * @param config Runtime config.
     * @returns Field-level errors.
     */
    private validateConfig(config: unknown): readonly IValidationErrorField[] {
        if (
            config === null ||
            typeof config !== "object" ||
            Array.isArray(config)
        ) {
            return [
                {
                    field: "config",
                    message: "must be a non-null object",
                },
            ]
        }

        return []
    }

    /**
     * Validates rule scope.
     *
     * @param scope Scope value.
     * @returns Field-level errors.
     */
    private validateRuleScope(scope: unknown): readonly IValidationErrorField[] {
        if (
            scope !== CUSTOM_RULE_SCOPE.FILE &&
            scope !== CUSTOM_RULE_SCOPE.CCR
        ) {
            return [
                {
                    field: "scope",
                    message: "must be FILE or CCR",
                },
            ]
        }

        return []
    }

    /**
     * Validates scope-specific payload.
     *
     * @param input Input payload.
     * @returns Field-level errors.
     */
    private validateScopePayload(
        input: IApplyRuleUseCaseInput,
    ): readonly IValidationErrorField[] {
        if (input.scope === CUSTOM_RULE_SCOPE.FILE) {
            if (Array.isArray(input.files) === false || input.files.length === 0) {
                return [
                    {
                        field: "files",
                        message: "must contain at least one file when scope is FILE",
                    },
                ]
            }

            return []
        }

        if (typeof input.ccrText !== "string" || input.ccrText.trim().length === 0) {
            return [
                {
                    field: "ccrText",
                    message: "must be a non-empty string when scope is CCR",
                },
            ]
        }

        return []
    }

    /**
     * Selects active rules for scope.
     *
     * @param rules Source rules.
     * @param scope Rule scope.
     * @returns Active rules filtered by scope.
     */
    private selectActiveRules(
        rules: readonly CustomRule[],
        scope: CustomRuleScope,
    ): readonly CustomRule[] {
        return rules.filter((rule): boolean => {
            return rule.status === CUSTOM_RULE_STATUS.ACTIVE && rule.scope === scope
        })
    }

    /**
     * Applies all active rules and aggregates raw suggestions.
     *
     * @param input Use-case payload.
     * @param rules Active rules.
     * @returns Raw suggestions.
     */
    private async applyRules(
        input: IApplyRuleUseCaseInput,
        rules: readonly CustomRule[],
    ): Promise<Result<readonly ISuggestionDTO[], ValidationError>> {
        const suggestions: ISuggestionDTO[] = []
        const fields: IValidationErrorField[] = []

        for (const rule of rules) {
            const ruleResult = await this.applyRule(input, rule)
            if (ruleResult.isFail) {
                fields.push(...ruleResult.error.fields)
                continue
            }

            suggestions.push(...ruleResult.value)
        }

        if (fields.length > 0) {
            return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                new ValidationError("Failed to apply one or more custom rules", fields),
            )
        }

        return Result.ok<readonly ISuggestionDTO[], ValidationError>(
            deduplicate(suggestions, (suggestion): string => {
                return `${suggestion.filePath}|${suggestion.lineStart}|${suggestion.lineEnd}|${suggestion.message}`
            }),
        )
    }

    /**
     * Applies one custom rule depending on type and scope.
     *
     * @param input Use-case payload.
     * @param rule Rule definition.
     * @returns Suggestions from one rule.
     */
    private async applyRule(
        input: IApplyRuleUseCaseInput,
        rule: CustomRule,
    ): Promise<Result<readonly ISuggestionDTO[], ValidationError>> {
        const validation = this.ruleValidationService.validate(rule.type, rule.rule)
        if (validation.isFail) {
            const detail = validation.error.fields[0]?.message ?? "Rule payload is invalid"
            return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                new ValidationError("Failed to apply one or more custom rules", [
                    {
                        field: `rule:${rule.id.value}`,
                        message: `${rule.type} rule validation failed: ${detail}`,
                    },
                ]),
            )
        }

        if (rule.type === CUSTOM_RULE_TYPE.REGEX) {
            return this.applyRegexRule(input, rule)
        }

        if (rule.type === CUSTOM_RULE_TYPE.PROMPT) {
            return this.applyPromptRule(input, rule)
        }

        if (rule.type === CUSTOM_RULE_TYPE.AST) {
            return this.applyAstRule(input, rule)
        }

        return Result.fail<readonly ISuggestionDTO[], ValidationError>(
            new ValidationError("Failed to apply one or more custom rules", [
                {
                    field: `rule:${rule.id.value}`,
                    message: `Unsupported rule type ${String(rule.type)}`,
                },
            ]),
        )
    }

    /**
     * Applies regex rule to targets.
     *
     * @param input Use-case payload.
     * @param rule Custom rule.
     * @returns Suggestions.
     */
    private applyRegexRule(
        input: IApplyRuleUseCaseInput,
        rule: CustomRule,
    ): Result<readonly ISuggestionDTO[], ValidationError> {
        const regex = this.createRegex(rule.rule)
        if (regex === null) {
            return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                new ValidationError("Failed to apply one or more custom rules", [
                    {
                        field: `rule:${rule.id.value}`,
                        message: `Invalid regex pattern for rule ${rule.id.value}`,
                    },
                ]),
            )
        }

        const targets = this.resolveTargets(input)
        const suggestions: ISuggestionDTO[] = []

        for (const target of targets) {
            suggestions.push(...this.applyRegexRuleToTarget(target, rule, regex))
        }

        return Result.ok<readonly ISuggestionDTO[], ValidationError>(suggestions)
    }

    /**
     * Applies AST rule to targets via injected evaluator.
     *
     * @param input Use-case payload.
     * @param rule Custom rule.
     * @returns Suggestions.
     */
    private async applyAstRule(
        input: IApplyRuleUseCaseInput,
        rule: CustomRule,
    ): Promise<Result<readonly ISuggestionDTO[], ValidationError>> {
        if (this.astEvaluator === undefined) {
            return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                new ValidationError("Failed to apply one or more custom rules", [
                    {
                        field: `rule:${rule.id.value}`,
                        message: "AST rule evaluator is required for AST rule type",
                    },
                ]),
            )
        }

        const targets = this.resolveTargets(input)
        const suggestions: ISuggestionDTO[] = []

        for (const target of targets) {
            let matches: readonly ICustomRuleAstMatch[]
            try {
                const astTarget: ICustomRuleAstTarget = {
                    filePath: target.filePath,
                    content: target.content,
                }
                matches = await this.astEvaluator.execute(rule, astTarget)
            } catch (error: unknown) {
                return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                    new ValidationError("Failed to apply one or more custom rules", [
                        {
                            field: `rule:${rule.id.value}`,
                            message:
                                error instanceof Error
                                    ? error.message
                                    : "AST rule execution failed",
                        },
                    ]),
                )
            }

            for (const match of matches) {
                suggestions.push(this.mapAstMatch(rule, target.filePath, match))
            }
        }

        return Result.ok<readonly ISuggestionDTO[], ValidationError>(suggestions)
    }

    /**
     * Applies PROMPT rule to targets.
     *
     * @param input Use-case payload.
     * @param rule Custom rule.
     * @returns Suggestions.
     */
    private async applyPromptRule(
        input: IApplyRuleUseCaseInput,
        rule: CustomRule,
    ): Promise<Result<readonly ISuggestionDTO[], ValidationError>> {
        const targets = this.resolveTargets(input)
        const suggestions: ISuggestionDTO[] = []

        for (const target of targets) {
            const request = this.buildPromptRequest(rule, target)
            let response: IChatResponseDTO

            try {
                response = await this.llmProvider.chat(request)
            } catch (error: unknown) {
                return Result.fail<readonly ISuggestionDTO[], ValidationError>(
                    new ValidationError("Failed to apply one or more custom rules", [
                        {
                            field: `rule:${rule.id.value}`,
                            message:
                                error instanceof Error
                                    ? error.message
                                    : "Prompt rule execution failed",
                        },
                    ]),
                )
            }

            suggestions.push(
                ...this.mapPromptResponse(response.content, rule, target.filePath),
            )
        }

        return Result.ok<readonly ISuggestionDTO[], ValidationError>(suggestions)
    }

    /**
     * Resolves all targets for selected scope.
     *
     * @param input Use-case payload.
     * @returns Targets.
     */
    private resolveTargets(input: IApplyRuleUseCaseInput): readonly RuleTarget[] {
        if (input.scope === CUSTOM_RULE_SCOPE.CCR) {
            return [
                {
                    filePath: GLOBAL_FILE_PATH,
                    content: input.ccrText ?? "",
                },
            ]
        }

        return input.files?.map((file): RuleTarget => {
            return {
                filePath: this.resolveFilePath(file),
                content: this.resolveSourceText(file),
            }
        }) ?? []
    }

    /**
     * Applies regex rule to text in one target.
     *
     * @param target Target payload.
     * @param rule Custom rule.
     * @param regex Compiled regex.
     * @returns Rule suggestions.
     */
    private applyRegexRuleToTarget(
        target: RuleTarget,
        rule: CustomRule,
        regex: RegExp,
    ): readonly ISuggestionDTO[] {
        if (target.content.trim().length === 0) {
            return []
        }

        const suggestions: ISuggestionDTO[] = []
        let match = regex.exec(target.content)

        while (match !== null) {
            const matchedText = match[0] ?? ""
            if (matchedText.length === 0) {
                regex.lastIndex += 1
                match = regex.exec(target.content)
                continue
            }

            const lineStart = this.resolveLineStart(target.content, match.index)
            const lineEnd = this.resolveLineEnd(
                target.content,
                match.index + matchedText.length,
            )
            suggestions.push({
                id: `${rule.id.value}:regex:${hash(`${target.filePath}|${match.index}|${matchedText}`)}`,
                filePath: target.filePath,
                lineStart,
                lineEnd,
                severity: this.normalizeSeverity(rule.severity.toString()),
                category: CUSTOM_RULE_CATEGORY,
                message: `${rule.title}: ${rule.rule}`,
                codeBlock: this.normalizeCodeBlock(matchedText),
                committable: true,
                rankScore: DEFAULT_REGEX_RANK_SCORE + rule.severity.weight,
            })

            match = regex.exec(target.content)
        }

        return suggestions
    }

    /**
     * Builds one prompt request for PROMPT custom rule.
     *
     * @param rule Custom rule.
     * @param target Target payload.
     * @returns Chat request.
     */
    private buildPromptRequest(
        rule: CustomRule,
        target: RuleTarget,
    ): IChatRequestDTO {
        const messages: readonly IMessageDTO[] = [
            {
                role: MESSAGE_ROLE.SYSTEM,
                content:
                    "You are a strict code reviewer. Return only JSON in one of formats: " +
                    "[{\"message\": string, \"severity\": string, \"lineStart\": number, " +
                    "\"lineEnd\": number, \"codeBlock\": string}].",
            },
            {
                role: MESSAGE_ROLE.USER,
                content: `Apply custom rule "${rule.title}" to ${target.filePath}:\nRule: ${rule.rule}\n\n${target.content}`,
            },
        ]

        return {
            model: DEFAULT_PROMPT_MODEL,
            maxTokens: DEFAULT_PROMPT_MAX_TOKENS,
            messages,
        }
    }

    /**
     * Parses prompt response and maps JSON payload.
     *
     * @param content Prompt response text.
     * @param rule Origin rule.
     * @param fallbackPath Fallback file path.
     * @returns Prompt-derived suggestions.
     */
    private mapPromptResponse(
        content: string,
        rule: CustomRule,
        fallbackPath: string,
    ): readonly ISuggestionDTO[] {
        const parsed = this.tryParseJson(content)
        if (parsed === null) {
            return []
        }

        const source = this.resolveResponseItems(parsed)
        const suggestions: ISuggestionDTO[] = []

        for (const item of source) {
            const suggestion = this.mapPromptSuggestion(item, rule, fallbackPath)
            if (suggestion !== null) {
                suggestions.push(suggestion)
            }
        }

        return suggestions
    }

    /**
     * Applies SafeGuard when configured.
     *
     * @param suggestions Raw suggestions.
     * @param config Runtime config.
     * @param context Filter context.
     * @returns Filtered output.
     */
    private async applySafeGuardIfNeeded(
        suggestions: readonly ISuggestionDTO[],
        config: Readonly<Record<string, unknown>>,
        context?: ReviewPipelineState,
    ): Promise<Result<IApplyRuleUseCaseOutput, ValidationError>> {
        const applyFilters = readBooleanField(config, APPLY_FILTERS_FLAG) ?? false
        if (applyFilters === false || this.filters.length === 0) {
            return Result.ok<IApplyRuleUseCaseOutput, ValidationError>({
                suggestions: this.copySuggestions(suggestions),
                discardedSuggestions: [],
            })
        }

        if (context === undefined) {
            return Result.fail<IApplyRuleUseCaseOutput, ValidationError>(
                new ValidationError(
                    "filterContext is required when applyFiltersToCustomRules is true",
                    [
                        {
                            field: "filterContext",
                            message: "must be provided when filter chain is enabled",
                        },
                    ],
                ),
            )
        }

        let accepted: readonly ISuggestionDTO[] = suggestions
        const discarded: IDiscardedSuggestionDTO[] = []

        try {
            for (const filter of this.filters) {
                const filtered = await filter.filter(accepted, context)
                const normalizedAccepted = this.normalizeSuggestionCollection(filtered.passed)
                const normalizedDiscarded = this.normalizeDiscardedSuggestions(
                    filtered.discarded,
                    filter.name,
                )

                accepted = normalizedAccepted
                discarded.push(...normalizedDiscarded)
            }
        } catch (error: unknown) {
            return Result.fail<IApplyRuleUseCaseOutput, ValidationError>(
                new ValidationError("SafeGuard filter execution failed", [
                    {
                        field: "filters",
                        message: error instanceof Error ? error.message : "Unknown filter error",
                    },
                ]),
            )
        }

        return Result.ok<IApplyRuleUseCaseOutput, ValidationError>({
            suggestions: deduplicate(accepted, (suggestion): string => {
                return `${suggestion.filePath}|${suggestion.lineStart}|${suggestion.lineEnd}|${suggestion.message}`
            }),
            discardedSuggestions: deduplicate(discarded, (item): string => {
                return `${item.filePath}|${item.lineStart}|${item.lineEnd}|${item.message}|${item.filterName}`
            }),
        })
    }

    /**
     * Normalizes passed suggestions list.
     *
     * @param source Source list.
     * @returns Valid suggestions.
     */
    private normalizeSuggestionCollection(
        source: readonly ISuggestionDTO[],
    ): ISuggestionDTO[] {
        const normalized: ISuggestionDTO[] = []

        for (const suggestion of source) {
            normalized.push({...suggestion})
        }

        return normalized
    }

    /**
     * Normalizes discarded suggestions list.
     *
     * @param source Source discarded payload.
     * @param filterName Filter label.
     * @returns Discarded suggestions.
     */
    private normalizeDiscardedSuggestions(
        source: readonly IDiscardedSuggestionDTO[],
        filterName: string,
    ): IDiscardedSuggestionDTO[] {
        const normalized: IDiscardedSuggestionDTO[] = []

        for (const item of source) {
            const suggestion = this.normalizeSuggestion(item)
            if (suggestion === null) {
                normalized.push(this.createInvalidDiscardedSuggestion(item, filterName))
                continue
            }

            const discardReason = this.readNonEmptyString(item.discardReason) ?? "unknown"
            const sourceFilterName = this.readNonEmptyString(item.filterName) ?? filterName
            normalized.push({
                ...suggestion,
                discardReason,
                filterName: sourceFilterName,
            })
        }

        return normalized
    }

    /**
     * Creates fallback discarded suggestion for malformed payload.
     *
     * @param source Raw discarded payload.
     * @param filterName Filter label.
     * @returns Fallback discarded suggestion.
     */
    private createInvalidDiscardedSuggestion(
        source: unknown,
        filterName: string,
    ): IDiscardedSuggestionDTO {
        const message = this.readFallbackString(source, "message", "Invalid discarded suggestion payload")
        const filePath = this.readFallbackString(source, "filePath", GLOBAL_FILE_PATH)
        const lineStart = this.readFallbackPositiveInteger(source, "lineStart", 1)
        const lineEnd = this.readFallbackPositiveInteger(source, "lineEnd", lineStart)
        const severity = this.readFallbackString(
            source,
            "severity",
            DEFAULT_RULE_SEVERITY,
        )
        const category = this.readFallbackString(source, "category", CUSTOM_RULE_CATEGORY)
        const committable = this.readFallbackBoolean(source, "committable", false)
        const rankScore = this.readFallbackPositiveInteger(
            source,
            "rankScore",
            DEFAULT_PROMPT_RANK_SCORE,
        )
        const identitySeed = this.readFallbackString(
            source,
            "id",
            message,
        )
        const sourceFilterName = this.readFallbackString(source, "filterName", filterName)
        const discardReason = this.readFallbackString(
            source,
            "discardReason",
            "invalid-suggestion-payload",
        )

        return {
            id: `discarded:${filterName}:${hash(`${sourceFilterName}|${identitySeed}`)}`,
            filePath,
            lineStart,
            lineEnd,
            severity: this.normalizeSeverity(severity),
            category,
            message,
            codeBlock: undefined,
            committable,
            rankScore,
            discardReason,
            filterName: sourceFilterName,
        }
    }

    /**
     * Normalizes one suggestion payload from unknown source.
     *
     * @param source Payload.
     * @returns Suggestion DTO or null.
     */
    private normalizeSuggestion(
        source: unknown,
    ): ISuggestionDTO | null {
        if (!this.isRecord(source)) {
            return null
        }

        const stringFields = this.readSuggestionStringFields(source)
        if (stringFields === null) {
            return null
        }

        const numericFields = this.readSuggestionNumericFields(source)
        if (numericFields === null) {
            return null
        }

        const codeBlock = this.readNonEmptyString(source["codeBlock"])

        return {
            id: stringFields.id,
            filePath: stringFields.filePath,
            lineStart: numericFields.lineStart,
            lineEnd: numericFields.lineEnd,
            severity: this.normalizeSeverity(stringFields.severity),
            category: stringFields.category,
            message: stringFields.message,
            codeBlock: this.normalizeCodeBlock(codeBlock),
            committable: numericFields.committable,
            rankScore: numericFields.rankScore,
        }
    }

    /**
     * Reads required string fields from suggestion payload.
     *
     * @param source Suggestion payload.
     * @returns String fields or null.
     */
    private readSuggestionStringFields(
        source: SuggestionRecord,
    ): ISuggestionStringFields | null {
        const id = this.readNonEmptyString(source["id"])
        const filePath = this.readNonEmptyString(source["filePath"])
        const severity = this.readNonEmptyString(source["severity"])
        const category = this.readNonEmptyString(source["category"])
        const message = this.readNonEmptyString(source["message"])
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
     * Reads required numeric fields from suggestion payload.
     *
     * @param source Suggestion payload.
     * @returns Numeric fields or null.
     */
    private readSuggestionNumericFields(
        source: SuggestionRecord,
    ): ISuggestionNumericFields | null {
        const lineStart = this.readPositiveInteger(source["lineStart"])
        const lineEnd = this.readPositiveInteger(source["lineEnd"])
        const committable = this.readBoolean(source["committable"])
        const rankScore = this.readPositiveInteger(source["rankScore"])
        if (
            lineStart === undefined ||
            lineEnd === undefined ||
            committable === undefined ||
            rankScore === undefined
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
     * Maps one prompt response item.
     *
     * @param source Parsed item.
     * @param rule Origin rule.
     * @param fallbackPath Fallback file path.
     * @returns Mapped suggestion or null.
     */
    private mapPromptSuggestion(
        source: SuggestionRecord,
        rule: CustomRule,
        fallbackPath: string,
    ): ISuggestionDTO | null {
        const message = this.readNonEmptyString(source["message"])
        if (message === undefined) {
            return null
        }

        const lineStart = this.readPositiveInteger(source["lineStart"]) ?? 1
        const lineEnd = this.readPositiveInteger(source["lineEnd"]) ?? lineStart
        const severity = this.readNonEmptyString(source["severity"]) ?? DEFAULT_RULE_SEVERITY
        const category = this.readNonEmptyString(source["category"]) ?? CUSTOM_RULE_CATEGORY
        const rankScore = this.readPositiveInteger(source["rankScore"]) ?? DEFAULT_PROMPT_RANK_SCORE
        const committable = this.readBoolean(source["committable"]) ?? true
        const filePath = this.readNonEmptyString(source["filePath"]) ?? fallbackPath
        const codeBlock = this.readNonEmptyString(source["codeBlock"]) ?? ""

        return {
            id: `${rule.id.value}:prompt:${hash(`${filePath}|${message}`)}`,
            filePath,
            lineStart,
            lineEnd: Math.max(lineStart, lineEnd),
            severity: this.normalizeSeverity(severity),
            category,
            message: `${rule.title}: ${message}`,
            codeBlock: this.normalizeCodeBlock(codeBlock),
            committable,
            rankScore,
        }
    }

    /**
     * Maps AST evaluator match to suggestion DTO with resilient normalization.
     *
     * @param rule Rule descriptor.
     * @param fallbackPath Target file path.
     * @param source Raw AST suggestion match.
     * @returns Normalized suggestion.
     */
    private mapAstMatch(
        rule: CustomRule,
        fallbackPath: string,
        source: ICustomRuleAstMatch,
    ): ISuggestionDTO {
        const message = this.readNonEmptyString(source.message) ?? `${rule.title}: AST suggestion`
        const lineStart = this.readPositiveInteger(source.lineStart) ?? 1
        const lineEnd = this.readPositiveInteger(source.lineEnd) ?? lineStart
        const severity = this.readNonEmptyString(source.severity) ?? DEFAULT_RULE_SEVERITY
        const category = this.readNonEmptyString(source.category) ?? CUSTOM_RULE_CATEGORY
        const filePath = this.readNonEmptyString(source.filePath) ?? fallbackPath
        const committable = this.readBoolean(source.committable) ?? true
        const rankScore = this.readPositiveInteger(source.rankScore) ??
            DEFAULT_PROMPT_RANK_SCORE + rule.severity.weight

        return {
            id: `${rule.id.value}:ast:${hash(`${filePath}|${lineStart}|${lineEnd}|${message}`)}`,
            filePath,
            lineStart,
            lineEnd: Math.max(lineStart, lineEnd),
            severity: this.normalizeSeverity(severity),
            category,
            message: `${rule.title}: ${message}`,
            codeBlock: this.normalizeCodeBlock(this.readNonEmptyString(source.codeBlock)),
            committable,
            rankScore,
        }
    }

    /**
     * Creates regex object from rule text.
     *
     * @param value Pattern text.
     * @returns RegExp or null on invalid pattern.
     */
    private createRegex(value: string): RegExp | null {
        try {
            return new RegExp(value, "g")
        } catch {
            return null
        }
    }

    /**
     * Parses and validates response JSON payload.
     *
     * @param content LLM response.
     * @returns Parsed payload or null.
     */
    private tryParseJson(content: string): ParsedJsonPayload | null {
        const normalized = content.trim()
        if (normalized.length === 0) {
            return null
        }

        try {
            const parsed: unknown = JSON.parse(normalized)
            if (this.isParsedPayload(parsed)) {
                return parsed
            }

            return null
        } catch {
            return null
        }
    }

    /**
     * Checks parse result shape.
     *
     * @param value Parsed value.
     * @returns True when parse result is valid.
     */
    private isParsedPayload(
        value: unknown,
    ): value is ParsedJsonPayload {
        if (Array.isArray(value)) {
            return value.every((item): item is SuggestionRecord => {
                return this.isRecord(item)
            })
        }

        return this.isRecord(value)
    }

    /**
     * Normalizes response as suggestion list.
     *
     * @param source Parsed payload.
     * @returns Suggestion list records.
     */
    private resolveResponseItems(
        source: ParsedJsonPayload,
    ): readonly SuggestionRecord[] {
        if (Array.isArray(source)) {
            return source.filter((item): item is SuggestionRecord => {
                return this.isRecord(item)
            })
        }

        const record = source as SuggestionRecord
        const suggestionsRaw = record["suggestions"]
        if (Array.isArray(suggestionsRaw) === false) {
            return []
        }

        return suggestionsRaw.filter((item): item is SuggestionRecord => {
            return this.isRecord(item)
        })
    }

    /**
     * Reads file path from pipeline item payload.
     *
     * @param file Pipeline item.
     * @returns Best-effort file path.
     */
    private resolveFilePath(file: PipelineCollectionItem): string {
        const directPath = this.readNonEmptyString(file["path"])
        if (directPath !== undefined) {
            return directPath
        }

        const legacyPath = this.readNonEmptyString(file["oldPath"])
        if (legacyPath !== undefined) {
            return legacyPath
        }

        return "UNKNOWN_FILE"
    }

    /**
     * Reads source text for rule execution.
     *
     * @param file Pipeline item.
     * @returns File text snapshot.
     */
    private resolveSourceText(file: PipelineCollectionItem): string {
        const patch = this.readNonEmptyString(file["patch"])
        if (patch !== undefined) {
            return patch
        }

        const content = this.readNonEmptyString(file["content"])
        if (content !== undefined) {
            return content
        }

        const hunks = file["hunks"]
        if (Array.isArray(hunks)) {
            const rawHunks = this.normalizeHunks(hunks)
            if (rawHunks.length > 0) {
                return rawHunks
            }
        }

        return ""
    }

    /**
     * Normalizes unknown file hunks.
     *
     * @param hunks Hunk payload.
     * @returns Joined hunks.
     */
    private normalizeHunks(hunks: readonly unknown[]): string {
        const lines: string[] = []

        for (const hunk of hunks) {
            if (!this.isRecord(hunk)) {
                continue
            }

            const hunkSource = this.readNonEmptyString(hunk["patch"])
            if (hunkSource !== undefined) {
                lines.push(hunkSource)
            }
        }

        return lines.join("\n")
    }

    /**
     * Normalizes source snippet for suggestion code block.
     *
     * @param value Snippet value.
     * @returns Trimmed snippet.
     */
    private normalizeCodeBlock(value: string | undefined): string {
        if (value === undefined) {
            return ""
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return ""
        }

        return normalized
    }

    /**
     * Resolves line start from character offset.
     *
     * @param content Source text.
     * @param offset Character offset.
     * @returns 1-based line start.
     */
    private resolveLineStart(content: string, offset: number): number {
        const prefix = content.slice(0, offset)
        return (prefix.match(/\n/g)?.length ?? 0) + 1
    }

    /**
     * Resolves line end from character offset.
     *
     * @param content Source text.
     * @param offset Character offset.
     * @returns 1-based line end.
     */
    private resolveLineEnd(content: string, offset: number): number {
        const prefix = content.slice(0, offset)
        return (prefix.match(/\n/g)?.length ?? 0) + 1
    }

    /**
     * Clones suggestions list immutably.
     *
     * @param source Source list.
     * @returns Copy of list.
     */
    private copySuggestions(source: readonly ISuggestionDTO[]): ISuggestionDTO[] {
        return source.map((suggestion): ISuggestionDTO => {
            return {...suggestion}
        })
    }

    /**
     * Reads string field as trimmed value.
     *
     * @param value Unknown value.
     * @returns Trimmed string or undefined.
     */
    private readNonEmptyString(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Reads and normalizes fallback string field.
     *
     * @param source Payload.
     * @param key Field key.
     * @param fallback Fallback value.
     * @returns Read value or fallback.
     */
    private readFallbackString(
        source: unknown,
        key: string,
        fallback: string,
    ): string {
        const raw = this.readRecordField(source, key)
        return this.readNonEmptyString(raw) ?? fallback
    }

    /**
     * Reads positive integer field.
     *
     * @param value Unknown value.
     * @returns Positive integer or undefined.
     */
    private readPositiveInteger(value: unknown): number | undefined {
        if (typeof value !== "number") {
            return undefined
        }

        if (Number.isInteger(value) === false || value < 1) {
            return undefined
        }

        return value
    }

    /**
     * Reads positive integer with fallback.
     *
     * @param source Payload.
     * @param key Field key.
     * @param fallback Fallback value.
     * @returns Positive integer.
     */
    private readFallbackPositiveInteger(
        source: unknown,
        key: string,
        fallback: number,
    ): number {
        const raw = this.readRecordField(source, key)
        return this.readPositiveInteger(raw) ?? fallback
    }

    /**
     * Reads boolean field.
     *
     * @param value Unknown value.
     * @returns Boolean or undefined.
     */
    private readBoolean(value: unknown): boolean | undefined {
        if (typeof value !== "boolean") {
            return undefined
        }

        return value
    }

    /**
     * Reads boolean with fallback.
     *
     * @param source Payload.
     * @param key Field key.
     * @param fallback Fallback value.
     * @returns Boolean.
     */
    private readFallbackBoolean(
        source: unknown,
        key: string,
        fallback: boolean,
    ): boolean {
        const raw = this.readRecordField(source, key)
        return this.readBoolean(raw) ?? fallback
    }

    /**
     * Reads property value from object record.
     *
     * @param source Payload.
     * @param key Field key.
     * @returns Value or undefined.
     */
    private readRecordField(source: unknown, key: string): unknown {
        if (this.isRecord(source) === false) {
            return undefined
        }

        return source[key]
    }

    /**
     * Checks plain object shape.
     *
     * @param source Candidate value.
     * @returns True when candidate is record.
     */
    private isRecord(source: unknown): source is SuggestionRecord {
        return source !== null && typeof source === "object" && Array.isArray(source) === false
    }

    /**
     * Normalizes severity to allowed list.
     *
     * @param value Severity text.
     * @returns Canonical severity.
     */
    private normalizeSeverity(value: string): SeverityLevel {
        const normalized = value.trim().toUpperCase()
        if (Object.values(SEVERITY_LEVEL).includes(normalized as SeverityLevel)) {
            return normalized as SeverityLevel
        }

        return DEFAULT_RULE_SEVERITY
    }
}
