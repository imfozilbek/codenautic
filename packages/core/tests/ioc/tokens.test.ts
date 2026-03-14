import {describe, expect, test} from "bun:test"

import type {IFileMetricsProvider} from "../../src/application/ports/outbound/analysis/file-metrics-provider"
import type {IAnalyticsService} from "../../src/application/ports/outbound/analytics/analytics-service.port"
import type {IAuditLogRepository} from "../../src/application/ports/outbound/audit-log-repository.port"
import type {ICache} from "../../src/application/ports/outbound/cache/cache.port"
import type {IDomainEventBus} from "../../src/application/ports/outbound/common/domain-event-bus.port"
import type {ILogger} from "../../src/application/ports/outbound/common/logger.port"
import type {ICustomRuleRepository} from "../../src/application/ports/outbound/custom-rule-repository.port"
import type {IFeedbackRepository} from "../../src/application/ports/outbound/feedback-repository.port"
import type {IGitBlame} from "../../src/application/ports/outbound/git/git-blame.port"
import type {IGitPipelineStatusProvider} from "../../src/application/ports/outbound/git/git-pipeline-status.port"
import type {IGitProvider} from "../../src/application/ports/outbound/git/git-provider.port"
import type {ICodeGraphClusteringService} from "../../src/application/ports/outbound/graph/code-graph-clustering-service.port"
import type {ICodeGraphDiffService} from "../../src/application/ports/outbound/graph/code-graph-diff-service.port"
import type {ICodeGraphPageRankService} from "../../src/application/ports/outbound/graph/code-graph-page-rank-service.port"
import type {IGraphRepository} from "../../src/application/ports/outbound/graph/code-graph-repository.port"
import type {ILLMProvider} from "../../src/application/ports/outbound/llm/llm-provider.port"
import type {IConversationThreadRepository} from "../../src/application/ports/outbound/messaging/conversation-thread-repository.port"
import type {IInboxRepository} from "../../src/application/ports/outbound/messaging/inbox-repository.port"
import type {IMessageBroker} from "../../src/application/ports/outbound/messaging/message-broker.port"
import type {IOutboxRepository} from "../../src/application/ports/outbound/messaging/outbox-repository.port"
import type {INotificationProvider} from "../../src/application/ports/outbound/notification/notification-provider.port"
import type {INotificationService} from "../../src/application/ports/outbound/notification/notification-service.port"
import type {IOrganizationRepository} from "../../src/application/ports/outbound/organization-repository.port"
import type {IProjectRepository} from "../../src/application/ports/outbound/project-repository.port"
import type {IPromptConfigurationRepository} from "../../src/application/ports/outbound/prompt-configuration-repository.port"
import type {IPromptTemplateRepository} from "../../src/application/ports/outbound/prompt-template-repository.port"
import type {IExternalContextProvider} from "../../src/application/ports/outbound/review/external-context-provider.port"
import type {IIssueAggregationProvider} from "../../src/application/ports/outbound/review/issue-aggregation-provider"
import type {IPipelineCheckpointStore} from "../../src/application/ports/outbound/review/pipeline-checkpoint-store.port"
import type {IRepositoryConfigLoader} from "../../src/application/ports/outbound/review/repository-config-loader.port"
import type {IReviewIssueTicketRepository} from "../../src/application/ports/outbound/review/review-issue-ticket-repository.port"
import type {IReviewRepository} from "../../src/application/ports/outbound/review/review-repository.port"
import type {ICustomRuleAstEvaluator} from "../../src/application/ports/outbound/rule/custom-rule-ast-evaluator.port"
import type {ICategoryWeightProvider} from "../../src/application/ports/outbound/rule/category-weight-provider.port"
import type {ILibraryRuleRepository} from "../../src/application/ports/outbound/rule/library-rule-repository.port"
import type {IRuleCategoryRepository} from "../../src/application/ports/outbound/rule/rule-category-repository.port"
import type {IRuleRepository} from "../../src/application/ports/outbound/rule/rule-repository.port"
import type {ITeamRuleProvider} from "../../src/application/ports/outbound/rule/team-rule-provider.port"
import type {IRepositoryIndexRepository} from "../../src/application/ports/outbound/scanning/repository-index-repository"
import type {IRepositoryScanner} from "../../src/application/ports/outbound/scanning/repository-scanner"
import type {IScanProgressRepository} from "../../src/application/ports/outbound/scanning/scan-progress-repository"
import type {IRepositoryWorkspaceProvider} from "../../src/application/ports/outbound/scanning/repository-workspace-provider"
import type {ISourceCodeParser} from "../../src/application/ports/outbound/scanning/source-code-parser.port"
import type {ITaskRepository} from "../../src/application/ports/outbound/task-repository.port"
import type {ITeamRepository} from "../../src/application/ports/outbound/team-repository.port"
import type {IUserRepository} from "../../src/application/ports/outbound/user-repository.port"
import type {ICodeChunkEmbeddingGenerator} from "../../src/application/ports/outbound/vector/code-chunk-embedding-generator.port"
import type {IVectorRepository} from "../../src/application/ports/outbound/vector/vector-repository.port"
import {createToken, TOKENS, type InjectionToken} from "../../src/index"

