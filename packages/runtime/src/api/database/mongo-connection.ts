import mongoose from "mongoose"

/**
 * Retry policy for MongoDB connection attempts.
 */
export interface IMongoConnectionRetryPolicy {
    maxAttempts: number
    initialDelayMs: number
    maxDelayMs: number
    backoffFactor: number
}

/**
 * Readiness snapshot for MongoDB connection manager.
 */
export interface IMongoConnectionReadiness {
    ready: boolean
    attempts: number
    lastError: string | null
}

/**
 * Low-level connector contract for Mongo client operations.
 */
export interface IMongoConnector {
    /**
     * Connects to MongoDB endpoint.
     *
     * @param uri MongoDB connection URI.
     * @returns Promise resolved when connection is established.
     */
    connect(uri: string): Promise<void>

    /**
     * Disconnects active MongoDB connection.
     *
     * @returns Promise resolved when disconnection is complete.
     */
    disconnect(): Promise<void>
}

/**
 * API-facing database connection contract.
 */
export interface IApiDatabaseConnection {
    /**
     * Establishes connection according to retry policy.
     *
     * @returns Promise resolved when connection becomes ready.
     */
    connect(): Promise<void>

    /**
     * Closes active connection and resets readiness.
     *
     * @returns Promise resolved when disconnect is complete.
     */
    disconnect(): Promise<void>

    /**
     * Indicates whether database connection is ready for use.
     *
     * @returns True when ready.
     */
    isReady(): boolean

    /**
     * Throws when write operations must be rejected.
     */
    assertWriteAllowed(): void

    /**
     * Returns current readiness snapshot.
     *
     * @returns Readiness snapshot.
     */
    getReadiness(): IMongoConnectionReadiness
}

/**
 * Optional dependencies for creating Mongo connection manager.
 */
export interface ICreateMongoConnectionManagerOptions {
    connector?: IMongoConnector
    retryPolicy?: IMongoConnectionRetryPolicy
    sleep?: (ms: number) => Promise<void>
}

/**
 * Default retry policy used for MongoDB connection startup.
 */
export const DEFAULT_MONGO_CONNECTION_RETRY_POLICY: IMongoConnectionRetryPolicy = {
    maxAttempts: 5,
    initialDelayMs: 250,
    maxDelayMs: 5_000,
    backoffFactor: 2,
}

/**
 * Error raised when connection cannot be established within retry policy.
 */
export class MongoConnectionError extends Error {
    /**
     * Creates terminal connection error.
     *
     * @param message Human-readable error.
     * @param cause Original underlying failure.
     */
    public constructor(message: string, cause?: Error) {
        super(message)
        this.name = "MongoConnectionError"

        if (cause !== undefined) {
            this.cause = cause
        }
    }

    public readonly cause?: Error
}

/**
 * Error raised when write request is blocked due to database not-ready state.
 */
export class MongoWriteBlockedError extends Error {
    /**
     * Creates write-blocked error.
     */
    public constructor() {
        super("database connection is not ready for write operations")
        this.name = "MongoWriteBlockedError"
    }
}

/**
 * Mongo connection manager with retry/backoff and readiness tracking.
 */
class MongoConnectionManager implements IApiDatabaseConnection {
    private readonly uri: string
    private readonly connector: IMongoConnector
    private readonly retryPolicy: IMongoConnectionRetryPolicy
    private readonly sleep: (ms: number) => Promise<void>

    private ready: boolean
    private attempts: number
    private lastError: string | null

    /**
     * Creates manager instance.
     *
     * @param uri MongoDB connection URI.
     * @param connector Connector implementation.
     * @param retryPolicy Retry policy.
     * @param sleep Async sleep helper.
     */
    public constructor(
        uri: string,
        connector: IMongoConnector,
        retryPolicy: IMongoConnectionRetryPolicy,
        sleep: (ms: number) => Promise<void>,
    ) {
        this.uri = uri
        this.connector = connector
        this.retryPolicy = retryPolicy
        this.sleep = sleep

        this.ready = false
        this.attempts = 0
        this.lastError = null
    }

    /**
     * Connects to MongoDB with bounded retry policy.
     *
     * @returns Promise resolved when connection is ready.
     * @throws MongoConnectionError When all attempts fail.
     */
    public async connect(): Promise<void> {
        this.ready = false
        this.attempts = 0
        this.lastError = null

        let lastFailure: Error | undefined

        while (this.attempts < this.retryPolicy.maxAttempts) {
            this.attempts += 1

            try {
                await this.connector.connect(this.uri)
                this.ready = true
                this.lastError = null
                return
            } catch (error: unknown) {
                const normalizedError = normalizeError(error)
                this.ready = false
                this.lastError = normalizedError.message
                lastFailure = normalizedError

                if (this.attempts < this.retryPolicy.maxAttempts) {
                    const delayMs = calculateRetryDelayMs(this.retryPolicy, this.attempts)
                    await this.sleep(delayMs)
                }
            }
        }

        throw new MongoConnectionError(
            `failed to connect to mongodb after ${this.retryPolicy.maxAttempts} attempts`,
            lastFailure,
        )
    }

