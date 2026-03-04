import {z} from "zod"

/**
 * Supported runtime environment modes for settings-service process.
 */
export const SETTINGS_SERVICE_NODE_ENV = {
    DEVELOPMENT: "development",
    TEST: "test",
    PRODUCTION: "production",
} as const

/**
 * Parsed settings-service environment configuration.
 */
export interface ISettingsServiceEnvironment {
    nodeEnv: (typeof SETTINGS_SERVICE_NODE_ENV)[keyof typeof SETTINGS_SERVICE_NODE_ENV]
    host: string
    port: number
    healthcheckEnabled: boolean
    defaultsDir?: string
    filePath?: string
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

const settingsServiceEnvironmentSchema = z.object({
    NODE_ENV: z.enum([
        SETTINGS_SERVICE_NODE_ENV.DEVELOPMENT,
        SETTINGS_SERVICE_NODE_ENV.TEST,
        SETTINGS_SERVICE_NODE_ENV.PRODUCTION,
    ]),
    SETTINGS_SERVICE_HOST: z.string().min(1).optional().default("0.0.0.0"),
    SETTINGS_SERVICE_PORT: portSchema.optional().default(3040),
    SETTINGS_SERVICE_HEALTHCHECK_ENABLED: booleanFromStringSchema.optional().default(true),
    SETTINGS_SERVICE_DEFAULTS_DIR: z.string().min(1).optional(),
    SETTINGS_SERVICE_FILE_PATH: z.string().min(1).optional(),
})

/**
 * Error raised when settings-service environment validation fails.
 */
export class SettingsServiceEnvironmentValidationError extends Error {
    /**
     * Creates validation error.
     *
     * @param message Validation diagnostics.
     */
    public constructor(message: string) {
        super(message)
        this.name = "SettingsServiceEnvironmentValidationError"
    }
}

/**
 * Parses and validates environment variables for settings-service runtime.
 *
 * @param input Environment source.
 * @returns Validated settings-service environment.
 * @throws SettingsServiceEnvironmentValidationError When input is invalid.
 */
export function parseSettingsServiceEnvironment(
    input: Record<string, string | undefined>,
): ISettingsServiceEnvironment {
    const parsed = settingsServiceEnvironmentSchema.safeParse(input)

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

        throw new SettingsServiceEnvironmentValidationError(
            `Settings-service environment validation failed: ${diagnostics}`,
        )
    }

    return {
        nodeEnv: parsed.data.NODE_ENV,
        host: parsed.data.SETTINGS_SERVICE_HOST,
        port: parsed.data.SETTINGS_SERVICE_PORT,
        healthcheckEnabled: parsed.data.SETTINGS_SERVICE_HEALTHCHECK_ENABLED,
        defaultsDir: parsed.data.SETTINGS_SERVICE_DEFAULTS_DIR,
        filePath: parsed.data.SETTINGS_SERVICE_FILE_PATH,
    }
}
