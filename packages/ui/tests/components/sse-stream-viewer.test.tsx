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

    public addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
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

        const event = new MessageEvent("message", { data: payload })
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
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Review stream" />,
        )

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
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Review stream" />,
        )

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

    it("позволяет повторно запустить поток после стартовой ошибки и смены URL", async (): Promise<void> => {
        const renderResult = renderWithProviders(
            <SseStreamViewer autoStart={false} eventSourceUrl="" title="Review stream" />,
        )

        await act(async (): Promise<void> => {
            screen.getByRole("button", { name: "Start" }).click()
        })
        expect(screen.getByText("SSE source URL is empty.")).not.toBeNull()
        expect(mockSources).toHaveLength(0)

        renderResult.rerender(
            <SseStreamViewer
                autoStart={false}
                eventSourceUrl="/api/v1/stream"
                title="Review stream"
            />,
        )

        await act(async (): Promise<void> => {
            screen.getByRole("button", { name: "Start" }).click()
        })

        expect(mockSources).toHaveLength(1)
        expect(mockSources[0]?.url).toBe("/api/v1/stream")
    })

    it("отображает idle state text при начальном рендере без autoStart", (): void => {
        renderWithProviders(
            <SseStreamViewer
                autoStart={false}
                eventSourceUrl="/api/v1/stream"
                title="Test stream"
            />,
        )

        expect(screen.getByText(/Статус:.*Idle/)).not.toBeNull()
        expect(screen.getByText("Ожидание событий")).not.toBeNull()
    })

    it("отображает заголовок и секцию Event log", (): void => {
        renderWithProviders(
            <SseStreamViewer
                autoStart={false}
                eventSourceUrl="/api/v1/stream"
                title="My Stream"
            />,
        )

        expect(screen.getByText("My Stream")).not.toBeNull()
        expect(screen.getByText("Event log")).not.toBeNull()
    })

    it("показывает 'Нет данных о прогрессе' когда прогресс отсутствует", (): void => {
        renderWithProviders(
            <SseStreamViewer
                autoStart={false}
                eventSourceUrl="/api/v1/stream"
                title="No progress stream"
            />,
        )

        expect(screen.getByText("Нет данных о прогрессе.")).not.toBeNull()
    })

    it("показывает progress bar при получении progress событий", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Progress stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit(
                "progress",
                JSON.stringify({
                    current: 3,
                    message: "Processing",
                    total: 10,
                }),
            )
        })

        const progressBar = screen.queryByRole("progressbar", { name: "Stream progress" })
        expect(progressBar).not.toBeNull()
    })

    it("рендерит done событие с меткой 'Done'", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Done stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit(
                "done",
                JSON.stringify({ message: "All done" }),
            )
        })

        expect(screen.getByText("Done")).not.toBeNull()
        expect(screen.getByText("All done")).not.toBeNull()
    })

    it("рендерит error событие с текстом ошибки", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Error stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit(
                "stream-error",
                JSON.stringify({ message: "Something went wrong" }),
            )
        })

        expect(screen.getByText("Error")).not.toBeNull()
    })

    it("рендерит message событие с текстом", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Message stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit("message", "Hello from server")
        })

        expect(screen.getByText("Message")).not.toBeNull()
        expect(screen.getByText("Hello from server")).not.toBeNull()
    })

    it("показывает статус 'Live' при открытом соединении", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Test stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
        })

        expect(screen.getByText(/Статус:.*Live/)).not.toBeNull()
    })

    it("ограничивает количество отображаемых событий через maxEvents", (): void => {
        renderWithProviders(
            <SseStreamViewer
                eventSourceUrl="/api/v1/stream"
                maxEvents={2}
                title="Limited stream"
            />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit("message", "msg 1")
            source?.emit("message", "msg 2")
            source?.emit("message", "msg 3")
        })

        const logItems = screen.getByRole("log", { name: "stream events" })
        const listItems = logItems.querySelectorAll("li")
        expect(listItems.length).toBeLessThanOrEqual(2)
    })

    it("позволяет остановить поток через кнопку Stop", async (): Promise<void> => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Stoppable stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
        })

        await act(async (): Promise<void> => {
            screen.getByRole("button", { name: "Stop" }).click()
        })

        expect(source?.close).toHaveBeenCalled()
    })

    it("рендерит progress событие с stage информацией", (): void => {
        renderWithProviders(
            <SseStreamViewer eventSourceUrl="/api/v1/stream" title="Stage stream" />,
        )

        const source = mockSources.at(0)
        expect(source).not.toBeUndefined()

        act((): void => {
            source?.emit("open", "")
            source?.emit(
                "progress",
                JSON.stringify({
                    current: 1,
                    message: "Running stage",
                    stage: "analysis",
                    total: 5,
                }),
            )
        })

        expect(screen.getByText("Progress")).not.toBeNull()
    })
})
