import { DEFAULT_THEME_PRESET_ID, type ThemePresetId } from "./theme-presets"
import {
    type IThemeProfile,
    isThemeMode,
    isThemePreset,
    parseUpdatedAtValue,
} from "./theme-type-guards"
import type { ThemeMode, ThemeResolvedMode } from "./theme-types"

/**
 * Ключ localStorage для режима темы.
 */
export const THEME_MODE_STORAGE_KEY = "codenautic:ui:theme-mode"

/**
 * Ключ localStorage для пресета темы.
 */
export const THEME_PRESET_STORAGE_KEY = "codenautic:ui:theme-preset"

/**
 * Ключ localStorage для состояния синхронизации профиля темы.
 */
export const THEME_PROFILE_STORAGE_SYNC_KEY = "codenautic:ui:theme-profile-synced"

/**
 * Режим темы по умолчанию.
 */
export const THEME_DEFAULT_MODE: ThemeMode = "system"

/**
 * Состояние синхронизации профиля темы.
 */
export interface IThemeProfileSyncState {
    /** Идентификатор режима. */
    readonly mode: ThemeMode
    /** Идентификатор пресета. */
    readonly preset: ThemePresetId
    /** Время последнего успешного/локального обновления в ms. */
    readonly updatedAtMs: number
}

/**
 * Безопасный доступ к window.localStorage.
 *
 * @returns Storage, если доступен; undefined в SSR или при ошибке доступа.
 */
export function getWindowLocalStorage(): Storage | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    try {
        return window.localStorage
    } catch {
        return undefined
    }
}

/**
 * Безопасно читает значение из localStorage.
 *
 * @param storageKey Ключ записи.
 * @returns Строковое значение или undefined.
 */
export function readLocalStorageItem(storageKey: string): string | undefined {
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return undefined
    }

    try {
        return storage.getItem(storageKey) ?? undefined
    } catch {
        return undefined
    }
}

/**
 * Безопасно записывает значение в localStorage.
 *
 * @param storageKey Ключ записи.
 * @param value Значение для записи.
 */
export function writeLocalStorageItem(storageKey: string, value: string): void {
    const storage = getWindowLocalStorage()
    if (storage === undefined) {
        return
    }

    try {
        storage.setItem(storageKey, value)
    } catch (error: unknown) {
        // eslint-disable-next-line no-console -- infrastructure-level storage error, ILogger not available here
        console.warn(`[theme-storage] Failed to write "${storageKey}":`, error)
    }
}

/**
 * Читает сохранённое состояние синхронизации профиля темы.
 *
 * @returns Состояние синхронизации или undefined, если данные отсутствуют/повреждены.
 */
export function readThemeProfileSyncState(): IThemeProfileSyncState | undefined {
    const rawState = readLocalStorageItem(THEME_PROFILE_STORAGE_SYNC_KEY)
    if (rawState === undefined) {
        return undefined
    }

    try {
        const parsed = JSON.parse(rawState) as Record<string, unknown>
        const mode = isThemeMode(parsed.mode) ? parsed.mode : undefined
        const preset = isThemePreset(parsed.preset) ? parsed.preset : undefined
        const updatedAtMs = parseUpdatedAtValue(parsed.updatedAtMs)

        if (mode === undefined || preset === undefined) {
            return undefined
        }

        return {
            mode,
            preset,
            updatedAtMs,
        }
    } catch {
        return undefined
    }
}

/**
 * Записывает состояние синхронизации профиля темы в localStorage.
 *
 * @param profile Профиль для сохранения.
 */
export function writeThemeProfileSyncState(profile: IThemeProfile): void {
    const payload = {
        mode: profile.mode,
        preset: profile.preset,
        updatedAtMs: profile.updatedAtMs,
    }

    writeLocalStorageItem(THEME_PROFILE_STORAGE_SYNC_KEY, JSON.stringify(payload))
}

/**
 * Читает сохранённый режим темы из localStorage.
 *
 * @returns Режим темы из localStorage или значение по умолчанию.
 */
export function readStoredThemeMode(): ThemeMode {
    const rawMode = readLocalStorageItem(THEME_MODE_STORAGE_KEY)
    if (rawMode !== undefined && isThemeMode(rawMode) === true) {
        return rawMode
    }

    return THEME_DEFAULT_MODE
}

/**
 * Читает сохранённый пресет темы из localStorage.
 *
 * @returns Пресет темы из localStorage или значение по умолчанию.
 */
export function readStoredThemePreset(): ThemePresetId {
    const rawPreset = readLocalStorageItem(THEME_PRESET_STORAGE_KEY)
    if (rawPreset !== undefined && isThemePreset(rawPreset) === true) {
        return rawPreset
    }

    return DEFAULT_THEME_PRESET_ID
}

/**
 * Разрешает системную тему через MediaQueryList.
 *
 * @param mediaQuery Опциональный MediaQueryList (для переиспользования).
 * @returns Физический режим: "light" или "dark".
 */
export function resolveSystemTheme(mediaQuery?: MediaQueryList): ThemeResolvedMode {
    if (typeof window === "undefined") {
        return "light"
    }

    try {
        const resolvedQuery = mediaQuery ?? window.matchMedia("(prefers-color-scheme: dark)")
        return resolvedQuery.matches === true ? "dark" : "light"
    } catch {
        return "light"
    }
}
