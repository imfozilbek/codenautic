import { type ReactElement } from "react"

import { Laptop, Moon, Sun } from "@/components/icons/app-icons"
import { Button } from "@/components/ui"
import { type ThemeMode, useThemeMode } from "@/lib/theme/theme-provider"

const MODE_OPTIONS: ReadonlyArray<{
    /** Mode value. */
    readonly value: ThemeMode
    /** Icon component. */
    readonly Icon: typeof Moon
    /** Accessible label. */
    readonly ariaLabel: string
}> = [
    {
        Icon: Moon,
        ariaLabel: "Use dark theme",
        value: "dark",
    },
    {
        Icon: Laptop,
        ariaLabel: "Use system theme",
        value: "system",
    },
    {
        Icon: Sun,
        ariaLabel: "Use light theme",
        value: "light",
    },
]

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
    const { mode, resolvedMode, setMode } = useThemeMode()

    return (
        <div className={props.className}>
            <div
                aria-label="Theme mode"
                className="inline-flex items-center rounded-lg border border-border bg-header-bg p-0.5 backdrop-blur"
                role="radiogroup"
            >
                {MODE_OPTIONS.map((option): ReactElement => {
                    const Icon = option.Icon
                    const isSelected = option.value === mode

                    return (
                        <Button
                            key={option.value}
                            aria-label={option.ariaLabel}
                            aria-pressed={isSelected}
                            aria-selected={isSelected}
                            className="min-w-0 px-1.5"
                            isIconOnly
                            radius="full"
                            size="sm"
                            variant={isSelected ? "solid" : "light"}
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
