import {describe, expect, test} from "bun:test"

import {
    BugsnagContextAcl,
    BugsnagErrorAcl,
    mapBugsnagContext,
    mapExternalBugsnagError,
} from "../../src/context"

describe("Bugsnag context ACL contract", () => {
    test("maps Bugsnag error payload into deterministic DTO with breadcrumbs", () => {
        const error = mapExternalBugsnagError({
            id: "bug-1122",
            error_class: "TypeError",
            message: "Cannot read properties of undefined (reading 'id')",
            events_count: 12,
            users_affected: 4,
            events: [
                {
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
        })

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
    })

    test("maps Bugsnag context payload with shared breadcrumbs", () => {
        const context = mapBugsnagContext({
            id: "bug-1122",
            error_class: "TypeError",
            message: "Cannot read properties of undefined (reading 'id')",
            events_count: 12,
            users_affected: 4,
            updated_at: "2026-03-15T09:15:00.000Z",
            events: [
                {
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
        })

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

    test("exposes Bugsnag ACL adapters as thin wrappers over mapping functions", () => {
        const errorAcl = new BugsnagErrorAcl()
        const contextAcl = new BugsnagContextAcl()

        const error = errorAcl.toDomain({
            id: "bug-1122",
            error_class: "TypeError",
            message: "Cannot read properties of undefined (reading 'id')",
        })
        const context = contextAcl.toDomain({
            id: "bug-1122",
            error_class: "TypeError",
            message: "Cannot read properties of undefined (reading 'id')",
        })

        expect(error.id).toBe("bug-1122")
        expect(context.source).toBe("BUGSNAG")
    })
})
