import {describe, expect, test} from "bun:test"

import {type ISentryProviderErrorDetails, SentryProviderError} from "../../src/context/sentry-provider.error"
import {
    SentryProvider,
    type ISentryApiClient,
    type ISentryApiResponse,
    type ISentryGetIssueRequest,
    type ISentryListIssueEventsRequest,
} from "../../src/context/sentry-provider"

type IssueResponseQueueItem = ISentryApiResponse<Readonly<Record<string, unknown>>> | Error
type EventResponseQueueItem = ISentryApiResponse<readonly unknown[]> | Error

class StubSentryApiClient implements ISentryApiClient {
    public issueResponses: IssueResponseQueueItem[] = []
    public eventResponses: EventResponseQueueItem[] = []
    public issueCalls: ISentryGetIssueRequest[] = []
    public eventCalls: ISentryListIssueEventsRequest[] = []

    public getIssue(
        request: ISentryGetIssueRequest,
    ): Promise<ISentryApiResponse<Readonly<Record<string, unknown>>>> {
        this.issueCalls.push(request)
        const response = this.issueResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed issue response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }

    public listIssueEvents(
        request: ISentryListIssueEventsRequest,
    ): Promise<ISentryApiResponse<readonly unknown[]>> {
        this.eventCalls.push(request)
        const response = this.eventResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed event response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates Sentry issue payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Sentry issue payload.
 */
function createIssuePayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        id: "7788",
        shortId: "CODE-7788",
        title: "NullReferenceException in review worker",
        count: "31",
        userCount: "7",
        metadata: {
            title: "NullReferenceException in review worker",
        },
        lastSeen: "2026-03-09T10:15:00.000Z",
        ...overrides,
    }
}

/**
 * Creates Sentry event payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Sentry event payload.
 */
function createEventPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        eventID: "event-1",
        entries: [
            {
                type: "exception",
                data: {
                    values: [
                        {
                            type: "TypeError",
                            value: "Cannot read properties of undefined (reading 'id')",
                            stacktrace: {
                                frames: [
                                    {
                                        function: "ReviewPipelineStage.execute",
                                        filename: "/app/src/review/pipeline-stage.ts",
                                        lineNo: 81,
                                        colNo: 17,
                                    },
                                    {
                                        function: "ReviewWorker.handle",
                                        filename: "/app/src/review/review-worker.ts",
                                        lineNo: 44,
                                        colNo: 9,
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ],
        ...overrides,
    }
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

describe("SentryProvider", () => {
    test("loads Sentry error and maps stack trace, frequency and affected users", async () => {
        const client = new StubSentryApiClient()
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        client.eventResponses = [
            {
                status: 200,
                headers: {
                    link: '<https://sentry.io/api/0/organizations/codenautic/issues/7788/events/?cursor=>; rel="next"; results="false"; cursor=""',
                },
                data: [
                    createEventPayload(),
                ],
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
        })

        const error = await provider.getError("7788")

        expect(error).toEqual({
            id: "7788",
            title: "TypeError: Cannot read properties of undefined (reading 'id')",
            stackTrace: [
                "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
                "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
            ],
            frequency: 31,
            affectedUsers: 7,
        })
        expect(client.issueCalls).toEqual([
            {
                issueId: "7788",
            },
        ])
        expect(client.eventCalls).toEqual([
            {
                organizationSlug: "codenautic",
                issueId: "7788",
                full: true,
            },
        ])
    })

    test("loads shared external context for Sentry issue", async () => {
        const client = new StubSentryApiClient()
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        client.eventResponses = [
            {
                status: 200,
                headers: {},
                data: [
                    createEventPayload(),
                ],
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
        })

        const context = await provider.loadContext("7788")

        expect(context).toEqual({
            source: "SENTRY",
            data: {
                error: {
                    id: "7788",
                    title: "TypeError: Cannot read properties of undefined (reading 'id')",
                    stackTrace: [
                        "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
                        "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
                    ],
                    frequency: 31,
                    affectedUsers: 7,
                },
                frequency: 31,
                affectedUsers: 7,
            },
            fetchedAt: new Date("2026-03-09T10:15:00.000Z"),
        })
    })

    test("returns null when issue is not found", async () => {
        const client = new StubSentryApiClient()
        client.issueResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    detail: "Issue not found",
                },
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
        })

        const error = await provider.getError("missing-issue")

        expect(error).toBeNull()
        expect(client.eventCalls).toEqual([])
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubSentryApiClient()
        const sleepDelays: number[] = []
        client.issueResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    detail: "Rate limited",
                },
            },
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        client.eventResponses = [
            {
                status: 200,
                headers: {},
                data: [
                    createEventPayload(),
                ],
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const error = await provider.getError("7788")

        expect(error?.id).toBe("7788")
        expect(client.issueCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("retries transient upstream failures while paginating events", async () => {
        const client = new StubSentryApiClient()
        const sleepDelays: number[] = []
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        client.eventResponses = [
            {
                status: 503,
                headers: {},
                data: [],
            },
            {
                status: 200,
                headers: {},
                data: [
                    createEventPayload(),
                ],
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const error = await provider.getError("7788")

        expect(error?.stackTrace).toEqual([
            "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
            "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
        ])
        expect(sleepDelays).toEqual([250])
        expect(client.eventCalls).toHaveLength(2)
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubSentryApiClient()
        const sleepDelays: number[] = []
        client.issueResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    detail: "You do not have permission to access this issue",
                },
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getError("7788")
            throw new Error("Expected SentryProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "SentryProviderError",
                message: "You do not have permission to access this issue",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<SentryProviderError & ISentryProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("paginates issue events until stack trace is found", async () => {
        const client = new StubSentryApiClient()
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        client.eventResponses = [
            {
                status: 200,
                headers: {
                    link: '<https://sentry.io/api/0/organizations/codenautic/issues/7788/events/?cursor=opaque-next>; rel="next"; results="true"; cursor="opaque-next"',
                },
                data: [
                    {
                        eventID: "event-0",
                        message: "No stack trace here",
                    },
                ],
            },
            {
                status: 200,
                headers: {
                    link: '<https://sentry.io/api/0/organizations/codenautic/issues/7788/events/?cursor=>; rel="next"; results="false"; cursor=""',
                },
                data: [
                    createEventPayload({
                        eventID: "event-2",
                    }),
                ],
            },
        ]
        const provider = new SentryProvider({
            client,
            organizationSlug: "codenautic",
        })

        const error = await provider.getError("7788")

        expect(error?.stackTrace).toEqual([
            "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
            "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
        ])
        expect(client.eventCalls).toEqual([
            {
                organizationSlug: "codenautic",
                issueId: "7788",
                full: true,
            },
            {
                organizationSlug: "codenautic",
                issueId: "7788",
                full: true,
                cursor: "opaque-next",
            },
        ])
    })

    test("uses fetch-backed client with expected Sentry endpoints and bearer auth", async () => {
        const requests: Array<{
            readonly url: string
            readonly init: RequestInit | undefined
        }> = []
        const fetchImplementation = asFetchImplementation((input, init) => {
            requests.push({
                url: normalizeRequestTarget(input),
                init,
            })

            if (requests.length === 1) {
                return Promise.resolve(new Response(JSON.stringify(createIssuePayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }

            return Promise.resolve(new Response(JSON.stringify([
                createEventPayload(),
            ]), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                },
            }))
        })
        const provider = new SentryProvider({
            baseUrl: "https://sentry.example",
            organizationSlug: "codenautic",
            authToken: "secret-token",
            fetchImplementation,
        })

        const error = await provider.getError("7788")

        expect(error?.id).toBe("7788")
        expect(requests).toHaveLength(2)
        expect(requests[0]?.url).toBe("https://sentry.example/api/0/issues/7788/")
        expect(requests[1]?.url).toBe(
            "https://sentry.example/api/0/organizations/codenautic/issues/7788/events/?full=1",
        )
        expect(readRequestHeaders(requests[0]?.init)).toEqual({
            accept: "application/json",
            authorization: "Bearer secret-token",
        })
    })

    test("throws configuration errors for missing organization slug and auth", () => {
        expect(() => {
            return new SentryProvider({
                client: new StubSentryApiClient(),
            })
        }).toThrow("Sentry organizationSlug is required")

        expect(() => {
            return new SentryProvider({
                organizationSlug: "codenautic",
            })
        }).toThrow("Sentry authToken or accessToken is required when no client is provided")
    })
})
