import Redis, {type RedisOptions} from "ioredis"

import {
    WORKER_REDIS_CONNECTION_STATUS,
    type IWorkerRedisConnection,
    type IWorkerRedisConnectionHealth,
    type IWorkerRedisConnectionManager,
    type WorkerRedisConnectionStatus,
} from "./worker.types"

/**
 * Default Redis connection pool size.
 */
export const DEFAULT_REDIS_POOL_SIZE = 4

/**
 * Default initial reconnect backoff in milliseconds.
 */
export const DEFAULT_REDIS_INITIAL_BACKOFF_MS = 100

/**
 * Default maximum reconnect backoff in milliseconds.
 */
export const DEFAULT_REDIS_MAX_BACKOFF_MS = 5_000

/**
 * Default maximum reconnect attempts per connection slot.
 */
export const DEFAULT_REDIS_MAX_RECONNECT_ATTEMPTS = 5

/**
 * Ping message used by health checks.
 */
export const REDIS_HEALTH_CHECK_PING_MESSAGE = "health-check"

/**
 * Sleep function used during reconnect backoff.
 */
export type RedisConnectionSleep = (delayMs: number) => Promise<void>

/**
 * Runtime connection contract for Redis manager internals and tests.
 */
export interface IRedisConnectionLike extends IWorkerRedisConnection {}

/**
 * Factory options for constructing one Redis connection.
 */
export interface IRedisConnectionManagerFactoryOptions {
    /**
     * Base Redis options.
     */
    readonly connection: RedisOptions

    /**
     * Retry strategy used by underlying Redis client.
     */
    readonly retryStrategy: (attempt: number) => number | null
}

/**
 * Factory contract for Redis connections.
 */
export type RedisConnectionFactory = (
    options: IRedisConnectionManagerFactoryOptions,
) => IRedisConnectionLike

/**
 * Constructor options for Redis connection manager.
 */
export interface IRedisConnectionManagerOptions {
    /**
     * Base Redis connection options.
     */
    readonly connection: RedisOptions

    /**
     * Number of pooled Redis connections.
     */
    readonly poolSize?: number

    /**
     * Initial reconnect backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Maximum reconnect backoff in milliseconds.
     */
    readonly maxBackoffMs?: number

    /**
     * Maximum reconnect attempts per connection slot.
     */
    readonly maxReconnectAttempts?: number

    /**
     * Optional connection factory for tests.
     */
    readonly connectionFactory?: RedisConnectionFactory

    /**
     * Optional async sleep strategy for tests.
     */
    readonly sleep?: RedisConnectionSleep

    /**
     * Optional clock override for deterministic tests.
     */
    readonly now?: () => Date
}

/**
 * Redis connection manager with pool, reconnect backoff and health checks.
 */
export class RedisConnectionManager implements IWorkerRedisConnectionManager {
    private readonly connection: RedisOptions
    private readonly poolSize: number
    private readonly initialBackoffMs: number
    private readonly maxBackoffMs: number
    private readonly maxReconnectAttempts: number
    private readonly connectionFactory: RedisConnectionFactory
    private readonly sleep: RedisConnectionSleep
    private readonly now: () => Date

    private status: WorkerRedisConnectionStatus = WORKER_REDIS_CONNECTION_STATUS.Idle
    private connections: IRedisConnectionLike[] = []
    private connectPromise: Promise<void> | undefined
    private nextConnectionIndex = 0
    private lastFailure: string | null = null

    /**
     * Creates Redis connection manager.
     *
     * @param options Connection manager options.
     */
    public constructor(options: IRedisConnectionManagerOptions) {
        this.connection = options.connection
        this.poolSize = normalizePositiveInteger(
            options.poolSize ?? DEFAULT_REDIS_POOL_SIZE,
            "poolSize",
        )
        this.initialBackoffMs = normalizeNonNegativeInteger(
            options.initialBackoffMs ?? DEFAULT_REDIS_INITIAL_BACKOFF_MS,
            "initialBackoffMs",
        )
        this.maxBackoffMs = normalizePositiveInteger(
            options.maxBackoffMs ?? DEFAULT_REDIS_MAX_BACKOFF_MS,
            "maxBackoffMs",
        )
        this.maxReconnectAttempts = normalizePositiveInteger(
            options.maxReconnectAttempts ?? DEFAULT_REDIS_MAX_RECONNECT_ATTEMPTS,
            "maxReconnectAttempts",
        )
        this.connectionFactory =
            options.connectionFactory ?? defaultRedisConnectionFactory
        this.sleep = options.sleep ?? defaultSleep
        this.now = options.now ?? defaultNow
    }

