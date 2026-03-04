import {z} from "zod"

/**
 * Parsed settings-service client environment configuration.
 */
export interface ISettingsServiceClientEnvironment {
    baseUrl?: string
    host?: string
    port?: number
    timeoutMs: number
}

const portSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)

const settingsClientEnvironmentSchema = z.object({
    SETTINGS_SERVICE_BASE_URL: z.string().min(1).optional(),
    SETTINGS_SERVICE_HOST: z.string().min(1).optional(),
    SETTINGS_SERVICE_PORT: portSchema.optional(),
    SETTINGS_SERVICE_TIMEOUT_MS: z.coerce.number().int().min(100).optional().default(5_000),
})

/**
 * Error raised when settings-service client environment validation fails.
 */
export class SettingsServiceClientEnvironmentValidationError extends Error {
    /**
     * Creates validation error.
     *
     * @param message Validation diagnostics.
     */
    public constructor(message: string) {
        super(message)
        this.name = "SettingsServiceClientEnvironmentValidationError"
    }
}

/**
 * Parses and validates environment variables for settings-service client.
 *
 * @param input Environment source.
 * @returns Validated settings-service client environment.
 * @throws SettingsServiceClientEnvironmentValidationError When input is invalid.
 */
export function parseSettingsServiceClientEnvironment(
    input: Record<string, string | undefined>,
): ISettingsServiceClientEnvironment {
    const parsed = settingsClientEnvironmentSchema.safeParse(input)

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

        throw new SettingsServiceClientEnvironmentValidationError(
            `Settings-service client environment validation failed: ${diagnostics}`,
        )
    }

    return {
        baseUrl: parsed.data.SETTINGS_SERVICE_BASE_URL,
        host: parsed.data.SETTINGS_SERVICE_HOST,
        port: parsed.data.SETTINGS_SERVICE_PORT,
        timeoutMs: parsed.data.SETTINGS_SERVICE_TIMEOUT_MS,
    }
}
