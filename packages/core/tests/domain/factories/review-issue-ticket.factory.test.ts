import {describe, expect, test} from "bun:test"

import {REVIEW_ISSUE_TICKET_STATUS} from "../../../src/domain/entities/review-issue-ticket.entity"
import {ReviewIssueTicketFactory} from "../../../src/domain/factories/review-issue-ticket.factory"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"

describe("ReviewIssueTicketFactory", () => {
    test("creates new review issue ticket with generated id", () => {
        const factory = new ReviewIssueTicketFactory()
        const ticket = factory.create({
            sourceReviewId: "review-1",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/review.ts"),
            category: "security",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        expect(ticket.id.value.length).toBeGreaterThan(0)
        expect(ticket.sourceReviewId).toBe("review-1")
        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1"])
        expect(ticket.filePath.toString()).toBe("src/review.ts")
        expect(ticket.category).toBe("security")
        expect(ticket.occurrenceCount).toBe(1)
    })

    test("reconstitutes review issue ticket from persistence snapshot", () => {
        const factory = new ReviewIssueTicketFactory()
        const ticket = factory.reconstitute({
            id: "ticket-123",
            sourceReviewId: "review-2",
            sourceSuggestionIds: ["suggestion-1", "suggestion-2"],
            filePath: FilePath.create("src/security.ts"),
            category: "bug",
            occurrenceCount: 3,
            status: REVIEW_ISSUE_TICKET_STATUS.RESOLVED,
        })

        expect(ticket.id.value).toBe("ticket-123")
        expect(ticket.sourceReviewId).toBe("review-2")
        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1", "suggestion-2"])
        expect(ticket.filePath.toString()).toBe("src/security.ts")
        expect(ticket.category).toBe("bug")
        expect(ticket.occurrenceCount).toBe(3)
        expect(ticket.status).toBe(REVIEW_ISSUE_TICKET_STATUS.RESOLVED)
    })
})
