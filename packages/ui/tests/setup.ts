import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import i18next from "i18next"
import { afterAll, afterEach, beforeAll } from "vitest"

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, initializeI18n } from "@/lib/i18n/i18n"
import { server } from "./mocks/server"

const originalFetch = globalThis.fetch
const originalConsoleWarn = globalThis.console.warn
const originalConsoleError = globalThis.console.error
const processRef = globalThis.process
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
const BENIGN_SOCKET_ERROR_CODES = new Set<string>(["ECONNRESET", "ECONNREFUSED"])
let unhandledRejectionCleanup: (() => void) | undefined

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

class TestEventSource {
    public static readonly CONNECTING = 0
    public static readonly OPEN = 1
    public static readonly CLOSED = 2
    public readonly CONNECTING = 0
    public readonly OPEN = 1
    public readonly CLOSED = 2
    public readonly url: string
    public readonly withCredentials = false
    public readyState = TestEventSource.OPEN
    public onerror: ((this: EventSource, ev: Event) => void) | null = null
    public onmessage: ((this: EventSource, ev: MessageEvent<string>) => void) | null = null
    public onopen: ((this: EventSource, ev: Event) => void) | null = null
    private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

    public constructor(url: string | URL) {
        this.url = String(url)
    }

    public addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
    ): void {
        if (callback === null) {
            return
        }

        const existingListeners = this.listeners.get(type)
        if (existingListeners !== undefined) {
            existingListeners.add(callback)
            return
        }

        this.listeners.set(type, new Set([callback]))
    }

    public removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
    ): void {
        if (callback === null) {
            return
        }

        const existingListeners = this.listeners.get(type)
        if (existingListeners === undefined) {
            return
        }

        existingListeners.delete(callback)
    }

    public close(): void {
        this.readyState = TestEventSource.CLOSED
    }

    public dispatchEvent(event: Event): boolean {
        const listeners = this.listeners.get(event.type)
        if (listeners === undefined) {
            return true
        }

        listeners.forEach((listener): void => {
            if (typeof listener === "function") {
                listener(event)
                return
            }

            listener.handleEvent(event)
        })

        return true
    }
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

function defineGlobalEventSource(value: typeof EventSource): void {
    Object.defineProperty(globalThis, "EventSource", {
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

function readErrorCode(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined
    }

    const code = (value as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
}

function shouldSuppressUnhandledRejection(reason: unknown): boolean {
    const code = readErrorCode(reason)
    if (code !== undefined && BENIGN_SOCKET_ERROR_CODES.has(code)) {
        return true
    }

    if (reason instanceof Error) {
        const message = reason.message.toLowerCase()
        if (message.includes("socket hang up")) {
            return true
        }

        if (message.includes("econnrefused")) {
            return true
        }
    }

    return false
}

function installUnhandledRejectionFilter(): void {
    if (processRef === undefined) {
        return
    }

    const onUnhandledRejection = (reason: unknown): void => {
        if (shouldSuppressUnhandledRejection(reason)) {
            return
        }

        originalConsoleError(reason)
    }

    processRef.on("unhandledRejection", onUnhandledRejection)
    unhandledRejectionCleanup = (): void => {
        processRef.off("unhandledRejection", onUnhandledRejection)
    }
}

function installTestConsoleNoiseFilter(): void {
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
}

installTestConsoleNoiseFilter()
installUnhandledRejectionFilter()

beforeAll(async (): Promise<void> => {
    defineReadonlyDimension(HTMLElement.prototype, "offsetWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "offsetHeight", DEFAULT_TEST_ELEMENT_HEIGHT)
    defineReadonlyDimension(HTMLElement.prototype, "clientWidth", DEFAULT_TEST_ELEMENT_WIDTH)
    defineReadonlyDimension(HTMLElement.prototype, "clientHeight", DEFAULT_TEST_ELEMENT_HEIGHT)
    defineTestBoundingClientRect(HTMLElement.prototype)
    defineGlobalResizeObserver(TestResizeObserver)
    defineGlobalEventSource(TestEventSource as unknown as typeof EventSource)
    Object.defineProperty(window, "confirm", {
        configurable: true,
        writable: true,
        value: (): boolean => true,
    })

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
    unhandledRejectionCleanup?.()
    server.close()
})
