import {describe, expect, test} from "bun:test"
import mongoose from "mongoose"

import {
    createMongoConnectionManager,
    DEFAULT_MONGO_CONNECTION_RETRY_POLICY,
    MongoConnectionError,
    MongoWriteBlockedError,
    type IMongoConnector,
} from "../../../src/api/database/mongo-connection"

class ScriptedMongoConnector implements IMongoConnector {
    public connectCalls: number
    public disconnectCalls: number
    private readonly connectScript: readonly (Error | null)[]

    public constructor(connectScript: readonly (Error | null)[]) {
        this.connectCalls = 0
        this.disconnectCalls = 0
        this.connectScript = connectScript
    }

    public connect(_uri: string): Promise<void> {
        const scripted = this.connectScript[this.connectCalls]
        this.connectCalls += 1

        if (scripted !== undefined && scripted !== null) {
            return Promise.reject(scripted)
        }

        return Promise.resolve()
    }

    public disconnect(): Promise<void> {
        this.disconnectCalls += 1
        return Promise.resolve()
    }
}

describe("createMongoConnectionManager", () => {
    test("connects on first attempt and sets ready", async () => {
        const connector = new ScriptedMongoConnector([null])
        const delays: number[] = []

        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
            sleep: (ms): Promise<void> => {
                delays.push(ms)
                return Promise.resolve()
            },
        })

        await manager.connect()

        expect(manager.isReady()).toBe(true)
        expect(connector.connectCalls).toBe(1)
        expect(delays).toHaveLength(0)
        expect(manager.getReadiness().lastError).toBeNull()
    })

    test("retries with backoff before successful connection", async () => {
        const connector = new ScriptedMongoConnector([
            new Error("attempt-1"),
            new Error("attempt-2"),
            null,
        ])
        const delays: number[] = []

        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
            sleep: (ms): Promise<void> => {
                delays.push(ms)
                return Promise.resolve()
            },
            retryPolicy: {
                maxAttempts: 4,
                initialDelayMs: 10,
                maxDelayMs: 25,
                backoffFactor: 2,
            },
        })

        await manager.connect()

        expect(connector.connectCalls).toBe(3)
        expect(manager.isReady()).toBe(true)
        expect(delays).toEqual([10, 20])
    })

    test("throws terminal connection error after max attempts", async () => {
        const connector = new ScriptedMongoConnector([
            new Error("offline-1"),
            new Error("offline-2"),
            new Error("offline-3"),
        ])
        const delays: number[] = []

        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
            sleep: (ms): Promise<void> => {
                delays.push(ms)
                return Promise.resolve()
            },
            retryPolicy: {
                maxAttempts: 3,
                initialDelayMs: 5,
                maxDelayMs: 100,
                backoffFactor: 2,
            },
        })

        let caughtError: unknown
        try {
            await manager.connect()
        } catch (error: unknown) {
            caughtError = error
        }

        expect(caughtError).toBeInstanceOf(MongoConnectionError)
        expect(manager.isReady()).toBe(false)
        expect(manager.getReadiness().lastError).toBe("offline-3")
        expect(delays).toEqual([5, 10])
    })

    test("blocks writes when connection is not ready", () => {
        const connector = new ScriptedMongoConnector([])
        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
        })

        expect(() => {
            manager.assertWriteAllowed()
        }).toThrow(MongoWriteBlockedError)
    })

    test("allows writes after connect and clears readiness on disconnect", async () => {
        const connector = new ScriptedMongoConnector([null])
        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
        })

        await manager.connect()
        expect(() => {
            manager.assertWriteAllowed()
        }).not.toThrow()

        await manager.disconnect()
        expect(connector.disconnectCalls).toBe(1)
        expect(manager.isReady()).toBe(false)
    })

    test("uses default retry policy when policy is omitted", () => {
        const connector = new ScriptedMongoConnector([])
        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
        })

        expect(manager.getRetryPolicy()).toEqual(DEFAULT_MONGO_CONNECTION_RETRY_POLICY)
    })

    test("uses default sleep helper when retrying without custom sleep", async () => {
        const connector = new ScriptedMongoConnector([new Error("temporary"), null])
        const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
            connector,
            retryPolicy: {
                maxAttempts: 2,
                initialDelayMs: 0,
                maxDelayMs: 0,
                backoffFactor: 2,
            },
        })

        await manager.connect()

        expect(connector.connectCalls).toBe(2)
        expect(manager.isReady()).toBe(true)
    })

    test("uses default mongoose connector when connector is omitted", async () => {
        interface IMongooseMutable {
            connect(uri: string): Promise<void>
            disconnect(): Promise<void>
        }

        const mongooseMutable = mongoose as unknown as IMongooseMutable
        const originalConnect = mongooseMutable.connect.bind(mongooseMutable)
        const originalDisconnect = mongooseMutable.disconnect.bind(mongooseMutable)

        const connectUris: string[] = []
        let disconnectCalls = 0

        mongooseMutable.connect = (uri: string): Promise<void> => {
            connectUris.push(uri)
            return Promise.resolve()
        }
        mongooseMutable.disconnect = (): Promise<void> => {
            disconnectCalls += 1
            return Promise.resolve()
        }

        try {
            const manager = createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
                retryPolicy: {
                    maxAttempts: 1,
                    initialDelayMs: 0,
                    maxDelayMs: 0,
                    backoffFactor: 2,
                },
            })

            await manager.connect()
            await manager.disconnect()
        } finally {
            mongooseMutable.connect = originalConnect
            mongooseMutable.disconnect = originalDisconnect
        }

        expect(connectUris).toEqual(["mongodb://localhost:27017/codenautic"])
        expect(disconnectCalls).toBe(1)
    })

    test("validates connection uri and retry policy", () => {
        const connector = new ScriptedMongoConnector([])

        expect(() => {
            createMongoConnectionManager("", {connector})
        }).toThrow("mongodb uri must be a non-empty string")

        expect(() => {
            createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
                connector,
                retryPolicy: {
                    maxAttempts: 0,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffFactor: 2,
                },
            })
        }).toThrow("maxAttempts must be a positive integer")

        expect(() => {
            createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
                connector,
                retryPolicy: {
                    maxAttempts: 3,
                    initialDelayMs: -1,
                    maxDelayMs: 100,
                    backoffFactor: 2,
                },
            })
        }).toThrow("initialDelayMs must be greater than or equal to zero")

        expect(() => {
            createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
                connector,
                retryPolicy: {
                    maxAttempts: 3,
                    initialDelayMs: 10,
                    maxDelayMs: -1,
                    backoffFactor: 2,
                },
            })
        }).toThrow("maxDelayMs must be greater than or equal to zero")

        expect(() => {
            createMongoConnectionManager("mongodb://localhost:27017/codenautic", {
                connector,
                retryPolicy: {
                    maxAttempts: 3,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffFactor: 0,
                },
            })
        }).toThrow("backoffFactor must be greater than or equal to 1")
    })
})
