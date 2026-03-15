import {describe, expect, test} from "bun:test"

import {type IBugsnagProviderErrorDetails, BugsnagProviderError} from "../../src/context/bugsnag-provider.error"
import {
    BugsnagProvider,
    type IBugsnagApiClient,
    type IBugsnagApiResponse,
    type IBugsnagGetErrorRequest,
    type IBugsnagListErrorEventsRequest,
} from "../../src/context/bugsnag-provider"

type BugsnagErrorPayload = Readonly<Record<string, unknown>>
type BugsnagEventsPayload = Readonly<Record<string, unknown>>
type ErrorResponseQueueItem = IBugsnagApiResponse<BugsnagErrorPayload> | Error
type EventsResponseQueueItem = IBugsnagApiResponse<BugsnagEventsPayload> | Error

class StubBugsnagApiClient implements IBugsnagApiClient {
    public errorResponses: ErrorResponseQueueItem[] = []
    public eventsResponses: EventsResponseQueueItem[] = []
    public errorCalls: IBugsnagGetErrorRequest[] = []
    public eventCalls: IBugsnagListErrorEventsRequest[] = []

    public getError(
        request: IBugsnagGetErrorRequest,
    ): Promise<IBugsnagApiResponse<BugsnagErrorPayload>> {
        this.errorCalls.push(request)
        const response = this.errorResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed error response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }

    public listErrorEvents(
        request: IBugsnagListErrorEventsRequest,
    ): Promise<IBugsnagApiResponse<BugsnagEventsPayload>> {
        this.eventCalls.push(request)
        const response = this.eventsResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed events response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates Bugsnag error payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Bugsnag error payload.
 */
function createErrorPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        id: "bug-1122",
        error_class: "TypeError",
        message: "Cannot read properties of undefined (reading 'id')",
        events_count: 12,
        users_affected: 4,
        updated_at: "2026-03-15T09:15:00.000Z",
        ...overrides,
    }
}

/**
 * Creates Bugsnag events payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Bugsnag events payload.
 */
function createEventsPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        data: [
            {
                id: "event-1",
                severity: "error",
                exceptions: [
                    {
                        errorClass: "TypeError",
                        message: "Cannot read properties of undefined (reading 'id')",
                        stacktrace: [
                            {
                                method: "ReviewWorker.handle",
                                file: "/app/src/review/review-worker.ts",
                                lineNumber: 44,
                                columnNumber: 9,
                            },
                        ],
                    },
                ],
                breadcrumbs: [
                    {
                        name: "Loaded merge request payload",
                        type: "state",
                        timestamp: "2026-03-15T09:10:00.000Z",
                    },
                ],
            },
        ],
        ...overrides,
    }
}

/**
 * Reads plain headers record from RequestInit.
 *
 * @param init Fetch init payload.
 * @returns Lower-cased headers record.
 */
function readRequestHeaders(init: RequestInit | undefined): Readonly<Record<string, string>> {
    const source = init?.headers
    if (source === undefined || source instanceof Headers) {
        return {}
    }

    if (Array.isArray(source)) {
        return Object.fromEntries(
            source.map(([key, value]) => {
                return [key.toLowerCase(), value]
            }),
        )
    }

    return Object.fromEntries(
        Object.entries(source).map(([key, value]) => {
            return [key.toLowerCase(), String(value)]
        }),
    )
}

/**
 * Casts async fetch stub to Bun-compatible fetch type.
 *
 * @param implementation Fetch stub implementation.
 * @returns Typed fetch implementation.
 */
function asFetchImplementation(
    implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
    return implementation as typeof fetch
}

/**
 * Normalizes fetch target into stable string URL.
 *
 * @param input Fetch target.
 * @returns Stable request URL.
 */
function normalizeRequestTarget(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input
    }

    if (input instanceof URL) {
        return input.toString()
    }

    return input.url
}

