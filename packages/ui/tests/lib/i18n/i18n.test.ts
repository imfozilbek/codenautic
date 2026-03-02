import {createInstance} from "i18next"
import {describe, expect, it} from "vitest"

import {
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    formatLocalizedDateTime,
    formatLocalizedNumber,
    getCurrentLocale,
    initializeI18n,
    resolveLocale,
} from "@/lib/i18n/i18n"

describe("i18n", (): void => {
    it("нормализует и валидирует локали", (): void => {
        expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE)
        expect(resolveLocale("EN")).toBe("en")
        expect(resolveLocale("ru-RU")).toBe("ru")
        expect(resolveLocale("de")).toBe(DEFAULT_LOCALE)
    })

    it("инициализирует i18n с persisted locale из localStorage", async (): Promise<void> => {
        localStorage.setItem(LOCALE_STORAGE_KEY, "en")
        const instance = createInstance()

        await initializeI18n(instance)

        expect(getCurrentLocale(instance)).toBe("en")
        expect(instance.t("common:loading")).toBe("Checking API availability...")
        expect(instance.t("auth:loginTitle")).toBe("Sign in to open dashboard")
    })

    it("возвращает тот же promise при повторной инициализации глобального i18n", (): void => {
        const first = initializeI18n()
        const second = initializeI18n()

        expect(first).toBe(second)
    })

    it("корректно обрабатывает повторную инициализацию уже готового instance", async (): Promise<void> => {
        const instance = createInstance()
        await initializeI18n(instance)
        await initializeI18n(instance)

        expect(instance.isInitialized).toBe(true)
    })

    it("форматирует даты и числа через Intl", (): void => {
        const date = formatLocalizedDateTime("2026-03-02T10:00:00.000Z", "en")
        const number = formatLocalizedNumber(1234567, "ru")

        expect(date.length > 0).toBe(true)
        expect(number).toBe("1 234 567")
    })

    it("возвращает пустую строку для невалидной даты", (): void => {
        expect(formatLocalizedDateTime("not-a-date", "en")).toBe("")
    })
})
