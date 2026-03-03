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
 * Состояние ThemeContext.
 */
interface IThemeContext {
    /** Выбранный режим темы (включая system). */
    readonly mode: ThemeMode
    /** Разрешённый режим темы с учётом системной настройки. */
    readonly resolvedMode: "light" | "dark"
    /** Установка режима с сохранением в localStorage. */
    readonly setMode: Dispatch<SetStateAction<ThemeMode>>
}

const THEME_MODE_STORAGE_KEY = "codenautic:ui:theme-mode"

const ThemeContext = createContext<IThemeContext | undefined>(undefined)

const STORAGE_DEFAULT_MODE: ThemeMode = "system"

function readStoredThemeMode(): ThemeMode {
    if (typeof window === "undefined") {
        return STORAGE_DEFAULT_MODE
    }

    const rawMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (rawMode === "light" || rawMode === "dark" || rawMode === "system") {
        return rawMode
    }

    return STORAGE_DEFAULT_MODE
}

function resolveSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") {
        return "light"
    }

    if (typeof window.matchMedia !== "function") {
        return "light"
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches === true ? "dark" : "light"
}

function resolveThemeMode(themeMode: ThemeMode, systemTheme: "light" | "dark"): "light" | "dark" {
    if (themeMode === "system") {
        return systemTheme
    }

    return themeMode
}

function applyThemeMode(resolvedMode: "light" | "dark"): void {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedMode === "dark")
    root.dataset["theme"] = resolvedMode
    root.style.colorScheme = resolvedMode
}

/**
 * Инициализация темы до рендера приложения (для минимизации flash).
 *
 * @returns Режим темы, выбранный в localStorage или system.
 */
export function initializeTheme(): ThemeMode {
    const themeMode = readStoredThemeMode()
    applyThemeMode(resolveThemeMode(themeMode, resolveSystemTheme()))

    return themeMode
}

/**
 * Provider для глобальной настройки темы.
 */
export function ThemeProvider({
    children,
    defaultMode = STORAGE_DEFAULT_MODE,
}: {
    readonly children: ReactNode
    readonly defaultMode?: ThemeMode
}): ReactElement {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const persistedMode = readStoredThemeMode()
        return persistedMode === "system" || persistedMode === "light" || persistedMode === "dark"
            ? persistedMode
            : defaultMode
    })
    const [systemMode, setSystemMode] = useState<"light" | "dark">(resolveSystemTheme())
    const resolvedMode = useMemo<"light" | "dark">(
        () => resolveThemeMode(mode, systemMode),
        [mode, systemMode],
    )

    useEffect(() => {
        if (typeof window.matchMedia !== "function") {
            return
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleMediaChange = (): void => {
            setSystemMode(resolveSystemTheme())
        }

        mediaQuery.addEventListener("change", handleMediaChange)
        return () => {
            mediaQuery.removeEventListener("change", handleMediaChange)
        }
    }, [])

    useEffect(() => {
        applyThemeMode(resolvedMode)
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
    }, [mode, resolvedMode])

    return (
        <ThemeContext.Provider value={{mode, resolvedMode, setMode}}>
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
