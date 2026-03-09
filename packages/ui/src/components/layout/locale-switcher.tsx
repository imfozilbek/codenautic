import { type ReactElement, useCallback } from "react"

import { Button } from "@/components/ui"
import { type SupportedLocale, useLocale } from "@/lib/i18n"

/**
 * Опция переключателя локали.
 */
interface ILocaleOption {
    /** Значение локали. */
    readonly value: SupportedLocale
    /** Короткая метка для кнопки. */
    readonly shortLabel: string
    /** Доступная метка для screen readers. */
    readonly ariaLabel: string
}

const LOCALE_OPTIONS: ReadonlyArray<ILocaleOption> = [
    {
        ariaLabel: "Русский язык",
        shortLabel: "РУ",
        value: "ru",
    },
    {
        ariaLabel: "English language",
        shortLabel: "EN",
        value: "en",
    },
]

/**
 * Props для компонента переключателя языка.
 */
export interface ILocaleSwitcherProps {
    /** Дополнительный CSS-класс. */
    readonly className?: string
}

/**
 * Компактный переключатель языка интерфейса.
 * Отображает радиогруппу с кнопками РУ / EN.
 * Смена языка сохраняется в localStorage и обновляет `<html lang>`.
 *
 * @param props Конфигурация компонента.
 * @returns Переключатель языка.
 */
export function LocaleSwitcher(props: ILocaleSwitcherProps): ReactElement {
    const { locale, setLocale } = useLocale()

    const handleLocaleChange = useCallback(
        (nextLocale: SupportedLocale): void => {
            void setLocale(nextLocale)
        },
        [setLocale],
    )

    return (
        <div className={props.className}>
            <div
                aria-label="Language switcher"
                className="inline-flex items-center rounded-lg border border-border bg-header-bg p-0.5 backdrop-blur"
                role="radiogroup"
            >
                {LOCALE_OPTIONS.map((option): ReactElement => {
                    const isSelected = option.value === locale

                    return (
                        <Button
                            key={option.value}
                            aria-label={option.ariaLabel}
                            aria-pressed={isSelected}
                            aria-selected={isSelected}
                            className="min-w-0 px-2 text-xs font-medium"
                            radius="full"
                            size="sm"
                            variant={isSelected ? "solid" : "light"}
                            onPress={(): void => {
                                handleLocaleChange(option.value)
                            }}
                        >
                            {option.shortLabel}
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