    /**
     * Disconnects from MongoDB and resets readiness.
     *
     * @returns Promise resolved when disconnect is complete.
     */
    public async disconnect(): Promise<void> {
        await this.connector.disconnect()
        this.ready = false
    }

    /**
     * Indicates current readiness state.
     *
     * @returns True when connection is ready.
     */
    public isReady(): boolean {
        return this.ready
    }

    /**
     * Guards write operations with readiness check.
     *
     * @throws MongoWriteBlockedError When connection is not ready.
     */
    public assertWriteAllowed(): void {
        if (!this.ready) {
            throw new MongoWriteBlockedError()
        }
    }

    /**
     * Returns readiness snapshot.
     *
     * @returns Readiness snapshot.
     */
    public getReadiness(): IMongoConnectionReadiness {
        return {
            ready: this.ready,
            attempts: this.attempts,
            lastError: this.lastError,
        }
    }

    /**
     * Exposes active retry policy for diagnostics/tests.
     *
     * @returns Retry policy snapshot.
     */
    public getRetryPolicy(): IMongoConnectionRetryPolicy {
        return {
            maxAttempts: this.retryPolicy.maxAttempts,
            initialDelayMs: this.retryPolicy.initialDelayMs,
            maxDelayMs: this.retryPolicy.maxDelayMs,
            backoffFactor: this.retryPolicy.backoffFactor,
        }
    }
}

/**
 * Creates Mongo connection manager instance.
 *
 * @param uri MongoDB connection URI.
 * @param options Optional connector and retry dependencies.
 * @returns Ready-to-use database connection manager.
 */
export function createMongoConnectionManager(
    uri: string,
    options: ICreateMongoConnectionManagerOptions = {},
): IApiDatabaseConnection & {getRetryPolicy(): IMongoConnectionRetryPolicy} {
    ensureConnectionUri(uri)

    const retryPolicy = options.retryPolicy ?? DEFAULT_MONGO_CONNECTION_RETRY_POLICY
    ensureRetryPolicy(retryPolicy)

    const connector = options.connector ?? createMongooseConnector()
    const sleep = options.sleep ?? defaultSleep

    return new MongoConnectionManager(uri, connector, retryPolicy, sleep)
}

/**
 * Creates default mongoose-based connector.
 *
 * @returns Connector adapter.
 */
function createMongooseConnector(): IMongoConnector {
    return {
        async connect(uri: string): Promise<void> {
            await mongoose.connect(uri)
        },
        async disconnect(): Promise<void> {
            await mongoose.disconnect()
        },
    }
}

/**
 * Sleeps for given duration.
 *
 * @param ms Delay in milliseconds.
 * @returns Promise resolved after delay.
 */
function defaultSleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

/**
 * Validates mongo connection URI.
 *
 * @param uri MongoDB URI.
 * @throws Error When URI is invalid.
 */
function ensureConnectionUri(uri: string): void {
    if (uri.trim().length === 0) {
        throw new Error("mongodb uri must be a non-empty string")
    }
}

/**
 * Validates retry policy values.
 *
 * @param retryPolicy Retry policy.
 * @throws Error When policy is invalid.
 */
function ensureRetryPolicy(retryPolicy: IMongoConnectionRetryPolicy): void {
    if (!Number.isInteger(retryPolicy.maxAttempts) || retryPolicy.maxAttempts <= 0) {
        throw new Error("maxAttempts must be a positive integer")
    }

    if (retryPolicy.initialDelayMs < 0) {
        throw new Error("initialDelayMs must be greater than or equal to zero")
    }

    if (retryPolicy.maxDelayMs < 0) {
        throw new Error("maxDelayMs must be greater than or equal to zero")
    }

    if (retryPolicy.backoffFactor < 1) {
        throw new Error("backoffFactor must be greater than or equal to 1")
    }
}

/**
 * Computes retry delay for failed attempt.
 *
 * @param retryPolicy Retry policy.
 * @param attempt Current attempt number.
 * @returns Delay in milliseconds.
 */
function calculateRetryDelayMs(
    retryPolicy: IMongoConnectionRetryPolicy,
    attempt: number,
): number {
    const rawDelay =
        retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffFactor, Math.max(0, attempt - 1))

    return Math.min(retryPolicy.maxDelayMs, rawDelay)
}

/**
 * Normalizes unknown error values.
 *
 * @param error Unknown failure value.
 * @returns Error instance.
 */
function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error
    }

    return new Error(String(error))
}
