import { type ReactElement } from "react"

import { Laptop, Moon, Sun } from "@/components/icons/app-icons"
import { Button } from "@/components/ui"
import {
    type ThemeMode,
    type ThemePresetId,
    type IThemePreset,
    useThemeMode,
} from "@/lib/theme/theme-provider"

const MODE_OPTIONS: ReadonlyArray<{
    /** Значение режима. */
    readonly value: ThemeMode
    /** Иконка режима. */
    readonly Icon: typeof Moon
    /** Читаемое название. */
    readonly label: string
    /** aria-метка. */
    readonly ariaLabel: string
}> = [
    {
        Icon: Moon,
        ariaLabel: "Use dark theme",
        label: "Dark",
        value: "dark",
    },
    {
        Icon: Laptop,
        ariaLabel: "Use system theme",
        label: "System",
        value: "system",
    },
    {
        Icon: Sun,
        ariaLabel: "Use light theme",
        label: "Light",
        value: "light",
    },
]

/**
 * Свойства компонента переключателя темы.
 */
export interface IThemeToggleProps {
    /** Дополнительный CSS-класс контейнера. */
    readonly className?: string
}

/**
 * Переключатель режима темы с HeroUI-кнопками и поддержкой system режима.
 *
 * @param props Конфигурация внешнего вида.
 * @returns Блок с тремя кнопками выбора `light`, `system`, `dark`.
 */
export function ThemeToggle(props: IThemeToggleProps): ReactElement {
    const { mode, preset, presets, resolvedMode, setMode, setPreset } = useThemeMode()
    const previewPalette = getPresetPalette(presets, preset, resolvedMode)

    return (
        <div className={props.className}>
            <div className="flex flex-col gap-2">
                <ThemeModeButtons currentMode={mode} onModeChange={setMode} />
                <ThemePresetButtons
                    currentPreset={preset}
                    onPresetChange={(nextPreset): void => {
                        setPreset(nextPreset as ThemePresetId)
                    }}
                    presets={presets}
                />
                <p className="px-1 text-xs text-text-secondary">
                    Preset: {getPresetLabel(presets, preset)}
                </p>
                <p className="sr-only" aria-live="polite">
                    Active theme resolved mode is {resolvedMode}.
                </p>
            </div>
            <ThemePalettePreview palette={previewPalette} />
        </div>
    )
}

function ThemeModeButtons({
    currentMode,
    onModeChange,
}: {
    readonly currentMode: ThemeMode
    readonly onModeChange: (nextMode: ThemeMode) => void
}): ReactElement {
    return (
        <div
            aria-label="Theme mode"
            className="inline-flex items-center rounded-lg border border-border bg-[color:color-mix(in_oklab,var(--surface)_85%,transparent)] p-1 backdrop-blur"
            role="radiogroup"
        >
            {MODE_OPTIONS.map((option): ReactElement => {
                const Icon = option.Icon
                const isSelected = option.value === currentMode

                return (
                    <Button
                        key={option.value}
                        aria-label={option.ariaLabel}
                        aria-pressed={isSelected}
                        aria-selected={isSelected}
                        className="min-w-0 px-2"
                        color="primary"
                        radius="full"
                        size="sm"
                        variant={isSelected ? "solid" : "light"}
                        onPress={(): void => {
                            onModeChange(option.value)
                        }}
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Icon size={14} />
                            <span className="hidden sm:inline">{option.label}</span>
                        </span>
                    </Button>
                )
            })}
        </div>
    )
}

function ThemePresetButtons({
    currentPreset,
    onPresetChange,
    presets,
}: {
    readonly currentPreset: string
    readonly onPresetChange: (nextPreset: string) => void
    readonly presets: ReadonlyArray<IThemePreset>
}): ReactElement {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {presets.map((themePreset): ReactElement => {
                const isActive = themePreset.id === currentPreset
                const style = {
                    background: `linear-gradient(135deg, ${themePreset.light.primary} 0%, ${themePreset.light.accent} 45%, ${themePreset.light.surface} 100%)`,
                }

                return (
                    <Button
                        key={themePreset.id}
                        aria-label={`Set ${themePreset.label} theme preset`}
                        aria-pressed={isActive}
                        className="min-w-0"
                        radius="full"
                        size="sm"
                        color="primary"
                        style={style}
                        variant={isActive ? "solid" : "light"}
                        onPress={(): void => {
                            onPresetChange(themePreset.id)
                        }}
                    >
                        <span className="sr-only">{themePreset.label}</span>
                        <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2 rounded-full border border-[color:color-mix(in_oklab,var(--foreground)_20%,transparent)]"
                        />
                    </Button>
                )
            })}
        </div>
    )
}

function ThemePalettePreview({
    palette,
}: {
    readonly palette:
        | {
              readonly primary: string
              readonly accent: string
              readonly success: string
          }
        | undefined
}): ReactElement | null {
    if (palette === undefined) {
        return null
    }

    return (
        <div aria-hidden="true" className="mt-2 flex gap-2">
            <span
                className="h-3 w-8 rounded-full border border-border"
                style={{ backgroundColor: palette.primary }}
            />
            <span
                className="h-3 w-8 rounded-full border border-border"
                style={{ backgroundColor: palette.accent }}
            />
            <span
                className="h-3 w-8 rounded-full border border-border"
                style={{ backgroundColor: palette.success }}
            />
        </div>
    )
}

function getPresetLabel(presets: ReadonlyArray<IThemePreset>, presetId: string): string {
    const nextPreset = presets.find((themePreset): boolean => themePreset.id === presetId)
    if (nextPreset === undefined) {
        return presetId
    }

    return nextPreset.label
}

function getPresetPalette(
    presets: ReadonlyArray<{
        readonly id: string
        readonly light: Record<"primary" | "accent" | "success", string>
        readonly dark: Record<"primary" | "accent" | "success", string>
    }>,
    presetId: string,
    resolvedMode: "light" | "dark",
): { readonly primary: string; readonly accent: string; readonly success: string } | undefined {
    const activePreset = presets.find((item): boolean => item.id === presetId)
    if (activePreset === undefined) {
        return undefined
    }

    return resolvedMode === "light" ? activePreset.light : activePreset.dark
}
