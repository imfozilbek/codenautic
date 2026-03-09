/**
 * Internationalization utilities: locale resolution, i18n initialization,
 * localized date/number formatting, locale hook, and type definitions.
 */
export {
    SUPPORTED_LOCALES,
    type SupportedLocale,
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    resolveLocale,
    initializeI18n,
    getCurrentLocale,
    formatLocalizedDateTime,
    formatLocalizedNumber,
} from "./i18n"
export { I18N_RESOURCES, I18N_NAMESPACES } from "./i18n-resources"
export { type IUseLocaleReturn, useLocale, syncHtmlLangAttribute } from "./use-locale"
