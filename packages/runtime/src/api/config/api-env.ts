import {z} from "zod"

/**
 * Supported runtime environment modes for API process.
 */
export const API_NODE_ENV = {
    DEVELOPMENT: "development",
    TEST: "test",
    PRODUCTION: "production",
} as const

/**
 * Parsed API environment configuration.
 */
export interface IApiEnvironment {
    nodeEnv: (typeof API_NODE_ENV)[keyof typeof API_NODE_ENV]
    adminApiKey: string
    mongodbUri: string
    redisUrl: string
    host: string
    port: number
    healthcheckEnabled: boolean
}

const booleanFromStringSchema = z
    .enum(["true", "false"])
    .transform((value) => {
        return value === "true"
    })

const portSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)

const apiEnvironmentSchema = z.object({
    NODE_ENV: z.enum([API_NODE_ENV.DEVELOPMENT, API_NODE_ENV.TEST, API_NODE_ENV.PRODUCTION]),
    ADMIN_API_KEY: z.string().min(1),
    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),
    API_HOST: z.string().min(1).optional().default("0.0.0.0"),
    API_PORT: portSchema.optional().default(3000),
    API_HEALTHCHECK_ENABLED: booleanFromStringSchema.optional().default(true),
})

/**
 * Error raised when API environment validation fails.
 */
export class ApiEnvironmentValidationError extends Error {
    /**
     * Creates validation error.
     *
     * @param message Validation diagnostics.
     */
    public constructor(message: string) {
        super(message)
        this.name = "ApiEnvironmentValidationError"
    }
}

/**
 * Parses and validates environment variables for API runtime.
 *
 * @param input Environment source.
 * @returns Validated API environment.
 * @throws ApiEnvironmentValidationError When input is invalid.
 */
export function parseApiEnvironment(input: Record<string, string | undefined>): IApiEnvironment {
    const parsed = apiEnvironmentSchema.safeParse(input)

    if (!parsed.success) {
        const diagnostics = parsed.error.issues
            .map((issue) => {
                const key = issue.path[0]
                if (typeof key === "string") {
                    return `${key}: ${issue.message}`
                }

                return issue.message
            })
            .join("; ")

        throw new ApiEnvironmentValidationError(
            `API environment validation failed: ${diagnostics}`,
        )
    }

    return {
        nodeEnv: parsed.data.NODE_ENV,
        adminApiKey: parsed.data.ADMIN_API_KEY,
        mongodbUri: parsed.data.MONGODB_URI,
        redisUrl: parsed.data.REDIS_URL,
        host: parsed.data.API_HOST,
        port: parsed.data.API_PORT,
        healthcheckEnabled: parsed.data.API_HEALTHCHECK_ENABLED,
    }
}
