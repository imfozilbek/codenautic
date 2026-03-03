import {
    type Dispatch,
    type ReactElement,
    type ReactNode,
    type SetStateAction,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

/**
 * Доступные режимы темы интерфейса.
 */
export type ThemeMode = "light" | "dark" | "system"

/**
 * Разрешённые режимы после применения system fallback.
 */
export type ThemeResolvedMode = "light" | "dark"

/**
 * Набор CSS переменных для конкретной цветовой схемы.
 */
export interface IThemePalette {
    /** Базовый фон приложения. */
    readonly background: string
    /** Основной текст. */
    readonly foreground: string
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
}

/**
 * Пресет темы для режима light и dark.
 */
export interface IThemePreset {
    /** Уникальный ключ пресета. */
    readonly id: string
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

const THEME_MODE_STORAGE_KEY = "codenautic:ui:theme-mode"
const THEME_PRESET_STORAGE_KEY = "codenautic:ui:theme-preset"
const THEME_DEFAULT_MODE: ThemeMode = "system"
const DEFAULT_THEME_PRESET_ID = "moonstone"

/**
 * Реестр HeroUI-подобных пресетов.
 */
export const THEME_PRESETS = [
    {
        id: "moonstone",
        label: "Moonstone",
        description: "Нежный фиолетовый акцент с холодной base-палитрой.",
        light: {
            background: "oklch(0.985 0.01 275)",
            foreground: "oklch(0.235 0.02 257)",
            surface: "oklch(0.988 0.008 275)",
            surfaceMuted: "oklch(0.95 0.015 262)",
            border: "oklch(0.887 0.012 263)",
            ring: "oklch(0.676 0.172 243)",
            primary: "oklch(0.66 0.17 267)",
            primaryForeground: "oklch(0.985 0.014 272)",
            accent: "oklch(0.82 0.09 176)",
            accentForeground: "oklch(0.25 0.03 178)",
            success: "oklch(0.74 0.14 149)",
            warning: "oklch(0.8 0.15 83)",
            danger: "oklch(0.66 0.22 26)",
        },
        dark: {
            background: "oklch(0.22 0.03 261)",
            foreground: "oklch(0.94 0.012 257)",
            surface: "oklch(0.26 0.03 256)",
            surfaceMuted: "oklch(0.33 0.028 255)",
            border: "oklch(0.42 0.036 260)",
            ring: "oklch(0.75 0.13 249)",
            primary: "oklch(0.79 0.18 267)",
            primaryForeground: "oklch(0.22 0.03 264)",
            accent: "oklch(0.77 0.1 174)",
            accentForeground: "oklch(0.24 0.03 171)",
            success: "oklch(0.76 0.135 149)",
            warning: "oklch(0.83 0.13 78)",
            danger: "oklch(0.73 0.2 25)",
        },
    },
    {
        id: "cobalt",
        label: "Cobalt",
        description: "Технологичный синий с фокусным акцентом.",
        light: {
            background: "oklch(0.987 0.008 258)",
            foreground: "oklch(0.235 0.02 252)",
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
        },
        dark: {
            background: "oklch(0.2 0.03 255)",
            foreground: "oklch(0.94 0.012 250)",
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
        },
    },
    {
        id: "forest",
        label: "Forest",
        description: "Природная зелень без перегруза.",
        light: {
            background: "oklch(0.985 0.012 136)",
            foreground: "oklch(0.242 0.025 136)",
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
        },
        dark: {
            background: "oklch(0.198 0.028 151)",
            foreground: "oklch(0.945 0.012 132)",
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
        },
    },
    {
        id: "sunrise",
        label: "Sunrise",
        description: "Тёплый янтарный с оранжевыми акцентами.",
        light: {
            background: "oklch(0.99 0.01 68)",
            foreground: "oklch(0.245 0.02 61)",
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
        },
        dark: {
            background: "oklch(0.208 0.028 58)",
            foreground: "oklch(0.94 0.012 66)",
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
        },
    },
    {
        id: "graphite",
        label: "Graphite",
        description: "Классическая нейтральная палитра для аналитики.",
        light: {
            background: "oklch(0.985 0.004 240)",
            foreground: "oklch(0.236 0.02 255)",
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
        },
        dark: {
            background: "oklch(0.18 0.01 236)",
            foreground: "oklch(0.94 0.008 252)",
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
        },
    },
    {
        id: "aqua",
        label: "Aqua",
        description: "Холодный акцент для спокойного сканирования.",
        light: {
            background: "oklch(0.986 0.01 194)",
            foreground: "oklch(0.24 0.02 204)",
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
        },
        dark: {
            background: "oklch(0.197 0.028 204)",
            foreground: "oklch(0.94 0.01 205)",
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
        },
    },
] as const

/**
 * Идентификаторы пресетов автоматически выводятся из реестра.
 */
export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"]

const THEME_CSS_VARIABLES: ReadonlyArray<keyof IThemePalette> = [
    "background",
    "foreground",
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
]

interface IThemeContext {
    /** Выбранный режим (включая system). */
    readonly mode: ThemeMode
    /** Разрешённый режим с учётом system. */
    readonly resolvedMode: ThemeResolvedMode
    /** Выбранный пресет. */
    readonly preset: ThemePresetId
    /** Каталог пресетов. */
    readonly presets: readonly IThemePreset[]
    /** Установка режима с сохранением в localStorage. */
    readonly setMode: Dispatch<SetStateAction<ThemeMode>>
    /** Установка пресета с сохранением в localStorage. */
    readonly setPreset: Dispatch<SetStateAction<ThemePresetId>>
}

function isThemeMode(rawMode: string): rawMode is ThemeMode {
    return rawMode === "light" || rawMode === "dark" || rawMode === "system"
}

function isThemePreset(rawPreset: string): rawPreset is ThemePresetId {
    return THEME_PRESETS.some((preset): boolean => preset.id === rawPreset)
}

function readStoredThemeMode(): ThemeMode {
    if (typeof window === "undefined") {
        return THEME_DEFAULT_MODE
    }

    const rawMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (rawMode !== null && isThemeMode(rawMode) === true) {
        return rawMode
    }

    return THEME_DEFAULT_MODE
}

function readStoredThemePreset(): ThemePresetId {
    if (typeof window === "undefined") {
        return DEFAULT_THEME_PRESET_ID
    }

    const rawPreset = window.localStorage.getItem(THEME_PRESET_STORAGE_KEY)
    if (rawPreset !== null && isThemePreset(rawPreset) === true) {
        return rawPreset
    }

    return DEFAULT_THEME_PRESET_ID
}

function resolveSystemTheme(mediaQuery?: MediaQueryList): ThemeResolvedMode {
    if (typeof window === "undefined") {
        return "light"
    }

    const resolvedQuery = mediaQuery ?? window.matchMedia("(prefers-color-scheme: dark)")
    return resolvedQuery.matches === true ? "dark" : "light"
}

function resolveThemeMode(themeMode: ThemeMode, systemTheme: ThemeResolvedMode): ThemeResolvedMode {
    if (themeMode === "system") {
        return systemTheme
    }

    return themeMode
}

function getPresetById(presetId: ThemePresetId): IThemePreset {
    const preset = THEME_PRESETS.find((themePreset): boolean => themePreset.id === presetId)
    if (preset === undefined) {
        return THEME_PRESETS[0]
    }

    return preset
}

function applyThemeTokens(resolvedMode: ThemeResolvedMode, presetId: ThemePresetId): void {
    const root = document.documentElement
    const preset = getPresetById(presetId)
    const palette = resolvedMode === "dark" ? preset.dark : preset.light

    THEME_CSS_VARIABLES.forEach((cssVariable): void => {
        const value = palette[cssVariable]
        root.style.setProperty(`--${cssVariable}`, value)
    })

    root.classList.toggle("dark", resolvedMode === "dark")
    root.dataset.theme = presetId
    root.dataset.mode = resolvedMode
    root.style.colorScheme = resolvedMode
}

function initializeFromStorage(): IThemeBootstrapState {
    const mode = readStoredThemeMode()
    const preset = readStoredThemePreset()
    const resolvedMode = resolveThemeMode(mode, resolveSystemTheme())

    if (typeof window !== "undefined") {
        applyThemeTokens(resolvedMode, preset)
    }

    return {
        mode,
        preset,
        resolvedMode,
    }
}

const ThemeContext = createContext<IThemeContext | undefined>(undefined)

/**
 * Инициализация темы до рендера приложения (для минимизации flash).
 *
 * @returns Состояние выбранной темы.
 */
export function initializeTheme(): IThemeBootstrapState {
    return initializeFromStorage()
}

/**
 * Provider для глобальной настройки темы.
 *
 * @param props Пропсы provider.
 * @returns React элемент.
 */
export function ThemeProvider(props: {
    readonly children: ReactNode
    readonly defaultMode?: ThemeMode
    readonly defaultPreset?: ThemePresetId
}): ReactElement {
    const {children, defaultMode, defaultPreset} = props

    const [mode, setMode] = useState<ThemeMode>(() => {
        const persistedMode = readStoredThemeMode()
        if (defaultMode !== undefined && isThemeMode(defaultMode) === true) {
            return defaultMode
        }

        return persistedMode
    })
    const [preset, setPreset] = useState<ThemePresetId>(() => {
        const persistedPreset = readStoredThemePreset()
        if (isThemePreset(persistedPreset) === true) {
            return persistedPreset
        }

        return defaultPreset ?? DEFAULT_THEME_PRESET_ID
    })
    const [systemMode, setSystemMode] = useState<ThemeResolvedMode>(() => resolveSystemTheme())
    const resolvedMode = useMemo<ThemeResolvedMode>(
        () => resolveThemeMode(mode, systemMode),
        [mode, systemMode],
    )

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleMediaChange = (): void => {
            setSystemMode(resolveSystemTheme(mediaQuery))
        }

        mediaQuery.addEventListener("change", handleMediaChange)
        return (): void => {
            mediaQuery.removeEventListener("change", handleMediaChange)
        }
    }, [])

    useEffect((): void => {
        applyThemeTokens(resolvedMode, preset)
        if (typeof window === "undefined") {
            return
        }

        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
        window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, preset)
    }, [mode, preset, resolvedMode])

    useEffect((): (() => void) | undefined => {
        if (typeof window === "undefined") {
            return undefined
        }

        const handleStorage = (event: StorageEvent): void => {
            if (event.key === THEME_MODE_STORAGE_KEY && event.newValue !== null) {
                if (isThemeMode(event.newValue) === true) {
                    setMode(event.newValue)
                }
            }

            if (event.key === THEME_PRESET_STORAGE_KEY && event.newValue !== null) {
                if (isThemePreset(event.newValue) === true) {
                    setPreset(event.newValue)
                }
            }
        }

        window.addEventListener("storage", handleStorage)
        return (): void => {
            window.removeEventListener("storage", handleStorage)
        }
    }, [])

    return (
        <ThemeContext.Provider
            value={{
                mode,
                preset,
                presets: THEME_PRESETS,
                resolvedMode,
                setMode,
                setPreset,
            }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

/**
 * Получение theme context.
 */
export function useThemeMode(): IThemeContext {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useThemeMode must be used inside ThemeProvider")
    }

    return context
}
