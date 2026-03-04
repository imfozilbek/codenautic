import {resolve} from "path"

import {
    parseSettingsServiceEnvironment,
    type ISettingsServiceEnvironment,
} from "./settings-env"

/**
 * Runtime section for settings-service configuration.
 */
export interface ISettingsServiceRuntimeConfig {
    nodeEnv: ISettingsServiceEnvironment["nodeEnv"]
    processName: string
}

/**
 * Server section for settings-service configuration.
 */
export interface ISettingsServiceServerConfig {
    host: string
    port: number
    healthcheckEnabled: boolean
}

/**
 * Data source configuration for settings-service.
 */
export interface ISettingsServiceDataConfig {
    defaultsDir: string
    settingsFilePath: string
}

/**
 * Aggregated settings-service configuration.
 */
export interface ISettingsServiceConfig {
    runtime: ISettingsServiceRuntimeConfig
    server: ISettingsServiceServerConfig
    data: ISettingsServiceDataConfig
}

/**
 * Optional override values for settings-service configuration.
 */
export interface ISettingsServiceConfigOverrides {
    runtime?: Partial<ISettingsServiceRuntimeConfig>
    server?: Partial<ISettingsServiceServerConfig>
    data?: Partial<ISettingsServiceDataConfig>
}

/**
 * Loading options for settings-service configuration.
 */
export interface ILoadSettingsServiceConfigOptions {
    env?: Record<string, string | undefined>
    overrides?: ISettingsServiceConfigOverrides
}

/**
 * Error raised when settings-service configuration fails validation.
 */
export class SettingsServiceConfigurationValidationError extends Error {
    /**
     * Creates configuration validation error.
     *
     * @param message Validation diagnostics.
     */
    public constructor(message: string) {
        super(message)
        this.name = "SettingsServiceConfigurationValidationError"
    }
}

/**
 * Loads and validates settings-service configuration from environment.
 *
 * @param options Loading options.
 * @returns Fully validated settings-service configuration.
 */
export function loadSettingsServiceConfig(
    options: ILoadSettingsServiceConfigOptions = {},
): ISettingsServiceConfig {
    const env = parseSettingsServiceEnvironment(options.env ?? process.env)
    const baseConfig = createConfigFromEnvironment(env)
    const mergedConfig = mergeConfig(baseConfig, options.overrides)

    return validateConfig(mergedConfig)
}

/**
 * Settings-service configuration module wrapper.
 */
export class SettingsServiceConfigModule {
    private readonly config: ISettingsServiceConfig

    /**
     * Creates module from preloaded config.
     *
     * @param config Preloaded config.
     */
    public constructor(config: ISettingsServiceConfig) {
        this.config = validateConfig(config)
    }

    /**
     * Creates module from environment source.
     *
     * @param options Loading options.
     * @returns Config module instance.
     */
    public static fromEnvironment(
        options: ILoadSettingsServiceConfigOptions = {},
    ): SettingsServiceConfigModule {
        return new SettingsServiceConfigModule(loadSettingsServiceConfig(options))
    }

    /**
     * Returns full config snapshot.
     *
     * @returns Config copy.
     */
    public getConfig(): ISettingsServiceConfig {
        return cloneConfig(this.config)
    }

    /**
     * Returns runtime config snapshot.
     *
     * @returns Runtime config.
     */
    public getRuntimeConfig(): ISettingsServiceRuntimeConfig {
        return cloneConfig(this.config).runtime
    }

    /**
     * Returns server config snapshot.
     *
     * @returns Server config.
     */
    public getServerConfig(): ISettingsServiceServerConfig {
        return cloneConfig(this.config).server
    }

    /**
     * Returns data config snapshot.
     *
     * @returns Data config.
     */
    public getDataConfig(): ISettingsServiceDataConfig {
        return cloneConfig(this.config).data
    }
}

/**
 * Creates base settings-service config from parsed environment.
 *
 * @param env Parsed settings-service environment.
 * @returns Base config.
 */
function createConfigFromEnvironment(env: ISettingsServiceEnvironment): ISettingsServiceConfig {
    const defaultsDir = resolveDefaultsDir(env.defaultsDir)
    return {
        runtime: {
            nodeEnv: env.nodeEnv,
            processName: "settings-service",
        },
        server: {
            host: env.host,
            port: env.port,
            healthcheckEnabled: env.healthcheckEnabled,
        },
        data: {
            defaultsDir,
            settingsFilePath: resolveSettingsFilePath(defaultsDir, env.filePath),
        },
    }
}

/**
 * Resolves defaults directory path.
 *
 * @param value Optional override path.
 * @returns Absolute path to defaults directory.
 */
function resolveDefaultsDir(value: string | undefined): string {
    if (value !== undefined) {
        return value
    }

    return resolve(import.meta.dir, "../../config/defaults")
}

/**
 * Resolves settings file path from environment or defaults directory.
 *
 * @param defaultsDir Defaults directory path.
 * @param value Optional override path.
 * @returns Absolute path to settings.json.
 */
function resolveSettingsFilePath(defaultsDir: string, value: string | undefined): string {
    if (value !== undefined) {
        return value
    }

    return resolve(defaultsDir, "settings.json")
}

/**
 * Merges overrides into base config.
 *
 * @param baseConfig Base config.
 * @param overrides Optional overrides.
 * @returns Merged config.
 */
function mergeConfig(
    baseConfig: ISettingsServiceConfig,
    overrides: ISettingsServiceConfigOverrides | undefined,
): ISettingsServiceConfig {
    if (overrides === undefined) {
        return baseConfig
    }

    return {
        runtime: {
            ...baseConfig.runtime,
            ...overrides.runtime,
        },
        server: {
            ...baseConfig.server,
            ...overrides.server,
        },
        data: {
            ...baseConfig.data,
            ...overrides.data,
        },
    }
}

/**
 * Validates settings-service config and clones it.
 *
 * @param config Raw config.
 * @returns Validated config copy.
 */
function validateConfig(config: ISettingsServiceConfig): ISettingsServiceConfig {
    if (config.runtime.processName.trim().length === 0) {
        throw new SettingsServiceConfigurationValidationError(
            "Settings-service processName must be non-empty",
        )
    }

    if (config.server.host.trim().length === 0) {
        throw new SettingsServiceConfigurationValidationError(
            "Settings-service host must be non-empty",
        )
    }

    if (Number.isFinite(config.server.port) === false || config.server.port <= 0) {
        throw new SettingsServiceConfigurationValidationError(
            "Settings-service port must be a positive number",
        )
    }

    if (config.data.defaultsDir.trim().length === 0) {
        throw new SettingsServiceConfigurationValidationError(
            "Settings-service defaultsDir must be non-empty",
        )
    }

    if (config.data.settingsFilePath.trim().length === 0) {
        throw new SettingsServiceConfigurationValidationError(
            "Settings-service settingsFilePath must be non-empty",
        )
    }

    return cloneConfig(config)
}

/**
 * Creates deep copy of config values.
 *
 * @param config Config to clone.
 * @returns Cloned config.
 */
function cloneConfig(config: ISettingsServiceConfig): ISettingsServiceConfig {
    return {
        runtime: {
            ...config.runtime,
        },
        server: {
            ...config.server,
        },
        data: {
            ...config.data,
        },
    }
}
