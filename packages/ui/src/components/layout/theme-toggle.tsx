import {type ReactElement} from "react"
import {Moon, Sun, SunMoon} from "lucide-react"
import {Button} from "@/components/ui"
import {useThemeMode} from "@/lib/theme/theme-provider"

/**
 * Свойства компонента переключателя темы.
 */
export interface IThemeToggleProps {
    /** Дополнительный CSS-класс контейнера. */
    readonly className?: string
}

const THEME_OPTIONS = [
    {
        ariaLabel: "Use dark theme",
        icon: Moon,
        label: "Dark",
        value: "dark",
    },
    {
        ariaLabel: "Use system theme",
        icon: SunMoon,
        label: "System",
        value: "system",
    },
    {
        ariaLabel: "Use light theme",
        icon: Sun,
        label: "Light",
        value: "light",
    },
] as const

/**
 * Переключатель режима темы с HeroUI-кнопками и поддержкой system режима.
 *
 * @param props Конфигурация внешнего вида.
 * @returns Блок с тремя кнопками выбора `light`, `system`, `dark`.
 */
export function ThemeToggle(props: IThemeToggleProps): ReactElement {
    const {setMode, mode} = useThemeMode()
    const activeMode = mode

    return (
        <div className={props.className}>
            <div
                aria-label="Theme mode"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white/85 p-1 backdrop-blur"
                role="radiogroup"
            >
                {THEME_OPTIONS.map((option): ReactElement => {
                    const Icon = option.icon
                    const isSelected = activeMode === option.value

                    return (
                        <Button
                            key={option.value}
                            aria-label={option.ariaLabel}
                            aria-pressed={isSelected}
                            radius="full"
                            size="sm"
                            variant={isSelected ? "solid" : "light"}
                            onPress={(): void => {
                                setMode(option.value)
                            }}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Icon size={16} />
                                {option.label}
                            </span>
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
