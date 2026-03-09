import {describe, expect, test} from "bun:test"

import type {
    IExternalContext,
    IJiraTicket,
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
})