describe("BugsnagProvider", () => {
    test("loads Bugsnag error and maps stack trace severity and breadcrumbs", async () => {
        const client = new StubBugsnagApiClient()
        client.errorResponses = [
            {
                status: 200,
                headers: {},
                data: createErrorPayload(),
            },
        ]
        client.eventsResponses = [
            {
                status: 200,
                headers: {},
                data: createEventsPayload(),
            },
        ]
        const provider = new BugsnagProvider({
            client,
        })

        const error = await provider.getError("bug-1122")

        expect(error).toEqual({
            id: "bug-1122",
            title: "TypeError: Cannot read properties of undefined (reading 'id')",
            stackTrace: [
                "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
            ],
            severity: "error",
            breadcrumbs: [
                {
                    message: "Loaded merge request payload",
                    type: "state",
                    timestamp: "2026-03-15T09:10:00.000Z",
                },
            ],
            eventCount: 12,
            affectedUsers: 4,
        })
        expect(client.errorCalls).toEqual([
            {
                errorId: "bug-1122",
            },
        ])
        expect(client.eventCalls).toEqual([
            {
                errorId: "bug-1122",
                perPage: 25,
            },
        ])
    })

    test("loads shared external context for Bugsnag error", async () => {
        const client = new StubBugsnagApiClient()
        client.errorResponses = [
            {
                status: 200,
                headers: {},
                data: createErrorPayload(),
            },
        ]
        client.eventsResponses = [
            {
                status: 200,
                headers: {},
                data: createEventsPayload(),
            },
        ]
        const provider = new BugsnagProvider({
            client,
        })

        const context = await provider.loadContext("bug-1122")

        expect(context).toEqual({
            source: "BUGSNAG",
            data: {
                error: {
                    id: "bug-1122",
                    title: "TypeError: Cannot read properties of undefined (reading 'id')",
                    stackTrace: [
                        "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
                    ],
                    severity: "error",
                    breadcrumbs: [
                        {
                            message: "Loaded merge request payload",
                            type: "state",
                            timestamp: "2026-03-15T09:10:00.000Z",
                        },
                    ],
                    eventCount: 12,
                    affectedUsers: 4,
                },
                breadcrumbs: [
                    {
                        message: "Loaded merge request payload",
                        type: "state",
                        timestamp: "2026-03-15T09:10:00.000Z",
                    },
                ],
                severity: "error",
            },
            fetchedAt: new Date("2026-03-15T09:15:00.000Z"),
        })
    })

    test("returns null when Bugsnag error is not found", async () => {
        const client = new StubBugsnagApiClient()
        client.errorResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    error: "Not found",
                },
            },
        ]
        const provider = new BugsnagProvider({
            client,
        })

        const error = await provider.getError("missing-error")

        expect(error).toBeNull()
        expect(client.eventCalls).toEqual([])
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubBugsnagApiClient()
        const sleepDelays: number[] = []
        client.errorResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    error: "Rate limited",
                },
            },
            {
                status: 200,
                headers: {},
                data: createErrorPayload(),
            },
        ]
        client.eventsResponses = [
            {
                status: 200,
                headers: {},
                data: createEventsPayload(),
            },
        ]
        const provider = new BugsnagProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const error = await provider.getError("bug-1122")

        expect(error?.id).toBe("bug-1122")
        expect(client.errorCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("retries transient upstream failures while loading events", async () => {
        const client = new StubBugsnagApiClient()
        const sleepDelays: number[] = []
        client.errorResponses = [
            {
                status: 200,
                headers: {},
                data: createErrorPayload(),
            },
        ]
        client.eventsResponses = [
            {
                status: 503,
                headers: {},
                data: {
                    error: "Temporary outage",
                },
            },
            {
                status: 200,
                headers: {},
                data: createEventsPayload(),
            },
        ]
        const provider = new BugsnagProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const context = await provider.loadContext("bug-1122")

        expect(context?.source).toBe("BUGSNAG")
        expect(client.eventCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([250])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubBugsnagApiClient()
        const sleepDelays: number[] = []
        client.errorResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    error: "Forbidden",
                    code: "FORBIDDEN",
                },
            },
        ]
        const provider = new BugsnagProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getError("bug-1122")
            throw new Error("Expected BugsnagProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "BugsnagProviderError",
                message: "Forbidden",
                code: "FORBIDDEN",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<BugsnagProviderError & IBugsnagProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("uses internal fetch-backed Bugsnag client with token authorization", async () => {
        const requests: Array<{
            readonly url: string
            readonly init: RequestInit | undefined
        }> = []
        const provider = new BugsnagProvider({
            baseUrl: "https://api.bugsnag.com",
            apiToken: "bugsnag-secret-token",
            fetchImplementation: asFetchImplementation((input, init) => {
                requests.push({
                    url: normalizeRequestTarget(input),
                    init,
                })

                if (requests.length === 1) {
                    return Promise.resolve(new Response(JSON.stringify(createErrorPayload()), {
                        status: 200,
                        headers: {
                            "content-type": "application/json",
                        },
                    }))
                }

                return Promise.resolve(new Response(JSON.stringify(createEventsPayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const context = await provider.loadContext("bug-1122")

        expect(context?.source).toBe("BUGSNAG")
        expect(requests).toHaveLength(2)
        expect(requests[0]?.url).toBe("https://api.bugsnag.com/errors/bug-1122")
        expect(requests[1]?.url).toContain("https://api.bugsnag.com/errors/bug-1122/events")
        expect(requests[1]?.url).toContain("per_page=25")
        expect(readRequestHeaders(requests[0]?.init)).toEqual({
            accept: "application/json",
            authorization: "token bugsnag-secret-token",
        })
    })

    test("throws configuration error when auth is missing for internal client", () => {
        expect(() => {
            return new BugsnagProvider({
                baseUrl: "https://api.bugsnag.com",
            })
        }).toThrow("Bugsnag apiToken or accessToken is required when no client is provided")
    })
})
