import mongoose, {type Connection} from "mongoose"

import {Result} from "@codenautic/core"

import type {
    CreateMongoConnectionFn,
    IMongoConnectionManager,
    IMongoConnectionManagerOptions,
} from "../contracts/database.contract"
import {
    DATABASE_ADAPTER_ERROR_CODE,
    DatabaseAdapterError,
} from "../errors/database-adapter.error"

const MONGOOSE_READY_STATE_CONNECTED = mongoose.ConnectionStates.connected

/**
 * MongoDB connection manager with idempotent connect lifecycle.
 */
export class MongoConnectionManager implements IMongoConnectionManager {
    private readonly uri: string
    private readonly createConnectionFn: CreateMongoConnectionFn
    private readonly options: IMongoConnectionManagerOptions

    private connection: Connection | undefined
    private pendingConnection:
        | Promise<Result<Connection, DatabaseAdapterError>>
        | undefined

    /**
     * Creates Mongo connection manager.
     *
     * @param uri MongoDB connection URI.
     * @param options Optional connection dependencies.
     * @throws Error When URI is invalid.
     */
    public constructor(uri: string, options: IMongoConnectionManagerOptions = {}) {
        const normalizedUri = normalizeNonEmptyString(uri)
        if (normalizedUri === undefined) {
            throw new Error("mongo connection uri must be a non-empty string")
        }

        this.uri = normalizedUri
        this.createConnectionFn = options.createConnectionFn ?? defaultCreateConnectionFn
        this.options = options
        this.connection = undefined
        this.pendingConnection = undefined
    }

    /**
     * Establishes active MongoDB connection.
     *
     * @returns Connection establishment result.
     */
    public async connect(): Promise<Result<Connection, DatabaseAdapterError>> {
        if (isConnected(this.connection)) {
            return Result.ok(this.connection)
        }

        if (this.pendingConnection !== undefined) {
            return this.pendingConnection
        }

        this.pendingConnection = this.connectInternal()
        const result = await this.pendingConnection
        this.pendingConnection = undefined
        return result
    }

    /**
     * Closes active MongoDB connection.
     *
     * @returns Disconnection result.
     */
    public async disconnect(): Promise<Result<void, DatabaseAdapterError>> {
        if (this.connection === undefined) {
            return Result.ok(undefined)
        }

        try {
            await this.connection.close()
            this.connection = undefined
            return Result.ok(undefined)
        } catch (error: unknown) {
            const cause = normalizeError(error)
            return Result.fail(
                new DatabaseAdapterError({
                    code: DATABASE_ADAPTER_ERROR_CODE.DISCONNECTION_FAILED,
                    message: "Failed to disconnect from MongoDB",
                    retryable: true,
                    cause,
                }),
            )
        }
    }

    /**
     * Returns active connected instance.
     *
     * @returns Connected mongoose connection.
     */
    public getConnection(): Result<Connection, DatabaseAdapterError> {
        if (isConnected(this.connection) === false) {
            return Result.fail(
                new DatabaseAdapterError({
                    code: DATABASE_ADAPTER_ERROR_CODE.NOT_CONNECTED,
                    message: "MongoDB connection is not established",
                    retryable: true,
                }),
            )
        }

        return Result.ok(this.connection)
    }

    /**
     * Indicates whether active connection is established.
     *
     * @returns True when manager has connected state.
     */
    public isConnected(): boolean {
        return isConnected(this.connection)
    }

    /**
     * Performs actual connection establishment.
     *
     * @returns Connection establishment result.
     */
    private async connectInternal(): Promise<Result<Connection, DatabaseAdapterError>> {
        try {
            const connection = await this.createConnectionFn(this.uri, this.options.connectOptions)
            this.connection = connection
            return Result.ok(connection)
        } catch (error: unknown) {
            return Result.fail(createConnectionFailedError(normalizeError(error)))
        }
    }
}

/**
 * Default mongoose createConnection wrapper.
 *
 * @param uri MongoDB connection URI.
 * @param options Optional connection options.
 * @returns Connected mongoose connection.
 */
async function defaultCreateConnectionFn(
    uri: string,
    options = {},
): Promise<Connection> {
    return mongoose.createConnection(uri, options).asPromise()
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
 * Resolves connected state for optional mongoose connection.
 *
 * @param connection Optional mongoose connection.
 * @returns True when connection is active.
 */
function isConnected(connection: Connection | undefined): connection is Connection {
    if (connection === undefined) {
        return false
    }

    return connection.readyState === MONGOOSE_READY_STATE_CONNECTED
}

/**
 * Normalizes unknown failure into Error instance.
 *
 * @param error Unknown failure value.
 * @returns Error instance.
 */
function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error
    }

    return new Error("Unknown database connection failure")
}

/**
 * Creates standardized connection failure.
 *
 * @param cause Original failure.
 * @returns Database adapter error.
 */
function createConnectionFailedError(cause: Error): DatabaseAdapterError {
    return new DatabaseAdapterError({
        code: DATABASE_ADAPTER_ERROR_CODE.CONNECTION_FAILED,
        message: "Failed to connect to MongoDB",
        retryable: true,
        cause,
    })
}
