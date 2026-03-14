import {Queue, type ConnectionOptions, type Job, type JobType} from "bullmq"

import {
    WORKER_QUEUE_JOB_STATUS,
    type IWorkerDequeuedJob,
    type IWorkerJobPayload,
    type IWorkerQueueService,
    type WorkerQueueJobStatus,
} from "./worker.types"

const DEFAULT_DEQUEUE_LIMIT = 1
const MAX_BULLMQ_PRIORITY = 2_097_152
const DEFAULT_MAX_ATTEMPTS = 5
const DEQUEUE_QUEUE_STATES: readonly JobType[] = [
    "waiting",
    "prioritized",
] as const

/**
 * Maximum supported app-level priority.
 */
export const MAX_WORKER_QUEUE_PRIORITY = MAX_BULLMQ_PRIORITY

/**
 * Default max attempts before job lands in failed/DLQ state.
 */
export const DEFAULT_WORKER_MAX_ATTEMPTS = DEFAULT_MAX_ATTEMPTS

/**
 * Serialized queue envelope stored in BullMQ.
 */
interface IBullMqQueueEnvelope {
    /**
     * Logical job type.
     */
    readonly type: string

    /**
     * Original payload.
     */
    readonly payload: unknown
}

/**
 * Minimal queue job contract used by queue service.
 */
export interface IBullMqQueueJob {
    /**
     * Job identifier.
     */
    readonly id: string | number | undefined

    /**
     * Queue job name.
     */
    readonly name: string

    /**
     * Raw queue payload.
     */
    readonly data: unknown

    /**
     * Stored BullMQ priority.
     */
    readonly priority: number | undefined

    /**
     * Removes job from queue.
     */
    remove(): Promise<void>

    /**
     * Returns BullMQ job state.
     */
    getState(): Promise<string>
}

/**
 * Minimal queue contract for runtime service.
 */
export interface IBullMqQueueInstance {
    /**
     * Adds one job to queue.
     *
     * @param name Job name.
     * @param data Queue payload.
     * @param options Optional add options.
     * @returns Created job.
     */
    add(
        name: string,
        data: IBullMqQueueEnvelope,
        options?: {
            readonly priority?: number
            readonly attempts?: number
        },
    ): Promise<IBullMqQueueJob>

    /**
     * Returns jobs by states and range.
     *
     * @param states Queue states.
     * @param start Start index.
     * @param end End index.
     * @returns Queue jobs.
     */
    getJobs(
        states: readonly JobType[],
        start: number,
        end: number,
    ): Promise<readonly IBullMqQueueJob[]>

    /**
     * Looks up one job by id.
     *
     * @param jobId Job id.
     * @returns Job or null.
     */
    getJob(jobId: string): Promise<IBullMqQueueJob | null>
}

/**
 * Queue factory options.
 */
export interface IBullMqQueueFactoryOptions {
    /**
     * Queue name.
     */
    readonly queueName: string

    /**
     * Redis connection options.
     */
    readonly connection: ConnectionOptions
}

/**
 * Queue factory contract.
 */
export type BullMqQueueFactory = (
    options: IBullMqQueueFactoryOptions,
) => IBullMqQueueInstance

/**
 * Construction options for queue service.
 */
export interface IBullMqQueueServiceOptions {
    /**
     * Queue name.
     */
    readonly queueName: string

    /**
     * Redis connection options.
     */
    readonly connection: ConnectionOptions

    /**
     * Maximum attempts before job is marked as failed.
     */
    readonly maxAttempts?: number

    /**
     * Optional queue factory override used by tests.
     */
    readonly queueFactory?: BullMqQueueFactory
}

/**
 * BullMQ queue service with enqueue/dequeue/status operations.
 */
export class BullMqQueueService implements IWorkerQueueService {
    private readonly queueName: string
    private readonly maxAttempts: number
    private readonly queue: IBullMqQueueInstance

    /**
     * Creates queue service instance.
     *
     * @param options Queue dependencies.
     */
    public constructor(options: IBullMqQueueServiceOptions) {
        this.queueName = normalizeQueueName(options.queueName)
        this.maxAttempts = normalizePositiveInteger(
            options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
            "maxAttempts",
        )
        const queueFactory = options.queueFactory ?? defaultBullMqQueueFactory
        this.queue = queueFactory({
            queueName: this.queueName,
            connection: options.connection,
        })
    }

