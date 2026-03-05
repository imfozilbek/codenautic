import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import i18next from "i18next"
import { afterAll, afterEach, beforeAll } from "vitest"

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, initializeI18n } from "@/lib/i18n/i18n"
import { server } from "./mocks/server"

const originalFetch = globalThis.fetch
const DEFAULT_TEST_ELEMENT_WIDTH = 1024
const DEFAULT_TEST_ELEMENT_HEIGHT = 768

class TestResizeObserver implements ResizeObserver {
    public constructor(callback: ResizeObserverCallback) {
        void callback
    }

    public observe(_target: Element): void {}

    public unobserve(_target: Element): void {}

    public disconnect(): void {}
}

function defineReadonlyDimension(target: object, property: string, value: number): void {
    const descriptor = Object.getOwnPropertyDescriptor(target, property)
    if (descriptor?.configurable === false) {
        return
    }

    Object.defineProperty(target, property, {
        configurable: true,
        get(): number {
            return value
        },
    })
}

beforeAll(async (): Promise<void> => {
    defineReadonlyDimension(HTMLElement.prototype, "offsetWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "offsetHeight", DEFAULT_TEST_ELEMENT_HEIGHT)
    defineReadonlyDimension(HTMLElement.prototype, "clientWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "clientHeight", DEFAULT_TEST_ELEMENT_HEIGHT)

    if (globalThis.ResizeObserver === undefined) {
        globalThis.ResizeObserver = TestResizeObserver
    }

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
