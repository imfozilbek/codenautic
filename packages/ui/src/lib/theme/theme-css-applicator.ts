import type { IThemePalette, ThemePresetId } from "./theme-presets"
import { THEME_PRESETS } from "./theme-presets"
import type { ISurfaceTonePalette } from "./theme-surface-tones"
import { resolveSurfaceTonePalette, type TSurfaceToneId } from "./theme-surface-tones"
import type { ThemeMode, ThemeResolvedMode } from "./theme-types"

/**
 * Список CSS переменных палитры, применяемых к document root.
 */
const THEME_CSS_VARIABLES: ReadonlyArray<keyof IThemePalette> = [
    "background",
    "foreground",
    "mutedForeground",
    "surface",
    "surfaceMuted",
    "border",
    "ring",
    "primary",
    "primaryForeground",
    "accent",
    "accentForeground",
    "success",
    "warning",
    "danger",
    "codeSurface",
    "onSuccess",
    "onWarning",
    "onDanger",
    "onPrimary",
]

/**
 * Конвертирует camelCase ключ палитры в kebab-case CSS-переменную.
 *
 * @param str Строка в camelCase.
 * @returns Строка в kebab-case.
 *
 * @example camelToKebab("surfaceMuted") // "surface-muted"
 */
export function camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter): string => `-${letter.toLowerCase()}`)
}

/**
 * Находит пресет по id из реестра THEME_PRESETS.
 *
 * @param presetId Идентификатор пресета.
 * @returns Найденный пресет или первый в реестре (fallback).
 */
export function getPresetById(presetId: ThemePresetId): (typeof THEME_PRESETS)[number] {
    const preset = THEME_PRESETS.find((themePreset): boolean => themePreset.id === presetId)
    if (preset === undefined) {
        return THEME_PRESETS[0]
    }

    return preset
}

/**
 * Применяет CSS-токены темы к document.documentElement.
 *
 * @param resolvedMode Физический режим (light/dark).
 * @param presetId Идентификатор пресета.
 */
export function applyThemeTokens(resolvedMode: ThemeResolvedMode, presetId: ThemePresetId): void {
    const root = document.documentElement
    const preset = getPresetById(presetId)
    const palette = resolvedMode === "dark" ? preset.dark : preset.light

    THEME_CSS_VARIABLES.forEach((cssVariable): void => {
        const value = palette[cssVariable]
        root.style.setProperty(`--${camelToKebab(cssVariable)}`, value)
    })

    root.classList.toggle("dark", resolvedMode === "dark")
    root.dataset.theme = presetId
    root.dataset.mode = resolvedMode
    root.style.colorScheme = resolvedMode
}

/**
 * CSS-переменные, перекрываемые surface tone.
 */
const SURFACE_TONE_CSS_VARIABLES: ReadonlyArray<keyof ISurfaceTonePalette> = [
    "background",
    "foreground",
    "surface",
    "surfaceMuted",
    "border",
]

/**
 * Применяет surface tone поверх текущей темы.
 *
 * @param resolvedMode Физический режим (light/dark).
 * @param toneId Идентификатор surface tone.
 */
export function applySurfaceTone(resolvedMode: ThemeResolvedMode, toneId: TSurfaceToneId): void {
    const root = document.documentElement
    const palette = resolveSurfaceTonePalette(toneId, resolvedMode)

    SURFACE_TONE_CSS_VARIABLES.forEach((cssVariable): void => {
        const value = palette[cssVariable]
        root.style.setProperty(`--${camelToKebab(cssVariable)}`, value)
    })
}

/**
 * Разрешает ThemeMode в физический ThemeResolvedMode.
 *
 * @param themeMode Режим темы (может быть "system").
 * @param systemTheme Текущий системный режим.
 * @returns Физический режим: "light" или "dark".
 */
export function resolveThemeMode(
    themeMode: ThemeMode,
    systemTheme: ThemeResolvedMode,
): ThemeResolvedMode {
    if (themeMode === "system") {
        return systemTheme
    }

    return themeMode
}
