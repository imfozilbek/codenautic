import {Result} from "@codenautic/core"

import {
    WORKER_ENQUEUE_STATUS,
    type IWorkerEnqueueRequest,
    type IWorkerEnqueueResult,
    type IWorkerJob,
} from "../contracts/worker.contract"
import {WORKER_ADAPTER_ERROR_CODE, WorkerAdapterError} from "../errors/worker-adapter.error"

/**
 * In-memory worker queue adapter with idempotent enqueue by job id.
 */
export class InMemoryWorkerQueueAdapter {
    private readonly jobsById: Map<string, IWorkerJob>
    private readonly order: string[]
    private readonly now: () => Date

    /**
     * Creates in-memory worker queue adapter.
     *
     * @param now Clock provider for deterministic tests.
     */
    public constructor(now: () => Date = () => new Date()) {
        this.jobsById = new Map<string, IWorkerJob>()
        this.order = []
        this.now = now
    }

    /**
     * Enqueues job idempotently by job id.
     *
     * @param request Worker enqueue request.
     * @returns Enqueued or duplicate result.
     */
    public enqueue(request: IWorkerEnqueueRequest): Result<IWorkerEnqueueResult, WorkerAdapterError> {
        const id = normalizeNonEmptyString(request.id)
        const type = normalizeNonEmptyString(request.type)
        if (id === undefined || type === undefined) {
            return Result.fail(createInvalidJobError("id and type must be non-empty strings"))
        }
        if (isPlainObject(request.payload) === false) {
            return Result.fail(createInvalidJobError("payload must be a plain object"))
        }

        const existing = this.jobsById.get(id)
        if (existing !== undefined) {
            return Result.ok({
                status: WORKER_ENQUEUE_STATUS.DUPLICATE,
                job: cloneJob(existing),
            })
        }

        const job: IWorkerJob = {
            id,
            type,
            payload: clonePayload(request.payload),
            enqueuedAt: this.now(),
        }
        this.jobsById.set(id, job)
        this.order.push(id)

        return Result.ok({
            status: WORKER_ENQUEUE_STATUS.ENQUEUED,
            job: cloneJob(job),
        })
    }

    /**
     * Dequeues next job in FIFO order with optional type filter.
     *
     * @param jobType Optional job type filter.
     * @returns Dequeued job or undefined when queue is empty.
     */
    public dequeue(jobType?: string): IWorkerJob | undefined {
        if (jobType === undefined) {
            return this.dequeueAny()
        }

        const normalizedType = normalizeNonEmptyString(jobType)
        if (normalizedType === undefined) {
            return undefined
        }

        const index = this.order.findIndex((jobId) => {
            const job = this.jobsById.get(jobId)
            if (job === undefined) {
                return false
            }

            return job.type === normalizedType
        })
        if (index === -1) {
            return undefined
        }

        const [jobId] = this.order.splice(index, 1)
        if (jobId === undefined) {
            return undefined
        }

        const job = this.jobsById.get(jobId)
        if (job === undefined) {
            return undefined
        }

        this.jobsById.delete(jobId)
        return cloneJob(job)
    }

    /**
     * Returns count of queued jobs.
     *
     * @returns Number of queued jobs.
     */
    public size(): number {
        return this.order.length
    }

    private dequeueAny(): IWorkerJob | undefined {
        while (this.order.length > 0) {
            const jobId = this.order.shift()
            if (jobId === undefined) {
                return undefined
            }

            const job = this.jobsById.get(jobId)
            if (job === undefined) {
                continue
            }

            this.jobsById.delete(jobId)
            return cloneJob(job)
        }

        return undefined
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

/**
 * Checks whether value is plain object.
 *
 * @param value Unknown value.
 * @returns True when value is plain object.
 */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null) {
        return false
    }

    return Array.isArray(value) === false
}

/**
 * Creates immutable payload clone.
 *
 * @param payload Source payload object.
 * @returns Cloned payload object.
 */
function clonePayload(payload: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    return Object.freeze({...payload})
}

/**
 * Creates immutable job clone.
 *
 * @param job Source job record.
 * @returns Cloned job record.
 */
function cloneJob(job: IWorkerJob): IWorkerJob {
    return {
        id: job.id,
        type: job.type,
        payload: clonePayload(job.payload),
        enqueuedAt: new Date(job.enqueuedAt),
    }
}
