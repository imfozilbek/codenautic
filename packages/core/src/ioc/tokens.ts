import type {IFileMetricsProvider} from "../application/ports/outbound/analysis/file-metrics-provider"
import type {IAnalyticsService} from "../application/ports/outbound/analytics/analytics-service.port"
import type {IAuditLogRepository} from "../application/ports/outbound/audit-log-repository.port"
import type {ICache} from "../application/ports/outbound/cache/cache.port"
import type {IDomainEventBus} from "../application/ports/outbound/common/domain-event-bus.port"
import type {ILogger} from "../application/ports/outbound/common/logger.port"
import type {ISystemSettingsProvider} from "../application/ports/outbound/common/system-settings-provider.port"
import type {ISystemSettingsRepository} from "../application/ports/outbound/common/system-settings-repository.port"
import type {ISystemSettingsWriter} from "../application/ports/outbound/common/system-settings-writer.port"
import type {ICustomRuleRepository} from "../application/ports/outbound/custom-rule-repository.port"
import type {IFeedbackRepository} from "../application/ports/outbound/feedback-repository.port"
import type {IGitBlame} from "../application/ports/outbound/git/git-blame.port"
import type {IGitProvider} from "../application/ports/outbound/git/git-provider.port"
import type {ICodeGraphPageRankService} from "../application/ports/outbound/graph/code-graph-page-rank-service.port"
import type {IGraphRepository} from "../application/ports/outbound/graph/code-graph-repository.port"
import type {ILLMProvider} from "../application/ports/outbound/llm/llm-provider.port"
import type {IConversationThreadRepository} from "../application/ports/outbound/messaging/conversation-thread-repository.port"
import type {IInboxRepository} from "../application/ports/outbound/messaging/inbox-repository.port"
import type {IMessageBroker} from "../application/ports/outbound/messaging/message-broker.port"
import type {IOutboxRepository} from "../application/ports/outbound/messaging/outbox-repository.port"
import type {INotificationProvider} from "../application/ports/outbound/notification/notification-provider.port"
import type {INotificationService} from "../application/ports/outbound/notification/notification-service.port"
import type {IOrganizationRepository} from "../application/ports/outbound/organization-repository.port"
import type {IProjectRepository} from "../application/ports/outbound/project-repository.port"
import type {IPromptConfigurationRepository} from "../application/ports/outbound/prompt-configuration-repository.port"
import type {IPromptTemplateRepository} from "../application/ports/outbound/prompt-template-repository.port"
import type {IExpertPanelRepository} from "../application/ports/outbound/expert-panel-repository.port"
import type {IExternalContextProvider} from "../application/ports/outbound/review/external-context-provider.port"
import type {IIssueAggregationProvider} from "../application/ports/outbound/review/issue-aggregation-provider"
import type {IPipelineCheckpointStore} from "../application/ports/outbound/review/pipeline-checkpoint-store.port"
import type {IRepositoryConfigLoader} from "../application/ports/outbound/review/repository-config-loader.port"
import type {IReviewIssueTicketRepository} from "../application/ports/outbound/review/review-issue-ticket-repository.port"
import type {IReviewRepository} from "../application/ports/outbound/review/review-repository.port"
import type {ICustomRuleAstEvaluator} from "../application/ports/outbound/rule/custom-rule-ast-evaluator.port"
import type {ICategoryWeightProvider} from "../application/ports/outbound/rule/category-weight-provider.port"
import type {ILibraryRuleRepository} from "../application/ports/outbound/rule/library-rule-repository.port"
import type {IRuleCategoryRepository} from "../application/ports/outbound/rule/rule-category-repository.port"
import type {IRuleRepository} from "../application/ports/outbound/rule/rule-repository.port"
import type {ITeamRuleProvider} from "../application/ports/outbound/rule/team-rule-provider.port"
import type {IRepositoryIndexRepository} from "../application/ports/outbound/scanning/repository-index-repository"
import type {IRepositoryScanner} from "../application/ports/outbound/scanning/repository-scanner"
import type {IScanProgressRepository} from "../application/ports/outbound/scanning/scan-progress-repository"
import type {IRepositoryWorkspaceProvider} from "../application/ports/outbound/scanning/repository-workspace-provider"
import type {ISourceCodeParser} from "../application/ports/outbound/scanning/source-code-parser.port"
import type {ITaskRepository} from "../application/ports/outbound/task-repository.port"
import type {ITeamRepository} from "../application/ports/outbound/team-repository.port"
import type {IUserRepository} from "../application/ports/outbound/user-repository.port"
import type {ICodeChunkEmbeddingGenerator} from "../application/ports/outbound/vector/code-chunk-embedding-generator.port"
import type {IVectorRepository} from "../application/ports/outbound/vector/vector-repository.port"
import {createToken} from "./create-token"

/**
 * Core package DI tokens.
 */
