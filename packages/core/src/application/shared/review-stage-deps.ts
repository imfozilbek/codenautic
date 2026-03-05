import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IGeneratePromptInput} from "../use-cases/generate-prompt.use-case"
import type {
    IGetEnabledRulesInput,
    IGetEnabledRulesOutput,
} from "../dto/rules/get-enabled-rules.dto"
import type {ILLMProvider} from "../ports/outbound/llm/llm-provider.port"
import type {ILibraryRuleRepository} from "../ports/outbound/rule/library-rule-repository.port"
import type {ValidationError} from "../../domain/errors/validation.error"
import {RuleContextFormatterService} from "../../domain/services/rule-context-formatter.service"

/**
 * Общие зависимости стадий review пайплайна.
 */
export interface IReviewStageDeps<TDefaults> {
    /**
     * LLM provider port.
     */
    readonly llmProvider: ILLMProvider

    /**
     * Prompt template rendering use case.
     */
    readonly generatePromptUseCase: IUseCase<IGeneratePromptInput, string, ValidationError>

    /**
     * Enabled rules resolution use case.
     */
    readonly getEnabledRulesUseCase: IUseCase<
        IGetEnabledRulesInput,
        IGetEnabledRulesOutput,
        ValidationError
    >

    /**
     * Rule library repository.
     */
    readonly libraryRuleRepository: ILibraryRuleRepository

    /**
     * Rule context formatter service.
     */
    readonly ruleContextFormatterService: RuleContextFormatterService

    /**
     * Stage defaults.
     */
    readonly defaults: TDefaults
}
