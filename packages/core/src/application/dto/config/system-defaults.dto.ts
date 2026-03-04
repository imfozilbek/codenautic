import type {ReviewDepthStrategy} from "../review/review-config.dto"
import type {SeverityLevel} from "../../../domain/value-objects/severity.value-object"
import type {SuggestionClusteringMode} from "../analytics/suggestion-clustering.dto"
import type {IMCPInitializeResponse} from "../mcp/mcp-types.dto"

/**
 * Defaults for chat completion in messaging.
 */
export interface IMessagingChatDefaults {
    readonly model: string
    readonly maxTokens: number
}

/**
 * Defaults for outbox relay batching.
 */
export interface IOutboxRelayDefaults {
    readonly batchSize: number
}

/**
 * Defaults for available mention command types.
 */
export interface IMentionCommandDefaults {
    readonly allowedCommands: readonly string[]
}

/**
 * Messaging defaults bundle.
 */
export interface IMessagingDefaults {
    readonly chat: IMessagingChatDefaults
    readonly outboxRelay: IOutboxRelayDefaults
    readonly mentionCommands: IMentionCommandDefaults
}

/**
 * Defaults for per-file review stage.
 */
export interface IReviewFileDefaults {
    readonly model: string
    readonly maxTokens: number
    readonly timeoutMs: number
    readonly reviewDepthStrategy: ReviewDepthStrategy
    readonly systemPromptName: string
    readonly reviewerPrompt: string
}

/**
 * Defaults for CCR level review stage.
 */
export interface IReviewCcrDefaults {
    readonly model: string
    readonly maxTokens: number
    readonly promptName: string
}

/**
 * Defaults for summary generation stage.
 */
export interface IReviewSummaryDefaults {
    readonly model: string
    readonly maxTokens: number
    readonly systemPrompt: string
    readonly userPrompt: string
}

/**
 * Defaults for CCR summary generation.
 */
export interface ICcrSummaryDefaults {
    readonly model: string
    readonly maxTokens: number
    readonly defaultSystemPromptName: string
    readonly complementSystemPromptName: string
}

/**
 * Defaults for file context gate batching.
 */
export interface IFileContextGateDefaults {
    readonly batchSize: number
}

/**
 * Defaults for external context loading.
 */
export interface IExternalContextDefaults {
    readonly limit: number
}

/**
 * Defaults for severity safeguard.
 */
export interface ISeveritySafeguardDefaults {
    readonly threshold: string
}

/**
 * Defaults for priority safeguard.
 */
export interface IPrioritySafeguardDefaults {
    readonly limit: number
}

/**
 * Defaults for hallucination safeguard.
 */
export interface IHallucinationSafeguardDefaults {
    readonly model: string
    readonly maxTokens: number
}

/**
 * Defaults for review safeguards.
 */
export interface IReviewSafeguardDefaults {
    readonly severity: ISeveritySafeguardDefaults
    readonly priority: IPrioritySafeguardDefaults
    readonly hallucination: IHallucinationSafeguardDefaults
}

/**
 * Defaults for review cadence automation.
 */
export interface IReviewCadenceDefaults {
    readonly autoPauseThreshold: number
}

/**
 * Defaults for review throttling.
 */
export interface IReviewThrottleDefaults {
    readonly windowSeconds: number
    readonly maxReviewsPerWindow: number
}

/**
 * Defaults for initial review comment.
 */
export interface IReviewInitialCommentDefaults {
    readonly body: string
}

/**
 * Defaults for check run creation.
 */
export interface IReviewCheckRunDefaults {
    readonly checkRunName: string
}

/**
 * Defaults for augment-context stage.
 */
export interface IReviewAugmentContextDefaults {
    readonly relatedFilesLimit: number
}

/**
 * Defaults for dry-run review.
 */
export interface IReviewDryRunDefaults {
    readonly startAttempt: number
    readonly mutatingStageIds: readonly string[]
}

/**
 * Review pipeline defaults bundle.
 */
export interface IReviewDefaults {
    readonly fileReview: IReviewFileDefaults
    readonly ccrReview: IReviewCcrDefaults
    readonly summary: IReviewSummaryDefaults
    readonly ccrSummary: ICcrSummaryDefaults
    readonly fileContextGate: IFileContextGateDefaults
    readonly externalContext: IExternalContextDefaults
    readonly safeguards: IReviewSafeguardDefaults
    readonly cadence: IReviewCadenceDefaults
    readonly throttle: IReviewThrottleDefaults
    readonly initialComment: IReviewInitialCommentDefaults
    readonly checkRun: IReviewCheckRunDefaults
    readonly augmentContext: IReviewAugmentContextDefaults
    readonly dryRun: IReviewDryRunDefaults
}

/**
 * Defaults for applying rules.
 */
export interface IApplyRuleDefaults {
    readonly promptModel: string
    readonly promptMaxTokens: number
    readonly promptRankScore: number
    readonly regexRankScore: number
    readonly ruleSeverity: SeverityLevel
}

/**
 * Defaults for rules listing pagination.
 */
export interface IListRulesDefaults {
    readonly page: number
    readonly limit: number
}

/**
 * Rule defaults bundle.
 */
export interface IRulesDefaults {
    readonly applyRule: IApplyRuleDefaults
    readonly listRules: IListRulesDefaults
}

/**
 * Defaults for false positive detection.
 */
export interface IFalsePositiveDetectionDefaults {
    readonly threshold: number
    readonly deactivateThreshold: number
    readonly minSampleSize: number
    readonly minDeactivateSampleSize: number
}

/**
 * Defaults for team pattern learning.
 */
export interface ILearnTeamPatternsDefaults {
    readonly minSampleSize: number
    readonly minConfidence: number
    readonly minWeightDelta: number
    readonly maxAdjustments: number
}

/**
 * Analytics defaults bundle.
 */
export interface IAnalyticsDefaults {
    readonly falsePositiveDetection: IFalsePositiveDetectionDefaults
    readonly learnTeamPatterns: ILearnTeamPatternsDefaults
}

/**
 * Defaults for suggestion clustering.
 */
export interface IClusteringDefaults {
    readonly mode: SuggestionClusteringMode
    readonly similarityThreshold: number
    readonly embeddingModel: string
}

/**
 * Defaults for MCP server.
 */
export interface IMcpDefaults {
    readonly protocolVersion: IMCPInitializeResponse["protocolVersion"]
}

/**
 * Full defaults payload resolved from config-service.
 */
export interface IApplicationDefaultsDTO {
    readonly review: IReviewDefaults
    readonly messaging: IMessagingDefaults
    readonly rules: IRulesDefaults
    readonly analytics: IAnalyticsDefaults
    readonly clustering: IClusteringDefaults
    readonly mcp: IMcpDefaults
}
