import {describe, expect, test} from "bun:test"

import {type ILogger} from "../../src/application/ports/outbound/common/logger.port"
import {type IDomainEventBus} from "../../src/application/ports/outbound/common/domain-event-bus.port"
import {type IPipelineCheckpointStore} from "../../src/application/ports/outbound/review/pipeline-checkpoint-store.port"
import {type IFileMetricsProvider} from "../../src/application/ports/outbound/analysis/file-metrics-provider"
import {type IIssueAggregationProvider} from "../../src/application/ports/outbound/review/issue-aggregation-provider"
import {type IReviewRepository} from "../../src/application/ports/outbound/review/review-repository.port"
import {type IRuleRepository} from "../../src/application/ports/outbound/rule/rule-repository.port"
import type {ITeamRuleProvider} from "../../src/application/ports/outbound/rule/team-rule-provider.port"
import type {IConversationThreadRepository} from "../../src/application/ports/outbound/messaging/conversation-thread-repository.port"
import type {IRepositoryScanner} from "../../src/application/ports/outbound/scanning/repository-scanner"
import type {IRepositoryIndexRepository} from "../../src/application/ports/outbound/scanning/repository-index-repository"
import {createToken, TOKENS, type InjectionToken} from "../../src/index"

interface IExamplePort {
    ping(): string
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
        const reviewToken: InjectionToken<IReviewRepository> = TOKENS.Review.Repository
        const checkpointToken: InjectionToken<IPipelineCheckpointStore> =
            TOKENS.Review.PipelineCheckpointStore
        const issueAggregationProviderToken: InjectionToken<IIssueAggregationProvider> =
            TOKENS.Review.IssueAggregationProvider
        const fileMetricsProviderToken: InjectionToken<IFileMetricsProvider> =
            TOKENS.Analysis.FileMetricsProvider
        const ruleToken: InjectionToken<IRuleRepository> = TOKENS.Rule.Repository
        const teamRuleProviderToken: InjectionToken<ITeamRuleProvider> =
            TOKENS.Rules.TeamRuleProvider
        const conversationThreadRepositoryToken: InjectionToken<IConversationThreadRepository> =
            TOKENS.Messaging.ConversationThreadRepository
        const repositoryScannerToken: InjectionToken<IRepositoryScanner> =
            TOKENS.Scanning.RepositoryScanner
        const repositoryIndexRepositoryToken: InjectionToken<IRepositoryIndexRepository> =
            TOKENS.Scanning.RepositoryIndexRepository
        const eventBusToken: InjectionToken<IDomainEventBus> = TOKENS.Common.DomainEventBus
        const loggerToken: InjectionToken<ILogger> = TOKENS.Common.Logger
        const reviewSymbol: symbol = reviewToken
        const checkpointSymbol: symbol = checkpointToken
        const issueAggregationSymbol: symbol = issueAggregationProviderToken
        const fileMetricsSymbol: symbol = fileMetricsProviderToken
        const ruleSymbol: symbol = ruleToken
        const teamRuleProviderSymbol: symbol = teamRuleProviderToken
        const conversationThreadRepositorySymbol: symbol =
            conversationThreadRepositoryToken
        const repositoryScannerSymbol: symbol = repositoryScannerToken
        const repositoryIndexRepositorySymbol: symbol = repositoryIndexRepositoryToken
        const eventBusSymbol: symbol = eventBusToken
        const loggerSymbol: symbol = loggerToken

        expect(typeof reviewToken).toBe("symbol")
        expect(typeof checkpointToken).toBe("symbol")
        expect(typeof issueAggregationProviderToken).toBe("symbol")
        expect(typeof fileMetricsProviderToken).toBe("symbol")
        expect(typeof ruleToken).toBe("symbol")
        expect(typeof teamRuleProviderToken).toBe("symbol")
        expect(typeof conversationThreadRepositoryToken).toBe("symbol")
        expect(typeof repositoryScannerToken).toBe("symbol")
        expect(typeof repositoryIndexRepositoryToken).toBe("symbol")
        expect(typeof eventBusToken).toBe("symbol")
        expect(typeof loggerToken).toBe("symbol")
        expect(reviewSymbol === ruleSymbol).toBe(false)
        expect(reviewSymbol === checkpointSymbol).toBe(false)
        expect(checkpointSymbol === ruleSymbol).toBe(false)
        expect(checkpointSymbol === issueAggregationSymbol).toBe(false)
        expect(checkpointSymbol === fileMetricsSymbol).toBe(false)
        expect(checkpointSymbol === eventBusSymbol).toBe(false)
        expect(checkpointSymbol === loggerSymbol).toBe(false)
        expect(reviewSymbol === eventBusSymbol).toBe(false)
        expect(reviewSymbol === loggerSymbol).toBe(false)
        expect(checkpointSymbol === fileMetricsSymbol).toBe(false)
        expect(issueAggregationSymbol === eventBusSymbol).toBe(false)
        expect(issueAggregationSymbol === fileMetricsSymbol).toBe(false)
        expect(ruleSymbol === eventBusSymbol).toBe(false)
        expect(ruleSymbol === loggerSymbol).toBe(false)
        expect(teamRuleProviderSymbol === reviewSymbol).toBe(false)
        expect(teamRuleProviderSymbol === checkpointSymbol).toBe(false)
        expect(teamRuleProviderSymbol === ruleSymbol).toBe(false)
        expect(teamRuleProviderSymbol === eventBusSymbol).toBe(false)
        expect(teamRuleProviderSymbol === loggerSymbol).toBe(false)
        expect(teamRuleProviderSymbol === issueAggregationSymbol).toBe(false)
        expect(teamRuleProviderSymbol === fileMetricsSymbol).toBe(false)
        expect(teamRuleProviderSymbol === repositoryScannerSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === reviewSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === checkpointSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === ruleSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === teamRuleProviderSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === eventBusSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === loggerSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === issueAggregationSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === fileMetricsSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === repositoryScannerSymbol).toBe(false)
        expect(conversationThreadRepositorySymbol === repositoryIndexRepositorySymbol).toBe(false)
        expect(issueAggregationSymbol === fileMetricsSymbol).toBe(false)
        expect(eventBusSymbol === loggerSymbol).toBe(false)
        expect(repositoryScannerSymbol === reviewSymbol).toBe(false)
        expect(repositoryScannerSymbol === checkpointSymbol).toBe(false)
        expect(repositoryScannerSymbol === issueAggregationSymbol).toBe(false)
        expect(repositoryScannerSymbol === fileMetricsSymbol).toBe(false)
        expect(repositoryScannerSymbol === ruleSymbol).toBe(false)
        expect(repositoryScannerSymbol === teamRuleProviderSymbol).toBe(false)
        expect(repositoryScannerSymbol === eventBusSymbol).toBe(false)
        expect(repositoryScannerSymbol === loggerSymbol).toBe(false)
        expect(repositoryScannerSymbol === conversationThreadRepositorySymbol).toBe(false)
        expect(repositoryScannerSymbol === repositoryIndexRepositorySymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === reviewSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === checkpointSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === issueAggregationSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === fileMetricsSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === ruleSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === teamRuleProviderSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === eventBusSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === loggerSymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === conversationThreadRepositorySymbol).toBe(false)
        expect(repositoryIndexRepositorySymbol === repositoryScannerSymbol).toBe(false)
    })
})
