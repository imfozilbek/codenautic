import {Container} from "@codenautic/core"

import {InMemoryWorkerQueueAdapter} from "./queue/in-memory-worker-queue.adapter"
import {WorkerProcessorRegistryAdapter} from "./registry/worker-processor-registry.adapter"
import {WORKER_TOKENS} from "./worker.tokens"

/**
 * Optional dependency overrides for worker module registration.
 */
export interface IWorkerModuleOverrides {
    queue?: InMemoryWorkerQueueAdapter
    processorRegistry?: WorkerProcessorRegistryAdapter
}

/**
 * Registers worker adapter module into target container.
 *
 * @param container Target IoC container.
 * @param overrides Optional dependency overrides.
 * @returns Same container instance for chaining.
 */
export function registerWorkerModule(
    container: Container,
    overrides: IWorkerModuleOverrides = {},
): Container {
    container.bindSingleton(WORKER_TOKENS.Queue, () => {
        return overrides.queue ?? new InMemoryWorkerQueueAdapter()
    })
    container.bindSingleton(WORKER_TOKENS.ProcessorRegistry, () => {
        return overrides.processorRegistry ?? new WorkerProcessorRegistryAdapter()
    })

    return container
}
