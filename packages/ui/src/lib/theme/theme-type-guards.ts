import { THEME_PRESETS, type ThemePresetId } from "./theme-presets"
import type { ThemeMode } from "./theme-types"

/**
 * Набор значений для синхронизации пользовательской темы.
 */
export interface IThemeSettingsPayload {
    /** Темная/светлая/системная схема. */
    readonly mode?: string
    /** Код пресета темы. */
    readonly preset?: string
}

/**
 * Ограниченный профиль темы для API-памяти.
 */
export interface IThemeProfile {
    /** Темная/светлая/системная схема. */
    readonly mode: ThemeMode
    /** Код пресета. */
    readonly preset: ThemePresetId
    /** Время синхронизации в миллисекундах. */
    readonly updatedAtMs: number
}

/**
 * Значение updatedAtMs по умолчанию для профилей, которые ещё не синхронизированы.
 */
export const THEME_PROFILE_DEFAULT_UPDATED_AT_MS = 0

/**
 * Вложенные пути для поиска настроек темы в API-ответе.
 */
const THEME_SETTINGS_PAYLOAD_PATHS = ["theme", "settings", "preferences", "data"] as const

/**
 * Проверяет, является ли значение объектом (Record).
 *
 * @param value Проверяемое значение.
 * @returns True, если value — непустой объект (не массив).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && Array.isArray(value) === false
}

/**
 * Проверяет, является ли значение допустимым ThemeMode.
 *
 * @param rawMode Значение для проверки.
 * @returns True, если rawMode — "light", "dark" или "system".
 */
export function isThemeMode(rawMode: unknown): rawMode is ThemeMode {
    if (typeof rawMode !== "string") {
        return false
    }
    return rawMode === "light" || rawMode === "dark" || rawMode === "system"
}

/**
 * Проверяет, является ли значение допустимым ThemePresetId.
 *
 * @param rawPreset Значение для проверки.
 * @returns True, если rawPreset соответствует id одного из пресетов.
 */
export function isThemePreset(rawPreset: unknown): rawPreset is ThemePresetId {
    if (typeof rawPreset !== "string") {
        return false
    }
    return THEME_PRESETS.some((preset): boolean => preset.id === rawPreset)
}

/**
 * Парсит значение updatedAt из различных форматов.
 *
 * @param rawValue Сырое значение (number или строка даты).
 * @returns Числовой timestamp в миллисекундах.
 */
export function parseUpdatedAtValue(rawValue: unknown): number {
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return rawValue
    }

    if (typeof rawValue === "string") {
        const parsed = Date.parse(rawValue)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    return THEME_PROFILE_DEFAULT_UPDATED_AT_MS
}

/**
 * Конвертирует неизвестное значение в IThemeProfile с fallback.
 *
 * @param value Сырое значение.
 * @param fallback Профиль по умолчанию.
 * @returns Валидный IThemeProfile.
 */
export function toThemeProfile(value: unknown, fallback: IThemeProfile): IThemeProfile {
    if (isRecord(value) === false) {
        return fallback
    }

    const mode = isThemeMode(value.mode) ? value.mode : fallback.mode
    const preset = isThemePreset(value.preset) ? value.preset : fallback.preset
    const updatedAtMs = parseUpdatedAtValue(value.updatedAtMs)

    return {
        mode,
        preset,
        updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : fallback.updatedAtMs,
    }
}

/**
 * Читает payload настроек темы из неизвестного значения.
 *
 * @param raw Сырое значение из API-ответа.
 * @returns Распознанный payload настроек темы.
 */
export function readThemeSettingsPayload(raw: unknown): IThemeSettingsPayload {
    if (isRecord(raw) === false) {
        return {}
    }

    const directPayload = readThemeSettingsPayloadFromObject(raw)
    if (directPayload.mode !== undefined || directPayload.preset !== undefined) {
        return directPayload
    }

    const nestedPayload = readThemeSettingsPayloadFromNestedValues(raw)
    if (nestedPayload.mode !== undefined || nestedPayload.preset !== undefined) {
        return nestedPayload
    }

    return {}
}

/**
 * Извлекает payload настроек темы из плоского объекта.
 *
 * @param raw Объект для анализа.
 * @returns Распознанный payload.
 */
function readThemeSettingsPayloadFromObject(raw: Record<string, unknown>): IThemeSettingsPayload {
    const directMode =
        isThemeMode(raw.mode) === true
            ? raw.mode
            : isThemeMode(raw.themeMode) === true
              ? raw.themeMode
              : undefined
    const directPreset =
        isThemePreset(raw.preset) === true
            ? raw.preset
            : isThemePreset(raw.themePreset) === true
              ? raw.themePreset
              : undefined

    if (directMode === undefined && directPreset === undefined) {
        return {}
    }

    return {
        mode: directMode,
        preset: directPreset,
    }
}

/**
 * Извлекает payload настроек темы из вложенных объектов.
 *
 * @param raw Объект для анализа.
 * @returns Распознанный payload.
 */
function readThemeSettingsPayloadFromNestedValues(
    raw: Record<string, unknown>,
): IThemeSettingsPayload {
    for (const path of THEME_SETTINGS_PAYLOAD_PATHS) {
        const nested = raw[path]
        if (isRecord(nested) === false) {
            continue
        }

        const payload = readThemeSettingsPayloadFromObject(nested)
        if (payload.mode !== undefined || payload.preset !== undefined) {
            return payload
        }
    }

    return {}
}
