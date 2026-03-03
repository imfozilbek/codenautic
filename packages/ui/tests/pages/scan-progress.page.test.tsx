import { act, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ScanProgressPage } from "@/pages/scan-progress.page"
import { renderWithProviders } from "../utils/render"

const seedEvents: ReadonlyArray<{
    readonly etaSeconds: number
    readonly log: string
    readonly message: string
    readonly phase: "queue" | "clone" | "analysis" | "indexing" | "report"
    readonly percent: number
    readonly phaseCompleted: boolean
    readonly timestamp: string
}> = [
    {
        etaSeconds: 180,
        log: "Подготовка seed-данных",
        message: "Очередь сканирования активна",
        phase: "queue",
        percent: 12,
        phaseCompleted: false,
        timestamp: new Date("2026-01-01T10:00:00Z").toISOString(),
    },
    {
        etaSeconds: 120,
        log: "Код загружен и готов к анализу",
        message: "Считывание репозитория",
        phase: "clone",
        percent: 34,
        phaseCompleted: false,
        timestamp: new Date("2026-01-01T10:00:20Z").toISOString(),
    },
]

interface IMockEventSource {
    close: () => void
    emit: (payload: string) => void
}

const originalEventSource = globalThis.EventSource

afterEach((): void => {
    if (originalEventSource === undefined) {
        delete (globalThis as { EventSource?: typeof EventSource }).EventSource
    } else {
        globalThis.EventSource = originalEventSource
    }

    vi.restoreAllMocks()
})

describe("ScanProgressPage", (): void => {
    it("показывает прогресс и логи из seed событий", (): void => {
        renderWithProviders(
            <ScanProgressPage
                jobId="scan-job-seed"
                seedEvents={seedEvents}
            />,
        )

        expect(screen.getByText("Scan Progress")).not.toBeNull()
        expect(screen.getByText("queue")).not.toBeNull()
        expect(screen.getByText("clone")).not.toBeNull()
        expect(screen.getByText("Подготовка seed-данных")).not.toBeNull()
        expect(screen.getByText("Считывание репозитория")).not.toBeNull()
        expect(screen.getByText("Прогресс: 34%")).not.toBeNull()
    })

    it("добавляет обновления из EventSource потока", async (): Promise<void> => {
        const createdSources: Array<{
            emit: (payload: string) => void
            close: () => void
            readonly url: string
        }> = []

        class MockEventSource {
            public url: string
            public onmessage: ((event: MessageEvent) => void) | null = null
            public onerror: (() => void) | null = null
            public close: () => void

            public constructor(url: string) {
                this.url = url
                this.close = vi.fn()
                createdSources.push(this)
            }

            public emit(payload: string): void {
                this.onmessage?.({
                    data: payload,
                } as MessageEvent)
            }

            public emitError(): void {
                this.onerror?.()
            }
        }

        // @ts-expect-error mock EventSource only for test
        globalThis.EventSource = MockEventSource as IMockEventSource

        renderWithProviders(
            <ScanProgressPage
                eventSourceUrl="/api/v1/scans/progress"
                jobId="scan-stream"
                seedEvents={[]}
            />,
        )

        const source = createdSources.at(0)
        expect(source).not.toBeUndefined()
        expect(source?.url).toBe("/api/v1/scans/progress?jobId=scan-stream")

        act((): void => {
            source?.emit(
                JSON.stringify({
                    etaSeconds: 90,
                    log: "Отчёт получен",
                    message: "Сборка отчёта",
                    phase: "analysis",
                    percent: 56,
                    phaseCompleted: false,
                    timestamp: new Date("2026-01-01T10:00:40Z").toISOString(),
                }),
            )
        })

        expect(screen.getByText("Сборка отчёта")).not.toBeNull()
        expect(screen.getByText("Отчёт получен")).not.toBeNull()
        expect(screen.getByText("Прогресс: 56%")).not.toBeNull()
    })
})
