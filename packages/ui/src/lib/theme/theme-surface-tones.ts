import type { ThemeResolvedMode } from "./theme-types"

/**
 * Идентификатор surface tone палитры.
 */
export type TSurfaceToneId = "cool" | "neutral" | "warm"

/**
 * Набор surface-переменных для одного режима.
 */
export interface ISurfaceTonePalette {
    /** Базовый фон приложения. */
    readonly background: string
    /** Цвет границ. */
    readonly border: string
    /** Основной цвет текста. */
    readonly foreground: string
    /** Базовый цвет поверхностей. */
    readonly surface: string
    /** Приглушенный цвет поверхностей. */
    readonly surfaceMuted: string
}

/**
 * Конфигурация одного surface tone.
 */
export interface ISurfaceToneConfig {
    /** Описание. */
    readonly description: string
    /** Палитра для dark режима. */
    readonly dark: ISurfaceTonePalette
    /** Идентификатор. */
    readonly id: TSurfaceToneId
    /** Подпись. */
    readonly label: string
    /** Палитра для light режима. */
    readonly light: ISurfaceTonePalette
}

/**
 * Все доступные surface tones.
 */
export const SURFACE_TONES: ReadonlyArray<ISurfaceToneConfig> = [
    {
        id: "neutral",
        label: "Neutral",
        description: "Balanced slate tones for neutral focus",
        light: {
            background: "oklch(0.965 0.004 260)",
            foreground: "oklch(0.22 0.01 260)",
            surface: "oklch(1.0 0.002 260)",
            surfaceMuted: "oklch(0.94 0.005 260)",
            border: "oklch(0.87 0.005 260)",
        },
        dark: {
            background: "oklch(0.14 0.005 260)",
            foreground: "oklch(0.94 0.005 260)",
            surface: "oklch(0.2 0.008 260)",
            surfaceMuted: "oklch(0.25 0.006 260)",
            border: "oklch(0.35 0.01 260)",
        },
    },
    {
        id: "warm",
        label: "Warm",
        description: "Warm paper-like palette for softer visual comfort",
        light: {
            background: "oklch(0.96 0.012 68)",
            foreground: "oklch(0.24 0.015 55)",
            surface: "oklch(0.99 0.008 62)",
            surfaceMuted: "oklch(0.935 0.014 65)",
            border: "oklch(0.87 0.012 62)",
        },
        dark: {
            background: "oklch(0.15 0.015 55)",
            foreground: "oklch(0.94 0.01 62)",
            surface: "oklch(0.21 0.018 55)",
            surfaceMuted: "oklch(0.27 0.015 58)",
            border: "oklch(0.38 0.02 55)",
        },
    },
    {
        id: "cool",
        label: "Cool",
        description: "Cool contrast palette with crisp blues",
        light: {
            background: "oklch(0.965 0.01 230)",
            foreground: "oklch(0.23 0.02 240)",
            surface: "oklch(0.985 0.006 235)",
            surfaceMuted: "oklch(0.94 0.01 232)",
            border: "oklch(0.87 0.008 232)",
        },
        dark: {
            background: "oklch(0.145 0.02 240)",
            foreground: "oklch(0.94 0.008 235)",
            surface: "oklch(0.21 0.025 238)",
            surfaceMuted: "oklch(0.26 0.022 236)",
            border: "oklch(0.38 0.025 238)",
        },
    },
]

/**
 * Дефолтный surface tone.
 */
export const DEFAULT_SURFACE_TONE_ID: TSurfaceToneId = "neutral"

/**
 * Проверяет, является ли значение валидным TSurfaceToneId.
 *
 * @param value Проверяемое значение.
 * @returns True если значение — один из известных tone id.
 */
export function isSurfaceToneId(value: unknown): value is TSurfaceToneId {
    return value === "neutral" || value === "warm" || value === "cool"
}

/**
 * Находит surface tone конфиг по id.
 *
 * @param toneId Идентификатор surface tone.
 * @returns Конфиг tone или neutral по умолчанию.
 */
export function getSurfaceTone(toneId: TSurfaceToneId): ISurfaceToneConfig {
    const match = SURFACE_TONES.find((tone): boolean => tone.id === toneId)
    if (match !== undefined) {
        return match
    }

    return SURFACE_TONES[0] as ISurfaceToneConfig
}

/**
 * Возвращает палитру surface tone для конкретного режима.
 *
 * @param toneId Идентификатор surface tone.
 * @param resolvedMode Физический режим (light/dark).
 * @returns Набор surface-переменных.
 */
export function resolveSurfaceTonePalette(
    toneId: TSurfaceToneId,
    resolvedMode: ThemeResolvedMode,
): ISurfaceTonePalette {
    const tone = getSurfaceTone(toneId)
    return resolvedMode === "dark" ? tone.dark : tone.light
}
