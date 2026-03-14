import {describe, expect, test} from "bun:test"

import {
    RedisConnectionManager,
    WORKER_REDIS_CONNECTION_STATUS,
    type IRedisConnectionManagerFactoryOptions,
    type IRedisConnectionLike,
} from "../../src/worker"

/**
 * Scripted Redis connection test double.
 */
class ScriptedRedisConnection implements IRedisConnectionLike {
    private readonly connectBehavior: () => Promise<void>
    private readonly quitBehavior: () => Promise<void>
    private readonly pingBehavior: (message?: string) => Promise<string>
    private connectCallCount = 0
    private quitCallCount = 0

    /**
     * Creates scripted Redis connection.
     *
     * @param connectBehavior Connect behavior.
     * @param quitBehavior Quit behavior.
     * @param pingBehavior Ping behavior.
     */
    public constructor(options: {
        readonly connectBehavior?: () => Promise<void>
        readonly quitBehavior?: () => Promise<void>
        readonly pingBehavior?: (message?: string) => Promise<string>
    }) {
        this.connectBehavior = options.connectBehavior ?? (() => Promise.resolve())
        this.quitBehavior = options.quitBehavior ?? (() => Promise.resolve())
        this.pingBehavior =
            options.pingBehavior ??
            (() => {
                return Promise.resolve("PONG")
            })
    }

    /**
     * Records connect call and executes scripted behavior.
     *
     * @returns Promise from scripted behavior.
     */
    public connect(): Promise<void> {
        this.connectCallCount += 1
        return this.connectBehavior()
    }

    /**
     * Records quit call and executes scripted behavior.
     *
     * @returns Promise from scripted behavior.
     */
    public quit(): Promise<void> {
        this.quitCallCount += 1
        return this.quitBehavior()
    }

    /**
     * Executes scripted ping behavior.
     *
     * @param message Optional ping message.
     * @returns Redis ping response.
     */
    public ping(message?: string): Promise<string> {
        return this.pingBehavior(message)
    }

    /**
     * Returns number of connect calls.
     *
     * @returns Count.
     */
    public getConnectCalls(): number {
        return this.connectCallCount
    }

    /**
     * Returns number of quit calls.
     *
     * @returns Count.
     */
    public getQuitCalls(): number {
        return this.quitCallCount
    }
}

