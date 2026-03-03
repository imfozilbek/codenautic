import type {ILogger} from "../application/ports/outbound/common/logger.port"
import type {IDomainEventBus} from "../application/ports/outbound/common/domain-event-bus.port"
import type {IPipelineCheckpointStore} from "../application/ports/outbound/review/pipeline-checkpoint-store.port"
import type {IReviewRepository} from "../application/ports/outbound/review/review-repository.port"
import type {IRuleRepository} from "../application/ports/outbound/rule/rule-repository.port"
import {createToken} from "./create-token"
import type {IFileMetricsProvider} from "../application/ports/outbound/analysis/file-metrics-provider"
import type {IIssueAggregationProvider} from "../application/ports/outbound/review/issue-aggregation-provider"
import type {ITeamRuleProvider} from "../application/ports/outbound/rule/team-rule-provider.port"
import type {IConversationThreadRepository} from "../application/ports/outbound/messaging/conversation-thread-repository.port"

/**
 * Core package DI tokens.
 */
export const TOKENS = {
    Common: {
        DomainEventBus: createToken<IDomainEventBus>("core.common.domain-event-bus"),
        Logger: createToken<ILogger>("core.common.logger"),
    },
    Review: {
        Repository: createToken<IReviewRepository>("core.review.repository"),
        PipelineCheckpointStore: createToken<IPipelineCheckpointStore>(
            "core.review.pipeline-checkpoint-store",
        ),
        IssueAggregationProvider: createToken<IIssueAggregationProvider>(
            "core.review.issue-aggregation-provider",
        ),
    },
    Analysis: {
        FileMetricsProvider: createToken<IFileMetricsProvider>(
            "core.analysis.file-metrics-provider",
        ),
    },
    Rule: {
        Repository: createToken<IRuleRepository>("core.rule.repository"),
    },
    Rules: {
        TeamRuleProvider: createToken<ITeamRuleProvider>("core.rules.team-rule-provider"),
    },
    Messaging: {
        ConversationThreadRepository: createToken<IConversationThreadRepository>(
            "core.messaging.conversation-thread-repository",
        ),
    },
} as const
