import { useCallback, useEffect, useState } from "react"

/**
 * Режим темы интерфейса.
 */
export type TThemeMode = "dark" | "light" | "system"

/**
 * Идентификатор цветового пресета.
 */
export type TThemePreset = "aqua" | "cobalt" | "forest" | "graphite" | "moonstone" | "sunrise"

/**
 * Каталог доступных пресетов.
 */
const PRESETS: ReadonlyArray<{ readonly id: TThemePreset; readonly label: string }> = [
    { id: "moonstone", label: "Moonstone" },
    { id: "cobalt", label: "Cobalt" },
    { id: "forest", label: "Forest" },
    { id: "sunrise", label: "Sunrise" },
    { id: "graphite", label: "Graphite" },
    { id: "aqua", label: "Aqua" },
]

/**
 * Разрешает режим темы с учётом system preference.
 *
 * @param mode Режим темы.
 * @returns Физический режим: "light" или "dark".
 */
function resolveMode(mode: TThemeMode): "dark" | "light" {
    if (mode !== "system") {
        return mode
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Применяет тему к document.documentElement.
 *
 * @param mode Режим темы.
 * @param preset Идентификатор пресета.
 */
function apply(mode: TThemeMode, preset: TThemePreset): void {
    const resolved = resolveMode(mode)
    document.documentElement.setAttribute("data-theme", preset)
    document.documentElement.classList.toggle("dark", resolved === "dark")
    document.documentElement.style.colorScheme = resolved
}

/**
 * Инициализирует тему ДО React-рендера для предотвращения flash.
 * Вызывается в main.tsx перед createRoot.
 */
export function initializeTheme(): void {
    const mode = (localStorage.getItem("cn:theme-mode") as TThemeMode | null) ?? "system"
    const preset = (localStorage.getItem("cn:theme-preset") as TThemePreset | null) ?? "sunrise"
    apply(mode, preset)
}

/**
 * Hook для управления темой приложения.
 *
 * @returns Состояние темы и функции управления.
 */
export function useTheme(): {
    mode: TThemeMode
    preset: TThemePreset
    presets: typeof PRESETS
    resolvedMode: "dark" | "light"
    setMode: (m: TThemeMode) => void
    setPreset: (p: TThemePreset) => void
} {
    const [mode, setModeState] = useState<TThemeMode>(
        () => (localStorage.getItem("cn:theme-mode") as TThemeMode | null) ?? "system",
    )
    const [preset, setPresetState] = useState<TThemePreset>(
        () => (localStorage.getItem("cn:theme-preset") as TThemePreset | null) ?? "sunrise",
    )

    const setMode = useCallback((m: TThemeMode): void => {
        setModeState(m)
        localStorage.setItem("cn:theme-mode", m)
    }, [])

    const setPreset = useCallback((p: TThemePreset): void => {
        setPresetState(p)
        localStorage.setItem("cn:theme-preset", p)
    }, [])

    useEffect((): void => {
        apply(mode, preset)
    }, [mode, preset])

    useEffect((): (() => void) | undefined => {
        if (mode !== "system") {
            return undefined
        }
        const mq = window.matchMedia("(prefers-color-scheme: dark)")
        const handler = (): void => {
            apply(mode, preset)
        }
        mq.addEventListener("change", handler)
        return (): void => {
            mq.removeEventListener("change", handler)
        }
    }, [mode, preset])

    return { mode, preset, presets: PRESETS, resolvedMode: resolveMode(mode), setMode, setPreset }
}
