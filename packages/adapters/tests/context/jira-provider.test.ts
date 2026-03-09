import {describe, expect, test} from "bun:test"

import {type IJiraProviderErrorDetails, JiraProviderError} from "../../src/context/jira-provider.error"
import {
    JiraProvider,
    type IJiraApiClient,
    type IJiraApiResponse,
    type IJiraGetIssueRequest,
    type IJiraSearchIssuesPage,
    type IJiraSearchIssuesRequest,
} from "../../src/context/jira-provider"

type JiraIssuePayload = Readonly<Record<string, unknown>>
type IssueResponseQueueItem = IJiraApiResponse<JiraIssuePayload> | Error
type SearchResponseQueueItem = IJiraApiResponse<IJiraSearchIssuesPage> | Error

class StubJiraApiClient implements IJiraApiClient {
    public issueResponses: IssueResponseQueueItem[] = []
    public searchResponses: SearchResponseQueueItem[] = []
    public issueCalls: IJiraGetIssueRequest[] = []
    public searchCalls: IJiraSearchIssuesRequest[] = []

    public getIssue(request: IJiraGetIssueRequest): Promise<IJiraApiResponse<JiraIssuePayload>> {
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

    public searchIssues(
        request: IJiraSearchIssuesRequest,
    ): Promise<IJiraApiResponse<IJiraSearchIssuesPage>> {
        this.searchCalls.push(request)
        const response = this.searchResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed search response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates Jira issue payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Jira issue payload.
 */
function createIssuePayload(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
    return {
        key: "PRJ-123",
        fields: {
            summary: "Expose Jira context",
            status: {
                name: "In Progress",
            },
            description: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: "Provider returns normalized Jira details.",
                            },
                        ],
                    },
                ],
            },
            sprint: {
                name: "Sprint 8",
            },
            customfield_12000: [
                "Normalize description",
                "Retry on rate limit",
            ],
        },
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

