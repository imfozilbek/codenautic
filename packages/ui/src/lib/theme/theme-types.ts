import type { ThemePresetId } from "./theme-presets"

/**
 * Доступные режимы темы интерфейса.
 */
export type ThemeMode = "light" | "dark" | "system"

/**
 * Разрешённые режимы после применения system fallback.
 */
export type ThemeResolvedMode = "light" | "dark"

/**
 * Результат инициализации темы.
 */
export interface IThemeBootstrapState {
    /** Сохранённый режим (с учётом system). */
    readonly mode: ThemeMode
    /** Сохранённый пресет. */
    readonly preset: ThemePresetId
    /** Физически применённый режим. */
    readonly resolvedMode: ThemeResolvedMode
}
