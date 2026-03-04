import {
    BadRequestException,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
} from "@nestjs/common"

import type {ISettingsServiceConfig} from "./config/settings-config.module"
import {SETTINGS_SERVICE_CONFIG_TOKEN} from "./settings.tokens"
import {SettingsService, type ISettingItem, type ISettingsSnapshot} from "./settings.service"

interface IHealthStatus {
    status: string
}

/**
 * HTTP controller for settings-service.
 */
@Controller()
export class SettingsController {
    private readonly settingsService: SettingsService
    private readonly config: ISettingsServiceConfig

    /**
     * Creates settings controller.
     *
     * @param settingsService Settings service.
     * @param config Settings-service configuration.
     */
    public constructor(
        settingsService: SettingsService,
        @Inject(SETTINGS_SERVICE_CONFIG_TOKEN)
        config: ISettingsServiceConfig,
    ) {
        this.settingsService = settingsService
        this.config = config
    }

    /**
     * Health check endpoint.
     *
     * @returns Health status.
     */
    @Get("/health")
    public getHealth(): IHealthStatus {
        if (this.config.server.healthcheckEnabled === false) {
            throw new NotFoundException()
        }

        return {
            status: "ok",
        }
    }

    /**
     * Returns all settings.
     *
     * @returns Settings snapshot.
     */
    @Get("/settings")
    public async getSettings(): Promise<ISettingsSnapshot> {
        return this.settingsService.getAll()
    }

    /**
     * Returns setting by key.
     *
     * @param key Setting key.
     * @returns Setting item.
     */
    @Get("/settings/:key")
    public async getSetting(@Param("key") key: string): Promise<ISettingItem> {
        const normalizedKey = key.trim()
        if (normalizedKey.length === 0) {
            throw new BadRequestException("Setting key cannot be empty")
        }

        const item = await this.settingsService.getByKey(normalizedKey)
        if (item === undefined) {
            throw new NotFoundException("Setting key not found")
        }

        return item
    }
}
