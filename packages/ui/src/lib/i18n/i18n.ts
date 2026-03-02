import i18n, {type i18n as II18n} from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import {initReactI18next} from "react-i18next"

export const SUPPORTED_LOCALES = ["en", "ru"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = "ru"
export const LOCALE_STORAGE_KEY = "codenautic.ui.locale"

const resources = {
    en: {
        common: {
            appTitle: "CodeNautic Runtime",
            retry: "Retry",
            loading: "Checking API availability...",
        },
        system: {
            healthStatus: "API status",
            service: "Service",
            timestamp: "Timestamp",
            unavailable: "Failed to fetch API status",
            noData: "No API status data",
        },
        auth: {
            checkingSession: "Checking current session...",
            loginTitle: "Sign in to open dashboard",
            oauthStartFailed: "Failed to start OAuth authorization. Please try again.",
            logout: "Log out",
            logoutFailed: "Failed to complete logout. Please try again.",
        },
    },
    ru: {
        common: {
            appTitle: "CodeNautic Runtime",
            retry: "Повторить проверку",
            loading: "Проверяем доступность API...",
        },
        system: {
            healthStatus: "Состояние API",
            service: "Сервис",
            timestamp: "Время",
            unavailable: "Не удалось получить статус API",
            noData: "Нет данных о состоянии API",
        },
        auth: {
            checkingSession: "Проверяем активную сессию...",
            loginTitle: "Войдите, чтобы открыть dashboard",
            oauthStartFailed: "Не удалось начать OAuth авторизацию. Повторите попытку.",
            logout: "Выйти",
            logoutFailed: "Не удалось завершить сессию. Повторите попытку.",
        },
    },
} as const

let initializationPromise: Promise<void> | null = null

/**
 * Возвращает поддерживаемый locale из произвольного входного значения.
 *
 * @param rawLocale Локаль из окружения/хранилища.
 * @returns Нормализованная локаль `en` или `ru`.
 */
export function resolveLocale(rawLocale: string | undefined): SupportedLocale {
    if (rawLocale === undefined) {
        return DEFAULT_LOCALE
    }

    const normalized = rawLocale.toLowerCase().split("-")[0]
    if (normalized === "en" || normalized === "ru") {
        return normalized
    }

    return DEFAULT_LOCALE
}

/**
 * Инициализирует i18n для UI с language detection и persisted locale.
 *
 * @param instance Экземпляр i18n.
 * @returns Promise завершения инициализации.
 */
export function initializeI18n(instance: II18n = i18n): Promise<void> {
    if (instance === i18n) {
        if (initializationPromise !== null) {
            return initializationPromise
        }

        initializationPromise = initializeInstance(instance)
        return initializationPromise
    }

    return initializeInstance(instance)
}

/**
 * Возвращает текущую локаль активного i18n-экземпляра.
 *
 * @param instance Экземпляр i18n.
 * @returns Текущая поддерживаемая локаль.
 */
export function getCurrentLocale(instance: II18n = i18n): SupportedLocale {
    const resolved = instance.resolvedLanguage ?? instance.language
    return resolveLocale(resolved)
}

/**
 * Форматирует дату/время через Intl в контексте активной локали.
 *
 * @param value ISO-строка или Date.
 * @param locale Локаль форматирования.
 * @returns Локализованная строка даты.
 */
export function formatLocalizedDateTime(value: string | Date, locale: SupportedLocale): string {
    const asDate = typeof value === "string" ? new Date(value) : value
    if (Number.isNaN(asDate.getTime())) {
        return ""
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(asDate)
}

/**
 * Форматирует числовое значение через Intl.
 *
 * @param value Число для форматирования.
 * @param locale Локаль форматирования.
 * @returns Локализованная числовая строка.
 */
export function formatLocalizedNumber(value: number, locale: SupportedLocale): string {
    return new Intl.NumberFormat(locale).format(value)
}

async function initializeInstance(instance: II18n): Promise<void> {
    if (instance.isInitialized) {
        return
    }

    instance.use(LanguageDetector).use(initReactI18next)
    await instance.init({
        resources,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: SUPPORTED_LOCALES,
        defaultNS: "common",
        ns: ["common", "system", "auth"],
        interpolation: {
            escapeValue: false,
        },
        returnNull: false,
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
            lookupLocalStorage: LOCALE_STORAGE_KEY,
        },
    })
}
