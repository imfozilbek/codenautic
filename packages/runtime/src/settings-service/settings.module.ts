import {type DynamicModule, Module} from "@nestjs/common"

import type {ISettingsServiceConfig} from "./config/settings-config.module"
import {SettingsController} from "./settings.controller"
import {SettingsService} from "./settings.service"
import {SETTINGS_SERVICE_CONFIG_TOKEN} from "./settings.tokens"

/**
 * Root module for settings-service.
 */
@Module({})
export class SettingsModule {
    /**
     * Creates module with injected configuration.
     *
     * @param config Settings-service configuration.
     * @returns Module definition.
     */
    public static forRoot(config: ISettingsServiceConfig): DynamicModule {
        return {
            module: SettingsModule,
            controllers: [SettingsController],
            providers: [
                SettingsService,
                {
                    provide: SETTINGS_SERVICE_CONFIG_TOKEN,
                    useValue: config,
                },
            ],
        }
    }
}
