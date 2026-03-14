/**
 * Normalized worker queue payload.
 */
export interface IWorkerJobPayload {
    /**
     * Logical job type identifier.
     */
    readonly type: string

    /**
     * Unvalidated job payload.
     */
    readonly payload: unknown

    /**
     * Optional queue priority (higher means sooner).
     */
    readonly priority?: number
}

/**
 * Runtime lifecycle statuses for worker adapter.
 */
export const WORKER_RUNTIME_STATUS = {
    Idle: "IDLE",
    Running: "RUNNING",
    Stopping: "STOPPING",
    Stopped: "STOPPED",
    Degraded: "DEGRADED",
} as const

/**
 * Worker runtime lifecycle status.
 */
export type WorkerRuntimeStatus =
    (typeof WORKER_RUNTIME_STATUS)[keyof typeof WORKER_RUNTIME_STATUS]

/**
 * Health snapshot for worker runtime.
 */
export interface IWorkerRuntimeHealth {
    /**
     * Queue name served by this runtime.
     */
    readonly queueName: string

    /**
     * Current runtime lifecycle state.
     */
    readonly status: WorkerRuntimeStatus

    /**
     * True when runtime is healthy and currently consuming jobs.
     */
    readonly isHealthy: boolean

    /**
     * Number of currently active jobs.
     */
    readonly activeJobs: number

    /**
     * Worker prefetch/concurrency value.
     */
    readonly prefetch: number

    /**
     * Graceful shutdown timeout in milliseconds.
     */
    readonly gracefulShutdownTimeoutMs: number

    /**
     * Runtime start timestamp.
     */
    readonly startedAt: Date | null

    /**
     * Runtime stop timestamp.
     */
    readonly stoppedAt: Date | null

    /**
     * Last failure message captured by runtime.
     */
    readonly lastFailure: string | null
}

/**
 * Queue job statuses exposed by queue service.
 */
export const WORKER_QUEUE_JOB_STATUS = {
    Waiting: "WAITING",
    Prioritized: "PRIORITIZED",
    Active: "ACTIVE",
    Completed: "COMPLETED",
    Failed: "FAILED",
    Delayed: "DELAYED",
    Paused: "PAUSED",
    Unknown: "UNKNOWN",
} as const

/**
 * Queue job status.
 */
export type WorkerQueueJobStatus =
    (typeof WORKER_QUEUE_JOB_STATUS)[keyof typeof WORKER_QUEUE_JOB_STATUS]

/**
 * Dequeued worker job representation.
 */
export interface IWorkerDequeuedJob {
    /**
     * Stable queue job identifier.
     */
    readonly id: string

    /**
     * Logical job type identifier.
     */
    readonly type: string

    /**
     * Original unvalidated payload.
     */
    readonly payload: unknown

    /**
     * Optional queue priority in app-level scale.
     */
    readonly priority?: number
}

/**
 * Queue service contract used by worker adapters.
 */
export interface IWorkerQueueService {
    /**
     * Enqueues one worker job.
     *
     * @param payload Job payload.
     * @returns Stable queue job identifier.
     */
    enqueue(payload: IWorkerJobPayload): Promise<string>

    /**
     * Dequeues pending jobs from queue and removes them.
     *
     * @param limit Maximum number of jobs to dequeue.
     * @returns Dequeued jobs.
     */
    dequeue(limit?: number): Promise<readonly IWorkerDequeuedJob[]>

    /**
     * Returns current queue status for one job.
     *
     * @param jobId Queue job identifier.
     * @returns Job status or null when not found.
     */
    getStatus(jobId: string): Promise<WorkerQueueJobStatus | null>
}

/**
 * Processor registry contract used by worker adapters.
 */
export interface IWorkerProcessorRegistry {
    /**
     * Registers one processor callback for job type.
     *
     * @param jobType Logical job type.
     * @param processor Processor callback.
     */
    register(jobType: string, processor: (payload: unknown) => Promise<void>): void
}

/**
 * Worker runtime contract used by infrastructure adapters.
 */
export interface IWorkerRuntime {
    /**
     * Starts job-consumer runtime loop.
     */
    start(): Promise<void>

    /**
     * Stops runtime gracefully.
     */
    stop(): Promise<void>

    /**
     * Returns current runtime health snapshot.
     */
    healthCheck(): IWorkerRuntimeHealth
}
