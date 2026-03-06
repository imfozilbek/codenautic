import {isDeepStrictEqual} from "node:util"

import {ValidationError} from "../../../domain/errors/validation.error"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ISystemSettingsRepository} from "../../ports/outbound/common/system-settings-repository.port"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {
    parseSystemSettingConfigList,
    type IConfigSystemSettingItem,
} from "../../dto/config/system-setting-config.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing system settings.
 */
export interface IImportSystemSettingsUseCaseDependencies {
    /**
     * System settings repository port.
     */
    readonly systemSettingsRepository: ISystemSettingsRepository
}

/**
 * Imports system settings from migration payload.
 */
export class ImportSystemSettingsUseCase
    implements IUseCase<readonly IConfigSystemSettingItem[], IImportResult, ValidationError>
{
    private readonly systemSettingsRepository: ISystemSettingsRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportSystemSettingsUseCaseDependencies) {
        this.systemSettingsRepository = dependencies.systemSettingsRepository
    }

    /**
     * Imports system settings with idempotent upsert.
     *
     * @param input System setting items.
     * @returns Import summary.
     */
    public async execute(
        input: readonly IConfigSystemSettingItem[],
    ): Promise<Result<IImportResult, ValidationError>> {
        const normalized = this.validateInput(input)
        if (normalized.isFail) {
            return Result.fail<IImportResult, ValidationError>(normalized.error)
        }

        const items = normalized.value
        let created = 0
        let updated = 0
        let skipped = 0

        for (const item of items) {
            const existing = await this.systemSettingsRepository.findByKey(item.key)
            if (existing === null) {
                await this.systemSettingsRepository.upsert({
                    key: item.key,
                    value: item.value,
                })
                created += 1
                continue
            }

            if (this.isValueUnchanged(existing.value, item.value)) {
                skipped += 1
                continue
            }

            await this.systemSettingsRepository.upsert({
                key: item.key,
                value: item.value,
            })
            updated += 1
        }

        return Result.ok<IImportResult, ValidationError>({
            total: items.length,
            created,
            updated,
            skipped,
            failed: 0,
        })
    }

    /**
     * Validates and normalizes import payload.
     *
     * @param input Raw payload.
     * @returns Normalized system settings or validation error.
     */
    private validateInput(
        input: unknown,
    ): Result<readonly IConfigSystemSettingItem[], ValidationError> {
        if (Array.isArray(input) === false) {
            return Result.fail<readonly IConfigSystemSettingItem[], ValidationError>(
                new ValidationError("Import system settings validation failed", [{
                    field: "items",
                    message: "must be an array",
                }]),
            )
        }

        const parsed = parseSystemSettingConfigList({items: input})
        if (parsed === undefined) {
            return Result.fail<readonly IConfigSystemSettingItem[], ValidationError>(
                new ValidationError("Import system settings validation failed", [{
                    field: "items",
                    message: "contains invalid system setting payload",
                }]),
            )
        }

        return Result.ok<readonly IConfigSystemSettingItem[], ValidationError>(parsed)
    }

    private isValueUnchanged(left: unknown, right: unknown): boolean {
        return isDeepStrictEqual(left, right)
    }
}
