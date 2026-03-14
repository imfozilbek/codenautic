import {Container, TOKENS, type ILogger} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import {WORKER_TOKENS} from "./worker.tokens"
import type {
    IWorkerDlqManager,
    IWorkerProcessorRegistry,
    IWorkerQueueService,
    IWorkerRedisConnectionManager,
    IWorkerRuntime,
} from "./worker.types"

/**
 * Registration options for worker adapter module.
 */
export interface IRegisterWorkerModuleOptions {
    /**
     * Optional structured logger adapter for workers.
     */
    readonly logger?: ILogger

    /**
     * Optional queue service adapter.
     */
    readonly queueService?: IWorkerQueueService

    /**
     * Optional DLQ manager adapter.
     */
    readonly dlqManager?: IWorkerDlqManager

    /**
     * Optional processor registry adapter.
     */
    readonly processorRegistry?: IWorkerProcessorRegistry

    /**
     * Optional Redis connection manager adapter.
     */
    readonly redisConnectionManager?: IWorkerRedisConnectionManager

    /**
     * Optional worker runtime adapter.
     */
    readonly runtime?: IWorkerRuntime
}

/**
 * Registers worker adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerWorkerModule(
    container: Container,
    options: IRegisterWorkerModuleOptions,
): void {
    if (options.logger !== undefined) {
        bindConstantSingleton(container, WORKER_TOKENS.Logger, options.logger)
        bindConstantSingleton(container, TOKENS.Common.Logger, options.logger)
    }

    if (options.queueService !== undefined) {
        bindConstantSingleton(container, WORKER_TOKENS.QueueService, options.queueService)
    }

    if (options.dlqManager !== undefined) {
        bindConstantSingleton(container, WORKER_TOKENS.DlqManager, options.dlqManager)
    }

    if (options.processorRegistry !== undefined) {
        bindConstantSingleton(
            container,
            WORKER_TOKENS.ProcessorRegistry,
            options.processorRegistry,
        )
    }

    if (options.redisConnectionManager !== undefined) {
        bindConstantSingleton(
            container,
            WORKER_TOKENS.RedisConnectionManager,
            options.redisConnectionManager,
        )
    }

    if (options.runtime !== undefined) {
        bindConstantSingleton(container, WORKER_TOKENS.Runtime, options.runtime)
    }
}
