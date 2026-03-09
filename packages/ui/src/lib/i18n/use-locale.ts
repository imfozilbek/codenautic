import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { type SupportedLocale, getCurrentLocale, resolveLocale } from "./i18n"

/**
 * Возвращаемое значение хука useLocale.
 */
export interface IUseLocaleReturn {
    /** Текущая активная локаль. */
    readonly locale: SupportedLocale
    /** Смена локали с персистентностью и обновлением html lang. */
    readonly setLocale: (nextLocale: SupportedLocale) => Promise<void>
}

/**
 * Хук для работы с текущей локалью приложения.
 * Обеспечивает реактивную смену языка, персистентность в localStorage
 * и обновление атрибута `lang` на `<html>`.
 *
 * @returns Текущая локаль и функция смены.
 */
export function useLocale(): IUseLocaleReturn {
    const { i18n } = useTranslation()

    const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language)

    const setLocale = useCallback(
        async (nextLocale: SupportedLocale): Promise<void> => {
            await i18n.changeLanguage(nextLocale)
            document.documentElement.lang = nextLocale
        },
        [i18n],
    )

    return { locale, setLocale }
}

/**
 * Синхронизирует атрибут `lang` на `<html>` с текущей локалью i18n.
 * Вызывается при инициализации приложения.
 *
 * @param locale Текущая локаль.
 */
export function syncHtmlLangAttribute(locale?: SupportedLocale): void {
    const resolved = locale ?? getCurrentLocale()
    document.documentElement.lang = resolved
}
