/**
 * Stable error codes exposed by database adapters.
 */
export const DATABASE_ADAPTER_ERROR_CODE = {
    INVALID_CONFIGURATION: "DATABASE_ADAPTER_INVALID_CONFIGURATION",
    CONNECTION_FAILED: "DATABASE_ADAPTER_CONNECTION_FAILED",
    DISCONNECTION_FAILED: "DATABASE_ADAPTER_DISCONNECTION_FAILED",
    NOT_CONNECTED: "DATABASE_ADAPTER_NOT_CONNECTED",
} as const

/**
 * Database adapter error code value.
 */
export type DatabaseAdapterErrorCode =
    (typeof DATABASE_ADAPTER_ERROR_CODE)[keyof typeof DATABASE_ADAPTER_ERROR_CODE]

/**
 * Construction params for database adapter error.
 */
export interface ICreateDatabaseAdapterErrorParams {
    readonly code: DatabaseAdapterErrorCode
    readonly message: string
    readonly retryable: boolean
    readonly cause?: Error
}

/**
 * Normalized adapter error used by database contracts.
 */
export class DatabaseAdapterError extends Error {
    public readonly code: DatabaseAdapterErrorCode
    public readonly retryable: boolean
    public readonly cause?: Error

    /**
     * Creates database adapter error instance.
     *
     * @param params Error initialization parameters.
     */
    public constructor(params: ICreateDatabaseAdapterErrorParams) {
        super(params.message)
        this.name = "DatabaseAdapterError"
        this.code = params.code
        this.retryable = params.retryable
        this.cause = params.cause
    }
}
