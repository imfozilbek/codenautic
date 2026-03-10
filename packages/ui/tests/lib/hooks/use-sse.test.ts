import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSSEStream, type IUseSSEStreamResult } from "@/lib/hooks/use-sse"

/**
 * Контроллер для управления мок-EventSource в тестах.
 * Каждый новый экземпляр EventSource регистрируется здесь,
 * так что controller всегда управляет последним созданным source.
 */
interface IMockEventSourceController {
    /** Триггерит событие open на последнем созданном source. */
    readonly open: () => void
    /** Триггерит событие error на последнем созданном source. */
    readonly error: () => void
    /** Отправляет message event с данными. */
    readonly sendMessage: (data: string) => void
    /** Отправляет progress event с данными. */
    readonly sendProgress: (data: string) => void
    /** Отправляет done event с данными. */
    readonly sendDone: (data: string) => void
    /** Отправляет stream-error event с данными. */
    readonly sendStreamError: (data: string) => void
    /** Проверяет, закрыт ли последний source. */
    readonly isClosed: () => boolean
    /** Возвращает URL последнего source. */
    readonly getUrl: () => string
}

interface IMockEventSourceInstance {
    readonly listeners: Map<string, Set<(event: Event) => void>>
    closed: boolean
    url: string
}

/**
 * Устанавливает глобальный мок EventSource и возвращает контроллер.
 * Контроллер всегда работает с ПОСЛЕДНИМ созданным экземпляром EventSource.
 *
 * @returns Контроллер для управления EventSource.
 */
function installMockEventSource(): IMockEventSourceController {
    let latestInstance: IMockEventSourceInstance | undefined

    const dispatch = (type: string, event: Event): void => {
        if (latestInstance === undefined) {
            return
        }
        const typeListeners = latestInstance.listeners.get(type)
        if (typeListeners === undefined) {
            return
        }
        for (const listener of [...typeListeners]) {
            listener(event)
        }
    }

    class ControlledEventSource {
        public readyState = 0
        public readonly url: string
        private readonly instance: IMockEventSourceInstance

        public constructor(sourceUrl: string) {
            this.url = sourceUrl
            this.instance = {
                listeners: new Map(),
                closed: false,
                url: sourceUrl,
            }
            latestInstance = this.instance
        }

        public addEventListener(type: string, callback: (event: Event) => void): void {
            const existing = this.instance.listeners.get(type)
            if (existing !== undefined) {
                existing.add(callback)
                return
            }
            this.instance.listeners.set(type, new Set([callback]))
        }

        public removeEventListener(type: string, callback: (event: Event) => void): void {
            const existing = this.instance.listeners.get(type)
            if (existing !== undefined) {
                existing.delete(callback)
            }
        }

        public close(): void {
            this.instance.closed = true
            this.readyState = 2
        }
    }

    vi.stubGlobal("EventSource", ControlledEventSource)

    return {
        open: (): void => {
            dispatch("open", new Event("open"))
        },
        error: (): void => {
            dispatch("error", new Event("error"))
        },
        sendMessage: (data: string): void => {
            dispatch("message", new MessageEvent("message", { data }))
        },
        sendProgress: (data: string): void => {
            dispatch("progress", new MessageEvent("progress", { data }))
        },
        sendDone: (data: string): void => {
            dispatch("done", new MessageEvent("done", { data }))
        },
        sendStreamError: (data: string): void => {
            dispatch("stream-error", new MessageEvent("stream-error", { data }))
        },
        isClosed: (): boolean => latestInstance?.closed === true,
        getUrl: (): string => latestInstance?.url ?? "",
    }
}

