/**
 * Набор CSS переменных для конкретной цветовой схемы.
 */
export interface IThemePalette {
    /** Базовый фон приложения. */
    readonly background: string
    /** Основной текст. */
    readonly foreground: string
    /** Вторичный/приглушённый текст (метки, подписи, secondary UI). */
    readonly mutedForeground: string
    /** Фон поверхностей. */
    readonly surface: string
    /** Поверхность с пониженной контрастностью. */
    readonly surfaceMuted: string
    /** Граница. */
    readonly border: string
    /** Фокус и focus ring. */
    readonly ring: string
    /** Акцентный цвет действий. */
    readonly primary: string
    /** Текст на акценте. */
    readonly primaryForeground: string
    /** Вторичный акцент. */
    readonly accent: string
    /** Текст на вторичном акценте. */
    readonly accentForeground: string
    /** Успех. */
    readonly success: string
    /** Предупреждение. */
    readonly warning: string
    /** Ошибка. */
    readonly danger: string
    /** Фон code-блоков. */
    readonly codeSurface: string
    /** Текст на success-tinted поверхностях (bg-success/10). */
    readonly onSuccess: string
    /** Текст на warning-tinted поверхностях (bg-warning/10). */
    readonly onWarning: string
    /** Текст на danger-tinted поверхностях (bg-danger/10). */
    readonly onDanger: string
    /** Текст на primary-tinted поверхностях (bg-primary/10). */
    readonly onPrimary: string
}

/**
 * Пресет темы для режима light и dark.
 */
export interface IThemePreset {
    /** Уникальный ключ пресета. */
    readonly id: ThemePresetId
    /** Читаемое название пресета. */
    readonly label: string
    /** Короткое описание. */
    readonly description: string
    /** Цвета для светлого режима. */
    readonly light: IThemePalette
    /** Цвета для тёмного режима. */
    readonly dark: IThemePalette
}

/**
 * Реестр HeroUI-подобных пресетов.
 */
