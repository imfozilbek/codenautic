import {describe, expect, test} from "bun:test"

import type {
    IBugsnagError,
    IExternalContext,
    IJiraTicket,
    ILinearIssue,
    IPostHogFeatureFlag,
    ISentryError,
} from "../../../../src/application/dto/review/external-context.dto"

describe("IExternalContext review DTO", () => {
    test("supports enriched Jira ticket payload with optional context fields", () => {
        const ticket: IJiraTicket = {
            key: "PRJ-101",
            summary: "Align pipeline contracts",
            status: "In Progress",
            description: "Review pipeline depends on updated DTO mappings.",
            acceptanceCriteria: [
                "Update provider contract",
                "Preserve backward compatibility",
            ],
            sprint: "Sprint 42",
        }
        const payload: IExternalContext = {
            source: "JIRA",
            data: {
                ticket,
            },
            fetchedAt: new Date("2026-03-09T12:00:00.000Z"),
        }

        expect(ticket.acceptanceCriteria).toEqual([
            "Update provider contract",
            "Preserve backward compatibility",
        ])
        expect(ticket.description).toBe("Review pipeline depends on updated DTO mappings.")
        expect(ticket.sprint).toBe("Sprint 42")
        expect(payload.source).toBe("JIRA")
    })

    test("supports enriched Linear issue payload with project and sub-issue context", () => {
        const issue: ILinearIssue = {
            id: "ENG-204",
            title: "Stabilize external context sync",
            state: "In Progress",
            description: "Provider should preserve project and sub-issue context from Linear.",
            priority: "High",
            cycle: "Cycle 14",
            project: {
                id: "project-42",
                name: "Context Platform",
                description: "Keeps review enrichment adapters in sync.",
                state: "started",
                priority: "Urgent",
            },
            subIssues: [
                {
                    id: "ENG-205",
                    title: "Map child issue priority",
                    state: "Todo",
                    priority: "Normal",
                },
            ],
        }
        const payload: IExternalContext = {
            source: "LINEAR",
            data: {
                issue,
                cycle: issue.cycle,
                project: issue.project,
                subIssues: issue.subIssues,
            },
            fetchedAt: new Date("2026-03-09T13:00:00.000Z"),
        }

        expect(issue.priority).toBe("High")
        expect(issue.project?.name).toBe("Context Platform")
        expect(issue.subIssues).toEqual([
            {
                id: "ENG-205",
                title: "Map child issue priority",
                state: "Todo",
                priority: "Normal",
            },
        ])
        expect(payload.source).toBe("LINEAR")
    })

    test("supports enriched Sentry error payload with stack trace and volume indicators", () => {
        const error: ISentryError = {
            id: "issue-7788",
            title: "NullReferenceException in review worker",
            stackTrace: [
                "TypeError: Cannot read properties of undefined (reading 'id')",
                "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
                "at async ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
            ],
            frequency: 31,
            affectedUsers: 7,
        }
        const payload: IExternalContext = {
            source: "SENTRY",
            data: {
                error,
                frequency: error.frequency,
                affectedUsers: error.affectedUsers,
            },
            fetchedAt: new Date("2026-03-09T14:00:00.000Z"),
        }

        expect(error.stackTrace).toEqual([
            "TypeError: Cannot read properties of undefined (reading 'id')",
            "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
            "at async ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
        ])
        expect(error.frequency).toBe(31)
        expect(error.affectedUsers).toBe(7)
        expect(payload.source).toBe("SENTRY")
    })

    test("supports enriched Bugsnag error payload with breadcrumbs and severity", () => {
        const error: IBugsnagError = {
            id: "bug-1122",
            title: "TypeError in analytics worker",
            stackTrace: [
                "TypeError: Cannot read properties of undefined (reading 'length')",
                "at AnalyticsWorker.handle (/app/src/analytics/worker.ts:91:13)",
            ],
            severity: "error",
            breadcrumbs: [
                {
                    message: "Started processing analytics batch",
                    type: "process",
                    timestamp: "2026-03-15T09:10:00.000Z",
                },
                {
                    message: "Loaded repository metadata",
                    type: "state",
                    timestamp: "2026-03-15T09:10:01.000Z",
                },
            ],
            eventCount: 24,
            affectedUsers: 6,
        }
        const payload: IExternalContext = {
            source: "BUGSNAG",
            data: {
                error,
                breadcrumbs: error.breadcrumbs,
            },
            fetchedAt: new Date("2026-03-15T09:15:00.000Z"),
        }

        expect(error.severity).toBe("error")
        expect(error.breadcrumbs).toHaveLength(2)
        expect(error.eventCount).toBe(24)
        expect(payload.source).toBe("BUGSNAG")
    })

    test("supports enriched PostHog feature-flag payload with rollout and variant", () => {
        const featureFlag: IPostHogFeatureFlag = {
            key: "review_temporal_coupling_overlay",
            name: "Review temporal coupling overlay",
            status: "active",
            rolloutPercentage: 55,
            variant: "treatment",
            tags: [
                "review",
                "experiments",
            ],
        }
        const payload: IExternalContext = {
            source: "POSTHOG",
            data: {
                featureFlag,
                rolloutPercentage: featureFlag.rolloutPercentage,
                status: featureFlag.status,
            },
            fetchedAt: new Date("2026-03-15T10:00:00.000Z"),
        }

        expect(featureFlag.key).toBe("review_temporal_coupling_overlay")
        expect(featureFlag.status).toBe("active")
        expect(featureFlag.rolloutPercentage).toBe(55)
        expect(payload.source).toBe("POSTHOG")
    })
})