    /**
     * Initializes Redis connection pool.
     */
    public async connect(): Promise<void> {
        if (
            this.status === WORKER_REDIS_CONNECTION_STATUS.Connected &&
            this.connections.length === this.poolSize
        ) {
            return
        }

        if (this.connectPromise !== undefined) {
            await this.connectPromise
            return
        }

        this.connectPromise = this.initializePool()
            .then((): void => {
                this.status = WORKER_REDIS_CONNECTION_STATUS.Connected
                this.lastFailure = null
            })
            .catch(async (error: unknown): Promise<never> => {
                await closeConnectionsQuietly(this.connections)
                this.connections = []
                this.nextConnectionIndex = 0
                this.status = WORKER_REDIS_CONNECTION_STATUS.Degraded
                this.lastFailure = toErrorMessage(error)
                throw toError(error)
            })
            .finally((): void => {
                this.connectPromise = undefined
            })

        await this.connectPromise
    }

    /**
     * Closes all pooled Redis connections.
     */
    public async disconnect(): Promise<void> {
        if (this.connections.length === 0) {
            this.status = WORKER_REDIS_CONNECTION_STATUS.Disconnected
            this.lastFailure = null
            return
        }

        const activeConnections = [...this.connections]
        this.connections = []
        this.nextConnectionIndex = 0

        let firstError: Error | undefined
        for (const connection of activeConnections) {
            try {
                await connection.quit()
            } catch (error: unknown) {
                if (firstError === undefined) {
                    firstError = toError(error)
                }
            }
        }

        if (firstError !== undefined) {
            this.status = WORKER_REDIS_CONNECTION_STATUS.Degraded
            this.lastFailure = firstError.message
            throw firstError
        }

        this.status = WORKER_REDIS_CONNECTION_STATUS.Disconnected
        this.lastFailure = null
    }

    /**
     * Returns next pooled connection using round-robin strategy.
     *
     * @returns Pooled connection instance.
     */
    public getConnection(): IRedisConnectionLike {
        if (this.connections.length === 0) {
            throw new Error("Redis connection pool is not initialized")
        }

        const connection = this.connections[this.nextConnectionIndex]
        if (connection === undefined) {
            throw new Error("Redis connection pool state is inconsistent")
        }

        this.nextConnectionIndex = (this.nextConnectionIndex + 1) % this.connections.length
        return connection
    }

    /**
     * Returns Redis pool health snapshot.
     *
     * @returns Health data.
     */
    public async healthCheck(): Promise<IWorkerRedisConnectionHealth> {
        if (this.connections.length === 0) {
            const status =
                this.status === WORKER_REDIS_CONNECTION_STATUS.Disconnected
                    ? WORKER_REDIS_CONNECTION_STATUS.Disconnected
                    : WORKER_REDIS_CONNECTION_STATUS.Idle
            return {
                status,
                isHealthy: false,
                poolSize: 0,
                connectedConnections: 0,
                degradedConnections: 0,
                lastFailure: this.lastFailure,
                checkedAt: this.now(),
            }
        }

        let connectedConnections = 0
        let degradedConnections = 0
        let lastFailure = this.lastFailure
        for (const connection of this.connections) {
            try {
                await connection.ping(REDIS_HEALTH_CHECK_PING_MESSAGE)
                connectedConnections += 1
            } catch (error: unknown) {
                degradedConnections += 1
                lastFailure = toErrorMessage(error)
            }
        }

        this.status = resolveConnectionStatus(
            connectedConnections,
            degradedConnections,
            this.connections.length,
        )
        this.lastFailure = degradedConnections > 0 ? lastFailure : null

        return {
            status: this.status,
            isHealthy: degradedConnections === 0 && connectedConnections === this.connections.length,
            poolSize: this.connections.length,
            connectedConnections,
            degradedConnections,
            lastFailure: this.lastFailure,
            checkedAt: this.now(),
        }
    }

    /**
     * Initializes all pool slots with retry/backoff policy.
     */
    private async initializePool(): Promise<void> {
        this.status = WORKER_REDIS_CONNECTION_STATUS.Connecting
        const createdConnections: IRedisConnectionLike[] = []
        try {
            for (let index = 0; index < this.poolSize; index += 1) {
                const connection = await this.createConnectionWithRetry()
                createdConnections.push(connection)
            }
        } catch (error: unknown) {
            await closeConnectionsQuietly(createdConnections)
            throw error
        }

        this.connections = createdConnections
        this.nextConnectionIndex = 0
    }

    /**
     * Creates one connection with reconnect backoff retries.
     *
     * @returns Connected Redis client.
     */
    private async createConnectionWithRetry(): Promise<IRedisConnectionLike> {
        for (
            let attempt = 1;
            attempt <= this.maxReconnectAttempts;
            attempt += 1
        ) {
            const connection = this.connectionFactory({
                connection: this.connection,
                retryStrategy: (retryAttempt: number): number => {
                    return this.calculateReconnectDelay(retryAttempt)
                },
            })

            try {
                await connection.connect()
                return connection
            } catch (error: unknown) {
                await closeConnectionQuietly(connection)
                this.lastFailure = toErrorMessage(error)
                const hasRetriesLeft = attempt < this.maxReconnectAttempts
                if (hasRetriesLeft === false) {
                    throw toError(error)
                }

                const delayMs = this.calculateReconnectDelay(attempt)
                await this.sleep(delayMs)
            }
        }

        throw new Error("Redis connection attempts exhausted")
    }