    /**
     * Enqueues one job and returns queue id.
     *
     * @param payload Job payload.
     * @returns Queue job id.
     */
    public async enqueue(payload: IWorkerJobPayload): Promise<string> {
        const normalizedPayload = normalizeWorkerJobPayload(payload)
        const addOptions: {
            readonly attempts: number
            readonly priority?: number
        } =
            normalizedPayload.priority === undefined
                ? {
                      attempts: this.maxAttempts,
                  }
                : {
                      attempts: this.maxAttempts,
                      priority: toBullMqPriority(normalizedPayload.priority),
                  }

        const job = await this.queue.add(
            normalizedPayload.type,
            {
                type: normalizedPayload.type,
                payload: normalizedPayload.payload,
            },
            addOptions,
        )

        return resolveJobId(job.id)
    }

    /**
     * Dequeues pending jobs and removes them from queue.
     *
     * @param limit Maximum number of jobs to dequeue.
     * @returns Dequeued jobs.
     */
    public async dequeue(limit = DEFAULT_DEQUEUE_LIMIT): Promise<readonly IWorkerDequeuedJob[]> {
        const normalizedLimit = normalizePositiveInteger(limit, "limit")
        const queuedJobs = await this.queue.getJobs(
            DEQUEUE_QUEUE_STATES,
            0,
            normalizedLimit - 1,
        )
        const dequeuedJobs: IWorkerDequeuedJob[] = []

        for (const queuedJob of queuedJobs) {
            const normalizedEnvelope = normalizeQueueEnvelope(queuedJob.data)
            await queuedJob.remove()
            dequeuedJobs.push({
                id: resolveJobId(queuedJob.id),
                type: normalizedEnvelope.type,
                payload: normalizedEnvelope.payload,
                priority: fromBullMqPriority(queuedJob.priority),
            })
        }

        return dequeuedJobs
    }

    /**
     * Returns queue status for one job.
     *
     * @param jobId Queue job id.
     * @returns Job status or null.
     */
    public async getStatus(jobId: string): Promise<WorkerQueueJobStatus | null> {
        const normalizedJobId = normalizeJobId(jobId)
        const job = await this.queue.getJob(normalizedJobId)
        if (job === null) {
            return null
        }

        const state = await job.getState()
        return mapBullMqStateToWorkerStatus(state)
    }
}

/**
 * Creates default BullMQ queue wrapper.
 *
 * @param options Factory options.
 * @returns Queue instance wrapper.
 */
function defaultBullMqQueueFactory(
    options: IBullMqQueueFactoryOptions,
): IBullMqQueueInstance {
    const queue = new Queue<IBullMqQueueEnvelope>(options.queueName, {
        connection: options.connection,
    })

    return {
        async add(
            name: string,
            data: IBullMqQueueEnvelope,
            addOptions?: {
                readonly priority?: number
                readonly attempts?: number
            },
        ): Promise<IBullMqQueueJob> {
            const job = await queue.add(name, data, addOptions)
            return toQueueJob(job)
        },
        async getJobs(
            states: readonly JobType[],
            start: number,
            end: number,
        ): Promise<readonly IBullMqQueueJob[]> {
            const jobs = await queue.getJobs([...states], start, end)
            return jobs.map((job): IBullMqQueueJob => toQueueJob(job))
        },
        async getJob(jobId: string): Promise<IBullMqQueueJob | null> {
            const job = await queue.getJob(jobId)
            if (job === null || job === undefined) {
                return null
            }

            return toQueueJob(job)
        },
    }
}

/**
 * Normalizes queue envelope from unknown value.
 *
 * @param value Unknown payload.
 * @returns Normalized queue envelope.
 */
function normalizeQueueEnvelope(value: unknown): IBullMqQueueEnvelope {
    if (isRecord(value) === false) {
        throw new Error("Queue payload must be an object with type and payload fields")
    }

    const rawType = value.type
    if (typeof rawType !== "string" || rawType.trim().length === 0) {
        throw new Error("Queue payload type must be a non-empty string")
    }

    return {
        type: rawType.trim(),
        payload: value.payload,
    }
}

/**
 * Validates and normalizes worker enqueue payload.
 *
 * @param payload Raw payload.
 * @returns Normalized payload.
 */