export const THEME_PRESETS = [
    {
        id: "moonstone",
        label: "Moonstone",
        description: "HeroUI-совместимая teal-палитра с тёплым акцентом.",
        light: {
            background: "oklch(0.9702 0.002 148.67)",
            foreground: "oklch(0.2103 0.002 148.67)",
            mutedForeground: "oklch(0.5517 0.004 148.67)",
            surface: "oklch(1.0 0.001 148.67)",
            surfaceMuted: "oklch(0.94 0.002 148.67)",
            border: "oklch(0.9 0.002 148.67)",
            ring: "oklch(0.7697 0.2124 148.67)",
            primary: "oklch(0.7697 0.2124 148.67)",
            primaryForeground: "oklch(0.15 0.03 148.67)",
            accent: "oklch(0.75 0.15 45)",
            accentForeground: "oklch(0.2 0.03 45)",
            success: "oklch(0.6072 0.1647 149.02)",
            warning: "oklch(0.6972 0.1687 54.22)",
            danger: "oklch(0.5509 0.2166 25.29)",
            codeSurface: "oklch(0.16 0.005 148.67)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 54)",
            onDanger: "oklch(0.35 0.08 25)",
            onPrimary: "oklch(0.35 0.08 148)",
        },
        dark: {
            background: "oklch(0.12 0.002 148.67)",
            foreground: "oklch(0.9911 0.002 148.67)",
            mutedForeground: "oklch(0.705 0.004 148.67)",
            surface: "oklch(0.2103 0.004 148.67)",
            surfaceMuted: "oklch(0.274 0.002 148.67)",
            border: "oklch(0.28 0.002 148.67)",
            ring: "oklch(0.7697 0.2124 148.67)",
            primary: "oklch(0.7697 0.2124 148.67)",
            primaryForeground: "oklch(0.15 0.03 148.67)",
            accent: "oklch(0.78 0.14 45)",
            accentForeground: "oklch(0.2 0.03 45)",
            success: "oklch(0.7697 0.2124 148.67)",
            warning: "oklch(0.7921 0.1626 67.42)",
            danger: "oklch(0.5931 0.2338 25.42)",
            codeSurface: "oklch(0.16 0.005 148.67)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 54)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 148)",
        },
    },
    {
        id: "cobalt",
        label: "Cobalt",
        description: "Технологичный синий с фокусным акцентом.",
        light: {
            background: "oklch(0.987 0.008 258)",
            foreground: "oklch(0.235 0.02 252)",
            mutedForeground: "oklch(0.55 0.015 252)",
            surface: "oklch(0.99 0.004 257)",
            surfaceMuted: "oklch(0.954 0.01 257)",
            border: "oklch(0.878 0.01 252)",
            ring: "oklch(0.682 0.148 257)",
            primary: "oklch(0.67 0.19 268)",
            primaryForeground: "oklch(0.985 0.006 259)",
            accent: "oklch(0.79 0.13 188)",
            accentForeground: "oklch(0.235 0.02 252)",
            success: "oklch(0.74 0.147 151)",
            warning: "oklch(0.82 0.142 84)",
            danger: "oklch(0.66 0.215 24)",
            codeSurface: "oklch(0.16 0.02 255)",
            onSuccess: "oklch(0.35 0.08 151)",
            onWarning: "oklch(0.35 0.08 84)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 268)",
        },
        dark: {
            background: "oklch(0.2 0.03 255)",
            foreground: "oklch(0.94 0.012 250)",
            mutedForeground: "oklch(0.65 0.015 250)",
            surface: "oklch(0.26 0.03 255)",
            surfaceMuted: "oklch(0.31 0.028 254)",
            border: "oklch(0.43 0.034 252)",
            ring: "oklch(0.75 0.14 260)",
            primary: "oklch(0.78 0.198 268)",
            primaryForeground: "oklch(0.23 0.03 255)",
            accent: "oklch(0.77 0.122 188)",
            accentForeground: "oklch(0.235 0.02 188)",
            success: "oklch(0.76 0.132 149)",
            warning: "oklch(0.83 0.135 78)",
            danger: "oklch(0.73 0.2 25)",
            codeSurface: "oklch(0.16 0.02 255)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 78)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 268)",
        },
    },
    {
        id: "forest",
        label: "Forest",
        description: "Природная зелень без перегруза.",
        light: {
            background: "oklch(0.985 0.012 136)",
            foreground: "oklch(0.242 0.025 136)",
            mutedForeground: "oklch(0.55 0.015 136)",
            surface: "oklch(0.99 0.008 136)",
            surfaceMuted: "oklch(0.948 0.014 141)",
            border: "oklch(0.88 0.01 142)",
            ring: "oklch(0.66 0.12 142)",
            primary: "oklch(0.57 0.14 146)",
            primaryForeground: "oklch(0.985 0.01 146)",
            accent: "oklch(0.79 0.1 84)",
            accentForeground: "oklch(0.246 0.028 90)",
            success: "oklch(0.72 0.16 149)",
            warning: "oklch(0.8 0.14 82)",
            danger: "oklch(0.67 0.21 24)",
            codeSurface: "oklch(0.16 0.02 146)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 82)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 146)",
        },
        dark: {
            background: "oklch(0.198 0.028 151)",
            foreground: "oklch(0.945 0.012 132)",
            mutedForeground: "oklch(0.65 0.015 132)",
            surface: "oklch(0.262 0.03 144)",
            surfaceMuted: "oklch(0.324 0.028 141)",
            border: "oklch(0.44 0.026 144)",
            ring: "oklch(0.75 0.12 145)",
            primary: "oklch(0.71 0.13 146)",
            primaryForeground: "oklch(0.24 0.03 151)",
            accent: "oklch(0.78 0.09 85)",
            accentForeground: "oklch(0.24 0.02 86)",
            success: "oklch(0.77 0.16 149)",
            warning: "oklch(0.82 0.135 82)",
            danger: "oklch(0.73 0.19 25)",
            codeSurface: "oklch(0.16 0.02 146)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 82)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 146)",
        },
    },
    {
        id: "sunrise",
        label: "Sunrise",
        description: "Тёплый янтарный с оранжевыми акцентами.",
        light: {
            background: "oklch(0.99 0.01 68)",
            foreground: "oklch(0.245 0.02 61)",
            mutedForeground: "oklch(0.55 0.015 61)",
            surface: "oklch(0.995 0.008 66)",
            surfaceMuted: "oklch(0.956 0.015 73)",
            border: "oklch(0.886 0.01 70)",
            ring: "oklch(0.68 0.132 72)",
            primary: "oklch(0.67 0.16 74)",
            primaryForeground: "oklch(0.985 0.012 64)",
            accent: "oklch(0.76 0.15 34)",
            accentForeground: "oklch(0.98 0.008 38)",
            success: "oklch(0.72 0.14 149)",
            warning: "oklch(0.81 0.15 63)",
            danger: "oklch(0.64 0.2 24)",
            codeSurface: "oklch(0.16 0.015 68)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 63)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 74)",
        },
        dark: {
            background: "oklch(0.208 0.028 58)",
            foreground: "oklch(0.94 0.012 66)",
            mutedForeground: "oklch(0.65 0.015 66)",
            surface: "oklch(0.26 0.027 64)",
            surfaceMuted: "oklch(0.32 0.026 67)",
            border: "oklch(0.415 0.03 64)",
            ring: "oklch(0.73 0.125 70)",
            primary: "oklch(0.71 0.168 74)",
            primaryForeground: "oklch(0.245 0.02 61)",
            accent: "oklch(0.78 0.148 32)",
            accentForeground: "oklch(0.98 0.012 30)",
            success: "oklch(0.77 0.132 149)",
            warning: "oklch(0.83 0.14 62)",
            danger: "oklch(0.74 0.2 26)",
            codeSurface: "oklch(0.16 0.015 68)",
            onSuccess: "oklch(0.88 0.06 149)",
            onWarning: "oklch(0.88 0.06 62)",
            onDanger: "oklch(0.88 0.06 26)",
            onPrimary: "oklch(0.88 0.06 74)",
        },
    },
    {
        id: "graphite",
        label: "Graphite",
        description: "Классическая нейтральная палитра для аналитики.",
        light: {
            background: "oklch(0.985 0.004 240)",
            foreground: "oklch(0.236 0.02 255)",
            mutedForeground: "oklch(0.55 0.01 255)",
            surface: "oklch(0.992 0.004 241)",
            surfaceMuted: "oklch(0.95 0.008 240)",
            border: "oklch(0.885 0.008 244)",
            ring: "oklch(0.675 0.035 250)",
            primary: "oklch(0.65 0.03 250)",
            primaryForeground: "oklch(0.985 0.004 255)",
            accent: "oklch(0.74 0.028 232)",
            accentForeground: "oklch(0.24 0.01 233)",
            success: "oklch(0.72 0.12 150)",
            warning: "oklch(0.8 0.12 85)",
            danger: "oklch(0.66 0.19 24)",
            codeSurface: "oklch(0.16 0.008 240)",
            onSuccess: "oklch(0.35 0.08 150)",
            onWarning: "oklch(0.35 0.08 85)",
            onDanger: "oklch(0.35 0.08 24)",
            onPrimary: "oklch(0.35 0.08 250)",
        },
        dark: {
            background: "oklch(0.18 0.01 236)",
            foreground: "oklch(0.94 0.008 252)",
            mutedForeground: "oklch(0.65 0.01 252)",
            surface: "oklch(0.26 0.014 241)",
            surfaceMuted: "oklch(0.32 0.018 242)",
            border: "oklch(0.44 0.03 244)",
            ring: "oklch(0.7 0.048 248)",
            primary: "oklch(0.72 0.035 250)",
            primaryForeground: "oklch(0.18 0.01 241)",
            accent: "oklch(0.76 0.04 231)",
            accentForeground: "oklch(0.24 0.01 233)",
            success: "oklch(0.76 0.108 151)",
            warning: "oklch(0.82 0.11 84)",
            danger: "oklch(0.73 0.182 25)",
            codeSurface: "oklch(0.16 0.008 240)",
            onSuccess: "oklch(0.88 0.06 151)",
            onWarning: "oklch(0.88 0.06 84)",
            onDanger: "oklch(0.88 0.06 25)",
            onPrimary: "oklch(0.88 0.06 250)",
        },
    },
    {
        id: "aqua",
        label: "Aqua",
        description: "Холодный акцент для спокойного сканирования.",
        light: {
            background: "oklch(0.986 0.01 194)",
            foreground: "oklch(0.24 0.02 204)",
            mutedForeground: "oklch(0.55 0.015 204)",
            surface: "oklch(0.992 0.006 197)",
            surfaceMuted: "oklch(0.956 0.01 197)",
            border: "oklch(0.88 0.008 195)",
            ring: "oklch(0.683 0.127 201)",
            primary: "oklch(0.62 0.16 205)",
            primaryForeground: "oklch(0.985 0.008 207)",
            accent: "oklch(0.79 0.11 173)",
            accentForeground: "oklch(0.236 0.034 181)",
            success: "oklch(0.71 0.128 149)",
            warning: "oklch(0.82 0.14 84)",
            danger: "oklch(0.68 0.215 23)",
            codeSurface: "oklch(0.16 0.02 204)",
            onSuccess: "oklch(0.35 0.08 149)",
            onWarning: "oklch(0.35 0.08 84)",
            onDanger: "oklch(0.35 0.08 23)",
            onPrimary: "oklch(0.35 0.08 205)",
        },
        dark: {
            background: "oklch(0.197 0.028 204)",
            foreground: "oklch(0.94 0.01 205)",
            mutedForeground: "oklch(0.65 0.012 205)",
            surface: "oklch(0.262 0.032 205)",
            surfaceMuted: "oklch(0.323 0.032 204)",
            border: "oklch(0.44 0.033 205)",
            ring: "oklch(0.78 0.145 198)",
            primary: "oklch(0.75 0.16 205)",
            primaryForeground: "oklch(0.22 0.03 205)",
            accent: "oklch(0.81 0.13 175)",
            accentForeground: "oklch(0.23 0.03 181)",
            success: "oklch(0.77 0.142 152)",
            warning: "oklch(0.82 0.14 83)",
            danger: "oklch(0.72 0.19 24)",
            codeSurface: "oklch(0.16 0.02 204)",
            onSuccess: "oklch(0.88 0.06 152)",
            onWarning: "oklch(0.88 0.06 83)",
            onDanger: "oklch(0.88 0.06 24)",
            onPrimary: "oklch(0.88 0.06 205)",
        },
    },
] as const

/**
 * Идентификаторы пресетов автоматически выводятся из реестра.
 */
export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"]

/**
 * Пресет по умолчанию.
 */
export const DEFAULT_THEME_PRESET_ID: ThemePresetId = "sunrise"
