import {ValidationError} from "../../../domain/errors/validation.error"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ISystemSettingsWriter} from "../../ports/outbound/common/system-settings-writer.port"
import type {IImportResult} from "../../dto/common/import-result.dto"
import {
    parseSystemSettingConfigList,
    type IConfigSystemSettingItem,
} from "../../dto/config/system-setting-config.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for importing default system settings.
 */
export interface IImportDefaultSystemSettingsUseCaseDependencies {
    /**
     * System settings writer port.
     */
    readonly systemSettingsWriter: ISystemSettingsWriter
}

/**
 * Imports default system settings from settings-service payload.
 */
export class ImportDefaultSystemSettingsUseCase
    implements IUseCase<readonly IConfigSystemSettingItem[], IImportResult, ValidationError>
{
    private readonly systemSettingsWriter: ISystemSettingsWriter

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IImportDefaultSystemSettingsUseCaseDependencies) {
        this.systemSettingsWriter = dependencies.systemSettingsWriter
    }

    /**
     * Imports system settings.
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
        let skipped = 0

        for (const item of items) {
            const exists = await this.systemSettingsWriter.has(item.key)
            if (exists) {
                skipped += 1
                continue
            }

            await this.systemSettingsWriter.save({
                key: item.key,
                value: item.value,
            })
            created += 1
        }

        return Result.ok<IImportResult, ValidationError>({
            total: items.length,
            created,
            updated: 0,
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
}
