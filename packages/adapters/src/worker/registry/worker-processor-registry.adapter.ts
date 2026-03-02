import {Result} from "@codenautic/core"

import {type IWorkerJobProcessor} from "../contracts/worker.contract"
import {WORKER_ADAPTER_ERROR_CODE, WorkerAdapterError} from "../errors/worker-adapter.error"

/**
 * In-memory registry for worker processors keyed by job type.
 */
export class WorkerProcessorRegistryAdapter {
    private readonly processors: Map<string, IWorkerJobProcessor>

    /**
     * Creates worker processor registry.
     */
    public constructor() {
        this.processors = new Map<string, IWorkerJobProcessor>()
    }

    /**
     * Registers processor for job type.
     *
     * @param jobType Job type identifier.
     * @param processor Processor function.
     * @returns Success result or duplicate registration error.
     */
    public register(
        jobType: string,
        processor: IWorkerJobProcessor,
    ): Result<void, WorkerAdapterError> {
        const normalizedType = normalizeNonEmptyString(jobType)
        if (normalizedType === undefined) {
            return Result.fail(createInvalidJobError("jobType must be a non-empty string"))
        }

        if (this.processors.has(normalizedType)) {
            return Result.fail(createProcessorAlreadyRegisteredError(normalizedType))
        }

        this.processors.set(normalizedType, processor)
        return Result.ok<void, WorkerAdapterError>(undefined)
    }

    /**
     * Resolves processor by job type.
     *
     * @param jobType Job type identifier.
     * @returns Processor function or undefined.
     */
    public resolve(jobType: string): IWorkerJobProcessor | undefined {
        const normalizedType = normalizeNonEmptyString(jobType)
        if (normalizedType === undefined) {
            return undefined
        }

        return this.processors.get(normalizedType)
    }
}

/**
 * Creates invalid job validation error.
 *
 * @param message Error message.
 * @returns Worker adapter validation error.
 */
function createInvalidJobError(message: string): WorkerAdapterError {
    return new WorkerAdapterError({
        code: WORKER_ADAPTER_ERROR_CODE.INVALID_JOB,
        message,
        retryable: false,
    })
}

/**
 * Creates duplicate processor registration error.
 *
 * @param jobType Job type identifier.
 * @returns Duplicate registration error.
 */
function createProcessorAlreadyRegisteredError(jobType: string): WorkerAdapterError {
    return new WorkerAdapterError({
        code: WORKER_ADAPTER_ERROR_CODE.PROCESSOR_ALREADY_REGISTERED,
        message: `Processor is already registered for job type '${jobType}'`,
        retryable: false,
    })
}

/**
 * Normalizes unknown value into trimmed non-empty string.
 *
 * @param value Unknown value.
 * @returns Trimmed string when valid.
 */
function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    return normalized
}