describe("useSSEStream", (): void => {
    beforeEach((): void => {
        vi.useFakeTimers()
    })

    afterEach((): void => {
        vi.useRealTimers()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    describe("initialization", (): void => {
        it("when autoStart is true, then connects immediately", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: true,
                })
            })

            expect(result.current.state).toBe("connecting")
            expect(controller.getUrl()).toBe("http://localhost:3000/stream")
        })

        it("when autoStart is false, then stays idle", (): void => {
            installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: false,
                })
            })

            expect(result.current.state).toBe("idle")
        })

        it("when sourceUrl is empty, then sets error state", (): void => {
            installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "   ",
                    autoStart: true,
                })
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe("SSE source URL is empty.")
        })
    })

    describe("connection lifecycle", (): void => {
        it("when connection opens, then state becomes open", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            expect(result.current.state).toBe("open")
            expect(result.current.error).toBeUndefined()
        })

        it("when stop is called, then state becomes closed", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                result.current.stop()
            })

            expect(result.current.state).toBe("closed")
            expect(controller.isClosed()).toBe(true)
        })

        it("when start is called after idle, then connects", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: false,
                })
            })

            act((): void => {
                result.current.start()
            })

            expect(result.current.state).toBe("connecting")

            act((): void => {
                controller.open()
            })

            expect(result.current.state).toBe("open")
        })

        it("when start is called while already running, then does nothing", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                result.current.start()
            })

            expect(result.current.state).toBe("open")
        })
    })

    describe("message events", (): void => {
        it("when message event received, then appends to events", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendMessage(JSON.stringify({ message: "Hello world" }))
            })

            expect(result.current.events).toHaveLength(1)
            expect(result.current.events[0]?.type).toBe("message")
            expect(result.current.events[0]?.payload.message).toBe("Hello world")
        })

        it("when message data is not valid JSON, then wraps in message payload", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendMessage("plain text data")
            })

            expect(result.current.events).toHaveLength(1)
            expect(result.current.events[0]?.payload.message).toBe("plain text data")
        })

        it("when multiple messages received, then accumulates events", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendMessage(JSON.stringify({ message: "first" }))
                controller.sendMessage(JSON.stringify({ message: "second" }))
                controller.sendMessage(JSON.stringify({ message: "third" }))
            })

            expect(result.current.events).toHaveLength(3)
        })
    })

    describe("progress events", (): void => {
        it("when progress event received, then updates progress state", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(
                    JSON.stringify({ current: 5, total: 20, stage: "analyzing" }),
                )
            })

            expect(result.current.progressCurrent).toBe(5)
            expect(result.current.progressTotal).toBe(20)
        })

        it("when progress has negative current, then clamps to 0", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(JSON.stringify({ current: -5, total: 10 }))
            })

            expect(result.current.progressCurrent).toBe(0)
        })

        it("when progress has NaN value, then clamps to 0", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(JSON.stringify({ current: "not-a-number", total: 10 }))
            })

            expect(result.current.progressCurrent).toBe(0)
        })
    })

    describe("done event", (): void => {
        it("when done event received, then closes stream", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendDone(JSON.stringify({ message: "Complete" }))
            })

            expect(result.current.state).toBe("closed")
        })
    })

    describe("error events", (): void => {
        it("when stream-error event received, then sets error state", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendStreamError(JSON.stringify({ message: "Server error occurred" }))
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe("Server error occurred")
        })

        it("when stream-error has no message, then uses default error text", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendStreamError(JSON.stringify({}))
            })

            expect(result.current.state).toBe("error")
        })
    })

    describe("reconnection", (): void => {
        it("when connection error occurs, then state becomes reconnecting", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    maxReconnectAttempts: 3,
                    initialReconnectDelayMs: 100,
                })
            })

            act((): void => {
                controller.error()
            })

            expect(result.current.state).toBe("reconnecting")
        })

        it("when max reconnect attempts exceeded, then sets error state", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    maxReconnectAttempts: 1,
                    initialReconnectDelayMs: 50,
                })
            })

            act((): void => {
                controller.error()
            })

            expect(result.current.state).toBe("reconnecting")

            act((): void => {
                vi.advanceTimersByTime(50)
            })

            act((): void => {
                controller.error()
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe("Maximum reconnect attempts reached.")
        })

        it("when reconnect succeeds after error, then state becomes open", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    maxReconnectAttempts: 3,
                    initialReconnectDelayMs: 50,
                })
            })

            act((): void => {
                controller.error()
            })

            expect(result.current.state).toBe("reconnecting")

            act((): void => {
                vi.advanceTimersByTime(50)
            })

            act((): void => {
                controller.open()
            })

            expect(result.current.state).toBe("open")
        })
    })

    describe("start resets state", (): void => {
        it("when start is called after stop, then resets events and progress", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: false,
                })
            })

            act((): void => {
                result.current.start()
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(JSON.stringify({ current: 5, total: 10 }))
            })

            expect(result.current.progressCurrent).toBe(5)

            act((): void => {
                result.current.stop()
            })

            act((): void => {
                result.current.start()
            })

            act((): void => {
                controller.open()
            })

            expect(result.current.events).toHaveLength(0)
            expect(result.current.progressCurrent).toBe(0)
            expect(result.current.progressTotal).toBe(0)
        })
    })

    describe("EventSource unavailable", (): void => {
        it("when EventSource is not a function, then sets error state", (): void => {
            vi.stubGlobal("EventSource", undefined)

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: true,
                })
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe(
                "EventSource is not available in this environment.",
            )
        })
    })

    describe("EventSource constructor throws", (): void => {
        it("when EventSource constructor throws, then sets error with message", (): void => {
            vi.stubGlobal("EventSource", class {
                public constructor() {
                    throw new Error("Blocked by CSP")
                }
            })

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: true,
                })
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe("Blocked by CSP")
        })

        it("when EventSource constructor throws non-Error, then uses fallback message", (): void => {
            vi.stubGlobal("EventSource", class {
                public constructor() {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw "string error"
                }
            })

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    autoStart: true,
                })
            })

            expect(result.current.state).toBe("error")
            expect(result.current.error).toBe("Failed to initialize SSE connection.")
        })
    })

    describe("connection error when stopped", (): void => {
        it("when connection error occurs after stop, then sets closed state", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                    maxReconnectAttempts: 3,
                    initialReconnectDelayMs: 50,
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                result.current.stop()
            })

            act((): void => {
                controller.error()
            })

            expect(result.current.state).toBe("closed")
        })
    })

    describe("event limit", (): void => {
        it("when more than 100 events received, then keeps last 100", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                for (let index = 0; index < 105; index += 1) {
                    controller.sendMessage(
                        JSON.stringify({ message: `msg-${String(index)}` }),
                    )
                }
            })

            expect(result.current.events.length).toBeLessThanOrEqual(100)
        })
    })

    describe("progress clamp edge cases", (): void => {
        it("when progress current exceeds max, then clamps to max", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(
                    JSON.stringify({ current: 999999999999999, total: 10 }),
                )
            })

            expect(result.current.progressCurrent).toBe(999999999999999)
            expect(result.current.progressTotal).toBe(10)
        })

        it("when progress values are undefined, then clamps to 0", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendProgress(JSON.stringify({ stage: "analyzing" }))
            })

            expect(result.current.progressCurrent).toBe(0)
            expect(result.current.progressTotal).toBe(0)
        })
    })

    describe("parseSSEPayload edge cases", (): void => {
        it("when parsed JSON is an array (not record), then wraps in message", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendMessage("[1,2,3]")
            })

            expect(result.current.events).toHaveLength(1)
            expect(result.current.events[0]?.payload.message).toBe("[1,2,3]")
        })

        it("when parsed JSON has no message field, then uses raw data as message", (): void => {
            const controller = installMockEventSource()

            const { result } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            act((): void => {
                controller.sendMessage(JSON.stringify({ stage: "step1", current: 5, total: 10 }))
            })

            expect(result.current.events).toHaveLength(1)
            const payload = result.current.events[0]?.payload
            expect(payload?.stage).toBe("step1")
            expect(payload?.current).toBe(5)
            expect(payload?.total).toBe(10)
        })
    })

    describe("cleanup on unmount", (): void => {
        it("when hook unmounts, then stops the stream", (): void => {
            const controller = installMockEventSource()

            const { unmount } = renderHook((): IUseSSEStreamResult => {
                return useSSEStream({
                    sourceUrl: "http://localhost:3000/stream",
                })
            })

            act((): void => {
                controller.open()
            })

            unmount()

            expect(controller.isClosed()).toBe(true)
        })
    })
})
