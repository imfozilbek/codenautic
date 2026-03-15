import type {
    IAdminConfigSnapshot,
    IAdminConfigValues,
} from "@/lib/api/endpoints/admin-config.endpoint"

/**
 * Данные для seed-инициализации AdminConfigCollection.
 */
export interface IAdminConfigSeedData {
    /**
     * Начальный снимок конфигурации.
     */
    readonly config: IAdminConfigSnapshot
}

/**
 * Результат попытки обновления конфига.
 */
export type TAdminConfigUpdateResult =
    | {
          /**
           * Обновление прошло успешно.
           */
          readonly success: true
          /**
           * Обновлённый снимок.
           */
          readonly config: IAdminConfigSnapshot
      }
    | {
          /**
           * Обновление отклонено из-за конфликта ETag.
           */
          readonly success: false
          /**
           * Текущий серверный снимок.
           */
          readonly serverConfig: IAdminConfigSnapshot
      }

/**
 * Коллекция admin config для mock API.
 *
 * Хранит конфигурацию с ETag и реализует optimistic concurrency control:
 * обновление отклоняется если переданный ETag не совпадает с текущим.
 */
export class AdminConfigCollection {
    /**
     * Текущий снимок конфигурации.
     */
    private config: IAdminConfigSnapshot = {
        etag: 1,
        values: {
            ignorePaths: "",
            requireReviewerApproval: false,
            severityThreshold: "medium",
        },
    }

    /**
     * Возвращает текущий снимок конфигурации.
     *
     * @returns Копия текущего снимка.
     */
    public getConfig(): IAdminConfigSnapshot {
        return { ...this.config, values: { ...this.config.values } }
    }

    /**
     * Возвращает текущий ETag.
     *
     * @returns Текущее значение ETag.
     */
    public getEtag(): number {
        return this.config.etag
    }

    /**
     * Пытается обновить конфигурацию с проверкой ETag.
     *
     * Если переданный ETag совпадает с текущим, обновляет конфиг и инкрементирует ETag.
     * Если не совпадает — возвращает текущий серверный снимок для разрешения конфликта.
     *
     * @param values - Новые значения конфига.
     * @param ifMatchEtag - ETag для If-Match проверки.
     * @returns Результат обновления (успех или конфликт).
     */
    public updateConfig(
        values: IAdminConfigValues,
        ifMatchEtag: number,
    ): TAdminConfigUpdateResult {
        if (ifMatchEtag !== this.config.etag) {
            return {
                success: false,
                serverConfig: this.getConfig(),
            }
        }

        this.config = {
            etag: this.config.etag + 1,
            values: { ...values },
        }

        return {
            success: true,
            config: this.getConfig(),
        }
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: IAdminConfigSeedData): void {
        this.config = {
            etag: data.config.etag,
            values: { ...data.config.values },
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.config = {
            etag: 1,
            values: {
                ignorePaths: "",
                requireReviewerApproval: false,
                severityThreshold: "medium",
            },
        }
    }
}