    /**
     * Calculates reconnect backoff delay.
     *
     * @param attempt Attempt number starting from 1.
     * @returns Delay in milliseconds.
     */
    private calculateReconnectDelay(attempt: number): number {
        const normalizedAttempt = normalizePositiveInteger(attempt, "attempt")
        if (this.initialBackoffMs === 0) {
            return 0
        }

        const multiplier = Math.pow(2, normalizedAttempt - 1)
        const delay = Math.trunc(this.initialBackoffMs * multiplier)
        return Math.min(this.maxBackoffMs, delay)
    }
}

/**
 * Resolves health status from ping results.
 *
 * @param connectedConnections Successful pings count.
 * @param degradedConnections Failed pings count.
 * @param poolSize Current pool size.
 * @returns Pool status.
 */
function resolveConnectionStatus(
    connectedConnections: number,
    degradedConnections: number,
    poolSize: number,
): WorkerRedisConnectionStatus {
    if (poolSize === 0) {
        return WORKER_REDIS_CONNECTION_STATUS.Disconnected
    }

    if (degradedConnections === 0 && connectedConnections === poolSize) {
        return WORKER_REDIS_CONNECTION_STATUS.Connected
    }

    return WORKER_REDIS_CONNECTION_STATUS.Degraded
}

/**
 * Creates default Redis client with lazy connect and retry strategy.
 *
 * @param options Connection factory options.
 * @returns Redis client instance.
 */
function defaultRedisConnectionFactory(
    options: IRedisConnectionManagerFactoryOptions,
): IRedisConnectionLike {
    const client = new Redis({
        ...options.connection,
        lazyConnect: true,
        retryStrategy: options.retryStrategy,
    })

    return {
        connect(): Promise<void> {
            return client.connect()
        },
        quit(): Promise<unknown> {
            return client.quit()
        },
        ping(message?: string): Promise<string> {
            if (message === undefined) {
                return client.ping()
            }

            return client.ping(message)
        },
    }
}

/**
 * Closes one connection and suppresses close errors.
 *
 * @param connection Connection to close.
 */
async function closeConnectionQuietly(
    connection: IRedisConnectionLike,
): Promise<void> {
    try {
        await connection.quit()
    } catch (error: unknown) {
        void error
    }
}

/**
 * Closes many connections and suppresses close errors.
 *
 * @param connections Connections to close.
 */
async function closeConnectionsQuietly(
    connections: readonly IRedisConnectionLike[],
): Promise<void> {
    for (const connection of connections) {
        await closeConnectionQuietly(connection)
    }
}

/**
 * Default async sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after timeout.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve): void => {
        setTimeout(resolve, delayMs)
    })
}

/**
 * Default clock provider.
 *
 * @returns Current date.
 */
function defaultNow(): Date {
    return new Date()
}

/**
 * Normalizes positive integer value.
 *
 * @param value Raw value.
 * @param fieldName Field name for error message.
 * @returns Normalized integer.
 */
function normalizePositiveInteger(value: number, fieldName: string): number {
    const normalized = normalizeFiniteInteger(value, fieldName)
    if (normalized < 1) {
        throw new Error(`${fieldName} must be greater than zero`)
    }

    return normalized
}

/**
 * Normalizes non-negative integer value.
 *
 * @param value Raw value.
 * @param fieldName Field name for error message.
 * @returns Normalized integer.
 */
function normalizeNonNegativeInteger(value: number, fieldName: string): number {
    const normalized = normalizeFiniteInteger(value, fieldName)
    if (normalized < 0) {
        throw new Error(`${fieldName} must be greater or equal to zero`)
    }

    return normalized
}

/**
 * Normalizes finite integer value.
 *
 * @param value Raw value.
 * @param fieldName Field name for error message.
 * @returns Truncated integer.
 */
function normalizeFiniteInteger(value: number, fieldName: string): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error(`${fieldName} must be finite number`)
    }

    return Math.trunc(value)
}

/**
 * Converts unknown error value into Error.
 *
 * @param error Unknown error value.
 * @returns Error instance.
 */
function toError(error: unknown): Error {
    if (error instanceof Error) {
        return error
    }

    return new Error(String(error))
}

/**
 * Converts unknown error value into message.
 *
 * @param error Unknown error value.
 * @returns Error message.
 */
function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return String(error)
}
