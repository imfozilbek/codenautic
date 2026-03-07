import {describe, expect, test} from "bun:test"

import {
    API_NODE_ENV,
    ApiEnvironmentValidationError,
    parseApiEnvironment,
} from "../../../src/api/config/api-env"

describe("parseApiEnvironment", () => {
    test("parses required variables and applies optional defaults", () => {
        const environment = parseApiEnvironment({
            NODE_ENV: API_NODE_ENV.TEST,
            ADMIN_API_KEY: "secret-key",
            MONGODB_URI: "mongodb://localhost:27017/codenautic",
            REDIS_URL: "redis://localhost:6379",
        })

        expect(environment).toEqual({
            nodeEnv: API_NODE_ENV.TEST,
            adminApiKey: "secret-key",
            mongodbUri: "mongodb://localhost:27017/codenautic",
            redisUrl: "redis://localhost:6379",
            host: "0.0.0.0",
            port: 3000,
            healthcheckEnabled: true,
        })
    })

    test("parses optional variables when explicitly provided", () => {
        const environment = parseApiEnvironment({
            NODE_ENV: API_NODE_ENV.PRODUCTION,
            ADMIN_API_KEY: "admin-token",
            MONGODB_URI: "mongodb://mongo:27017/runtime",
            REDIS_URL: "redis://redis:6379",
            API_HOST: "127.0.0.1",
            API_PORT: "8080",
            API_HEALTHCHECK_ENABLED: "false",
        })

        expect(environment.host).toBe("127.0.0.1")
        expect(environment.port).toBe(8080)
        expect(environment.healthcheckEnabled).toBe(false)
        expect(environment.nodeEnv).toBe(API_NODE_ENV.PRODUCTION)
    })

    test("fails fast with diagnostics for missing required variable", () => {
        expect(() => {
            parseApiEnvironment({
                NODE_ENV: API_NODE_ENV.DEVELOPMENT,
                MONGODB_URI: "mongodb://localhost:27017/runtime",
                REDIS_URL: "redis://localhost:6379",
            })
        }).toThrow(ApiEnvironmentValidationError)

        try {
            parseApiEnvironment({
                NODE_ENV: API_NODE_ENV.DEVELOPMENT,
                MONGODB_URI: "mongodb://localhost:27017/runtime",
                REDIS_URL: "redis://localhost:6379",
            })
            throw new Error("Expected parseApiEnvironment to throw")
        } catch (error: unknown) {
            expect(error instanceof ApiEnvironmentValidationError).toBe(true)
            if (error instanceof ApiEnvironmentValidationError) {
                expect(error.message.includes("ADMIN_API_KEY")).toBe(true)
            }
        }
    })

    test("fails fast for invalid optional values", () => {
        expect(() => {
            parseApiEnvironment({
                NODE_ENV: API_NODE_ENV.TEST,
                ADMIN_API_KEY: "key",
                MONGODB_URI: "mongodb://localhost:27017/runtime",
                REDIS_URL: "redis://localhost:6379",
                API_PORT: "70000",
            })
        }).toThrow(ApiEnvironmentValidationError)

        expect(() => {
            parseApiEnvironment({
                NODE_ENV: API_NODE_ENV.TEST,
                ADMIN_API_KEY: "key",
                MONGODB_URI: "mongodb://localhost:27017/runtime",
                REDIS_URL: "redis://localhost:6379",
                API_HEALTHCHECK_ENABLED: "yes",
            })
        }).toThrow(ApiEnvironmentValidationError)
    })

    test("uses fallback diagnostics when issue path is empty", () => {
        expect(() => {
            parseApiEnvironment(undefined as unknown as Record<string, string | undefined>)
        }).toThrow(ApiEnvironmentValidationError)

        try {
            parseApiEnvironment(undefined as unknown as Record<string, string | undefined>)
            throw new Error("Expected parseApiEnvironment to throw")
        } catch (error: unknown) {
            expect(error instanceof ApiEnvironmentValidationError).toBe(true)
            if (error instanceof ApiEnvironmentValidationError) {
                expect(error.message.length > 0).toBe(true)
            }
        }
    })
})
