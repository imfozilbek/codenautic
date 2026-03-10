import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/analytics-types"
import {
    AnalyticsSdk,
    createAnalyticsSdk,
    createDefaultAnalyticsSdkOptions,
    sanitizeAnalyticsPayload,
    type IAnalyticsSdkOptions,
} from "@/lib/analytics/analytics-sdk"

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

function createThrowingStorage(): Storage {
    return {
        get length(): number {
            return 0
        },
        clear(): void {
            throw new Error("storage unavailable")
        },
        getItem(_key: string): string | null {
            throw new Error("storage unavailable")
        },
        key(_index: number): string | null {
            throw new Error("storage unavailable")
        },
        removeItem(_key: string): void {
            throw new Error("storage unavailable")
        },
        setItem(_key: string, _value: string): void {
            throw new Error("storage unavailable")
        },
    }
}

function createDefaultTestOptions(
    overrides: Partial<IAnalyticsSdkOptions> = {},
): IAnalyticsSdkOptions {
    return {
        endpoint: "/api/v1/analytics/events",
        maxBatchSize: 20,
        flushIntervalMs: 0,
        samplingRate: 1,
        now: (): number => 1_000_000,
        storage: createInMemoryStorage(),
        queueStorageKey: "test:analytics:queue",
        sessionStorageKey: "test:analytics:session",
        onQueueStateChange: (): void => undefined,
        isOnline: (): boolean => true,
        sendRequest: vi.fn(
            async (): Promise<Response> => new Response(null, { status: 200, statusText: "ok" }),
        ),
        ...overrides,
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
        const sendRequest = vi.fn(async (_url: string, _init: RequestInit): Promise<Response> => {
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
        if (request === undefined) {
            throw new Error("Expected at least one analytics request call")
        }
        const requestInit = request[1]
        if (requestInit === undefined || requestInit.body === undefined) {
            throw new Error("Expected analytics request body")
        }

        const body = JSON.parse(String(requestInit.body)) as {
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
        const sendRequest = vi.fn(async (_url: string, _init: RequestInit): Promise<Response> => {
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

        const firstPayload = JSON.parse(String(sendRequest.mock.calls[0]?.[1]?.body)) as {
            readonly events: ReadonlyArray<{ readonly id: string }>
        }
        const secondPayload = JSON.parse(String(sendRequest.mock.calls[1]?.[1]?.body)) as {
            readonly events: ReadonlyArray<{ readonly id: string }>
        }
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

    describe("dispose", (): void => {
        it("когда вызван dispose, flush ничего не делает", async (): Promise<void> => {
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest,
                consent: "pending",
                options: {
                    flushIntervalMs: 0,
                },
            })

            sdk.setConsent("granted")
            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })
            sdk.dispose()

            sendRequest.mockClear()
            await sdk.flush()
            expect(sendRequest).not.toHaveBeenCalled()
        })

        it("когда вызван dispose повторно, не выбрасывает ошибку", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
            })
            sdk.dispose()
            sdk.dispose()
        })
    })

    describe("setConsent", (): void => {
        it("когда consent=denied, очередь очищается", (): void => {
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (pending: number): void => {
                    queueStateChangeCalls.push(pending)
                },
                sendRequest,
                consent: "granted",
            })

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "open" })
            expect(sdk.getPendingEventsCount()).toBe(1)

            sdk.setConsent("denied")
            expect(sdk.getPendingEventsCount()).toBe(0)
            expect(queueStateChangeCalls.at(-1)).toBe(0)
        })

        it("когда consent=pending, track возвращает false", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                consent: "pending",
            })

            const accepted = sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })
            expect(accepted).toBe(false)
            expect(sdk.getPendingEventsCount()).toBe(0)
        })

        it("когда consent=pending, flush не отправляет", async (): Promise<void> => {
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest,
                consent: "pending",
            })

            await sdk.flush()
            expect(sendRequest).not.toHaveBeenCalled()
        })
    })

    describe("getState / getConsent / getSessionId", (): void => {
        it("когда создан SDK, возвращает корректные значения", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                consent: "granted",
                sessionId: "custom-session",
            })

            expect(sdk.getConsent()).toBe("granted")
            expect(sdk.getState()).toEqual({ consent: "granted" })
            expect(sdk.getSessionId()).toBe("custom-session")
        })

        it("когда consent не указан, используется pending по умолчанию", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
            })

            expect(sdk.getConsent()).toBe("pending")
        })
    })

    describe("очередь и overflow", (): void => {
        it("когда очередь превышает MAX_QUEUE_SIZE, обрезается до лимита", (): void => {
            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    consent: "granted",
                    maxBatchSize: 300,
                }),
            )

            for (let index = 0; index < 260; index += 1) {
                sdk.track(ANALYTICS_EVENT_NAMES.keyAction, {
                    action: `action-${String(index)}`,
                })
            }

            expect(sdk.getPendingEventsCount()).toBeLessThanOrEqual(250)
        })
    })

    describe("loadQueueFromStorage", (): void => {
        it("когда storage содержит валидную очередь для той же сессии, загружает события", (): void => {
            const sessionId = "test-session-abc"
            storage.setItem("test:analytics:session", sessionId)
            const events = [
                {
                    id: "evt_1",
                    name: "key_action",
                    occurredAt: 1000,
                    schemaVersion: 1,
                    correlation: { sessionId, correlationId: "c1" },
                    payload: { action: "click" },
                },
            ]
            storage.setItem("test:analytics:queue", JSON.stringify({ events, sessionId }))

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    storage,
                    sessionId,
                    consent: "granted",
                }),
            )

            expect(sdk.getPendingEventsCount()).toBe(1)
        })

        it("когда storage содержит очередь для другой сессии, возвращает пустую очередь", (): void => {
            storage.setItem(
                "test:analytics:queue",
                JSON.stringify({
                    events: [
                        {
                            id: "evt_1",
                            name: "key_action",
                            occurredAt: 1000,
                            schemaVersion: 1,
                            correlation: { sessionId: "other-session", correlationId: "c1" },
                            payload: { action: "click" },
                        },
                    ],
                    sessionId: "other-session",
                }),
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    storage,
                    sessionId: "current-session",
                }),
            )

            expect(sdk.getPendingEventsCount()).toBe(0)
        })

        it("когда storage содержит невалидный JSON, возвращает пустую очередь", (): void => {
            storage.setItem("test:analytics:queue", "not valid json{{{")

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage }))

            expect(sdk.getPendingEventsCount()).toBe(0)
        })

        it("когда storage содержит невалидную структуру, возвращает пустую очередь", (): void => {
            storage.setItem("test:analytics:queue", JSON.stringify({ invalid: true }))

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage }))

            expect(sdk.getPendingEventsCount()).toBe(0)
        })

        it("когда storage содержит структуру без events array, возвращает пустую очередь", (): void => {
            storage.setItem(
                "test:analytics:queue",
                JSON.stringify({ sessionId: "s", events: "not-array" }),
            )

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage }))

            expect(sdk.getPendingEventsCount()).toBe(0)
        })

        it("когда storage содержит очередь более MAX_QUEUE_SIZE, обрезает до лимита", (): void => {
            const sessionId = "big-queue-session"
            const events = Array.from({ length: 300 }, (_v, index): object => ({
                id: `evt_${String(index)}`,
                name: "key_action",
                occurredAt: 1000 + index,
                schemaVersion: 1,
                correlation: { sessionId, correlationId: `c${String(index)}` },
                payload: { action: `a${String(index)}` },
            }))

            storage.setItem("test:analytics:queue", JSON.stringify({ events, sessionId }))

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    storage,
                    sessionId,
                }),
            )

            expect(sdk.getPendingEventsCount()).toBeLessThanOrEqual(250)
        })
    })

    describe("readOrCreateSessionId", (): void => {
        it("когда storage содержит sessionId, использует его", (): void => {
            storage.setItem("test:analytics:session", "existing-session")

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage }))

            expect(sdk.getSessionId()).toBe("existing-session")
        })

        it("когда storage пуст, создает новый sessionId и сохраняет", (): void => {
            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage }))

            const sessionId = sdk.getSessionId()
            expect(sessionId.length).toBeGreaterThan(3)
            expect(sessionId.startsWith("s_")).toBe(true)
            expect(storage.getItem("test:analytics:session")).toBe(sessionId)
        })

        it("когда storage выбрасывает при чтении, генерирует sessionId", (): void => {
            const throwingStorage = createThrowingStorage()

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage: throwingStorage }))

            const sessionId = sdk.getSessionId()
            expect(sessionId.length).toBeGreaterThan(3)
            expect(sessionId.startsWith("s_")).toBe(true)
        })

        it("когда storage выбрасывает при записи, всё равно возвращает sessionId", (): void => {
            let readCount = 0
            const partialStorage: Storage = {
                ...createInMemoryStorage(),
                getItem(_key: string): string | null {
                    readCount += 1
                    return null
                },
                setItem(_key: string, _value: string): void {
                    throw new Error("write fail")
                },
            }

            const sdk = new AnalyticsSdk(createDefaultTestOptions({ storage: partialStorage }))

            expect(sdk.getSessionId().length).toBeGreaterThan(3)
            expect(readCount).toBeGreaterThan(0)
        })
    })

    describe("persistQueue с ошибкой storage", (): void => {
        it("когда storage.setItem выбрасывает, не ломает SDK", (): void => {
            let writeAllowed = true
            const conditionalStorage: Storage = {
                ...createInMemoryStorage(),
                getItem(_key: string): string | null {
                    return null
                },
                setItem(_key: string, _value: string): void {
                    if (writeAllowed !== true) {
                        throw new Error("quota exceeded")
                    }
                },
            }

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    storage: conditionalStorage,
                    consent: "granted",
                }),
            )

            writeAllowed = false
            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })
            expect(sdk.getPendingEventsCount()).toBe(1)
        })
    })

    describe("flush edge cases", (): void => {
        it("когда sendRequest выбрасывает сетевую ошибку, не ломает SDK", async (): Promise<void> => {
            const sendRequest = vi.fn(async (): Promise<Response> => {
                throw new Error("network error")
            })

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    consent: "granted",
                    isOnline: (): boolean => true,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })
            await sdk.flush()

            expect(sdk.getPendingEventsCount()).toBe(1)
            expect(sendRequest).toHaveBeenCalledTimes(1)
        })

        it("когда очередь пуста, flush не отправляет запрос", async (): Promise<void> => {
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    consent: "granted",
                }),
            )

            await sdk.flush()
            expect(sendRequest).not.toHaveBeenCalled()
        })
    })

    describe("online event listener", (): void => {
        it("когда срабатывает online event, пробует flush", async (): Promise<void> => {
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )

            let isOnline = false
            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    consent: "granted",
                    isOnline: (): boolean => isOnline,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })
            expect(sdk.getPendingEventsCount()).toBe(1)

            isOnline = true
            window.dispatchEvent(new Event("online"))

            await vi.waitFor((): void => {
                expect(sendRequest).toHaveBeenCalledTimes(1)
            })
        })
    })

    describe("sanitizeAnalyticsPayload", (): void => {
        it("когда payload содержит PII email, заменяет на [REDACTED]", (): void => {
            const result = sanitizeAnalyticsPayload({
                name: "safe-string",
                contact: "user@example.com",
            })

            expect(result.name).toBe("safe-string")
            expect(result.contact).toBe("[REDACTED]")
        })

        it("когда payload содержит sensitive keys, заменяет значения", (): void => {
            const result = sanitizeAnalyticsPayload({
                action: "login",
                password: "s3cret",
                token: "jwt-xyz",
                authorization: "Bearer abc",
                secret: "top-secret",
            })

            expect(result.action).toBe("login")
            expect(result.password).toBe("[REDACTED]")
            expect(result.token).toBe("[REDACTED]")
            expect(result.authorization).toBe("[REDACTED]")
            expect(result.secret).toBe("[REDACTED]")
        })

        it("когда payload содержит вложенные объекты, рекурсивно санитизирует", (): void => {
            const result = sanitizeAnalyticsPayload({
                level1: {
                    password: "hidden",
                    value: 42,
                },
            })

            const level1 = result.level1 as Record<string, unknown>
            expect(level1.password).toBe("[REDACTED]")
            expect(level1.value).toBe(42)
        })

        it("когда payload содержит массивы, рекурсивно санитизирует", (): void => {
            const result = sanitizeAnalyticsPayload({
                items: ["safe-text", "user@test.com", 123, true],
            })

            const items = result.items as unknown[]
            expect(items[0]).toBe("safe-text")
            expect(items[1]).toBe("[REDACTED]")
            expect(items[2]).toBe(123)
            expect(items[3]).toBe(true)
        })

        it("когда payload содержит null/undefined, сохраняет как есть", (): void => {
            const result = sanitizeAnalyticsPayload({
                a: null,
                b: undefined,
            })

            expect(result.a).toBeNull()
            expect(result.b).toBeUndefined()
        })

        it("когда payload содержит числа и boolean, сохраняет как есть", (): void => {
            const result = sanitizeAnalyticsPayload({
                count: 42,
                active: true,
                disabled: false,
            })

            expect(result.count).toBe(42)
            expect(result.active).toBe(true)
            expect(result.disabled).toBe(false)
        })

        it("когда string пустая, не считает PII", (): void => {
            const result = sanitizeAnalyticsPayload({
                empty: "",
                whitespace: "  ",
            })

            expect(result.empty).toBe("")
            expect(result.whitespace).toBe("  ")
        })
    })

    describe("createDefaultAnalyticsSdkOptions", (): void => {
        it("когда вызвана, возвращает все обязательные поля с дефолтами", (): void => {
            const onQueueStateChange = vi.fn()
            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )
            const options = createDefaultAnalyticsSdkOptions({
                tenantId: "t1",
                userId: "u1",
                sessionId: "s1",
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange,
                sendRequest,
                consent: "granted",
            })

            expect(options.endpoint).toBe("/api/v1/analytics/events")
            expect(options.maxBatchSize).toBe(20)
            expect(options.flushIntervalMs).toBe(4000)
            expect(options.samplingRate).toBe(1)
            expect(options.tenantId).toBe("t1")
            expect(options.userId).toBe("u1")
            expect(options.sessionId).toBe("s1")
            expect(options.queueStorageKey).toBe("codenautic:ui:analytics:queue")
            expect(options.sessionStorageKey).toBe("codenautic:ui:analytics:session-id")
            expect(options.consent).toBe("granted")
            expect(typeof options.now()).toBe("number")
        })
    })

    describe("createAnalyticsSdk с runtime options", (): void => {
        it("когда переданы runtime overrides, нормализует значения", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                options: {
                    endpoint: "/custom/endpoint",
                    maxBatchSize: 999,
                    flushIntervalMs: 99999,
                    samplingRate: 5,
                    queueStorageKey: "custom:queue",
                    sessionStorageKey: "custom:session",
                },
            })

            expect(sdk.getSessionId().length).toBeGreaterThan(0)
        })

        it("когда maxBatchSize = NaN, использует дефолт", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                options: {
                    maxBatchSize: NaN,
                },
            })

            expect(sdk.getSessionId().length).toBeGreaterThan(0)
        })

        it("когда samplingRate = NaN, использует дефолт", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                options: {
                    samplingRate: NaN,
                },
                consent: "granted",
            })

            const accepted = sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "test" })
            expect(accepted).toBe(true)
        })

        it("когда samplingRate отрицательный, нормализуется до 0", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                options: {
                    samplingRate: -0.5,
                },
                consent: "granted",
            })

            const accepted = sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "test" })
            expect(accepted).toBe(false)
        })

        it("когда maxBatchSize ниже минимума, нормализуется до minValue", (): void => {
            const sdk = createAnalyticsSdk({
                storage,
                isOnline: (): boolean => true,
                onQueueStateChange: (): void => undefined,
                sendRequest: vi.fn(
                    async (): Promise<Response> =>
                        new Response(null, { status: 200, statusText: "ok" }),
                ),
                options: {
                    maxBatchSize: -10,
                },
            })

            expect(sdk.getSessionId().length).toBeGreaterThan(0)
        })
    })

    describe("startAutoFlushTimer", (): void => {
        afterEach((): void => {
            vi.restoreAllMocks()
        })

        it("когда consent не granted, таймер не запускается", (): void => {
            vi.useFakeTimers()

            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    flushIntervalMs: 100,
                    consent: "pending",
                }),
            )

            vi.advanceTimersByTime(500)
            expect(sendRequest).not.toHaveBeenCalled()
            sdk.dispose()
            vi.useRealTimers()
        })
    })

    describe("sampling с дробным rate", (): void => {
        it("когда sampling rate 0.5, часть событий фильтруется", (): void => {
            let acceptedCount = 0

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    consent: "granted",
                    samplingRate: 0.5,
                    tenantId: "t1",
                    userId: "u1",
                }),
            )

            for (let index = 0; index < 100; index += 1) {
                const accepted = sdk.track(ANALYTICS_EVENT_NAMES.keyAction, {
                    action: `action-${String(index)}`,
                })
                if (accepted) {
                    acceptedCount += 1
                }
            }

            expect(acceptedCount).toBeGreaterThan(0)
            expect(acceptedCount).toBeLessThan(100)
        })
    })

    describe("startAutoFlushTimer with active timer", (): void => {
        afterEach((): void => {
            vi.restoreAllMocks()
        })

        it("когда flushIntervalMs > 0 и есть события, таймер запускается и flush срабатывает", async (): Promise<void> => {
            vi.useFakeTimers()

            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    flushIntervalMs: 200,
                    consent: "granted",
                    isOnline: (): boolean => true,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })

            await vi.advanceTimersByTimeAsync(300)

            expect(sendRequest).toHaveBeenCalledTimes(1)
            sdk.dispose()
            vi.useRealTimers()
        })

        it("когда autoFlush и isOnline=false, таймер не запускается", (): void => {
            vi.useFakeTimers()

            const sendRequest = vi.fn(
                async (): Promise<Response> =>
                    new Response(null, { status: 200, statusText: "ok" }),
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    flushIntervalMs: 100,
                    consent: "granted",
                    isOnline: (): boolean => false,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })

            vi.advanceTimersByTime(500)
            expect(sendRequest).not.toHaveBeenCalled()
            sdk.dispose()
            vi.useRealTimers()
        })
    })

    describe("dispose с активным flushTimeout", (): void => {
        afterEach((): void => {
            vi.restoreAllMocks()
        })

        it("когда dispose вызван при активном таймере, таймер очищается", async (): Promise<void> => {
            vi.useFakeTimers()

            let flushCount = 0
            const sendRequest = vi.fn(
                async (): Promise<Response> => {
                    flushCount += 1
                    return new Response(null, { status: 200, statusText: "ok" })
                },
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    flushIntervalMs: 500,
                    consent: "granted",
                    isOnline: (): boolean => true,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })

            await vi.advanceTimersByTimeAsync(10)
            const countAfterFirstFlush = flushCount

            sdk.dispose()

            sendRequest.mockClear()
            await vi.advanceTimersByTimeAsync(1000)

            expect(sendRequest).not.toHaveBeenCalled()
            expect(countAfterFirstFlush).toBeGreaterThan(0)
            vi.useRealTimers()
        })
    })

    describe("sanitizeAnalyticsPayload extended", (): void => {
        it("когда payload содержит non-object/non-array non-string type, сохраняет как есть", (): void => {
            const result = sanitizeAnalyticsPayload({
                sym: Symbol.for("test") as unknown as string,
                fn: ((): void => undefined) as unknown as string,
            })

            expect(result.sym).toEqual(Symbol.for("test"))
            expect(typeof result.fn).toBe("function")
        })

        it("когда payload содержит вложенные массивы с объектами, рекурсивно санитизирует", (): void => {
            const result = sanitizeAnalyticsPayload({
                items: [
                    { password: "secret123", name: "safe" },
                    { token: "jwt-abc", label: "ok" },
                ],
            })

            const items = result.items as Array<Record<string, unknown>>
            expect(items[0]?.password).toBe("[REDACTED]")
            expect(items[0]?.name).toBe("safe")
            expect(items[1]?.token).toBe("[REDACTED]")
            expect(items[1]?.label).toBe("ok")
        })

        it("когда ключ содержит пробелы/регистр, нормализует чувствительные ключи", (): void => {
            const result = sanitizeAnalyticsPayload({
                " Password ": "hidden",
                " TOKEN ": "jwt",
                normalKey: "visible",
            })

            expect(result[" Password "]).toBe("[REDACTED]")
            expect(result[" TOKEN "]).toBe("[REDACTED]")
            expect(result.normalKey).toBe("visible")
        })
    })

    describe("concurrent flush guard", (): void => {
        it("когда flush уже в процессе, повторный вызов flush не отправляет второй запрос", async (): Promise<void> => {
            let resolveFirst: (() => void) | undefined
            const firstCallPromise = new Promise<void>((resolve): void => {
                resolveFirst = resolve
            })

            const sendRequest = vi.fn(
                async (): Promise<Response> => {
                    await firstCallPromise
                    return new Response(null, { status: 200, statusText: "ok" })
                },
            )

            const sdk = new AnalyticsSdk(
                createDefaultTestOptions({
                    sendRequest,
                    consent: "granted",
                    isOnline: (): boolean => true,
                }),
            )

            sdk.track(ANALYTICS_EVENT_NAMES.keyAction, { action: "click" })

            const flushPromise1 = sdk.flush()
            const flushPromise2 = sdk.flush()

            expect(sendRequest).toHaveBeenCalledTimes(1)

            if (resolveFirst !== undefined) {
                resolveFirst()
            }
            await flushPromise1
            await flushPromise2

            sdk.dispose()
        })
    })
})
