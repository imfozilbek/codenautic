import type { SettingsCollection } from "../collections/settings-collection"

/**
 * Заполняет settings-коллекцию набором дефолтных настроек и предпочтений.
 *
 * Вызывает seed() коллекции, который устанавливает:
 * - userSettings: тема, локаль
 * - userPreferences: уведомления, дайджест
 * - repoConfigs: дефолтный конфиг для repo-1
 *
 * @param settings - Коллекция настроек для заполнения.
 */
export function seedSettings(settings: SettingsCollection): void {
    settings.seed()
}