export const TOKENS = {
    Analytics: {
        Service: createToken<IAnalyticsService>("core.analytics.service"),
    },
    Analysis: {
        CodeGraphPageRankService: createToken<ICodeGraphPageRankService>(
            "core.analysis.code-graph-page-rank-service",
        ),
        FileMetricsProvider: createToken<IFileMetricsProvider>(
            "core.analysis.file-metrics-provider",
        ),
        GraphRepository: createToken<IGraphRepository>("core.analysis.graph-repository"),
    },
    Audit: {
        LogRepository: createToken<IAuditLogRepository>("core.audit.log-repository"),
    },
    Common: {
        Cache: createToken<ICache>("core.common.cache"),
        DomainEventBus: createToken<IDomainEventBus>("core.common.domain-event-bus"),
        Logger: createToken<ILogger>("core.common.logger"),
        SystemSettingsProvider: createToken<ISystemSettingsProvider>(
            "core.common.system-settings-provider",
        ),
        SystemSettingsRepository: createToken<ISystemSettingsRepository>(
            "core.common.system-settings-repository",
        ),
        SystemSettingsWriter: createToken<ISystemSettingsWriter>(
            "core.common.system-settings-writer",
        ),
    },
    Feedback: {
        Repository: createToken<IFeedbackRepository>("core.feedback.repository"),
    },
    Git: {
        Blame: createToken<IGitBlame>("core.git.blame"),
        Provider: createToken<IGitProvider>("core.git.provider"),
    },
    LLM: {
        Provider: createToken<ILLMProvider>("core.llm.provider"),
    },
    Messaging: {
        ConversationThreadRepository: createToken<IConversationThreadRepository>(
            "core.messaging.conversation-thread-repository",
        ),
        InboxRepository: createToken<IInboxRepository>("core.messaging.inbox-repository"),
        MessageBroker: createToken<IMessageBroker>("core.messaging.message-broker"),
        OutboxRepository: createToken<IOutboxRepository>("core.messaging.outbox-repository"),
    },
    Notification: {
        Provider: createToken<INotificationProvider>("core.notification.provider"),
        Service: createToken<INotificationService>("core.notification.service"),
    },
    Organization: {
        Repository: createToken<IOrganizationRepository>("core.organization.repository"),
    },
    Project: {
        Repository: createToken<IProjectRepository>("core.project.repository"),
    },
    Prompt: {
        ConfigurationRepository: createToken<IPromptConfigurationRepository>(
            "core.prompt.configuration-repository",
        ),
        ExpertPanelRepository: createToken<IExpertPanelRepository>(
            "core.prompt.expert-panel-repository",
        ),
        TemplateRepository: createToken<IPromptTemplateRepository>(
            "core.prompt.template-repository",
        ),
    },
    Review: {
        ExternalContextProvider: createToken<IExternalContextProvider>(
            "core.review.external-context-provider",
        ),
        IssueAggregationProvider: createToken<IIssueAggregationProvider>(
            "core.review.issue-aggregation-provider",
        ),
        IssueTicketRepository: createToken<IReviewIssueTicketRepository>(
            "core.review.issue-ticket-repository",
        ),
        PipelineCheckpointStore: createToken<IPipelineCheckpointStore>(
            "core.review.pipeline-checkpoint-store",
        ),
        Repository: createToken<IReviewRepository>("core.review.repository"),
        RepositoryConfigLoader: createToken<IRepositoryConfigLoader>(
            "core.review.repository-config-loader",
        ),
    },
    Rule: {
        CategoryRepository: createToken<IRuleCategoryRepository>("core.rule.category-repository"),
        CustomAstEvaluator: createToken<ICustomRuleAstEvaluator>("core.rule.custom-ast-evaluator"),
        CustomRepository: createToken<ICustomRuleRepository>("core.rule.custom-repository"),
        LibraryRepository: createToken<ILibraryRuleRepository>("core.rule.library-repository"),
        Repository: createToken<IRuleRepository>("core.rule.repository"),
    },
    Rules: {
        CategoryWeightProvider: createToken<ICategoryWeightProvider>(
            "core.rules.category-weight-provider",
        ),
        TeamRuleProvider: createToken<ITeamRuleProvider>("core.rules.team-rule-provider"),
    },
    Scanning: {
        RepositoryIndexRepository: createToken<IRepositoryIndexRepository>(
            "core.scanning.repository-index-repository",
        ),
        RepositoryScanner: createToken<IRepositoryScanner>(
            "core.scanning.repository-scanner",
        ),
        RepositoryWorkspaceProvider: createToken<IRepositoryWorkspaceProvider>(
            "core.scanning.repository-workspace-provider",
        ),
        ScanProgressRepository: createToken<IScanProgressRepository>(
            "core.scanning.scan-progress-repository",
        ),
        SourceCodeParser: createToken<ISourceCodeParser>(
            "core.scanning.source-code-parser",
        ),
    },
    Task: {
        Repository: createToken<ITaskRepository>("core.task.repository"),
    },
    Team: {
        Repository: createToken<ITeamRepository>("core.team.repository"),
    },
    User: {
        Repository: createToken<IUserRepository>("core.user.repository"),
    },
    Vector: {
        CodeChunkEmbeddingGenerator: createToken<ICodeChunkEmbeddingGenerator>(
            "core.vector.code-chunk-embedding-generator",
        ),
        Repository: createToken<IVectorRepository>("core.vector.repository"),
    },
} as const
