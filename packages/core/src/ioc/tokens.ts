import type {ILogger} from "../application/ports/outbound/common/logger.port"
import type {IDomainEventBus} from "../application/ports/outbound/common/domain-event-bus.port"
import type {IPipelineCheckpointStore} from "../application/ports/outbound/review/pipeline-checkpoint-store.port"
import type {IReviewRepository} from "../application/ports/outbound/review/review-repository.port"
import type {IRuleRepository} from "../application/ports/outbound/rule/rule-repository.port"
import {createToken} from "./create-token"

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
    },
    Rule: {
        Repository: createToken<IRuleRepository>("core.rule.repository"),
    },
} as const
