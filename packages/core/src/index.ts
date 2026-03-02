export {type IUseCase} from "./application/ports/inbound/use-case.port"
export {type IDomainEventBus} from "./application/ports/outbound/domain-event-bus.port"
export {type IReviewRepository} from "./application/ports/outbound/review-repository.port"
export {type IRuleRepository} from "./application/ports/outbound/rule-repository.port"
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
export {AggregateRoot} from "./domain/aggregates/aggregate-root"
export {REVIEW_STATUS, Review, type IReviewProps, type ReviewStatus} from "./domain/aggregates/review.aggregate"
export {RULE_STATUS, Rule, type IRuleProps, type RuleStatus} from "./domain/aggregates/rule.aggregate"
export {Entity} from "./domain/entities/entity"
export {DomainError} from "./domain/errors/domain.error"
export {ReviewNotFoundError} from "./domain/errors/review-not-found.error"
export {ReviewSeverityBudgetExceededError} from "./domain/errors/review-severity-budget-exceeded.error"
export {ReviewStatusTransitionError} from "./domain/errors/review-status-transition.error"
export {RuleStatusTransitionError} from "./domain/errors/rule-status-transition.error"
export {BaseDomainEvent} from "./domain/events/base-domain-event"
export {ReviewCompleted, type IReviewCompletedPayload} from "./domain/events/review-completed"
export {ReviewStarted, type IReviewStartedPayload} from "./domain/events/review-started"
export {RuleActivated, type IRuleActivatedPayload} from "./domain/events/rule-activated"
export {
    type ICreateReviewProps,
    type IReconstituteReviewProps,
    ReviewFactory,
} from "./domain/factories/review.factory"
export {type ICreateRuleProps, type IReconstituteRuleProps, RuleFactory} from "./domain/factories/rule.factory"
export {type IEntityFactory} from "./domain/factories/entity-factory.interface"
export {RuleStatusPolicyService} from "./domain/services/rule-status-policy.service"
export {CodeChunk, type ICreateCodeChunkProps} from "./domain/value-objects/code-chunk.value-object"
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
