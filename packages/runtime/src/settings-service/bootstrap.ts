import {NestFactory} from "@nestjs/core"

import {
    SettingsServiceConfigModule,
    type ISettingsServiceConfig,
    type ISettingsServiceConfigOverrides,
} from "./config/settings-config.module"
import {SettingsModule} from "./settings.module"

/**
 * Settings-service runtime object returned after successful startup.
 */
export interface ISettingsServiceRuntime {
    config: ISettingsServiceConfig
    stop(): Promise<void>
}

/**
 * Startup options for settings-service runtime.
 */
export interface IStartSettingsServiceOptions {
    env?: Record<string, string | undefined>
    configOverrides?: ISettingsServiceConfigOverrides
}

/**
 * Starts settings-service runtime with validated environment.
 *
 * @param options Optional startup overrides.
 * @returns Running settings-service runtime handle.
 */
export async function startSettingsService(
    options: IStartSettingsServiceOptions = {},
): Promise<ISettingsServiceRuntime> {
    const configModule = SettingsServiceConfigModule.fromEnvironment({
        env: options.env,
        overrides: options.configOverrides,
    })
    const config = configModule.getConfig()

    const app = await NestFactory.create(SettingsModule.forRoot(config), {
        logger: false,
    })

    await app.listen(config.server.port, config.server.host)

    return {
        config,
        stop(): Promise<void> {
            return app.close()
        },
    }
}
