import {describe, expect, test} from "bun:test"

import {type IClickUpProviderErrorDetails, ClickUpProviderError} from "../../src/context/clickup-provider.error"
import {
    ClickUpProvider,
    type IClickUpApiClient,
    type IClickUpApiResponse,
    type IClickUpGetTaskRequest,
} from "../../src/context/clickup-provider"

type ClickUpTaskPayload = Readonly<Record<string, unknown>>
type TaskResponseQueueItem = IClickUpApiResponse<ClickUpTaskPayload> | Error

class StubClickUpApiClient implements IClickUpApiClient {
    public taskResponses: TaskResponseQueueItem[] = []
    public taskCalls: IClickUpGetTaskRequest[] = []

    public getTask(request: IClickUpGetTaskRequest): Promise<IClickUpApiResponse<ClickUpTaskPayload>> {
        this.taskCalls.push(request)
        const response = this.taskResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed task response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates ClickUp task payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns ClickUp task payload.
 */
function createTaskPayload(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
    return {
        id: "clk-123",
        name: "Stabilize clickup provider mapping",
        status: {
            status: "In Progress",
        },
        description: "Provider should preserve custom fields and list metadata from ClickUp.",
        assignees: [
            {
                username: "Grace Hopper",
            },
        ],
        due_date: "1762819200000",
        list: {
            name: "Context Backlog",
        },
        tags: [
            {
                name: "integration",
            },
            {
                name: "context",
            },
        ],
        custom_fields: [
            {
                id: "cf-priority",
                name: "Priority",
                value: "High",
            },
            {
                id: "cf-stage",
                name: "Stage",
                value: "opt-2",
                type_config: {
                    options: [
                        {
                            id: "opt-1",
                            name: "Todo",
                        },
                        {
                            id: "opt-2",
                            name: "In Progress",
                        },
                    ],
                },
            },
        ],
        date_updated: "2026-03-12T14:00:00.000Z",
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

describe("ClickUpProvider", () => {
    test("loads ClickUp task and maps custom fields, list name and tags", async () => {
        const client = new StubClickUpApiClient()
        client.taskResponses = [
            {
                status: 200,
                headers: {},
                data: createTaskPayload(),
            },
        ]
        const provider = new ClickUpProvider({
            client,
        })

        const task = await provider.getTask("clk-123")

        expect(task).toEqual({
            id: "clk-123",
            title: "Stabilize clickup provider mapping",
            status: "In Progress",
            description: "Provider should preserve custom fields and list metadata from ClickUp.",
            assignee: "Grace Hopper",
            dueDate: "2025-11-11T00:00:00.000Z",
            listName: "Context Backlog",
            tags: [
                "integration",
                "context",
            ],
            customFields: [
                {
                    id: "cf-priority",
                    name: "Priority",
                    value: "High",
                },
                {
                    id: "cf-stage",
                    name: "Stage",
                    value: "In Progress",
                },
            ],
        })
        expect(client.taskCalls).toEqual([
            {
                taskId: "clk-123",
                includeSubtasks: false,
            },
        ])
    })

    test("loads shared external context for ClickUp task", async () => {
        const client = new StubClickUpApiClient()
        client.taskResponses = [
            {
                status: 200,
                headers: {},
                data: createTaskPayload(),
            },
        ]
        const provider = new ClickUpProvider({
            client,
        })

        const context = await provider.loadContext("clk-123")

        expect(context).toEqual({
            source: "CLICKUP",
            data: {
                task: {
                    id: "clk-123",
                    title: "Stabilize clickup provider mapping",
                    status: "In Progress",
                    description: "Provider should preserve custom fields and list metadata from ClickUp.",
                    assignee: "Grace Hopper",
                    dueDate: "2025-11-11T00:00:00.000Z",
                    listName: "Context Backlog",
                    tags: [
                        "integration",
                        "context",
                    ],
                    customFields: [
                        {
                            id: "cf-priority",
                            name: "Priority",
                            value: "High",
                        },
                        {
                            id: "cf-stage",
                            name: "Stage",
                            value: "In Progress",
                        },
                    ],
                },
                assignee: "Grace Hopper",
                dueDate: "2025-11-11T00:00:00.000Z",
                listName: "Context Backlog",
                tags: [
                    "integration",
                    "context",
                ],
                customFields: [
                    {
                        id: "cf-priority",
                        name: "Priority",
                        value: "High",
                    },
                    {
                        id: "cf-stage",
                        name: "Stage",
                        value: "In Progress",
                    },
                ],
            },
            fetchedAt: new Date("2026-03-12T14:00:00.000Z"),
        })
    })

    test("returns null for not found task", async () => {
        const client = new StubClickUpApiClient()
        client.taskResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    err: "Task not found",
                },
            },
        ]
        const provider = new ClickUpProvider({
            client,
        })

        const task = await provider.getTask("missing-task")

        expect(task).toBeNull()
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubClickUpApiClient()
        const sleepDelays: number[] = []
        client.taskResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    err: "Rate limit",
                },
            },
            {
                status: 200,
                headers: {},
                data: createTaskPayload(),
            },
        ]
        const provider = new ClickUpProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const task = await provider.getTask("clk-123")

        expect(task?.id).toBe("clk-123")
        expect(client.taskCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubClickUpApiClient()
        const sleepDelays: number[] = []
        client.taskResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    err: "Forbidden",
                    ECODE: "OAUTH_023",
                },
            },
        ]
        const provider = new ClickUpProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getTask("clk-403")
            throw new Error("Expected ClickUpProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "ClickUpProviderError",
                message: "Forbidden",
                code: "OAUTH_023",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<ClickUpProviderError & IClickUpProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("uses internal fetch-backed ClickUp client with raw authorization token", async () => {
        const calls: Array<{readonly url: string; readonly headers: Readonly<Record<string, string>>}> = []
        const provider = new ClickUpProvider({
            apiToken: "clickup-secret",
            fetchImplementation: asFetchImplementation((
                input: RequestInfo | URL,
                init?: RequestInit,
            ): Promise<Response> => {
                calls.push({
                    url: normalizeRequestTarget(input),
                    headers: readRequestHeaders(init),
                })

                return Promise.resolve(new Response(JSON.stringify(createTaskPayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const task = await provider.getTask("clk-123")

        expect(task?.id).toBe("clk-123")
        expect(calls[0]?.url).toContain("https://api.clickup.com/api/v2/task/clk-123")
        expect(calls[0]?.url).toContain("include_subtasks=false")
        expect(calls[0]?.headers["authorization"]).toBe("clickup-secret")
        expect(calls[0]?.headers["accept"]).toBe("application/json")
    })

    test("throws configuration error when auth is missing for internal client", () => {
        try {
            new ClickUpProvider({
                baseUrl: "https://api.clickup.com/api/v2",
            })
            throw new Error("Expected ClickUpProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "ClickUpProviderError",
                code: "CONFIGURATION",
            } satisfies Partial<ClickUpProviderError>)
        }
    })

    test("handles invalid JSON response body from internal fetch client", async () => {
        const provider = new ClickUpProvider({
            apiToken: "clickup-secret",
            fetchImplementation: asFetchImplementation((): Promise<Response> => {
                return Promise.resolve(new Response("not-json", {
                    status: 500,
                }))
            }),
            retryMaxAttempts: 1,
        })

        try {
            await provider.getTask("clk-500")
            throw new Error("Expected ClickUpProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "ClickUpProviderError",
                statusCode: 500,
                message: "ClickUp request failed with status 500",
            } satisfies Partial<ClickUpProviderError>)
        }
    })
})