describe("RedisConnectionManager", () => {
    test("validates required options", () => {
        expect(
            () =>
                new RedisConnectionManager({
                    connection: {
                        host: "127.0.0.1",
                        port: 6379,
                    },
                    poolSize: 0,
                }),
        ).toThrow("poolSize must be greater than zero")

        expect(
            () =>
                new RedisConnectionManager({
                    connection: {
                        host: "127.0.0.1",
                        port: 6379,
                    },
                    initialBackoffMs: -1,
                }),
        ).toThrow("initialBackoffMs must be greater or equal to zero")

        expect(
            () =>
                new RedisConnectionManager({
                    connection: {
                        host: "127.0.0.1",
                        port: 6379,
                    },
                    maxBackoffMs: 0,
                }),
        ).toThrow("maxBackoffMs must be greater than zero")
    })

    test("connect initializes pool and health check reports healthy", async () => {
        const createdConnections: ScriptedRedisConnection[] = []
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 2,
            connectionFactory: (_options: IRedisConnectionManagerFactoryOptions) => {
                const connection = new ScriptedRedisConnection({})
                createdConnections.push(connection)
                return connection
            },
            now: () => new Date("2026-03-14T21:00:00.000Z"),
        })

        await manager.connect()
        const firstConnection = manager.getConnection()
        const secondConnection = manager.getConnection()
        const thirdConnection = manager.getConnection()
        const health = await manager.healthCheck()
        const firstCreatedConnection = createdConnections[0]
        const secondCreatedConnection = createdConnections[1]
        if (
            firstCreatedConnection === undefined ||
            secondCreatedConnection === undefined
        ) {
            throw new Error("Expected pooled connections to be created")
        }

        expect(createdConnections.length).toBe(2)
        expect(firstConnection).toBe(firstCreatedConnection)
        expect(secondConnection).toBe(secondCreatedConnection)
        expect(thirdConnection).toBe(firstCreatedConnection)
        expect(health).toEqual({
            status: WORKER_REDIS_CONNECTION_STATUS.Connected,
            isHealthy: true,
            poolSize: 2,
            connectedConnections: 2,
            degradedConnections: 0,
            lastFailure: null,
            checkedAt: new Date("2026-03-14T21:00:00.000Z"),
        })
    })

    test("coalesces concurrent connect calls into one pool initialization", async () => {
        let resolveConnect: (() => void) | undefined
        let factoryCalls = 0
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 1,
            connectionFactory: (_options: IRedisConnectionManagerFactoryOptions) => {
                factoryCalls += 1
                return new ScriptedRedisConnection({
                    connectBehavior: () => {
                        return new Promise<void>((resolve): void => {
                            resolveConnect = resolve
                        })
                    },
                })
            },
        })

        const firstConnect = manager.connect()
        const secondConnect = manager.connect()
        expect(factoryCalls).toBe(1)
        expect(resolveConnect).toBeDefined()

        resolveConnect?.()
        await firstConnect
        await secondConnect
    })

    test("retries failed connect with exponential backoff", async () => {
        let attempts = 0
        const sleepCalls: number[] = []
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 1,
            initialBackoffMs: 10,
            maxBackoffMs: 100,
            connectionFactory: (_options: IRedisConnectionManagerFactoryOptions) => {
                return new ScriptedRedisConnection({
                    connectBehavior: () => {
                        attempts += 1
                        if (attempts < 3) {
                            return Promise.reject(new Error(`failed-${attempts}`))
                        }
                        return Promise.resolve()
                    },
                })
            },
            sleep: (delayMs: number): Promise<void> => {
                sleepCalls.push(delayMs)
                return Promise.resolve()
            },
        })

        await manager.connect()

        expect(attempts).toBe(3)
        expect(sleepCalls).toEqual([
            10,
            20,
        ])
    })

    test("health check marks degraded when ping fails for part of pool", async () => {
        let connectionFactoryCalls = 0
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 2,
            connectionFactory: (_options: IRedisConnectionManagerFactoryOptions) => {
                connectionFactoryCalls += 1
                const connectionIndex = connectionFactoryCalls
                return new ScriptedRedisConnection({
                    pingBehavior: (_message?: string): Promise<string> => {
                        if (connectionIndex === 1) {
                            return Promise.resolve("PONG")
                        }
                        return Promise.reject(new Error("ping failed"))
                    },
                })
            },
            now: () => new Date("2026-03-14T21:05:00.000Z"),
        })

        await manager.connect()
        const health = await manager.healthCheck()

        expect(health.status).toBe(WORKER_REDIS_CONNECTION_STATUS.Degraded)
        expect(health.isHealthy).toBe(false)
        expect(health.poolSize).toBe(2)
        expect(health.connectedConnections).toBe(1)
        expect(health.degradedConnections).toBe(1)
        expect(health.lastFailure).toBe("ping failed")
        expect(health.checkedAt).toEqual(new Date("2026-03-14T21:05:00.000Z"))
    })

    test("disconnect closes all connections and resets manager state", async () => {
        const firstConnection = new ScriptedRedisConnection({})
        const secondConnection = new ScriptedRedisConnection({})
        let factoryCalls = 0
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 2,
            connectionFactory: () => {
                factoryCalls += 1
                return factoryCalls === 1 ? firstConnection : secondConnection
            },
            now: () => new Date("2026-03-14T21:10:00.000Z"),
        })

        await manager.connect()
        await manager.disconnect()
        const health = await manager.healthCheck()

        expect(firstConnection.getQuitCalls()).toBe(1)
        expect(secondConnection.getQuitCalls()).toBe(1)
        expect(health).toEqual({
            status: WORKER_REDIS_CONNECTION_STATUS.Disconnected,
            isHealthy: false,
            poolSize: 0,
            connectedConnections: 0,
            degradedConnections: 0,
            lastFailure: null,
            checkedAt: new Date("2026-03-14T21:10:00.000Z"),
        })
    })

    test("resets internal state after connect failure when retries exhausted", async () => {
        let firstAttempt = true
        const manager = new RedisConnectionManager({
            connection: {
                host: "127.0.0.1",
                port: 6379,
            },
            poolSize: 1,
            maxReconnectAttempts: 1,
            connectionFactory: (_options: IRedisConnectionManagerFactoryOptions) => {
                return new ScriptedRedisConnection({
                    connectBehavior: () => {
                        if (firstAttempt) {
                            firstAttempt = false
                            return Promise.reject(new Error("initial failure"))
                        }
                        return Promise.resolve()
                    },
                })
            },
        })

        await expectRejectMessage(manager.connect(), "initial failure")
        await manager.connect()
        const health = await manager.healthCheck()

        expect(health.status).toBe(WORKER_REDIS_CONNECTION_STATUS.Connected)
        expect(health.isHealthy).toBe(true)
    })
})

/**
 * Asserts that promise rejects with expected message.
 *
 * @param promise Promise expected to reject.
 * @param message Expected error message.
 */
async function expectRejectMessage(
    promise: Promise<unknown>,
    message: string,
): Promise<void> {
    try {
        await promise
        throw new Error("Expected promise rejection")
    } catch (error: unknown) {
        if (error instanceof Error) {
            expect(error.message).toBe(message)
            return
        }

        throw error
    }
}
