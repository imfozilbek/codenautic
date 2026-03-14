import {describe, expect, test} from "bun:test"

import {type IAsanaProviderErrorDetails, AsanaProviderError} from "../../src/context/asana-provider.error"
import {
    AsanaProvider,
    type IAsanaApiClient,
    type IAsanaApiResponse,
    type IAsanaGetTaskRequest,
} from "../../src/context/asana-provider"

type AsanaTaskPayload = Readonly<Record<string, unknown>>
type TaskResponseQueueItem = IAsanaApiResponse<AsanaTaskPayload> | Error

class StubAsanaApiClient implements IAsanaApiClient {
    public taskResponses: TaskResponseQueueItem[] = []
    public taskCalls: IAsanaGetTaskRequest[] = []

    public getTask(request: IAsanaGetTaskRequest): Promise<IAsanaApiResponse<AsanaTaskPayload>> {
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
 * Creates Asana task payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Asana task payload.
 */
function createTaskPayload(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
    return {
        gid: "task-123",
        name: "Sync context provider contracts",
        completed: false,
        notes: "Keep Asana provider aligned with normalized DTOs.",
        assignee: {
            name: "Grace Hopper",
        },
        due_on: "2026-03-11",
        memberships: [
            {
                project: {
                    gid: "project-1",
                    name: "Context Platform",
                },
                section: {
                    gid: "section-1",
                    name: "In Progress",
                },
            },
        ],
        tags: [
            {
                name: "integration",
            },
            {
                name: "context",
            },
        ],
        modified_at: "2026-03-10T12:15:00.000Z",
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

describe("AsanaProvider", () => {
    test("loads Asana task and maps hierarchy, assignee, due date and tags", async () => {
        const client = new StubAsanaApiClient()
        client.taskResponses = [
            {
                status: 200,
                headers: {},
                data: {
                    data: createTaskPayload(),
                },
            },
        ]
        const provider = new AsanaProvider({
            client,
        })

        const task = await provider.getTask("task-123")

        expect(task).toEqual({
            id: "task-123",
            title: "Sync context provider contracts",
            status: "unknown",
            description: "Keep Asana provider aligned with normalized DTOs.",
            assignee: "Grace Hopper",
            dueDate: "2026-03-11T00:00:00.000Z",
            projectHierarchy: [
                {
                    projectId: "project-1",
                    projectName: "Context Platform",
                    sectionId: "section-1",
                    sectionName: "In Progress",
                },
            ],
            tags: [
                "integration",
                "context",
            ],
        })
        expect(client.taskCalls).toHaveLength(1)
        expect(client.taskCalls[0]?.optFields.length).toBeGreaterThan(0)
    })

    test("loads shared external context for Asana task", async () => {
        const client = new StubAsanaApiClient()
        client.taskResponses = [
            {
                status: 200,
                headers: {},
                data: {
                    data: createTaskPayload(),
                },
            },
        ]
        const provider = new AsanaProvider({
            client,
        })

        const context = await provider.loadContext("task-123")

        expect(context).toEqual({
            source: "ASANA",
            data: {
                task: {
                    id: "task-123",
                    title: "Sync context provider contracts",
                    status: "unknown",
                    description: "Keep Asana provider aligned with normalized DTOs.",
                    assignee: "Grace Hopper",
                    dueDate: "2026-03-11T00:00:00.000Z",
                    projectHierarchy: [
                        {
                            projectId: "project-1",
                            projectName: "Context Platform",
                            sectionId: "section-1",
                            sectionName: "In Progress",
                        },
                    ],
                    tags: [
                        "integration",
                        "context",
                    ],
                },
                assignee: "Grace Hopper",
                dueDate: "2026-03-11T00:00:00.000Z",
                projectHierarchy: [
                    {
                        projectId: "project-1",
                        projectName: "Context Platform",
                        sectionId: "section-1",
                        sectionName: "In Progress",
                    },
                ],
                tags: [
                    "integration",
                    "context",
                ],
            },
            fetchedAt: new Date("2026-03-10T12:15:00.000Z"),
        })
    })

    test("returns null for not found task", async () => {
        const client = new StubAsanaApiClient()
        client.taskResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    errors: [
                        {
                            message: "Task not found",
                        },
                    ],
                },
            },
        ]
        const provider = new AsanaProvider({
            client,
        })

        const task = await provider.getTask("missing-task")

        expect(task).toBeNull()
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubAsanaApiClient()
        const sleepDelays: number[] = []
        client.taskResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    errors: [
                        {
                            message: "Rate limit",
                        },
                    ],
                },
            },
            {
                status: 200,
                headers: {},
                data: {
                    data: createTaskPayload(),
                },
            },
        ]
        const provider = new AsanaProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const task = await provider.getTask("task-123")

        expect(task?.id).toBe("task-123")
        expect(client.taskCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubAsanaApiClient()
        const sleepDelays: number[] = []
        client.taskResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    errors: [
                        {
                            message: "Forbidden",
                        },
                    ],
                },
            },
        ]
        const provider = new AsanaProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getTask("task-403")
            throw new Error("Expected AsanaProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "AsanaProviderError",
                message: "Forbidden",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<AsanaProviderError & IAsanaProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("uses internal fetch-backed Asana client with bearer auth", async () => {
        const calls: Array<{readonly url: string; readonly headers: Readonly<Record<string, string>>}> = []
        const provider = new AsanaProvider({
            baseUrl: "https://app.asana.com",
            accessToken: "asana-secret",
            fetchImplementation: asFetchImplementation((
                input: RequestInfo | URL,
                init?: RequestInit,
            ): Promise<Response> => {
                calls.push({
                    url: normalizeRequestTarget(input),
                    headers: readRequestHeaders(init),
                })

                return Promise.resolve(new Response(JSON.stringify({
                    data: createTaskPayload(),
                }), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const task = await provider.getTask("task-123")

        expect(task?.id).toBe("task-123")
        expect(calls[0]?.url).toContain("https://app.asana.com/api/1.0/tasks/task-123")
        expect(calls[0]?.url).toContain("opt_fields=")
        expect(calls[0]?.headers["authorization"]).toBe("Bearer asana-secret")
        expect(calls[0]?.headers["accept"]).toBe("application/json")
    })

    test("throws configuration error when auth is missing for internal client", () => {
        try {
            new AsanaProvider({
                baseUrl: "https://app.asana.com",
            })
            throw new Error("Expected AsanaProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "AsanaProviderError",
                code: "CONFIGURATION",
            } satisfies Partial<AsanaProviderError>)
        }
    })

    test("handles invalid JSON response body from internal fetch client", async () => {
        const provider = new AsanaProvider({
            accessToken: "asana-secret",
            fetchImplementation: asFetchImplementation((): Promise<Response> => {
                return Promise.resolve(new Response("not-json", {
                    status: 500,
                }))
            }),
            retryMaxAttempts: 1,
        })

        try {
            await provider.getTask("task-500")
            throw new Error("Expected AsanaProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "AsanaProviderError",
                statusCode: 500,
                message: "Asana request failed with status 500",
            } satisfies Partial<AsanaProviderError>)
        }
    })
})
