import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import i18next from "i18next"
import { afterAll, afterEach, beforeAll } from "vitest"

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, initializeI18n } from "@/lib/i18n/i18n"
import { server } from "./mocks/server"

const originalFetch = globalThis.fetch
const originalConsoleWarn = globalThis.console.warn
const originalConsoleError = globalThis.console.error
const DEFAULT_TEST_ELEMENT_WIDTH = 1024
const DEFAULT_TEST_ELEMENT_HEIGHT = 768
const RECHARTS_SIZE_WARNING = "of chart should be greater than 0"
const CONTROLLED_STATE_WARNING = "WARN: A component changed from uncontrolled to controlled."
const HEROUI_WARNING_PREFIX = "[HeroUI]"
const PRESS_RESPONDER_WARNING = "A PressResponder was rendered without a pressable child."
const SOCKET_HANG_UP_MESSAGE = "socket hang up"
const BENIGN_API_ERROR_MESSAGES = [
    "GET http://localhost:3000/api/v1/user/settings",
    "GET http://localhost:3000/api/v1/user/preferences",
    "GET http://localhost:3000/api/v1/health",
    "GET http://localhost:3000/api/v1/feature-flags",
]

class TestResizeObserver implements ResizeObserver {
    private readonly callback: ResizeObserverCallback

    public constructor(callback: ResizeObserverCallback) {
        this.callback = callback
    }

    public observe(target: Element): void {
        const contentRect = new DOMRectReadOnly(
            0,
            0,
            DEFAULT_TEST_ELEMENT_WIDTH,
            DEFAULT_TEST_ELEMENT_HEIGHT,
        )

        const entry = {
            target,
            contentRect,
        } as ResizeObserverEntry

        this.callback([entry], this)
    }

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

function defineGlobalResizeObserver(value: typeof ResizeObserver): void {
    Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        writable: true,
        value,
    })
}

function defineTestBoundingClientRect(target: object): void {
    const descriptor = Object.getOwnPropertyDescriptor(target, "getBoundingClientRect")
    if (descriptor?.configurable === false) {
        return
    }

    Object.defineProperty(target, "getBoundingClientRect", {
        configurable: true,
        value(): DOMRect {
            return new DOMRect(0, 0, DEFAULT_TEST_ELEMENT_WIDTH, DEFAULT_TEST_ELEMENT_HEIGHT)
        },
    })
}

function resolveConsoleMessage(args: ReadonlyArray<unknown>): string | undefined {
    const first = args[0]
    if (typeof first === "string") {
        return first
    }

    if (first instanceof Error) {
        return first.message
    }

    return undefined
}

function shouldSuppressTestConsoleNoise(args: ReadonlyArray<unknown>): boolean {
    const message = resolveConsoleMessage(args)
    if (message === undefined) {
        return false
    }

    if (message.includes(RECHARTS_SIZE_WARNING)) {
        return true
    }

    if (message.includes(CONTROLLED_STATE_WARNING)) {
        return true
    }

    if (message.includes(HEROUI_WARNING_PREFIX)) {
        return true
    }

    if (message.includes(PRESS_RESPONDER_WARNING)) {
        return true
    }

    if (message.includes(SOCKET_HANG_UP_MESSAGE)) {
        return true
    }

    return BENIGN_API_ERROR_MESSAGES.some((prefix): boolean => message.startsWith(prefix))
}

beforeAll(async (): Promise<void> => {
    defineReadonlyDimension(HTMLElement.prototype, "offsetWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "offsetHeight", DEFAULT_TEST_ELEMENT_HEIGHT)
    defineReadonlyDimension(HTMLElement.prototype, "clientWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "clientHeight", DEFAULT_TEST_ELEMENT_HEIGHT)
    defineTestBoundingClientRect(HTMLElement.prototype)
    defineGlobalResizeObserver(TestResizeObserver)
    Object.defineProperty(window, "confirm", {
        configurable: true,
        writable: true,
        value: (): boolean => true,
    })

    globalThis.console.warn = (...args: unknown[]): void => {
        if (shouldSuppressTestConsoleNoise(args)) {
            return
        }

        originalConsoleWarn(...args)
    }

    globalThis.console.error = (...args: unknown[]): void => {
        if (shouldSuppressTestConsoleNoise(args)) {
            return
        }

        originalConsoleError(...args)
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
    globalThis.console.warn = originalConsoleWarn
    globalThis.console.error = originalConsoleError
    server.close()
})
