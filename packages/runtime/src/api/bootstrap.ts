import {
    ApiConfigModule,
    type IApiConfig,
    type IApiConfigOverrides,
} from "./config/api-config.module"
import {
    createMongoConnectionManager,
    type IApiDatabaseConnection,
} from "./database/mongo-connection"
import {type IApiEnvironment} from "./config/api-env"

/**
 * Minimal HTTP server abstraction for API runtime.
 */
export interface IApiServer {
    /**
     * Stops HTTP server.
     */
    stop(): void
}

/**
 * Server factory options.
 */
export interface IApiServerFactoryOptions {
    port: number
    hostname: string
    fetch(request: Request): Response | Promise<Response>
}

/**
 * HTTP server factory abstraction.
 */
export type IApiServerFactory = (options: IApiServerFactoryOptions) => IApiServer

/**
 * API runtime object returned after successful startup.
 */
export interface IApiRuntime {
    environment: IApiEnvironment
    stop(): void
}

/**
 * Startup options for API runtime.
 */
export interface IStartApiOptions {
    env?: Record<string, string | undefined>
    configOverrides?: IApiConfigOverrides
    databaseConnection?: IApiDatabaseConnection
    factory?: IApiServerFactory
}

/**
 * Starts API runtime with validated environment.
 *
 * @param options Optional startup overrides for tests and composition.
 * @returns Running API runtime handle.
 * @throws Error When environment or server factory is invalid.
 */
export function startApi(options: IStartApiOptions = {}): Promise<IApiRuntime> {
    return startApiInternal(options)
}

/**
 * Internal async startup implementation.
 *
 * @param options Startup options.
 * @returns Running API runtime handle.
 */
async function startApiInternal(options: IStartApiOptions): Promise<IApiRuntime> {
    const configModule = ApiConfigModule.fromEnvironment({
        env: options.env,
        overrides: options.configOverrides,
    })
    const config = configModule.getConfig()
    const environment = mapConfigToEnvironment(config)
    const databaseConnection =
        options.databaseConnection ?? createMongoConnectionManager(config.database.mongodbUri)
    await databaseConnection.connect()

    const factory = options.factory ?? bunServerFactory

    const server = factory({
        port: config.server.port,
        hostname: config.server.host,
        fetch(request: Request): Response {
            return handleRequest(request, environment, databaseConnection)
        },
    })

    if (!hasStop(server)) {
        throw new Error("API server factory must return object with stop()")
    }

    return {
        environment,
        stop(): void {
            server.stop()
            void databaseConnection.disconnect()
        },
    }
}

/**
 * Handles API HTTP requests.
 *
 * @param request Incoming request.
 * @param environment Validated API environment.
 * @returns HTTP response.
 */
function handleRequest(
    request: Request,
    environment: IApiEnvironment,
    databaseConnection: IApiDatabaseConnection,
): Response {
    const url = new URL(request.url)

    if (url.pathname === "/health" && environment.healthcheckEnabled === true) {
        if (!databaseConnection.isReady()) {
            return Response.json(
                {
                    status: "not_ready",
                },
                {
                    status: 503,
                },
            )
        }

        return Response.json({
            status: "ok",
        })
    }

    if (isWriteMethod(request.method) && !databaseConnection.isReady()) {
        return Response.json(
            {
                status: "database_unavailable",
            },
            {
                status: 503,
            },
        )
    }

    return new Response("Not Found", {
        status: 404,
    })
}

/**
 * Maps API config to environment shape kept for runtime compatibility.
 *
 * @param config API configuration.
 * @returns Environment-like runtime structure.
 */
function mapConfigToEnvironment(config: IApiConfig): IApiEnvironment {
    return {
        nodeEnv: config.runtime.nodeEnv,
        adminApiKey: config.security.adminApiKey,
        mongodbUri: config.database.mongodbUri,
        redisUrl: config.cache.redisUrl,
        host: config.server.host,
        port: config.server.port,
        healthcheckEnabled: config.server.healthcheckEnabled,
    }
}

/**
 * Determines whether HTTP method is write-oriented.
 *
 * @param method HTTP method.
 * @returns True for write methods.
 */
function isWriteMethod(method: string): boolean {
    return (
        method === "POST" ||
        method === "PUT" ||
        method === "PATCH" ||
        method === "DELETE"
    )
}

/**
 * Default Bun HTTP server factory.
 *
 * @param options Server options.
 * @returns Bun server instance.
 */
function bunServerFactory(options: IApiServerFactoryOptions): IApiServer {
    return Bun.serve({
        port: options.port,
        hostname: options.hostname,
        fetch(request: Request): Response | Promise<Response> {
            return options.fetch(request)
        },
    })
}

/**
 * Runtime guard for server stop capability.
 *
 * @param value Unknown server value.
 * @returns True when value has stop() function.
 */
function hasStop(value: unknown): value is IApiServer {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const candidate = value as Record<string, unknown>
    const stopMethod = Reflect.get(candidate, "stop")
    return typeof stopMethod === "function"
}
