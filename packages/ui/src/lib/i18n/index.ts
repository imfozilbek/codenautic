/**
 * Internationalization utilities: locale resolution, i18n initialization,
 * and localized date/number formatting.
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
