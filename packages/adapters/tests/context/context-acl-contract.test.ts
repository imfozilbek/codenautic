import {describe, expect, test} from "bun:test"

import {
    JiraContextAcl,
    JiraTicketAcl,
    LinearContextAcl,
    LinearIssueAcl,
    SentryContextAcl,
    SentryErrorAcl,
    mapExternalJiraTicket,
    mapExternalLinearIssue,
    mapExternalSentryError,
    mapJiraContext,
    mapLinearContext,
    mapSentryContext,
} from "../../src/context"

describe("Context ACL contract", () => {
    test("maps Jira issue fields/status/sprint into domain-safe DTO", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-101",
            fields: {
                summary: "Fix auth bug",
                status: {
                    name: "In Progress",
                },
                sprint: {
                    name: "Sprint 42",
                },
            },
            sdkPayload: {
                raw: true,
            },
        })

        expect(ticket).toEqual({
            key: "PRJ-101",
            summary: "Fix auth bug",
            status: "In Progress",
            sprint: "Sprint 42",
        })
    })

    test("normalizes invalid Jira payload without breaking domain model", () => {
        const ticket = mapExternalJiraTicket({
            id: 99,
            fields: {
                summary: 404,
                status: {
                    name: 500,
                },
                customfield_10020: [
                    {
                        name: "Sprint Board",
                    },
                ],
            },
        })

        expect(ticket).toEqual({
            key: "99",
            summary: "(no summary)",
            status: "unknown",
            sprint: "Sprint Board",
        })
    })

    test("maps Linear issue state/cycle into domain-safe DTO", () => {
        const issue = mapExternalLinearIssue({
            id: "LIN-77",
            title: "Refactor review stage",
            state: {
                name: "Started",
            },
            cycle: {
                name: "Cycle 12",
            },
        })

        expect(issue).toEqual({
            id: "LIN-77",
            title: "Refactor review stage",
            state: "Started",
            cycle: "Cycle 12",
        })
    })

    test("normalizes invalid Linear payload without breaking domain model", () => {
        const issue = mapExternalLinearIssue({
            issueId: 88,
            name: 123,
            state: null,
            status: {
                name: "Backlog",
            },
        })

        expect(issue).toEqual({
            id: "88",
            title: "(no title)",
            state: "Backlog",
        })
    })

    test("prefers explicit Jira sprint and trims textual fields", () => {
        const ticket = mapExternalJiraTicket({
            key: "  PRJ-200  ",
            fields: {
                summary: "  Align ACL  ",
                status: {
                    name: "  Open  ",
                },
                sprint: {
                    name: "  Sprint Direct  ",
                },
                customfield_10020: [
                    {
                        name: "Fallback Sprint",
                    },
                ],
            },
        })

        const context = mapJiraContext({
            key: "PRJ-200",
            fields: {
                summary: "Align ACL",
                status: {
                    name: "Open",
                },
                sprint: {
                    name: "  Sprint Direct  ",
                },
                customfield_10020: [
                    {
                        name: "Fallback Sprint",
                    },
                ],
            },
        })

        expect(ticket).toEqual({
            key: "PRJ-200",
            summary: "Align ACL",
            status: "Open",
            sprint: "Sprint Direct",
        })
        expect((context.data as {sprint?: string}).sprint).toBe("Sprint Direct")
    })

    test("uses numeric Jira id when string identifiers are blank", () => {
        const ticket = mapExternalJiraTicket({
            key: "   ",
            issueKey: "",
            id: 321,
            fields: {
                summary: "Numeric id fallback",
                status: {
                    name: "Todo",
                },
            },
        })

        expect(ticket.key).toBe("321")
    })

    test("falls back from blank Jira text fields and invalid id number", () => {
        const ticket = mapExternalJiraTicket({
            key: "   ",
            issueKey: "   ",
            id: Number.POSITIVE_INFINITY,
            title: "  Summary from root title  ",
            status: "  Root status  ",
            fields: {
                summary: "   ",
                status: {
                    name: "   ",
                    statusCategory: "  In QA  ",
                },
            },
        })

        expect(ticket).toEqual({
            key: "UNKNOWN",
            summary: "Summary from root title",
            status: "In QA",
        })
    })

    test("prefers cycle object name and trims Linear textual fields", () => {
        const issue = mapExternalLinearIssue({
            identifier: "  LIN-200  ",
            name: "  Review cleanup  ",
            status: {
                name: "  In Review  ",
            },
            cycle: {
                name: "  Cycle Object  ",
            },
            cycleName: "Cycle Fallback",
        })

        const context = mapLinearContext({
            id: "LIN-200",
            title: "Review cleanup",
            state: {
                name: "In Review",
            },
            cycle: {
                name: "  Cycle Object  ",
            },
            cycleName: "Cycle Fallback",
        })

        expect(issue).toEqual({
            id: "LIN-200",
            title: "Review cleanup",
            state: "In Review",
            cycle: "Cycle Object",
        })
        expect((context.data as {cycle?: string}).cycle).toBe("Cycle Object")
    })

    test("falls back from blank Linear text fields", () => {
        const issue = mapExternalLinearIssue({
            id: "LIN-404",
            title: "   ",
            name: "  Name fallback  ",
            state: {
                name: "   ",
            },
            status: {
                name: "  Backlog  ",
            },
        })

        expect(issue).toEqual({
            id: "LIN-404",
            title: "Name fallback",
            state: "Backlog",
        })
    })

    test("maps Linear description, priority, project and sub-issues into deterministic DTO fields", () => {
        const issue = mapExternalLinearIssue({
            identifier: "  ENG-204  ",
            title: "  Stabilize external context sync  ",
            description: "  Preserve project and child issue context.  ",
            priorityLabel: "  High  ",
            cycle: {
                name: "  Cycle 14  ",
            },
            project: {
                id: "project-42",
                name: "  Context Platform  ",
                description: "  Keeps review enrichment adapters in sync.  ",
                state: "  started  ",
                priorityLabel: "  Urgent  ",
            },
            children: {
                nodes: [
                    {
                        identifier: "ENG-205",
                        title: "  Map child issue priority  ",
                        state: {
                            name: "  Todo  ",
                        },
                        priority: 3,
                    },
                ],
            },
        })
        const context = mapLinearContext({
            identifier: "ENG-204",
            title: "Stabilize external context sync",
            description: "Preserve project and child issue context.",
            priorityLabel: "High",
            cycle: {
                name: "Cycle 14",
            },
            project: {
                id: "project-42",
                name: "Context Platform",
                description: "Keeps review enrichment adapters in sync.",
                state: "started",
                priorityLabel: "Urgent",
            },
            children: {
                nodes: [
                    {
                        identifier: "ENG-205",
                        title: "Map child issue priority",
                        state: {
                            name: "Todo",
                        },
                        priorityLabel: "Normal",
                    },
                ],
            },
        })

        expect(issue).toEqual({
            id: "ENG-204",
            title: "Stabilize external context sync",
            state: "unknown",
            description: "Preserve project and child issue context.",
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
        })
        expect(context).toEqual({
            source: "LINEAR",
            data: {
                issue: {
                    id: "ENG-204",
                    title: "Stabilize external context sync",
                    state: "unknown",
                    description: "Preserve project and child issue context.",
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
                },
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
            },
            fetchedAt: new Date(0),
        })
    })

    test("maps Linear state and priority from nested fallbacks and ignores invalid child entries", () => {
        const issue = mapExternalLinearIssue({
            id: "LIN-501",
            title: "Linear fallback handling",
            state: {
                name: "   ",
                type: "started",
            },
            priority: 2,
            project: {
                id: "project-77",
                name: "Provider Runtime",
                description: "   ",
                priority: 4,
            },
            subIssues: [
                null,
                {
                    issueId: 778,
                    name: "  Search fallback  ",
                    status: {
                        name: "  Backlog  ",
                    },
                    priority: 1,
                },
                {
                    id: "   ",
                    title: "   ",
                },
            ],
        })

        expect(issue).toEqual({
            id: "LIN-501",
            title: "Linear fallback handling",
            state: "started",
            priority: "High",
            project: {
                id: "project-77",
                name: "Provider Runtime",
                priority: "Low",
            },
            subIssues: [
                {
                    id: "778",
                    title: "Search fallback",
                    state: "Backlog",
                    priority: "Urgent",
                },
            ],
        })
    })

    test("drops empty Linear project context, deduplicates child issues and ignores blank priorities", () => {
        const issue = mapExternalLinearIssue({
            id: "LIN-700",
            title: "Linear dedupe coverage",
            state: "Todo",
            project: {
                id: "   ",
                name: "   ",
                priorityLabel: "   ",
            },
            subIssues: [
                {
                    identifier: "SUB-1",
                    title: "First child",
                    state: "Todo",
                    priorityLabel: "   ",
                },
                {
                    identifier: "SUB-1",
                    title: "Duplicate child",
                    state: "Done",
                    priority: 0,
                },
            ],
        })

        expect(issue).toEqual({
            id: "LIN-700",
            title: "Linear dedupe coverage",
            state: "Todo",
            subIssues: [
                {
                    id: "SUB-1",
                    title: "First child",
                    state: "Todo",
                },
            ],
        })
    })

    test("builds normalized Jira context with deterministic fetchedAt fallback", () => {
        const context = mapJiraContext({
            key: "PRJ-9",
            fields: {
                summary: "Investigate",
                status: {
                    name: "Todo",
                },
                customfield_10020: [
                    {
                        name: "Board Sprint",
                    },
                ],
            },
            fetchedAt: "not-a-date",
        })

        expect(context).toEqual({
            source: "JIRA",
            data: {
                ticket: {
                    key: "PRJ-9",
                    summary: "Investigate",
                    status: "Todo",
                    sprint: "Board Sprint",
                },
                sprint: "Board Sprint",
            },
            fetchedAt: new Date(0),
        })
    })

    test("maps Jira description and acceptance criteria from Atlassian document fields", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-303",
            fields: {
                summary: "Normalize Jira rich text",
                status: {
                    name: "Todo",
                },
                sprint: {
                    name: "Sprint Rich Text",
                },
                description: {
                    type: "doc",
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: "Review adapter should expose normalized context.",
                                },
                            ],
                        },
                        {
                            type: "heading",
                            content: [
                                {
                                    type: "text",
                                    text: "Acceptance Criteria",
                                },
                            ],
                        },
                        {
                            type: "bulletList",
                            content: [
                                {
                                    type: "listItem",
                                    content: [
                                        {
                                            type: "paragraph",
                                            content: [
                                                {
                                                    type: "text",
                                                    text: "Map description to plain text",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "listItem",
                                    content: [
                                        {
                                            type: "paragraph",
                                            content: [
                                                {
                                                    type: "text",
                                                    text: "Preserve sprint metadata",
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        })

        expect(ticket).toEqual({
            key: "PRJ-303",
            summary: "Normalize Jira rich text",
            status: "Todo",
            description:
                "Review adapter should expose normalized context.\n"
                + "Acceptance Criteria\nMap description to plain text\nPreserve sprint metadata",
            acceptanceCriteria: [
                "Map description to plain text",
                "Preserve sprint metadata",
            ],
            sprint: "Sprint Rich Text",
        })
    })

    test("prefers explicit Jira acceptance criteria field over description section", () => {
        const context = mapJiraContext({
            key: "PRJ-404",
            fields: {
                summary: "Support explicit checklist field",
                status: {
                    name: "Ready",
                },
                acceptanceCriteria: [
                    "Use explicit field",
                    "Ignore duplicate values",
                    "Use explicit field",
                ],
                description: "Acceptance Criteria:\n- Fallback should not win",
            },
        })

        expect(context).toEqual({
            source: "JIRA",
            data: {
                ticket: {
                    key: "PRJ-404",
                    summary: "Support explicit checklist field",
                    status: "Ready",
                    description: "Acceptance Criteria:\n- Fallback should not win",
                    acceptanceCriteria: [
                        "Use explicit field",
                        "Ignore duplicate values",
                    ],
                },
                acceptanceCriteria: [
                    "Use explicit field",
                    "Ignore duplicate values",
                ],
            },
            fetchedAt: new Date(0),
        })
    })

    test("keeps Jira description without inferring acceptance criteria when heading is absent", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-405",
            fields: {
                summary: "Plain description",
                status: {
                    name: "Open",
                },
                description: "<p>Rendered HTML description</p>",
                acceptanceCriteria: 42,
            },
        })

        expect(ticket).toEqual({
            key: "PRJ-405",
            summary: "Plain description",
            status: "Open",
            description: "Rendered HTML description",
        })
    })

    test("parses inline Jira acceptance criteria from description heading", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-406",
            fields: {
                summary: "Inline criteria",
                status: {
                    name: "Ready",
                },
                description: "Acceptance Criteria: - First item\n- Second item",
            },
        })

        expect(ticket.acceptanceCriteria).toEqual([
            "First item",
            "Second item",
        ])
    })

    test("parses array-based Jira description and task-item checklist payload", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-407",
            fields: {
                summary: "Array description",
                status: {
                    name: "Open",
                },
                description: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: "Array part",
                            },
                        ],
                    },
                    "Tail text",
                ],
                acceptanceCriteria: {
                    type: "taskItem",
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: "Line one",
                                },
                                {
                                    type: "hardBreak",
                                },
                                {
                                    type: "text",
                                    text: "Line two",
                                },
                            ],
                        },
                    ],
                },
            },
        })

        expect(ticket).toEqual({
            key: "PRJ-407",
            summary: "Array description",
            status: "Open",
            description: "Array part\nTail text",
            acceptanceCriteria: [
                "Line one\nLine two",
            ],
        })
    })

    test("parses nested Jira acceptance criteria values from generic content nodes", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-408",
            fields: {
                summary: "Nested criteria",
                status: {
                    name: "Open",
                },
                acceptanceCriteria: [
                    {
                        content: [
                            {
                                value: "Nested criteria item",
                            },
                        ],
                    },
                    {
                        value: "Direct value item",
                    },
                ],
            },
        })

        expect(ticket.acceptanceCriteria).toEqual([
            "Nested criteria item",
            "Direct value item",
        ])
    })

    test("stops description-based Jira acceptance criteria parsing on empty bullet marker", () => {
        const ticket = mapExternalJiraTicket({
            key: "PRJ-409",
            fields: {
                summary: "Stop criteria section",
                status: {
                    name: "Open",
                },
                description: "Acceptance Criteria\n- First item\n-\n- Ignored item",
            },
        })

        expect(ticket.acceptanceCriteria).toEqual([
            "First item",
        ])
    })

    test("builds normalized Linear context with parsed fetchedAt", () => {
        const context = mapLinearContext({
            id: "L-1",
            title: "Context",
            state: "Done",
            cycleName: "Cycle Alpha",
            updated_at: "2026-03-07T12:00:00.000Z",
        })

        expect(context).toEqual({
            source: "LINEAR",
            data: {
                issue: {
                    id: "L-1",
                    title: "Context",
                    state: "Done",
                    cycle: "Cycle Alpha",
                },
                cycle: "Cycle Alpha",
            },
            fetchedAt: new Date("2026-03-07T12:00:00.000Z"),
        })
    })

    test("maps Sentry error stack trace, frequency and affected users into deterministic DTO", () => {
        const error = mapExternalSentryError({
            id: "issue-7788",
            title: "   ",
            count: "31",
            userCount: 7,
            latestEvent: {
                exception: {
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
        })

        expect(error).toEqual({
            id: "issue-7788",
            title: "TypeError: Cannot read properties of undefined (reading 'id')",
            stackTrace: [
                "at ReviewPipelineStage.execute (/app/src/review/pipeline-stage.ts:81:17)",
                "at ReviewWorker.handle (/app/src/review/review-worker.ts:44:9)",
            ],
            frequency: 31,
            affectedUsers: 7,
        })
    })

    test("normalizes malformed Sentry payload into safe domain DTO", () => {
        const error = mapExternalSentryError({
            issueId: 404,
            culprit: 500,
            stackTrace: [
                "  TypeError: broken  ",
                "",
                " at handler (/srv/app.ts:10:2) ",
            ],
            frequency: "not-a-number",
            affectedUsers: -1,
        })

        expect(error).toEqual({
            id: "404",
            title: "(no title)",
            stackTrace: [
                "TypeError: broken",
                "at handler (/srv/app.ts:10:2)",
            ],
        })
    })

    test("builds normalized Sentry context with parsed fetchedAt", () => {
        const context = mapSentryContext({
            id: "issue-1",
            title: "Queue stalled",
            count: 9,
            userCount: "3",
            updatedAt: "2026-03-09T08:30:00.000Z",
            stackTrace: "Error: Queue stalled\nat Worker.process (/srv/worker.ts:18:4)",
        })

        expect(context).toEqual({
            source: "SENTRY",
            data: {
                error: {
                    id: "issue-1",
                    title: "Queue stalled",
                    stackTrace: [
                        "Error: Queue stalled",
                        "at Worker.process (/srv/worker.ts:18:4)",
                    ],
                    frequency: 9,
                    affectedUsers: 3,
                },
                frequency: 9,
                affectedUsers: 3,
            },
            fetchedAt: new Date("2026-03-09T08:30:00.000Z"),
        })
    })

    test("exposes class-based ACL wrappers for Jira, Linear and Sentry", () => {
        const jiraTicketAcl = new JiraTicketAcl()
        const linearIssueAcl = new LinearIssueAcl()
        const sentryErrorAcl = new SentryErrorAcl()
        const jiraContextAcl = new JiraContextAcl()
        const linearContextAcl = new LinearContextAcl()
        const sentryContextAcl = new SentryContextAcl()

        const jiraTicket = jiraTicketAcl.toDomain({
            key: "PRJ-7",
            summary: "From root",
            status: "Open",
        })
        const linearIssue = linearIssueAcl.toDomain({
            id: "LIN-3",
            title: "Issue",
            state: "Todo",
        })
        const sentryError = sentryErrorAcl.toDomain({
            id: "issue-5",
            title: "Worker exploded",
            stackTrace: "Error: Worker exploded\nat Worker.run (/srv/worker.ts:4:2)",
        })
        const jiraContext = jiraContextAcl.toDomain({
            key: "PRJ-7",
            summary: "Context",
            status: "Open",
            fetchedAt: new Date("2026-03-07T15:00:00.000Z"),
        })
        const linearContext = linearContextAcl.toDomain({
            id: "LIN-3",
            title: "Issue",
            state: "Todo",
            timestamp: 0,
        })
        const sentryContext = sentryContextAcl.toDomain({
            id: "issue-5",
            title: "Worker exploded",
            stackTrace: "Error: Worker exploded\nat Worker.run (/srv/worker.ts:4:2)",
            fetchedAt: new Date("2026-03-07T16:00:00.000Z"),
        })

        expect(jiraTicket).toEqual({
            key: "PRJ-7",
            summary: "From root",
            status: "Open",
        })
        expect(linearIssue).toEqual({
            id: "LIN-3",
            title: "Issue",
            state: "Todo",
        })
        expect(sentryError).toEqual({
            id: "issue-5",
            title: "Worker exploded",
            stackTrace: [
                "Error: Worker exploded",
                "at Worker.run (/srv/worker.ts:4:2)",
            ],
        })
        expect(jiraContext.source).toBe("JIRA")
        expect(linearContext.source).toBe("LINEAR")
        expect(sentryContext.source).toBe("SENTRY")
    })

    test("keeps context payload free from raw sdk-specific root fields", () => {
        const jira = mapJiraContext({
            key: "PRJ-1",
            fields: {
                summary: "A",
                status: {
                    name: "Open",
                },
            },
            sdkRootField: "must-not-leak",
        })

        const linear = mapLinearContext({
            id: "LIN-1",
            title: "B",
            state: "Done",
            sdkRootField: "must-not-leak",
        })
        const sentry = mapSentryContext({
            id: "issue-1",
            title: "C",
            stackTrace: "Error: C",
            sdkRootField: "must-not-leak",
        })

        expect(Object.keys(jira.data as Record<string, unknown>).sort()).toEqual([
            "ticket",
        ])
        expect(Object.keys(linear.data as Record<string, unknown>).sort()).toEqual([
            "issue",
        ])
        expect(Object.keys(sentry.data as Record<string, unknown>).sort()).toEqual([
            "error",
        ])
    })
})
