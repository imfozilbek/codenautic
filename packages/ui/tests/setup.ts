import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import i18next from "i18next"
import { afterAll, afterEach, beforeAll } from "vitest"

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, initializeI18n } from "@/lib/i18n/i18n"
import { server } from "./mocks/server"

const originalFetch = globalThis.fetch

beforeAll(async (): Promise<void> => {
    sessionStorage.clear()
    localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)
    await initializeI18n()
    server.listen({
        onUnhandledRequest: "error",
    })
})

afterEach(async (): Promise<void> => {
    cleanup()
    server.resetHandlers()
    sessionStorage.clear()
    localStorage.clear()
    localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)
    await i18next.changeLanguage(DEFAULT_LOCALE)
    globalThis.fetch = originalFetch
})

afterAll((): void => {
    server.close()
})
