import { type ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Laptop, Moon, Sun } from "@/components/icons/app-icons"
import { Button } from "@heroui/react"
import { useDynamicTranslation } from "@/lib/i18n"
import { type TThemeMode, useTheme } from "@/lib/theme/use-theme"

const MODE_ICONS: Record<TThemeMode, typeof Moon> = {
    dark: Moon,
    system: Laptop,
    light: Sun,
}

const MODE_ARIA_KEYS: Record<TThemeMode, string> = {
    dark: "navigation:themeModeToggle.darkAriaLabel",
    system: "navigation:themeModeToggle.systemAriaLabel",
    light: "navigation:themeModeToggle.lightAriaLabel",
}

const MODE_VALUES: ReadonlyArray<TThemeMode> = ["dark", "system", "light"]

/**
 * Props for compact theme mode toggle.
 */
export interface IThemeModeToggleProps {
    /** Additional CSS class. */
    readonly className?: string
}

/**
 * Compact theme mode toggle for header — icons only, no preset selection.
 * Preset selection lives on /settings-appearance page.
 *
 * @param props Configuration.
 * @returns Compact Dark/System/Light icon toggle.
 */
export function ThemeModeToggle(props: IThemeModeToggleProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const { td } = useDynamicTranslation(["navigation"])
    const { mode, resolvedMode, setMode } = useTheme()

    const modeOptions = useMemo(
        () =>
            MODE_VALUES.map((value) => ({
                Icon: MODE_ICONS[value],
                ariaLabel: td(MODE_ARIA_KEYS[value]),
                value,
            })),
        [td],
    )

    return (
        <div className={props.className}>
            <div
                aria-label={t("navigation:themeModeToggle.ariaLabel")}
                className="inline-flex items-center rounded-md border border-border/40 bg-surface/30 p-0.5"
                role="radiogroup"
            >
                {modeOptions.map((option): ReactElement => {
                    const Icon = option.Icon
                    const isSelected = option.value === mode

                    return (
                        <Button
                            key={option.value}
                            aria-label={option.ariaLabel}
                            aria-pressed={isSelected}
                            aria-selected={isSelected}
                            className={`min-w-0 rounded-sm px-1.5 ${isSelected ? "bg-surface shadow-sm" : ""}`}
                            size="sm"
                            variant="ghost"
                            onPress={(): void => {
                                setMode(option.value)
                            }}
                        >
                            <Icon size={14} />
                        </Button>
                    )
                })}
            </div>
            <p className="sr-only" aria-live="polite">
                Active theme resolved mode is {resolvedMode}.
            </p>
        </div>
    )
}
