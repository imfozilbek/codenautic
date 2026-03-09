import i18next from "i18next"
import { afterEach, describe, expect, it } from "vitest"

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "@/lib/i18n/i18n"
import { syncHtmlLangAttribute } from "@/lib/i18n/use-locale"

describe("syncHtmlLangAttribute", (): void => {
    afterEach((): void => {
        document.documentElement.lang = ""
    })

    it("when called without argument, then sets html lang to current i18n locale", (): void => {
        syncHtmlLangAttribute()

        expect(document.documentElement.lang).toBe(DEFAULT_LOCALE)
    })

    it("when called with explicit locale, then sets html lang to that locale", (): void => {
        syncHtmlLangAttribute("en")

        expect(document.documentElement.lang).toBe("en")
    })

    it("when called with 'ru', then sets html lang to 'ru'", (): void => {
        syncHtmlLangAttribute("ru")

        expect(document.documentElement.lang).toBe("ru")
    })
})

describe("useLocale integration", (): void => {
    afterEach(async (): Promise<void> => {
        localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)
        await i18next.changeLanguage(DEFAULT_LOCALE)
    })

    it("when i18n language changes, then getCurrentLocale reflects new value", async (): Promise<void> => {
        await i18next.changeLanguage("en")

        const resolved = i18next.resolvedLanguage ?? i18next.language

        expect(resolved).toBe("en")
    })

    it("when i18n language is set to 'ru', then resolvedLanguage is 'ru'", async (): Promise<void> => {
        await i18next.changeLanguage("ru")

        const resolved = i18next.resolvedLanguage ?? i18next.language

        expect(resolved).toBe("ru")
    })
})
