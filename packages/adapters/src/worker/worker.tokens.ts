import {createToken} from "@codenautic/core"

import type {
    IWorkerProcessorRegistry,
    IWorkerQueueService,
    IWorkerRedisConnectionManager,
    IWorkerRuntime,
} from "./worker.types"

/**
 * DI tokens for worker adapter domain.
 */
export const WORKER_TOKENS = {
    ProcessorRegistry: createToken<IWorkerProcessorRegistry>(
        "adapters.worker.processor-registry",
    ),
    QueueService: createToken<IWorkerQueueService>("adapters.worker.queue-service"),
    RedisConnectionManager: createToken<IWorkerRedisConnectionManager>(
        "adapters.worker.redis-connection-manager",
    ),
    Runtime: createToken<IWorkerRuntime>("adapters.worker.runtime"),
} as const