describe("JiraProvider", () => {
    test("loads Jira ticket and maps description, acceptance criteria and sprint", async () => {
        const client = new StubJiraApiClient()
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        const provider = new JiraProvider({
            client,
            acceptanceCriteriaFieldIds: ["customfield_12000"],
        })

        const ticket = await provider.getTicket("PRJ-123")

        expect(ticket).toEqual({
            key: "PRJ-123",
            summary: "Expose Jira context",
            status: "In Progress",
            description: "Provider returns normalized Jira details.",
            acceptanceCriteria: [
                "Normalize description",
                "Retry on rate limit",
            ],
            sprint: "Sprint 8",
        })
        expect(client.issueCalls).toHaveLength(1)
        expect(client.issueCalls[0]?.fields).toContain("customfield_12000")
    })

    test("loads shared external context for Jira issue", async () => {
        const client = new StubJiraApiClient()
        client.issueResponses = [
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        const provider = new JiraProvider({
            client,
            acceptanceCriteriaFieldIds: ["customfield_12000"],
        })

        const context = await provider.loadContext("PRJ-123")

        expect(context).toEqual({
            source: "JIRA",
            data: {
                ticket: {
                    key: "PRJ-123",
                    summary: "Expose Jira context",
                    status: "In Progress",
                    description: "Provider returns normalized Jira details.",
                    acceptanceCriteria: [
                        "Normalize description",
                        "Retry on rate limit",
                    ],
                    sprint: "Sprint 8",
                },
                acceptanceCriteria: [
                    "Normalize description",
                    "Retry on rate limit",
                ],
                sprint: "Sprint 8",
            },
            fetchedAt: new Date(0),
        })
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubJiraApiClient()
        const sleepDelays: number[] = []
        client.issueResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    message: "Rate limited",
                },
            },
            {
                status: 200,
                headers: {},
                data: createIssuePayload(),
            },
        ]
        const provider = new JiraProvider({
            client,
            acceptanceCriteriaFieldIds: ["customfield_12000"],
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const ticket = await provider.getTicket("PRJ-123")

        expect(ticket?.key).toBe("PRJ-123")
        expect(client.issueCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubJiraApiClient()
        const sleepDelays: number[] = []
        client.issueResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    errorMessages: ["Forbidden"],
                },
            },
        ]
        const provider = new JiraProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getTicket("PRJ-403")
            throw new Error("Expected JiraProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "JiraProviderError",
                message: "Forbidden",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<JiraProviderError & IJiraProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("falls back to paginated search after direct lookup misses issue", async () => {
        const client = new StubJiraApiClient()
        client.issueResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    errorMessages: ["Issue does not exist"],
                },
            },
        ]
        client.searchResponses = [
            {
                status: 200,
                headers: {},
                data: {
                    issues: [{}],
                    startAt: 0,
                    maxResults: 1,
                    total: 2,
                },
            },
            {
                status: 200,
                headers: {},
                data: {
                    issues: [
                        createIssuePayload({
                            key: "PRJ-999",
                        }),
                    ],
                    startAt: 1,
                    maxResults: 1,
                    total: 2,
                },
            },
        ]
        const provider = new JiraProvider({
            client,
            acceptanceCriteriaFieldIds: ["customfield_12000"],
            searchPageSize: 1,
        })

        const ticket = await provider.getTicket("missing-ticket")

        expect(ticket?.key).toBe("PRJ-999")
        expect(client.issueCalls).toHaveLength(1)
        expect(client.searchCalls).toHaveLength(2)
        expect(client.searchCalls[0]?.startAt).toBe(0)
        expect(client.searchCalls[1]?.startAt).toBe(1)
    })

    test("uses internal fetch-backed Jira client with bearer auth", async () => {
        const calls: Array<{readonly url: string; readonly headers: Readonly<Record<string, string>>}> = []
        const provider = new JiraProvider({
            baseUrl: "https://jira.example.com",
            token: "secret-token",
            acceptanceCriteriaFieldIds: ["customfield_12000"],
            fetchImplementation: asFetchImplementation((
                input: RequestInfo | URL,
                init?: RequestInit,
            ): Promise<Response> => {
                calls.push({
                    url: normalizeRequestTarget(input),
                    headers: readRequestHeaders(init),
                })

                return Promise.resolve(new Response(JSON.stringify(createIssuePayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                        "x-trace-id": "trace-1",
                    },
                }))
            }),
        })

        const ticket = await provider.getTicket("PRJ-123")

        expect(ticket?.key).toBe("PRJ-123")
        expect(calls[0]?.url).toContain("https://jira.example.com/rest/api/3/issue/PRJ-123")
        expect(calls[0]?.url).toContain("fields=")
        expect(calls[0]?.headers["authorization"]).toBe("Bearer secret-token")
        expect(calls[0]?.headers["accept"]).toBe("application/json")
    })

    test("uses basic auth and internal paginated search fallback", async () => {
        const calls: Array<{readonly url: string; readonly headers: Readonly<Record<string, string>>}> = []
        let requestCount = 0
        const provider = new JiraProvider({
            baseUrl: "https://jira.example.com",
            email: "dev@example.com",
            apiToken: "api-token",
            acceptanceCriteriaFieldIds: ["customfield_12000"],
            fetchImplementation: asFetchImplementation((
                input: RequestInfo | URL,
                init?: RequestInit,
            ): Promise<Response> => {
                requestCount += 1
                calls.push({
                    url: normalizeRequestTarget(input),
                    headers: readRequestHeaders(init),
                })

                if (requestCount === 1) {
                    return Promise.resolve(new Response(JSON.stringify({
                        errorMessages: ["Missing issue"],
                    }), {
                        status: 404,
                    }))
                }

                return Promise.resolve(new Response(JSON.stringify({
                    issues: [
                        createIssuePayload({
                            key: "PRJ-777",
                        }),
                    ],
                    startAt: 0,
                    maxResults: 50,
                    total: 1,
                }), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const ticket = await provider.getTicket("missing-issue")

        expect(ticket?.key).toBe("PRJ-777")
        expect(calls[0]?.headers["authorization"]).toMatch(/^Basic /)
        expect(calls[1]?.url).toContain("/rest/api/3/search")
        expect(calls[1]?.url).toContain("jql=")
    })

    test("throws configuration error when baseUrl is missing for internal client", () => {
        try {
            new JiraProvider({
                token: "secret-token",
            })
            throw new Error("Expected JiraProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "JiraProviderError",
                code: "CONFIGURATION",
            } satisfies Partial<JiraProviderError>)
        }
    })

    test("throws configuration error when auth is missing for internal client", () => {
        try {
            new JiraProvider({
                baseUrl: "https://jira.example.com",
            })
            throw new Error("Expected JiraProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "JiraProviderError",
                code: "CONFIGURATION",
            } satisfies Partial<JiraProviderError>)
        }
    })

    test("uses default sleep implementation for retryable internal fetch failures", async () => {
        let requestCount = 0
        const provider = new JiraProvider({
            baseUrl: "https://jira.example.com",
            token: "secret-token",
            fetchImplementation: asFetchImplementation((): Promise<Response> => {
                requestCount += 1

                if (requestCount === 1) {
                    return Promise.resolve(new Response(JSON.stringify({
                        message: "Rate limited",
                    }), {
                        status: 429,
                        headers: {
                            "retry-after": "0.001",
                        },
                    }))
                }

                return Promise.resolve(new Response(JSON.stringify(createIssuePayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const ticket = await provider.getTicket("PRJ-123")

        expect(ticket?.key).toBe("PRJ-123")
        expect(requestCount).toBe(2)
    })

    test("handles empty and invalid JSON response bodies from internal fetch client", async () => {
        let requestCount = 0
        const provider = new JiraProvider({
            baseUrl: "https://jira.example.com",
            token: "secret-token",
            fetchImplementation: asFetchImplementation((): Promise<Response> => {
                requestCount += 1

                if (requestCount === 1) {
                    return Promise.resolve(new Response("", {
                        status: 404,
                    }))
                }

                return Promise.resolve(new Response("not-json", {
                    status: 500,
                }))
            }),
            retryMaxAttempts: 1,
        })

        try {
            await provider.getTicket("missing-issue")
            throw new Error("Expected JiraProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "JiraProviderError",
                statusCode: 500,
                message: "Jira request failed with status 500",
            } satisfies Partial<JiraProviderError>)
        }
        expect(requestCount).toBe(2)
    })
})
