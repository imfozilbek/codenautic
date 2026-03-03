import { type ReactElement } from "react"
import { Laptop, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui"
import { type ThemeMode, type ThemePresetId, useThemeMode } from "@/lib/theme/theme-provider"

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
    const activePreset = preset

    const getActivePresetLabel = (presetId: ThemePresetId): string => {
        const nextPreset = presets.find((themePreset): boolean => themePreset.id === presetId)
        if (nextPreset === undefined) {
            return presetId
        }

        return nextPreset.label
    }

    const activePalette =
        preset !== undefined ? presets.find((item): boolean => item.id === preset) : undefined
    const previewPalette = activePalette === undefined ? undefined : activePalette[resolvedMode]

    return (
        <div className={props.className}>
            <div className="flex flex-col gap-2">
                <div
                    aria-label="Theme mode"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white/85 p-1 backdrop-blur"
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
                                className="min-w-0 px-2"
                                radius="full"
                                role="radio"
                                size="sm"
                                variant={isSelected ? "solid" : "light"}
                                onPress={(): void => {
                                    setMode(option.value)
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
                <div className="flex flex-wrap items-center gap-2">
                    {presets.map((themePreset): ReactElement => {
                        const isActive = themePreset.id === activePreset
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
                                style={style}
                                variant={isActive ? "solid" : "light"}
                                onPress={(): void => {
                                    setPreset(themePreset.id)
                                }}
                            >
                                <span className="sr-only">{themePreset.label}</span>
                                <span
                                    aria-hidden="true"
                                    className="inline-block h-2 w-2 rounded-full border border-slate-900/20"
                                />
                            </Button>
                        )
                    })}
                </div>
                <p className="px-1 text-xs text-slate-600">
                    Preset: {getActivePresetLabel(activePreset)}
                </p>
                <p className="sr-only" aria-live="polite">
                    Active theme resolved mode is {resolvedMode}.
                </p>
            </div>
            {previewPalette === undefined ? null : (
                <div aria-hidden="true" className="mt-2 flex gap-2">
                    <span
                        className="h-3 w-8 rounded-full border border-slate-200"
                        style={{
                            backgroundColor: previewPalette.primary,
                        }}
                    />
                    <span
                        className="h-3 w-8 rounded-full border border-slate-200"
                        style={{
                            backgroundColor: previewPalette.accent,
                        }}
                    />
                    <span
                        className="h-3 w-8 rounded-full border border-slate-200"
                        style={{
                            backgroundColor: previewPalette.success,
                        }}
                    />
                </div>
            )}
        </div>
    )
}
