export {type IUseCase} from "./application/ports/inbound/use-case.port"
export {type IDomainEventBus} from "./application/ports/outbound/common/domain-event-bus.port"
export {type ILogger} from "./application/ports/outbound/common/logger.port"
export {
    PIPELINE_CHECKPOINT_STATUS,
    type IPipelineCheckpointStore,
    type IPipelineStageCheckpoint,
    type PipelineCheckpointStatus,
} from "./application/ports/outbound/review/pipeline-checkpoint-store.port"
export {type IReviewRepository} from "./application/ports/outbound/review/review-repository.port"
export {type IRuleRepository} from "./application/ports/outbound/rule/rule-repository.port"
export {
    type IHeuristicRegistryEntry,
    type IHeuristicResolutionMode,
    type IHeuristicRiskLevel,
    type IHeuristicStatus,
    type IHeuristicType,
    type IHeuristicVerificationRule,
} from "./application/dto/heuristics/heuristic-registry-entry.dto"
export {type IImportedRuleHeuristicsMetadata} from "./application/dto/rules/rule-import-metadata.dto"
export {
    CompleteReviewUseCase,
    type ICompleteReviewInput,
    type ICompleteReviewOutput,
} from "./application/use-cases/review/complete-review.use-case"
export {
    PipelineOrchestratorUseCase,
    PipelineRunner,
    type IPipelineOrchestratorDependencies,
    type IPipelineRunCommand,
} from "./application/use-cases/review/pipeline-orchestrator.use-case"
export {type IPipelineDefinition, type IPipelineDefinitionStage} from "./application/types/review/pipeline-definition.type"
export {
    PIPELINE_STAGE_RESULT_STATUS,
    type IPipelineResult,
    type IPipelineStageExecutionResult,
    type PipelineStageResultStatus,
} from "./application/types/review/pipeline-result.type"
export {
    PipelineStageUseCaseAdapter,
    type IPipelineStage,
    type IPipelineStageUseCase,
    type IStageCommand,
    type IStageTransition,
    type IStageTransitionMetadata,
} from "./application/types/review/pipeline-stage.contract"
export {
    ReviewPipelineState,
    type ICreateReviewPipelineStateProps,
    type IReviewPipelineStateProps,
    type IUpdateReviewPipelineStateProps,
} from "./application/types/review/review-pipeline-state"
export {AggregateRoot} from "./domain/aggregates/aggregate-root"
export {
    REVIEW_STATUS,
    Review,
    type IReviewCompletionMetrics,
    type IReviewProps,
    type ReviewStatus,
} from "./domain/aggregates/review.aggregate"
export {RULE_STATUS, Rule, type IRuleProps, type RuleStatus} from "./domain/aggregates/rule.aggregate"
export {Entity} from "./domain/entities/entity"
export {
    ISSUE_CATEGORY,
    ReviewIssue,
    type IReviewIssueProps,
    type IssueCategory,
} from "./domain/entities/review-issue.entity"
export {ConflictError} from "./domain/errors/conflict.error"
export {DomainError} from "./domain/errors/domain.error"
export {InvalidUniqueIdError} from "./domain/errors/invalid-unique-id.error"
export {NotFoundError} from "./domain/errors/not-found.error"
export {ReviewNotFoundError} from "./domain/errors/review-not-found.error"
export {ReviewSeverityBudgetExceededError} from "./domain/errors/review-severity-budget-exceeded.error"
export {ReviewStatusTransitionError} from "./domain/errors/review-status-transition.error"
export {RuleStatusTransitionError} from "./domain/errors/rule-status-transition.error"
export {StageError, type ICreateStageErrorParams} from "./domain/errors/stage.error"
export {UnauthorizedError} from "./domain/errors/unauthorized.error"
export {ValidationError, type IValidationErrorField} from "./domain/errors/validation.error"
export {BaseDomainEvent} from "./domain/events/base-domain-event"
export {
    FEEDBACK_TYPE,
    FeedbackReceived,
    type FeedbackType,
    type IFeedbackReceivedPayload,
} from "./domain/events/feedback-received"
export {IssueFound, type IIssueFoundPayload} from "./domain/events/issue-found"
export {
    MetricsCalculated,
    type IMetricsCalculatedPayload,
    type ITokenUsagePayload,
} from "./domain/events/metrics-calculated"
export {PipelineCompleted, type IPipelineCompletedPayload} from "./domain/events/pipeline-completed"
export {PipelineFailed, type IPipelineFailedPayload} from "./domain/events/pipeline-failed"
export {PipelineStarted, type IPipelineStartedPayload} from "./domain/events/pipeline-started"
export {
    REVIEW_COMPLETION_STATUS,
    ReviewCompleted,
    type IReviewCompletedPayload,
    type ReviewCompletionStatus,
} from "./domain/events/review-completed"
export {ReviewStarted, type IReviewStartedPayload} from "./domain/events/review-started"
export {RuleActivated, type IRuleActivatedPayload} from "./domain/events/rule-activated"
export {StageCompleted, type IStageCompletedPayload} from "./domain/events/stage-completed"
export {StageFailed, type IStageFailedPayload} from "./domain/events/stage-failed"
export {StageStarted, type IStageStartedPayload} from "./domain/events/stage-started"
export {type IEntityFactory} from "./domain/factories/entity-factory.interface"
export {
    type ICreateReviewIssueProps,
    type IReconstituteReviewIssueProps,
    ReviewIssueFactory,
} from "./domain/factories/review-issue.factory"
export {
    type ICreateReviewProps,
    type IReconstituteReviewProps,
    ReviewFactory,
} from "./domain/factories/review.factory"
export {type ICreateRuleProps, type IReconstituteRuleProps, RuleFactory} from "./domain/factories/rule.factory"
export {RuleStatusPolicyService} from "./domain/services/rule-status-policy.service"
export {CodeChunk, type ICreateCodeChunkProps} from "./domain/value-objects/code-chunk.value-object"
export {
    DIFF_FILE_STATUS,
    DiffFile,
    type DiffFileStatus,
    type ICreateDiffFileProps,
} from "./domain/value-objects/diff-file.value-object"
export {Embedding, type ICreateEmbeddingProps} from "./domain/value-objects/embedding.value-object"
export {FilePath} from "./domain/value-objects/file-path.value-object"
export {LineRange} from "./domain/value-objects/line-range.value-object"
export {
    MEMBER_ROLE,
    MemberRole,
    type MemberRoleValue,
} from "./domain/value-objects/member-role.value-object"
export {OrganizationId} from "./domain/value-objects/organization-id.value-object"
export {
    PROGRAMMING_LANGUAGE,
    ProgrammingLanguage,
    type ProgrammingLanguageValue,
} from "./domain/value-objects/programming-language.value-object"
export {
    REPOSITORY_PLATFORM,
    RepositoryId,
    type RepositoryPlatform,
} from "./domain/value-objects/repository-id.value-object"
export {
    RISK_SCORE_LEVEL,
    RiskScore,
    type IRiskScoreFactors,
    type RiskScoreLevel,
} from "./domain/value-objects/risk-score.value-object"
export {SEVERITY_LEVEL, Severity, type SeverityLevel} from "./domain/value-objects/severity.value-object"
export {UniqueId} from "./domain/value-objects/unique-id.value-object"
export {ValueObject} from "./domain/value-objects/value-object"
export {Container, type DependencyFactory} from "./ioc/container"
export {createToken, type InjectionToken} from "./ioc/create-token"
export {TOKENS} from "./ioc/tokens"
export {
    ARCHITECTURE_LAYER,
    collectTypeScriptFiles,
    type ArchitectureLayer,
    type IDependencyDirectionValidationOptions,
    type IDependencyDirectionViolation,
    type ISourceFileSnapshot,
    validateDependencyDirection,
} from "./shared/dependency-direction-guard"
export {deduplicate} from "./shared/utils/deduplicate"
export {hash} from "./shared/utils/hash"
export {serialize, deserialize} from "./shared/utils/serialize"
export {similarity} from "./shared/utils/similarity"
export {Result} from "./shared/result"
