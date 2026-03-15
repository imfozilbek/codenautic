import {describe, expect, test} from "bun:test"

import {
    DatadogAlertAcl,
    DatadogContextAcl,
    DatadogLogAcl,
    mapDatadogContext,
    mapExternalDatadogAlert,
    mapExternalDatadogLogs,
} from "../../src/context"

describe("Datadog context ACL contract", () => {
    test("maps Datadog monitor payload into deterministic alert DTO", () => {
        const alert = mapExternalDatadogAlert({
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
        })

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
    })

    test("maps Datadog logs payload and extracts source file paths", () => {
        const logs = mapExternalDatadogLogs({
            data: [
                {
                    id: "log-1",
                    attributes: {
                        message:
                            "Unhandled exception at packages/runtime/src/worker/review-worker.ts line 91",
                        status: "error",
                        service: "analytics-worker",
                        timestamp: "2026-03-15T08:11:10.000Z",
                        attributes: {
                            file_path: "packages/runtime/src/worker/review-worker.ts",
                        },
                    },
                },
                {
                    id: "log-2",
                    attributes: {
                        message: "Follow-up failure in packages/core/src/application/use-cases/foo.ts",
                        status: "warning",
                        service: "analytics-worker",
                        timestamp: "2026-03-15T08:11:40.000Z",
                    },
                },
            ],
        })

        expect(logs).toEqual([
            {
                id: "log-1",
                timestamp: "2026-03-15T08:11:10.000Z",
                message: "Unhandled exception at packages/runtime/src/worker/review-worker.ts line 91",
                service: "analytics-worker",
                status: "error",
                filePath: "packages/runtime/src/worker/review-worker.ts",
            },
            {
                id: "log-2",
                timestamp: "2026-03-15T08:11:40.000Z",
                message: "Follow-up failure in packages/core/src/application/use-cases/foo.ts",
                service: "analytics-worker",
                status: "warning",
                filePath: "packages/core/src/application/use-cases/foo.ts",
            },
        ])
    })

    test("maps Datadog context with alert logs and affected code paths", () => {
        const context = mapDatadogContext({
            monitor: {
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
            },
            logs: {
                data: [
                    {
                        id: "log-1",
                        attributes: {
                            message:
                                "Unhandled exception at packages/runtime/src/worker/review-worker.ts",
                            status: "error",
                            service: "analytics-worker",
                            timestamp: "2026-03-15T08:11:10.000Z",
                            attributes: {
                                file_path: "packages/runtime/src/worker/review-worker.ts",
                            },
                        },
                    },
                ],
            },
        })

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
                        message:
                            "Unhandled exception at packages/runtime/src/worker/review-worker.ts",
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
    })

    test("exposes Datadog ACL adapters as thin wrappers over mapping functions", () => {
        const alertAcl = new DatadogAlertAcl()
        const logAcl = new DatadogLogAcl()
        const contextAcl = new DatadogContextAcl()

        const alert = alertAcl.toDomain({
            id: 4021,
            name: "Datadog alert",
            overall_state: "Warn",
        })
        const logs = logAcl.toDomain({
            data: [
                {
                    id: "log-1",
                    attributes: {
                        message: "Failure in packages/adapters/src/context/datadog-provider.ts",
                        timestamp: "2026-03-15T08:11:10.000Z",
                    },
                },
            ],
        })
        const context = contextAcl.toDomain({
            monitor: {
                id: 4021,
                name: "Datadog alert",
                overall_state: "Warn",
            },
            logs: {
                data: [
                    {
                        id: "log-1",
                        attributes: {
                            message: "Failure in packages/adapters/src/context/datadog-provider.ts",
                            timestamp: "2026-03-15T08:11:10.000Z",
                        },
                    },
                ],
            },
        })

        expect(alert.id).toBe("4021")
        expect(logs).toHaveLength(1)
        expect(context.source).toBe("DATADOG")
    })
})
