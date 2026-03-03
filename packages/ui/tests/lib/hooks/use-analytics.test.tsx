import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AnalyticsProvider, useAnalytics } from "@/lib/analytics/analytics-context"
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/analytics-types"

function createInMemoryStorage(): Storage {
    const data = new Map<string, string>()

    return {
        get length(): number {
            return data.size
        },
        clear(): void {
            data.clear()
        },
        getItem(key: string): string | null {
            return data.get(key) ?? null
        },
        key(index: number): string | null {
            return Array.from(data.keys())[index] ?? null
        },
        removeItem(key: string): void {
            data.delete(key)
        },
        setItem(key: string, value: string): void {
            data.set(key, value)
        },
    }
}

function AnalyticsProbe({ onFlush }: { readonly onFlush: () => void }): JSX.Element {
    const analytics = useAnalytics()

    return (
        <div>
            <p data-testid="consent">{analytics.consent}</p>
            <p data-testid="pending">{analytics.pendingEventsCount}</p>
            <p data-testid="session">{analytics.sessionId}</p>
            <button
                data-testid="track-key-action"
                onClick={(): void => {
                    analytics.trackKeyAction({
                        action: "open-dashboard",
                        target: "analytics-screen",
                    })
                }}
                type="button"
            >
                Track key action
            </button>
            <button
                data-testid="track-funnel"
                onClick={(): void => {
                    analytics.trackFunnelStep({
                        funnel: "review-flow",
                        stepIndex: 1,
                        stepName: "open",
                        status: "entered",
                    })
                }}
                type="button"
            >
                Track funnel
            </button>
            <button
                data-testid="consent-deny"
                onClick={(): void => {
                    analytics.setConsent("denied")
                }}
                type="button"
            >
                Deny consent
            </button>
            <button
                data-testid="flush"
                onClick={async (): Promise<void> => {
                    await analytics.flush()
                    onFlush()
                }}
                type="button"
            >
                Flush
            </button>
            <button
                data-testid="track-raw"
                onClick={(): void => {
                    analytics.track(ANALYTICS_EVENT_NAMES.timeToFirstValue, {
                        funnel: "review-flow",
                        millisecondsToValue: 100,
                    })
                }}
                type="button"
            >
                Track raw
            </button>
        </div>
    )
}

describe("useAnalytics", (): void => {
    it("интегрируется с provider и отчитывает очередь/flush", async (): Promise<void> => {
        const storage = createInMemoryStorage()
        const sendRequest = vi.fn(async () => {
            return new Response(null, {
                status: 200,
                statusText: "ok",
            })
        })
        const flushSpy = vi.fn()

        render(
            <AnalyticsProvider
                storage={storage}
                defaultConsent="granted"
                sendRequest={sendRequest}
                options={{
                    flushIntervalMs: 0,
                    samplingRate: 1,
                }}
            >
                <AnalyticsProbe onFlush={flushSpy} />
            </AnalyticsProvider>,
        )

        const consent = await screen.findByTestId("consent")
        expect(consent.textContent).toBe("granted")

        const session = await screen.findByTestId("session")
        expect(session.textContent?.length).toBeGreaterThan(3)

        expect(await screen.findByTestId("pending")).toHaveTextContent("0")
        await userEvent.click(screen.getByTestId("track-key-action"))
        expect(await screen.findByTestId("pending")).toHaveTextContent("1")
        await userEvent.click(screen.getByTestId("track-funnel"))
        await waitFor((): void => {
            expect(screen.getByTestId("pending")).toHaveTextContent("2")
        })
        await userEvent.click(screen.getByTestId("flush"))

        await waitFor((): void => {
            expect(flushSpy).toHaveBeenCalled()
            expect(sendRequest).toHaveBeenCalledTimes(1)
        })
        await waitFor((): void => {
            expect(screen.getByTestId("pending")).toHaveTextContent("0")
        })
    })

    it("очищает очередь при переходе в denied consent", async (): Promise<void> => {
        const storage = createInMemoryStorage()
        const sendRequest = vi.fn(async () => {
            return new Response(null, {
                status: 200,
                statusText: "ok",
            })
        })

        render(
            <AnalyticsProvider
                storage={storage}
                defaultConsent="granted"
                sendRequest={sendRequest}
                options={{
                    flushIntervalMs: 0,
                    samplingRate: 1,
                }}
            >
                <AnalyticsProbe onFlush={(): void => undefined} />
            </AnalyticsProvider>,
        )

        await userEvent.click(screen.getByTestId("track-raw"))
        expect(await screen.findByTestId("pending")).toHaveTextContent("1")

        await userEvent.click(screen.getByTestId("consent-deny"))
        await waitFor((): void => {
            expect(screen.getByTestId("pending")).toHaveTextContent("0")
            expect(screen.getByTestId("consent")).toHaveTextContent("denied")
        })
    })
})
