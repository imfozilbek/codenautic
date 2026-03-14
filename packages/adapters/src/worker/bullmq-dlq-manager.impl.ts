import {Queue, QueueEvents, type ConnectionOptions} from "bullmq"

import type {IWorkerDlqAlert, IWorkerDlqManager} from "./worker.types"

/**
 * Default maximum attempts before job is treated as DLQ entry.
 */
export const DEFAULT_WORKER_DLQ_MAX_ATTEMPTS = 5

/**
 * Callback invoked when job enters DLQ.
 */
export type WorkerDlqAlertHandler = (alert: IWorkerDlqAlert) => Promise<void>

/**
 * Callback invoked when DLQ processing fails unexpectedly.
 */
export type WorkerDlqErrorHandler = (error: Error) => void

/**
 * Minimal failed job contract used by DLQ manager.
 */
export interface IBullMqDlqJob {
    /**
     * BullMQ job identifier.
     */
    readonly id: string | number | undefined

    /**
     * Logical job name.
     */
    readonly name: string

    /**
     * Raw job payload.
     */
    readonly data: unknown

    /**
     * Number of attempts made.
     */
    readonly attemptsMade: number

    /**
     * Failure reason from BullMQ.
     */
    readonly failedReason: string

    /**
     * Retries failed job.
     */
    retry(): Promise<void>
}

/**
 * Minimal queue contract required by DLQ manager.
 */
export interface IBullMqDlqQueueInstance {
    /**
     * Returns job by identifier.
     *
     * @param jobId Job identifier.
     * @returns Job or null when absent.
     */
    getJob(jobId: string): Promise<IBullMqDlqJob | null>
}

/**
 * Queue-events payload for failed event.
 */
export interface IBullMqFailedEventPayload {
    /**
     * Failed job identifier.
     */
    readonly jobId: string

    /**
     * Failure reason.
     */
    readonly failedReason: string
}

/**
 * Minimal queue-events contract required by DLQ manager.
 */
export interface IBullMqQueueEventsInstance {
    /**
     * Registers failed event listener.
     *
     * @param event Event name.
     * @param handler Event handler.
     */
    on(
        event: "failed",
        handler: (payload: IBullMqFailedEventPayload) => void,
    ): void

    /**
     * Unregisters failed event listener.
     *
     * @param event Event name.
     * @param handler Event handler.
     */
    off(
        event: "failed",
        handler: (payload: IBullMqFailedEventPayload) => void,
    ): void

    /**
     * Closes queue-events stream.
     */
    close(): Promise<void>
}

/**
 * Factory options for DLQ queue.
 */
export interface IBullMqDlqQueueFactoryOptions {
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
 * Factory options for queue-events stream.
 */
export interface IBullMqDlqManagerQueueEventsFactoryOptions {
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
 * Factory contract for DLQ queue wrapper.
 */
export type BullMqDlqQueueFactory = (
    options: IBullMqDlqQueueFactoryOptions,
) => IBullMqDlqQueueInstance

/**
 * Factory contract for queue-events wrapper.
 */
export type BullMqDlqQueueEventsFactory = (
    options: IBullMqDlqManagerQueueEventsFactoryOptions,
) => IBullMqQueueEventsInstance

/**
 * Construction options for DLQ manager.
 */
export interface IBullMqDlqManagerOptions {
    /**
     * Queue name.
     */
    readonly queueName: string

    /**
     * Redis connection options.
     */
    readonly connection: ConnectionOptions

    /**
     * Maximum attempts before DLQ entry.
     */
    readonly maxAttempts?: number

    /**
     * Optional DLQ alert handler.
     */
    readonly onDlqEntry?: WorkerDlqAlertHandler

    /**
     * Optional DLQ error handler.
     */
    readonly onError?: WorkerDlqErrorHandler

    /**
     * Optional queue factory override for tests.
     */
    readonly queueFactory?: BullMqDlqQueueFactory

    /**
     * Optional queue-events factory override for tests.
     */
    readonly queueEventsFactory?: BullMqDlqQueueEventsFactory
}

/**
 * BullMQ DLQ manager with alerting and manual retry API.
 */
export class BullMqDlqManager implements IWorkerDlqManager {
    private readonly queueName: string
    private readonly maxAttempts: number
    private readonly queue: IBullMqDlqQueueInstance
    private readonly queueEvents: IBullMqQueueEventsInstance
    private readonly onDlqEntry: WorkerDlqAlertHandler
    private readonly onError: WorkerDlqErrorHandler
    private failedHandler: ((payload: IBullMqFailedEventPayload) => void) | undefined

    /**
     * Creates DLQ manager.
     *
     * @param options Manager options.
     */
    public constructor(options: IBullMqDlqManagerOptions) {
        this.queueName = normalizeQueueName(options.queueName)
        this.maxAttempts = normalizePositiveInteger(
            options.maxAttempts ?? DEFAULT_WORKER_DLQ_MAX_ATTEMPTS,
            "maxAttempts",
        )
        const queueFactory = options.queueFactory ?? defaultDlqQueueFactory
        const queueEventsFactory =
            options.queueEventsFactory ?? defaultDlqQueueEventsFactory
        this.queue = queueFactory({
            queueName: this.queueName,
            connection: options.connection,
        })
        this.queueEvents = queueEventsFactory({
            queueName: this.queueName,
            connection: options.connection,
        })
        this.onDlqEntry = options.onDlqEntry ?? defaultOnDlqEntry
        this.onError = options.onError ?? defaultOnError
    }

