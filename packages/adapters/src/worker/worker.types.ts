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
 * Worker processor callback.
 */
export type WorkerProcessor = (payload: unknown) => Promise<void>

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
    register(jobType: string, processor: WorkerProcessor): void

    /**
     * Looks up processor callback by job type.
     *
     * @param jobType Logical job type.
     * @returns Registered callback or undefined.
     */
    get(jobType: string): WorkerProcessor | undefined
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

/**
 * Runtime lifecycle statuses for Redis connection manager.
 */
export const WORKER_REDIS_CONNECTION_STATUS = {
    Idle: "IDLE",
    Connecting: "CONNECTING",
    Connected: "CONNECTED",
    Degraded: "DEGRADED",
    Disconnected: "DISCONNECTED",
} as const

/**
 * Redis connection manager lifecycle status.
 */
export type WorkerRedisConnectionStatus =
    (typeof WORKER_REDIS_CONNECTION_STATUS)[keyof typeof WORKER_REDIS_CONNECTION_STATUS]

/**
 * Minimal Redis connection contract required by worker infrastructure.
 */
export interface IWorkerRedisConnection {
    /**
     * Opens connection to Redis.
     */
    connect(): Promise<void>

    /**
     * Closes active Redis connection gracefully.
     */
    quit(): Promise<unknown>

    /**
     * Sends Redis ping command.
     *
     * @param message Optional ping payload.
     * @returns Redis response payload.
     */
    ping(message?: string): Promise<string>
}

/**
 * Health snapshot for worker Redis connection pool.
 */
export interface IWorkerRedisConnectionHealth {
    /**
     * Current pool status.
     */
    readonly status: WorkerRedisConnectionStatus

    /**
     * True when all pooled connections are healthy.
     */
    readonly isHealthy: boolean

    /**
     * Number of pooled connections currently managed.
     */
    readonly poolSize: number

    /**
     * Connections that passed ping check.
     */
    readonly connectedConnections: number

    /**
     * Connections that failed ping check.
     */
    readonly degradedConnections: number

    /**
     * Last captured failure message.
     */
    readonly lastFailure: string | null

    /**
     * Health check timestamp.
     */
    readonly checkedAt: Date
}

/**
 * Redis connection manager contract used by worker adapters.
 */
export interface IWorkerRedisConnectionManager {
    /**
     * Initializes Redis connection pool.
     */
    connect(): Promise<void>

    /**
     * Closes Redis connection pool.
     */
    disconnect(): Promise<void>

    /**
     * Returns next connection from pool in round-robin order.
     */
    getConnection(): IWorkerRedisConnection

    /**
     * Returns current connection pool health snapshot.
     *
     * @returns Health data.
     */
    healthCheck(): Promise<IWorkerRedisConnectionHealth>
}

/**
 * Alert payload emitted when job enters DLQ after max attempts.
 */
export interface IWorkerDlqAlert {
    /**
     * Failed job identifier.
     */
    readonly jobId: string

    /**
     * Failed job type.
     */
    readonly jobType: string

    /**
     * Original failed payload.
     */
    readonly payload: unknown

    /**
     * Attempts made before moving to DLQ.
     */
    readonly attemptsMade: number

    /**
     * Failure reason from queue.
     */
    readonly failedReason: string

    /**
     * Queue name where job failed.
     */
    readonly queueName: string
}

/**
 * DLQ manager contract used by worker infrastructure adapters.
 */
export interface IWorkerDlqManager {
    /**
     * Starts DLQ monitoring listeners.
     */
    start(): Promise<void>

    /**
     * Stops DLQ monitoring listeners.
     */
    stop(): Promise<void>

    /**
     * Manually retries failed job from DLQ.
     *
     * @param jobId Failed job identifier.
     * @returns True when retry was triggered.
     */
    retry(jobId: string): Promise<boolean>
}
