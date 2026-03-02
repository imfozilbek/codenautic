import {describe, expect, test} from "bun:test"
import mongoose from "mongoose"
import type {Connection} from "mongoose"

import {
    DATABASE_ADAPTER_ERROR_CODE,
    MongoConnectionManager,
} from "../../src/database"

interface IConnectionStub {
    readyState: number
    close: () => Promise<void>
}

interface IConnectionStubOptions {
    closeError?: Error
}

interface IConnectionStubHandle {
    readonly connection: Connection
    readonly closeCalls: () => number
}

interface IMongooseCreateConnectionReturn {
    asPromise: () => Promise<Connection>
}

interface IMongooseMutable {
    createConnection: (uri: string, options?: object) => IMongooseCreateConnectionReturn
}

/**
 * Creates connection stub with mutable close counter.
 *
 * @param options Stub behavior options.
 * @returns Handle with mongoose-compatible connection and counters.
 */
function createConnectionStub(options: IConnectionStubOptions = {}): IConnectionStubHandle {
    let closeCalls = 0
    const stub: IConnectionStub = {
        readyState: 1,
        close: (): Promise<void> => {
            closeCalls += 1
            if (options.closeError !== undefined) {
                return Promise.reject(options.closeError)
            }

            stub.readyState = 0
            return Promise.resolve()
        },
    }

    return {
        connection: stub as unknown as Connection,
        closeCalls: (): number => closeCalls,
    }
}

describe("MongoConnectionManager", () => {
    test("throws when uri is empty", () => {
        expect(() => {
            new MongoConnectionManager(" ")
        }).toThrow("mongo connection uri must be a non-empty string")
    })

    test("connects successfully and exposes active connection", async () => {
        const stub = createConnectionStub()
        let capturedUri = ""
        let createCalls = 0
        const mongooseMutable = mongoose as unknown as IMongooseMutable
        const originalCreateConnection = mongooseMutable.createConnection

        mongooseMutable.createConnection = (
            uri: string,
        ): IMongooseCreateConnectionReturn => {
            createCalls += 1
            capturedUri = uri
            return {
                asPromise: (): Promise<Connection> => {
                    return Promise.resolve(stub.connection)
                },
            }
        }

        let connectResult: Awaited<ReturnType<MongoConnectionManager["connect"]>> | undefined
        try {
            const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic")
            connectResult = await manager.connect()
            expect(manager.isConnected()).toBe(true)
        } finally {
            mongooseMutable.createConnection = originalCreateConnection
        }

        if (connectResult === undefined) {
            throw new Error("Expected connect result")
        }
        expect(connectResult.isOk).toBe(true)
        if (connectResult.isFail) {
            throw new Error("Expected successful connection")
        }

        expect(connectResult.value).toBe(stub.connection)
        expect(capturedUri).toBe("mongodb://localhost:27017/codenautic")
        expect(createCalls).toBe(1)
    })

    test("does not reconnect when connection is already established", async () => {
        const stub = createConnectionStub()
        let createCalls = 0
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic", {
            createConnectionFn: (): Promise<Connection> => {
                createCalls += 1
                return Promise.resolve(stub.connection)
            },
        })

        const first = await manager.connect()
        const second = await manager.connect()

        expect(first.isOk).toBe(true)
        expect(second.isOk).toBe(true)
        expect(createCalls).toBe(1)
    })

    test("returns connection failure when connector throws", async () => {
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic", {
            createConnectionFn: (): Promise<Connection> => {
                return Promise.reject(new Error("database unavailable"))
            },
        })

        const result = await manager.connect()

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected failed connection")
        }

        expect(result.error.code).toBe(DATABASE_ADAPTER_ERROR_CODE.CONNECTION_FAILED)
        expect(result.error.retryable).toBe(true)
    })

    test("getConnection fails when manager is not connected", () => {
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic")

        const result = manager.getConnection()

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected connection lookup failure")
        }

        expect(result.error.code).toBe(DATABASE_ADAPTER_ERROR_CODE.NOT_CONNECTED)
    })

    test("getConnection returns active connection after connect", async () => {
        const stub = createConnectionStub()
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic", {
            createConnectionFn: (): Promise<Connection> => {
                return Promise.resolve(stub.connection)
            },
        })

        await manager.connect()
        const result = manager.getConnection()

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected active connection")
        }

        expect(result.value).toBe(stub.connection)
    })

    test("disconnect closes active connection and resets state", async () => {
        const stub = createConnectionStub()
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic", {
            createConnectionFn: (): Promise<Connection> => {
                return Promise.resolve(stub.connection)
            },
        })

        await manager.connect()
        const result = await manager.disconnect()

        expect(result.isOk).toBe(true)
        expect(stub.closeCalls()).toBe(1)
        expect(manager.isConnected()).toBe(false)
        expect(manager.getConnection().isFail).toBe(true)
    })

    test("disconnect succeeds when there is no active connection", async () => {
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic")

        const result = await manager.disconnect()

        expect(result.isOk).toBe(true)
    })

    test("disconnect returns failure when close throws", async () => {
        const stub = createConnectionStub({
            closeError: new Error("close failed"),
        })
        const manager = new MongoConnectionManager("mongodb://localhost:27017/codenautic", {
            createConnectionFn: (): Promise<Connection> => {
                return Promise.resolve(stub.connection)
            },
        })

        await manager.connect()
        const result = await manager.disconnect()

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected failed disconnect")
        }

        expect(result.error.code).toBe(DATABASE_ADAPTER_ERROR_CODE.DISCONNECTION_FAILED)
        expect(result.error.retryable).toBe(true)
        expect(manager.isConnected()).toBe(true)
    })
})