    /**
     * Starts failed-job monitoring listener.
     */
    public start(): Promise<void> {
        if (this.failedHandler !== undefined) {
            return Promise.resolve()
        }

        this.failedHandler = (payload: IBullMqFailedEventPayload): void => {
            void this.handleFailedEvent(payload)
        }
        this.queueEvents.on("failed", this.failedHandler)
        return Promise.resolve()
    }

    /**
     * Stops failed-job monitoring listener.
     */
    public async stop(): Promise<void> {
        if (this.failedHandler !== undefined) {
            this.queueEvents.off("failed", this.failedHandler)
            this.failedHandler = undefined
        }

        await this.queueEvents.close()
    }

    /**
     * Retries failed job by identifier.
     *
     * @param jobId Failed job id.
     * @returns True when retry triggered.
     */
    public async retry(jobId: string): Promise<boolean> {
        const normalizedJobId = normalizeJobId(jobId)
        const job = await this.queue.getJob(normalizedJobId)
        if (job === null) {
            return false
        }

        await job.retry()
        return true
    }

    /**
     * Handles one failed event and emits DLQ alert when attempts threshold reached.
     *
     * @param payload Failed event payload.
     */
    private async handleFailedEvent(payload: IBullMqFailedEventPayload): Promise<void> {
        try {
            const job = await this.queue.getJob(payload.jobId)
            if (job === null) {
                return
            }
            if (job.attemptsMade < this.maxAttempts) {
                return
            }

            const envelope = normalizeJobEnvelope(job.data)
            await this.onDlqEntry({
                jobId: normalizeJobId(payload.jobId),
                jobType: envelope.type,
                payload: envelope.payload,
                attemptsMade: job.attemptsMade,
                failedReason: payload.failedReason,
                queueName: this.queueName,
            })
        } catch (error: unknown) {
            this.onError(toError(error))
        }
    }
}

/**
 * Creates default BullMQ queue wrapper for DLQ manager.
 *
 * @param options Queue factory options.
 * @returns Queue wrapper.
 */
function defaultDlqQueueFactory(
    options: IBullMqDlqQueueFactoryOptions,
): IBullMqDlqQueueInstance {
    const queue = new Queue(options.queueName, {
        connection: options.connection,
    })

    return {
        async getJob(jobId: string): Promise<IBullMqDlqJob | null> {
            const job = await queue.getJob(jobId)
            if (job === null || job === undefined) {
                return null
            }

            return {
                id: job.id,
                name: job.name,
                data: job.data,
                attemptsMade: job.attemptsMade,
                failedReason: job.failedReason,
                retry(): Promise<void> {
                    return job.retry()
                },
            }
        },
    }
}

/**
 * Creates default queue-events wrapper.
 *
 * @param options Queue-events options.
 * @returns Queue-events wrapper.
 */
function defaultDlqQueueEventsFactory(
    options: IBullMqDlqManagerQueueEventsFactoryOptions,
): IBullMqQueueEventsInstance {
    const queueEvents = new QueueEvents(options.queueName, {
        connection: options.connection,
    })

    return {
        on(
            event: "failed",
            handler: (payload: IBullMqFailedEventPayload) => void,
        ): void {
            queueEvents.on(event, handler)
        },
        off(
            event: "failed",
            handler: (payload: IBullMqFailedEventPayload) => void,
        ): void {
            queueEvents.off(event, handler)
        },
        close(): Promise<void> {
            return queueEvents.close()
        },
    }
}

/**
 * Parses queue envelope from unknown job payload.
 *
 * @param data Unknown payload.
 * @returns Normalized envelope.
 */
function normalizeJobEnvelope(data: unknown): {
    readonly type: string
    readonly payload: unknown
} {
    if (isRecord(data) === false) {
        throw new Error("DLQ job payload must be an object with type and payload")
    }

    const rawType = data.type
    if (typeof rawType !== "string" || rawType.trim().length === 0) {
        throw new Error("DLQ job type must be a non-empty string")
    }

    return {
        type: rawType.trim(),
        payload: data.payload,
    }
}

/**
 * Type guard for plain object record.
 *
 * @param value Unknown value.
 * @returns True when plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

/**
 * Validates queue name value.
 *
 * @param value Raw queue name.
 * @returns Normalized queue name.
 */
function normalizeQueueName(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("queueName must be a non-empty string")
    }

    return normalized
}

/**
 * Validates positive integer value.
 *
 * @param value Raw numeric value.
 * @param fieldName Field name for error.
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
 * Validates job identifier.
 *
 * @param value Raw id.
 * @returns Normalized id.
 */
function normalizeJobId(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("jobId must be a non-empty string")
    }

    return normalized
}

/**
 * Default DLQ alert handler.
 *
 * @param alert DLQ alert payload.
 */
function defaultOnDlqEntry(alert: IWorkerDlqAlert): Promise<void> {
    void alert
    return Promise.resolve()
}

/**
 * Default error handler for DLQ processing.
 *
 * @param error Processing error.
 */
function defaultOnError(error: Error): void {
    void error
}

/**
 * Converts unknown value to Error instance.
 *
 * @param value Unknown value.
 * @returns Error instance.
 */
function toError(value: unknown): Error {
    if (value instanceof Error) {
        return value
    }

    return new Error(String(value))
}
