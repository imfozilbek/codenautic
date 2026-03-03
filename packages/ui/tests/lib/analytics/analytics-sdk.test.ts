import { beforeEach, describe, expect, it, vi } from "vitest"

import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/analytics-types"
import { createAnalyticsSdk } from "@/lib/analytics/analytics-sdk"

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

describe("AnalyticsSdk", (): void => {
    let storage: Storage = createInMemoryStorage()
    let queueStateChangeCalls: number[] = []

    beforeEach((): void => {
        storage = createInMemoryStorage()
        queueStateChangeCalls = []
    })

    it("отправляет redacted payload и correlation metadata", async (): Promise<void> => {
        const sendRequest = vi.fn(async () => {
            return new Response(null, {
                status: 200,
                statusText: "ok",
            })
        })
        const sdk = createAnalyticsSdk({
            tenantId: "tenant-1",
            userId: "user-1",
            storage,
            isOnline: (): boolean => true,
            onQueueStateChange: (pending: number): void => {
                queueStateChangeCalls.push(pending)
            },
            sendRequest,
            options: {
                samplingRate: 1,
            },
        })

        sdk.setConsent("granted")
        const accepted = sdk.track(ANALYTICS_EVENT_NAMES.keyAction, {
            action: "open",
            target: "button",
            details: {
                email: "devops@test.com",
                code: "console.log('x')",
            },
        })

        expect(accepted).toBe(true)
        expect(sdk.getPendingEventsCount()).toBe(1)
        expect(queueStateChangeCalls.at(-1)).toBe(1)

        await sdk.flush()

        expect(sendRequest).toHaveBeenCalledTimes(1)
        const request = sendRequest.mock.calls[0]
        expect(request).toBeDefined()

        const body = JSON.parse(String(request[1]?.body)) as {
            readonly events: readonly [
                {
                    readonly payload: {
                        readonly action: string
                        readonly details: {
                            readonly email: string
                            readonly code: string
                        }
                    }
                    readonly correlation: {
                        readonly tenantId: string
                        readonly userId: string
                        readonly sessionId: string
                    }
                },
            ]
        }
        expect(body.events).toHaveLength(1)
        expect(body.events[0].payload.details.email).toBe("[REDACTED]")
        expect(body.events[0].payload.details.code).toBe("[REDACTED]")
        expect(body.events[0].correlation.tenantId).toBe("tenant-1")
        expect(body.events[0].correlation.userId).toBe("user-1")
        expect(body.events[0].correlation.sessionId.length).toBeGreaterThan(3)
        expect(sdk.getPendingEventsCount()).toBe(0)
    })

    it("держит очередь offline и отправляет после появления online", async (): Promise<void> => {
        let online = false
        const sendRequest = vi.fn(async () => {
            return new Response(null, {
                status: 200,
                statusText: "ok",
            })
        })
        const sdk = createAnalyticsSdk({
            storage,
            isOnline: (): boolean => online,
            onQueueStateChange: (pending: number): void => {
                queueStateChangeCalls.push(pending)
            },
            sendRequest,
            options: {
                flushIntervalMs: 0,
                samplingRate: 1,
            },
        })

        sdk.setConsent("granted")
        const accepted = sdk.track(ANALYTICS_EVENT_NAMES.funnelStep, {
            funnel: "review-flow",
            stepIndex: 1,
            stepName: "open",
            status: "entered",
        })
        expect(accepted).toBe(true)
        expect(sdk.getPendingEventsCount()).toBe(1)
        expect(sendRequest).not.toHaveBeenCalled()

        online = true
        await sdk.flush()

        expect(sendRequest).toHaveBeenCalledTimes(1)
        expect(sdk.getPendingEventsCount()).toBe(0)
    })

    it("не дублирует eventId между retries", async (): Promise<void> => {
        const sendRequest = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 500,
                    statusText: "fail",
                }),
            )
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 200,
                    statusText: "ok",
                }),
            )
        const sdk = createAnalyticsSdk({
            storage,
            isOnline: (): boolean => true,
            onQueueStateChange: (pending: number): void => {
                queueStateChangeCalls.push(pending)
            },
            sendRequest,
        })
        sdk.setConsent("granted")

        const accepted = sdk.track(ANALYTICS_EVENT_NAMES.dropOff, {
            funnel: "review-flow",
            reason: "network-error",
            stepName: "send",
        })
        expect(accepted).toBe(true)
        expect(sdk.getPendingEventsCount()).toBe(1)

        await sdk.flush()
        expect(sendRequest).toHaveBeenCalledTimes(1)
        expect(sdk.getPendingEventsCount()).toBe(1)

        await sdk.flush()
        expect(sendRequest).toHaveBeenCalledTimes(2)
        expect(sdk.getPendingEventsCount()).toBe(0)

        const firstPayload = JSON.parse(
            String(sendRequest.mock.calls[0]?.[1]?.body),
        ) as { readonly events: ReadonlyArray<{ readonly id: string }> }
        const secondPayload = JSON.parse(
            String(sendRequest.mock.calls[1]?.[1]?.body),
        ) as { readonly events: ReadonlyArray<{ readonly id: string }> }
        expect(firstPayload.events[0]?.id).toBe(secondPayload.events[0]?.id)
    })

    it("игнорирует события при samplingRate=0", (): void => {
        const sendRequest = vi.fn(async () => {
            return new Response(null, {
                status: 200,
                statusText: "ok",
            })
        })
        const sdk = createAnalyticsSdk({
            storage,
            isOnline: (): boolean => true,
            onQueueStateChange: (): void => undefined,
            sendRequest,
            options: {
                samplingRate: 0,
            },
        })
        sdk.setConsent("granted")

        const accepted = sdk.track(ANALYTICS_EVENT_NAMES.timeToFirstValue, {
            funnel: "review-flow",
            millisecondsToValue: 1250,
        })
        expect(accepted).toBe(false)
        expect(sdk.getPendingEventsCount()).toBe(0)
        expect(sendRequest).not.toHaveBeenCalled()
    })
})
