import {parseSettingsServiceClientEnvironment, type ISettingsServiceClientEnvironment} from "./settings-client-env"

/**
 * Settings-service client configuration.
 */
export interface ISettingsServiceClientConfig {
    baseUrl: string
    timeoutMs: number
}

/**
 * Optional overrides for settings-service client configuration.
 */
export interface ISettingsServiceClientConfigOverrides {
    baseUrl?: string
    timeoutMs?: number
}

/**
 * Loading options for settings-service client configuration.
 */
export interface ILoadSettingsServiceClientConfigOptions {
    env?: Record<string, string | undefined>
    overrides?: ISettingsServiceClientConfigOverrides
}

/**
 * Error raised when settings-service client configuration fails validation.
 */
export class SettingsServiceClientConfigurationValidationError extends Error {
    /**
     * Creates configuration validation error.
     *
     * @param message Validation diagnostics.
     */
    public constructor(message: string) {
        super(message)
        this.name = "SettingsServiceClientConfigurationValidationError"
    }
}

/**
 * Loads and validates settings-service client configuration from environment.
 *
 * @param options Loading options.
 * @returns Fully validated settings-service client configuration.
 */
export function loadSettingsServiceClientConfig(
    options: ILoadSettingsServiceClientConfigOptions = {},
): ISettingsServiceClientConfig {
    const env = parseSettingsServiceClientEnvironment(options.env ?? process.env)
    const baseConfig = createConfigFromEnvironment(env)
    const mergedConfig = mergeConfig(baseConfig, options.overrides)

    return validateConfig(mergedConfig)
}

/**
 * Settings-service client configuration module wrapper.
 */
export class SettingsServiceClientConfigModule {
    private readonly config: ISettingsServiceClientConfig

    /**
     * Creates module from preloaded config.
     *
     * @param config Preloaded config.
     */
    public constructor(config: ISettingsServiceClientConfig) {
        this.config = validateConfig(config)
    }

    /**
     * Creates module from environment source.
     *
     * @param options Loading options.
     * @returns Config module instance.
     */
    public static fromEnvironment(
        options: ILoadSettingsServiceClientConfigOptions = {},
    ): SettingsServiceClientConfigModule {
        return new SettingsServiceClientConfigModule(loadSettingsServiceClientConfig(options))
    }

    /**
     * Returns full config snapshot.
     *
     * @returns Config copy.
     */
    public getConfig(): ISettingsServiceClientConfig {
        return cloneConfig(this.config)
    }
}

function createConfigFromEnvironment(
    env: ISettingsServiceClientEnvironment,
): ISettingsServiceClientConfig {
    return {
        baseUrl: resolveBaseUrl(env),
        timeoutMs: env.timeoutMs,
    }
}

function resolveBaseUrl(env: ISettingsServiceClientEnvironment): string {
    if (env.baseUrl !== undefined) {
        return env.baseUrl
    }

    const host = normalizeHost(env.host ?? "127.0.0.1")
    const port = env.port ?? 3040
    return `http://${host}:${port}`
}

function normalizeHost(value: string): string {
    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed === "0.0.0.0") {
        return "127.0.0.1"
    }

    return trimmed
}

function mergeConfig(
    baseConfig: ISettingsServiceClientConfig,
    overrides: ISettingsServiceClientConfigOverrides | undefined,
): ISettingsServiceClientConfig {
    if (overrides === undefined) {
        return baseConfig
    }

    return {
        baseUrl: overrides.baseUrl ?? baseConfig.baseUrl,
        timeoutMs: overrides.timeoutMs ?? baseConfig.timeoutMs,
    }
}

function validateConfig(config: ISettingsServiceClientConfig): ISettingsServiceClientConfig {
    if (config.baseUrl.trim().length === 0) {
        throw new SettingsServiceClientConfigurationValidationError(
            "Settings-service client baseUrl must be non-empty",
        )
    }

    try {
        void new URL(config.baseUrl)
    } catch {
        throw new SettingsServiceClientConfigurationValidationError(
            "Settings-service client baseUrl must be a valid URL",
        )
    }

    if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
        throw new SettingsServiceClientConfigurationValidationError(
            "Settings-service client timeoutMs must be a positive integer",
        )
    }

    return cloneConfig(config)
}

function cloneConfig(config: ISettingsServiceClientConfig): ISettingsServiceClientConfig {
    return {
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
    }
}
