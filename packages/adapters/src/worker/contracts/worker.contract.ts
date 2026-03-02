/**
 * Worker enqueue status values.
 */
export const WORKER_ENQUEUE_STATUS = {
    ENQUEUED: "enqueued",
    DUPLICATE: "duplicate",
} as const

/**
 * Worker enqueue status value.
 */
export type WorkerEnqueueStatus = (typeof WORKER_ENQUEUE_STATUS)[keyof typeof WORKER_ENQUEUE_STATUS]

/**
 * Worker job record DTO.
 */
export interface IWorkerJob {
    readonly id: string
    readonly type: string
    readonly payload: Readonly<Record<string, unknown>>
    readonly enqueuedAt: Date
}

/**
 * Worker enqueue request DTO.
 */
export interface IWorkerEnqueueRequest {
    readonly id: string
    readonly type: string
    readonly payload: Readonly<Record<string, unknown>>
}

/**
 * Worker enqueue result DTO.
 */
export interface IWorkerEnqueueResult {
    readonly status: WorkerEnqueueStatus
    readonly job: IWorkerJob
}

/**
 * Worker processor function signature.
 */
export type IWorkerJobProcessor = (payload: Readonly<Record<string, unknown>>) => void | Promise<void>
