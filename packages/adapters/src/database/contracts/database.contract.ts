import type {Connection, ConnectOptions} from "mongoose"

import type {Result} from "@codenautic/core"

import type {DatabaseAdapterError} from "../errors/database-adapter.error"

/**
 * Injectable factory for establishing MongoDB connection.
 */
export type CreateMongoConnectionFn = (
    uri: string,
    options?: ConnectOptions,
) => Promise<Connection>

/**
 * Optional dependencies for MongoConnectionManager.
 */
export interface IMongoConnectionManagerOptions {
    readonly createConnectionFn?: CreateMongoConnectionFn
    readonly connectOptions?: ConnectOptions
}

/**
 * Connection manager contract used by database adapters.
 */
export interface IMongoConnectionManager {
    /**
     * Establishes active MongoDB connection.
     *
     * @returns Connection establishment result.
     */
    connect(): Promise<Result<Connection, DatabaseAdapterError>>

    /**
     * Closes active MongoDB connection.
     *
     * @returns Disconnection result.
     */
    disconnect(): Promise<Result<void, DatabaseAdapterError>>

    /**
     * Returns active connected instance.
     *
     * @returns Connected mongoose connection.
     */
    getConnection(): Result<Connection, DatabaseAdapterError>

    /**
     * Indicates whether active connection is established.
     *
     * @returns True when manager has connected state.
     */
    isConnected(): boolean
}