function normalizeWorkerJobPayload(payload: IWorkerJobPayload): {
    readonly type: string
    readonly payload: unknown
    readonly priority: number | undefined
} {
    const type = normalizeQueueName(payload.type)
    return {
        type,
        payload: payload.payload,
        priority: normalizeOptionalPriority(payload.priority),
    }
}

/**
 * Maps BullMQ state string to worker status.
 *
 * @param state BullMQ state.
 * @returns Worker queue status.
 */
function mapBullMqStateToWorkerStatus(state: string): WorkerQueueJobStatus {
    if (state === "waiting") {
        return WORKER_QUEUE_JOB_STATUS.Waiting
    }
    if (state === "prioritized") {
        return WORKER_QUEUE_JOB_STATUS.Prioritized
    }
    if (state === "active") {
        return WORKER_QUEUE_JOB_STATUS.Active
    }
    if (state === "completed") {
        return WORKER_QUEUE_JOB_STATUS.Completed
    }
    if (state === "failed") {
        return WORKER_QUEUE_JOB_STATUS.Failed
    }
    if (state === "delayed") {
        return WORKER_QUEUE_JOB_STATUS.Delayed
    }
    if (state === "paused") {
        return WORKER_QUEUE_JOB_STATUS.Paused
    }

    return WORKER_QUEUE_JOB_STATUS.Unknown
}

/**
 * Converts app-level priority (higher is sooner) to BullMQ priority.
 *
 * @param priority App-level priority.
 * @returns BullMQ priority.
 */
function toBullMqPriority(priority: number): number {
    return MAX_BULLMQ_PRIORITY - priority + 1
}

/**
 * Converts BullMQ priority back to app-level priority.
 *
 * @param priority BullMQ priority.
 * @returns App-level priority or undefined.
 */
function fromBullMqPriority(priority: number | undefined): number | undefined {
    if (priority === undefined || priority === 0) {
        return undefined
    }

    return MAX_BULLMQ_PRIORITY - priority + 1
}

/**
 * Validates queue name.
 *
 * @param value Raw queue name.
 * @returns Normalized queue name.
 */
function normalizeQueueName(value: string): string {
    if (value.trim().length === 0) {
        throw new Error("queueName must be a non-empty string")
    }

    return value.trim()
}

/**
 * Validates queue job id.
 *
 * @param value Raw job id.
 * @returns Normalized id.
 */
function normalizeJobId(value: string): string {
    if (value.trim().length === 0) {
        throw new Error("jobId must be a non-empty string")
    }

    return value.trim()
}

/**
 * Validates positive integer value.
 *
 * @param value Raw number.
 * @param fieldName Field name.
 * @returns Normalized integer.
 */
function normalizePositiveInteger(value: number, fieldName: string): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error(`${fieldName} must be finite number`)
    }

    const normalized = Math.trunc(value)
    if (normalized < 1) {
        throw new Error(`${fieldName} must be greater than zero`)
    }

    return normalized
}

/**
 * Validates optional app-level priority.
 *
 * @param value Raw priority.
 * @returns Normalized priority.
 */
function normalizeOptionalPriority(value: number | undefined): number | undefined {
    if (value === undefined) {
        return undefined
    }

    const normalized = normalizePositiveInteger(value, "priority")
    if (normalized > MAX_WORKER_QUEUE_PRIORITY) {
        throw new Error(`priority must be less or equal to ${MAX_WORKER_QUEUE_PRIORITY}`)
    }

    return normalized
}

/**
 * Resolves queue job id from BullMQ value.
 *
 * @param value BullMQ job id.
 * @returns String job id.
 */
function resolveJobId(value: string | number | undefined): string {
    if (value === undefined) {
        throw new Error("Queue job id is missing")
    }

    return `${value}`
}

/**
 * Maps BullMQ job to minimal queue job contract.
 *
 * @param job BullMQ job.
 * @returns Queue job wrapper.
 */
function toQueueJob(job: Job<IBullMqQueueEnvelope>): IBullMqQueueJob {
    return {
        id: job.id,
        name: job.name,
        data: job.data,
        priority: job.opts.priority,
        remove(): Promise<void> {
            return job.remove()
        },
        getState(): Promise<string> {
            return job.getState()
        },
    }
}

/**
 * Checks whether value is plain object record.
 *
 * @param value Unknown value.
 * @returns True when object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}
