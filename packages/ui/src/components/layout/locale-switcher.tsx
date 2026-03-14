import { type ReactElement, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

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

const LOCALE_ARIA_KEYS: Record<SupportedLocale, string> = {
    ru: "navigation:localeSwitcher.russianAriaLabel",
    en: "navigation:localeSwitcher.englishAriaLabel",
}

const LOCALE_SHORT_LABELS: Record<SupportedLocale, string> = {
    ru: "РУ",
    en: "EN",
}

const LOCALE_VALUES: ReadonlyArray<SupportedLocale> = ["ru", "en"]

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
    const { t } = useTranslation(["navigation"])
    const { locale, setLocale } = useLocale()

    const localeOptions = useMemo(
        (): ReadonlyArray<ILocaleOption> =>
            LOCALE_VALUES.map((value): ILocaleOption => ({
                ariaLabel: (t as unknown as (key: string) => string)(LOCALE_ARIA_KEYS[value]),
                shortLabel: LOCALE_SHORT_LABELS[value],
                value,
            })),
        [t],
    )

    const handleLocaleChange = useCallback(
        (nextLocale: SupportedLocale): void => {
            void setLocale(nextLocale)
        },
        [setLocale],
    )

    return (
        <div className={props.className}>
            <div
                aria-label={t("navigation:localeSwitcher.ariaLabel")}
                className="inline-flex items-center rounded-lg border border-border bg-header-bg p-0.5 backdrop-blur"
                role="radiogroup"
            >
                {localeOptions.map((option): ReactElement => {
                    const isSelected = option.value === locale

                    return (
                        <Button
                            key={option.value}
                            aria-label={option.ariaLabel}
                            aria-pressed={isSelected}
                            aria-selected={isSelected}
                            className="min-w-0 px-2 text-xs font-medium"
                            color="primary"
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
