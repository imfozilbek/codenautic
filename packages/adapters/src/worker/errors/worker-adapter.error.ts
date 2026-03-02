/**
 * Stable error codes exposed by worker adapters.
 */
export const WORKER_ADAPTER_ERROR_CODE = {
    INVALID_JOB: "WORKER_ADAPTER_INVALID_JOB",
    PROCESSOR_ALREADY_REGISTERED: "WORKER_ADAPTER_PROCESSOR_ALREADY_REGISTERED",
} as const

/**
 * Worker adapter error code value.
 */
export type WorkerAdapterErrorCode =
    (typeof WORKER_ADAPTER_ERROR_CODE)[keyof typeof WORKER_ADAPTER_ERROR_CODE]

/**
 * Construction params for worker adapter error.
 */
export interface ICreateWorkerAdapterErrorParams {
    readonly code: WorkerAdapterErrorCode
    readonly message: string
    readonly retryable: boolean
    readonly cause?: Error
}

/**
 * Normalized adapter error used by worker contracts.
 */
export class WorkerAdapterError extends Error {
    public readonly code: WorkerAdapterErrorCode
    public readonly retryable: boolean
    public readonly cause?: Error

    /**
     * Creates worker adapter error instance.
     *
     * @param params Error initialization parameters.
     */
    public constructor(params: ICreateWorkerAdapterErrorParams) {
        super(params.message)
        this.name = "WorkerAdapterError"
        this.code = params.code
        this.retryable = params.retryable
        this.cause = params.cause
    }
}
