import {describe, expect, test} from "bun:test"

import {type IDatadogProviderErrorDetails, DatadogProviderError} from "../../src/context/datadog-provider.error"
import {
    DatadogProvider,
    type IDatadogApiClient,
    type IDatadogApiResponse,
    type IDatadogGetMonitorRequest,
    type IDatadogSearchLogsRequest,
} from "../../src/context/datadog-provider"

type DatadogMonitorPayload = Readonly<Record<string, unknown>>
type DatadogLogsPayload = Readonly<Record<string, unknown>>
type MonitorResponseQueueItem = IDatadogApiResponse<DatadogMonitorPayload> | Error
type LogsResponseQueueItem = IDatadogApiResponse<DatadogLogsPayload> | Error

class StubDatadogApiClient implements IDatadogApiClient {
    public monitorResponses: MonitorResponseQueueItem[] = []
    public logsResponses: LogsResponseQueueItem[] = []
    public monitorCalls: IDatadogGetMonitorRequest[] = []
    public logsCalls: IDatadogSearchLogsRequest[] = []

    public getMonitor(
        request: IDatadogGetMonitorRequest,
    ): Promise<IDatadogApiResponse<DatadogMonitorPayload>> {
        this.monitorCalls.push(request)
        const response = this.monitorResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed monitor response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }

    public searchLogs(
        request: IDatadogSearchLogsRequest,
    ): Promise<IDatadogApiResponse<DatadogLogsPayload>> {
        this.logsCalls.push(request)
        const response = this.logsResponses.shift()
        if (response === undefined) {
            return Promise.reject(new Error("Missing stubbed logs response"))
        }

        if (response instanceof Error) {
            return Promise.reject(response)
        }

        return Promise.resolve(response)
    }
}

/**
 * Creates Datadog monitor payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Datadog monitor payload.
 */
function createMonitorPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        id: 4021,
        name: "High error rate in analytics worker",
        overall_state: "Alert",
        query: "avg(last_5m):sum:trace.errors{service:analytics-worker}.as_count() > 10",
        tags: [
            "service:analytics-worker",
            "team:platform",
        ],
        priority: 2,
        overall_state_modified: "2026-03-15T08:10:00.000Z",
        ...overrides,
    }
}

/**
 * Creates Datadog logs payload used by provider tests.
 *
 * @param overrides Optional payload overrides.
 * @returns Datadog logs payload.
 */