interface IExamplePort {
    ping(): string
}

interface ITokenTree {
    readonly [key: string]: InjectionToken<unknown> | ITokenTree
}

function collectTokenSymbols(tree: ITokenTree): readonly symbol[] {
    const symbols: symbol[] = []

    for (const key of Object.keys(tree)) {
        const value = tree[key]
        if (value === undefined) {
            continue
        }

        if (typeof value === "symbol") {
            symbols.push(value)
            continue
        }

        symbols.push(...collectTokenSymbols(value))
    }

    return symbols
}

describe("createToken", () => {
    test("returns symbol token with preserved generic type", () => {
        const token = createToken<IExamplePort>("example.port")
        const registry = new Map<InjectionToken<IExamplePort>, IExamplePort>()

        registry.set(token, {
            ping(): string {
                return "pong"
            },
        })

        const resolved = registry.get(token)

        expect(typeof token).toBe("symbol")
        expect(resolved?.ping()).toBe("pong")
    })

    test("creates unique tokens for the same description", () => {
        const first = createToken<IExamplePort>("duplicate-description")
        const second = createToken<IExamplePort>("duplicate-description")

        expect(first === second).toBe(false)
    })
})

describe("TOKENS", () => {
    test("exposes typed symbols for outbound core ports", () => {
        const analyticsServiceToken: InjectionToken<IAnalyticsService> = TOKENS.Analytics.Service
        const codeGraphClusteringServiceToken: InjectionToken<ICodeGraphClusteringService> =
            TOKENS.Analysis.CodeGraphClusteringService
        const codeGraphDiffServiceToken: InjectionToken<ICodeGraphDiffService> =
            TOKENS.Analysis.CodeGraphDiffService
        const codeGraphPageRankServiceToken: InjectionToken<ICodeGraphPageRankService> =
            TOKENS.Analysis.CodeGraphPageRankService
        const fileMetricsProviderToken: InjectionToken<IFileMetricsProvider> =
            TOKENS.Analysis.FileMetricsProvider
        const graphRepositoryToken: InjectionToken<IGraphRepository> =
            TOKENS.Analysis.GraphRepository
        const auditLogRepositoryToken: InjectionToken<IAuditLogRepository> =
            TOKENS.Audit.LogRepository
        const cacheToken: InjectionToken<ICache> = TOKENS.Common.Cache
        const domainEventBusToken: InjectionToken<IDomainEventBus> =
            TOKENS.Common.DomainEventBus
        const loggerToken: InjectionToken<ILogger> = TOKENS.Common.Logger
        const feedbackRepositoryToken: InjectionToken<IFeedbackRepository> =
            TOKENS.Feedback.Repository
        const gitBlameToken: InjectionToken<IGitBlame> = TOKENS.Git.Blame
        const gitPipelineStatusToken: InjectionToken<IGitPipelineStatusProvider> =
            TOKENS.Git.PipelineStatus
        const gitProviderToken: InjectionToken<IGitProvider> = TOKENS.Git.Provider
        const llmProviderToken: InjectionToken<ILLMProvider> = TOKENS.LLM.Provider
        const messageBrokerToken: InjectionToken<IMessageBroker> = TOKENS.Messaging.MessageBroker
        const conversationThreadRepositoryToken: InjectionToken<IConversationThreadRepository> =
            TOKENS.Messaging.ConversationThreadRepository
        const inboxRepositoryToken: InjectionToken<IInboxRepository> =
            TOKENS.Messaging.InboxRepository
        const outboxRepositoryToken: InjectionToken<IOutboxRepository> =
            TOKENS.Messaging.OutboxRepository
        const notificationProviderToken: InjectionToken<INotificationProvider> =
            TOKENS.Notification.Provider
        const notificationServiceToken: InjectionToken<INotificationService> =
            TOKENS.Notification.Service
        const organizationRepositoryToken: InjectionToken<IOrganizationRepository> =
            TOKENS.Organization.Repository
        const projectRepositoryToken: InjectionToken<IProjectRepository> =
            TOKENS.Project.Repository
        const promptConfigurationRepositoryToken: InjectionToken<IPromptConfigurationRepository> =
            TOKENS.Prompt.ConfigurationRepository
        const promptTemplateRepositoryToken: InjectionToken<IPromptTemplateRepository> =
            TOKENS.Prompt.TemplateRepository
        const externalContextProviderToken: InjectionToken<IExternalContextProvider> =
            TOKENS.Review.ExternalContextProvider
        const issueAggregationProviderToken: InjectionToken<IIssueAggregationProvider> =
            TOKENS.Review.IssueAggregationProvider
        const issueTicketRepositoryToken: InjectionToken<IReviewIssueTicketRepository> =
            TOKENS.Review.IssueTicketRepository
        const pipelineCheckpointStoreToken: InjectionToken<IPipelineCheckpointStore> =
            TOKENS.Review.PipelineCheckpointStore
        const reviewRepositoryToken: InjectionToken<IReviewRepository> = TOKENS.Review.Repository
        const repositoryConfigLoaderToken: InjectionToken<IRepositoryConfigLoader> =
            TOKENS.Review.RepositoryConfigLoader
        const ruleCategoryRepositoryToken: InjectionToken<IRuleCategoryRepository> =
            TOKENS.Rule.CategoryRepository
        const customRuleAstEvaluatorToken: InjectionToken<ICustomRuleAstEvaluator> =
            TOKENS.Rule.CustomAstEvaluator
        const customRuleRepositoryToken: InjectionToken<ICustomRuleRepository> =
            TOKENS.Rule.CustomRepository
        const libraryRuleRepositoryToken: InjectionToken<ILibraryRuleRepository> =
            TOKENS.Rule.LibraryRepository
        const ruleRepositoryToken: InjectionToken<IRuleRepository> = TOKENS.Rule.Repository
        const categoryWeightProviderToken: InjectionToken<ICategoryWeightProvider> =
            TOKENS.Rules.CategoryWeightProvider
        const teamRuleProviderToken: InjectionToken<ITeamRuleProvider> =
            TOKENS.Rules.TeamRuleProvider
        const repositoryIndexRepositoryToken: InjectionToken<IRepositoryIndexRepository> =
            TOKENS.Scanning.RepositoryIndexRepository
        const repositoryScannerToken: InjectionToken<IRepositoryScanner> =
            TOKENS.Scanning.RepositoryScanner
        const repositoryWorkspaceProviderToken: InjectionToken<IRepositoryWorkspaceProvider> =
            TOKENS.Scanning.RepositoryWorkspaceProvider
        const scanProgressRepositoryToken: InjectionToken<IScanProgressRepository> =
            TOKENS.Scanning.ScanProgressRepository
        const sourceCodeParserToken: InjectionToken<ISourceCodeParser> =
            TOKENS.Scanning.SourceCodeParser
        const taskRepositoryToken: InjectionToken<ITaskRepository> = TOKENS.Task.Repository
        const teamRepositoryToken: InjectionToken<ITeamRepository> = TOKENS.Team.Repository
        const userRepositoryToken: InjectionToken<IUserRepository> = TOKENS.User.Repository
        const codeChunkEmbeddingGeneratorToken: InjectionToken<ICodeChunkEmbeddingGenerator> =
            TOKENS.Vector.CodeChunkEmbeddingGenerator
        const vectorRepositoryToken: InjectionToken<IVectorRepository> = TOKENS.Vector.Repository

        const tokens: readonly InjectionToken<unknown>[] = [
            analyticsServiceToken,
            codeGraphClusteringServiceToken,
            codeGraphDiffServiceToken,
            codeGraphPageRankServiceToken,
            fileMetricsProviderToken,
            graphRepositoryToken,
            auditLogRepositoryToken,
            cacheToken,
            domainEventBusToken,
            loggerToken,
            feedbackRepositoryToken,
            gitBlameToken,
            gitPipelineStatusToken,
            gitProviderToken,
            llmProviderToken,
            messageBrokerToken,
            conversationThreadRepositoryToken,
            inboxRepositoryToken,
            outboxRepositoryToken,
            notificationProviderToken,
            notificationServiceToken,
            organizationRepositoryToken,
            projectRepositoryToken,
            promptConfigurationRepositoryToken,
            promptTemplateRepositoryToken,
            externalContextProviderToken,
            issueAggregationProviderToken,
            issueTicketRepositoryToken,
            pipelineCheckpointStoreToken,
            reviewRepositoryToken,
            repositoryConfigLoaderToken,
            ruleCategoryRepositoryToken,
            customRuleAstEvaluatorToken,
            customRuleRepositoryToken,
            libraryRuleRepositoryToken,
            ruleRepositoryToken,
            categoryWeightProviderToken,
            teamRuleProviderToken,
            repositoryIndexRepositoryToken,
            repositoryScannerToken,
            repositoryWorkspaceProviderToken,
            scanProgressRepositoryToken,
            sourceCodeParserToken,
            taskRepositoryToken,
            teamRepositoryToken,
            userRepositoryToken,
            codeChunkEmbeddingGeneratorToken,
            vectorRepositoryToken,
        ]

        for (const token of tokens) {
            expect(typeof token).toBe("symbol")
        }
    })

    test("contains only unique symbols", () => {
        const symbols = collectTokenSymbols(TOKENS)
        const unique = new Set(symbols)

        expect(symbols.length).toBeGreaterThan(0)
        expect(unique.size).toBe(symbols.length)
    })
})
