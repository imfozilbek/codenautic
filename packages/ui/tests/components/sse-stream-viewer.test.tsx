import { act, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SseStreamViewer } from "@/components/streaming/sse-stream-viewer"
import { renderWithProviders } from "../utils/render"

interface IMockEventSource {
    close: () => void
    emit: (eventType: string, payload: string) => void
    url: string
}

class MockEventSource {
    public close: () => void
    public readonly url: string
    private readonly listeners: Record<string, Array<(event: MessageEvent<string>) => void>>

    public constructor(url: string) {
        this.url = url
        this.close = vi.fn()
        this.listeners = {}

        mockSources.push(this)
    }

    public addEventListener(
        type: string,
        listener: (event: MessageEvent<string>) => void,
    ): void {
        const previousListeners = this.listeners[type]

        if (previousListeners === undefined) {
            this.listeners[type] = [listener]
            return
        }

        previousListeners.push(listener)
    }

    public emit(eventType: string, payload: string): void {
        const listeners = this.listeners[eventType]
        if (listeners === undefined) {
            return
        }

        const event = { data: payload } as MessageEvent<string>
        listeners.forEach((listener): void => {
            listener(event)
        })
    }
}

const mockSources: Array<MockEventSource> = []
const originalEventSource = globalThis.EventSource

beforeEach((): void => {
    mockSources.length = 0
    // @ts-expect-error mock EventSource only for test
    globalThis.EventSource = MockEventSource as IMockEventSource
})

afterEach((): void => {
    if (originalEventSource === undefined) {
        delete (globalThis as { EventSource?: typeof EventSource }).EventSource
    } else {
        globalThis.EventSource = originalEventSource
    }

    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe("SseStreamViewer", (): void => {
    it("отображает progress и обычные события из потока", (): void => {
        renderWithProviders(<SseStreamViewer eventSourceUrl="/api/v1/stream" title="Review stream" />)

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit(
                "progress",
                JSON.stringify({
                    current: 2,
                    message: "Analysis running",
                    stage: "analysis",
                    total: 5,
                }),
            )
            source?.emit("message", "analysis done")
        })

        expect(screen.getByRole("log", { name: "stream events" })).not.toBeNull()
    })

    it("переподключается после временной ошибки", async (): Promise<void> => {
        vi.useFakeTimers()
        renderWithProviders(<SseStreamViewer eventSourceUrl="/api/v1/stream" title="Review stream" />)

        const firstSource = mockSources.at(0)
        expect(firstSource).not.toBeUndefined()

        act((): void => {
            firstSource?.emit("error", "temporary")
        })

        await vi.advanceTimersToNextTimerAsync()
        const secondSource = mockSources.at(1)
        expect(secondSource).not.toBeUndefined()
        expect(mockSources.length).toBeGreaterThanOrEqual(2)
    })
})
