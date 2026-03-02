import {createToken} from "@codenautic/core"

import {InMemoryWorkerQueueAdapter} from "./queue/in-memory-worker-queue.adapter"
import {WorkerProcessorRegistryAdapter} from "./registry/worker-processor-registry.adapter"

/**
 * Worker domain IoC tokens.
 */
export const WORKER_TOKENS = {
    Queue: createToken<InMemoryWorkerQueueAdapter>("adapters.worker.queue"),
    ProcessorRegistry: createToken<WorkerProcessorRegistryAdapter>(
        "adapters.worker.processor-registry",
    ),
} as const