function createLogsPayload(
    overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
    return {
        data: [
            {
                id: "log-1",
                attributes: {
                    message: "Unhandled exception at packages/runtime/src/worker/review-worker.ts",
                    status: "error",
                    service: "analytics-worker",
                    timestamp: "2026-03-15T08:11:10.000Z",
                    attributes: {
                        file_path: "packages/runtime/src/worker/review-worker.ts",
                    },
                },
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

describe("DatadogProvider", () => {
    test("loads Datadog alert and normalizes title status severity and tags", async () => {
        const client = new StubDatadogApiClient()
        client.monitorResponses = [
            {
                status: 200,
                headers: {},
                data: createMonitorPayload(),
            },
        ]
        const provider = new DatadogProvider({
            client,
        })

        const alert = await provider.getAlert("4021")

        expect(alert).toEqual({
            id: "4021",
            title: "High error rate in analytics worker",
            status: "Alert",
            query: "avg(last_5m):sum:trace.errors{service:analytics-worker}.as_count() > 10",
            tags: [
                "service:analytics-worker",
                "team:platform",
            ],
            severity: "high",
            triggeredAt: "2026-03-15T08:10:00.000Z",
        })
        expect(client.monitorCalls).toEqual([
            {
                monitorId: "4021",
            },
        ])
        expect(client.logsCalls).toEqual([])
    })

    test("loads shared external context with logs and affected code paths", async () => {
        const client = new StubDatadogApiClient()
        client.monitorResponses = [
            {
                status: 200,
                headers: {},
                data: createMonitorPayload(),
            },
        ]
        client.logsResponses = [
            {
                status: 200,
                headers: {},
                data: createLogsPayload(),
            },
        ]
        const provider = new DatadogProvider({
            client,
            logsTimeWindowMinutes: 30,
        })

        const context = await provider.loadContext("4021")

        expect(context).toEqual({
            source: "DATADOG",
            data: {
                alert: {
                    id: "4021",
                    title: "High error rate in analytics worker",
                    status: "Alert",
                    query: "avg(last_5m):sum:trace.errors{service:analytics-worker}.as_count() > 10",
                    tags: [
                        "service:analytics-worker",
                        "team:platform",
                    ],
                    severity: "high",
                    triggeredAt: "2026-03-15T08:10:00.000Z",
                },
                logs: [
                    {
                        id: "log-1",
                        timestamp: "2026-03-15T08:11:10.000Z",
                        message: "Unhandled exception at packages/runtime/src/worker/review-worker.ts",
                        service: "analytics-worker",
                        status: "error",
                        filePath: "packages/runtime/src/worker/review-worker.ts",
                    },
                ],
                affectedCodePaths: [
                    "packages/runtime/src/worker/review-worker.ts",
                ],
            },
            fetchedAt: new Date("2026-03-15T08:10:00.000Z"),
        })
        expect(client.logsCalls).toEqual([
            {
                query: "@monitor.id:4021 service:analytics-worker status:error",
                from: "2026-03-15T07:40:00.000Z",
                to: "2026-03-15T08:10:00.000Z",
                limit: 25,
            },
        ])
    })

    test("returns null when monitor is not found", async () => {
        const client = new StubDatadogApiClient()
        client.monitorResponses = [
            {
                status: 404,
                headers: {},
                data: {
                    errors: [
                        "Monitor not found",
                    ],
                },
            },
        ]
        const provider = new DatadogProvider({
            client,
        })

        const alert = await provider.getAlert("missing-monitor")

        expect(alert).toBeNull()
        expect(client.logsCalls).toEqual([])
    })

    test("retries once on rate limit and respects retry-after header", async () => {
        const client = new StubDatadogApiClient()
        const sleepDelays: number[] = []
        client.monitorResponses = [
            {
                status: 429,
                headers: {
                    "retry-after": "2",
                },
                data: {
                    errors: [
                        "Rate limit exceeded",
                    ],
                },
            },
            {
                status: 200,
                headers: {},
                data: createMonitorPayload(),
            },
        ]
        const provider = new DatadogProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const alert = await provider.getAlert("4021")

        expect(alert?.id).toBe("4021")
        expect(client.monitorCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([2000])
    })

    test("retries transient upstream failures while loading logs", async () => {
        const client = new StubDatadogApiClient()
        const sleepDelays: number[] = []
        client.monitorResponses = [
            {
                status: 200,
                headers: {},
                data: createMonitorPayload(),
            },
        ]
        client.logsResponses = [
            {
                status: 503,
                headers: {},
                data: {
                    errors: [
                        "Temporary outage",
                    ],
                },
            },
            {
                status: 200,
                headers: {},
                data: createLogsPayload(),
            },
        ]
        const provider = new DatadogProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        const context = await provider.loadContext("4021")

        expect(context?.source).toBe("DATADOG")
        expect(client.logsCalls).toHaveLength(2)
        expect(sleepDelays).toEqual([250])
    })

    test("throws non-retryable error for permission denied response", async () => {
        const client = new StubDatadogApiClient()
        const sleepDelays: number[] = []
        client.monitorResponses = [
            {
                status: 403,
                headers: {},
                data: {
                    errors: [
                        "Forbidden",
                    ],
                    code: "FORBIDDEN",
                },
            },
        ]
        const provider = new DatadogProvider({
            client,
            sleep: (delayMs: number): Promise<void> => {
                sleepDelays.push(delayMs)
                return Promise.resolve()
            },
        })

        try {
            await provider.getAlert("4021")
            throw new Error("Expected DatadogProviderError to be thrown")
        } catch (error: unknown) {
            expect(error).toMatchObject({
                name: "DatadogProviderError",
                message: "Forbidden",
                code: "FORBIDDEN",
                statusCode: 403,
                isRetryable: false,
            } satisfies Partial<DatadogProviderError & IDatadogProviderErrorDetails>)
        }
        expect(sleepDelays).toEqual([])
    })

    test("uses internal fetch-backed Datadog client with API and application keys", async () => {
        const requests: Array<{
            readonly url: string
            readonly init: RequestInit | undefined
        }> = []
        const provider = new DatadogProvider({
            baseUrl: "https://api.datadoghq.eu",
            apiKey: "datadog-api-key",
            applicationKey: "datadog-app-key",
            fetchImplementation: asFetchImplementation((input, init) => {
                requests.push({
                    url: normalizeRequestTarget(input),
                    init,
                })

                return Promise.resolve(new Response(JSON.stringify(createMonitorPayload()), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                }))
            }),
        })

        const alert = await provider.getAlert("4021")

        expect(alert?.id).toBe("4021")
        expect(requests).toHaveLength(1)
        expect(requests[0]?.url).toBe("https://api.datadoghq.eu/api/v1/monitor/4021")
        expect(readRequestHeaders(requests[0]?.init)).toEqual({
            accept: "application/json",
            "content-type": "application/json",
            "dd-api-key": "datadog-api-key",
            "dd-application-key": "datadog-app-key",
        })
    })

    test("throws configuration errors when auth keys are missing", () => {
        expect(() => {
            return new DatadogProvider({
                baseUrl: "https://api.datadoghq.com",
            })
        }).toThrow("Datadog apiKey is required when no client is provided")

        expect(() => {
            return new DatadogProvider({
                baseUrl: "https://api.datadoghq.com",
                apiKey: "api-key",
            })
        }).toThrow("Datadog applicationKey is required when no client is provided")
    })
})
