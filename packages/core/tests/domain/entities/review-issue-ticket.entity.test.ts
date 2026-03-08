import {describe, expect, test} from "bun:test"

import {
    ReviewIssueTicket,
    REVIEW_ISSUE_TICKET_STATUS,
    type ReviewIssueTicketStatus,
} from "../../../src/domain/entities/review-issue-ticket.entity"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("ReviewIssueTicket", () => {
    test("creates ticket with normalized properties", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-1"), {
            sourceReviewId: " review-1 ",
            sourceSuggestionIds: [" suggestion-1 ", "suggestion-2"],
            filePath: FilePath.create("src/app.ts"),
            category: " Security ",
            occurrenceCount: 2,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        expect(ticket.id.value).toBe("ticket-1")
        expect(ticket.sourceReviewId).toBe("review-1")
        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1", "suggestion-2"])
        expect(ticket.filePath.toString()).toBe("src/app.ts")
        expect(ticket.category).toBe("security")
        expect(ticket.occurrenceCount).toBe(2)
        expect(ticket.status).toBe(REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS)
    })

    test("adds occurrence and updates count", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-2"), {
            sourceReviewId: "review-2",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "bug",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        ticket.addOccurrence("suggestion-2")

        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1", "suggestion-2"])
        expect(ticket.occurrenceCount).toBe(2)
    })

    test("counts repeated occurrence without duplicating suggestion ids", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-dup"), {
            sourceReviewId: "review-dup",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "bug",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        ticket.addOccurrence("suggestion-1")

        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1"])
        expect(ticket.occurrenceCount).toBe(2)
    })

    test("resolves and dismisses only in progress tickets", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-3"), {
            sourceReviewId: "review-3",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "maintainability",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        ticket.resolve()
        expect(ticket.status).toBe(REVIEW_ISSUE_TICKET_STATUS.RESOLVED)

        expect(() => {
            ticket.dismiss()
        }).toThrow("Cannot dismiss review issue ticket in status RESOLVED")
    })

    test("dismisses in progress ticket", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-3a"), {
            sourceReviewId: "review-3a",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "maintainability",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        ticket.dismiss()

        expect(ticket.status).toBe(REVIEW_ISSUE_TICKET_STATUS.DISMISSED)
    })

    test("throws when adding occurrence to non-active ticket", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-4"), {
            sourceReviewId: "review-4",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "security",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.DISMISSED,
        })

        expect(() => {
            ticket.addOccurrence("suggestion-2")
        }).toThrow("Cannot add occurrence to review issue ticket in status DISMISSED")
    })

    test("allows occurrence count to exceed unique suggestion ids", () => {
        const ticket = new ReviewIssueTicket(UniqueId.create("ticket-5"), {
            sourceReviewId: "review-5",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/index.ts"),
            category: "other",
            occurrenceCount: 2,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        expect(ticket.occurrenceCount).toBe(2)
        expect(ticket.sourceSuggestionIds).toEqual(["suggestion-1"])
    })

    test("throws when occurrence count is less than unique suggestion ids", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-5"), {
                sourceReviewId: "review-5",
                sourceSuggestionIds: ["suggestion-1", "suggestion-2"],
                filePath: FilePath.create("src/index.ts"),
                category: "other",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket occurrenceCount cannot be less than suggestionIds length")
    })

    test("throws when occurrence count is not a positive integer", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-5a"), {
                sourceReviewId: "review-5a",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "style",
                occurrenceCount: 0,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket occurrenceCount must be a positive integer")

        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-5b"), {
                sourceReviewId: "review-5b",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "style",
                occurrenceCount: 1.5,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket occurrenceCount must be a positive integer")
    })

    test("throws on duplicate or empty suggestion ids", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-6"), {
                sourceReviewId: "review-6",
                sourceSuggestionIds: ["suggestion-1", "suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "bug",
                occurrenceCount: 2,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("Duplicate suggestionId: suggestion-1")

        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-7"), {
                sourceReviewId: "review-7",
                sourceSuggestionIds: ["   "],
                filePath: FilePath.create("src/index.ts"),
                category: "bug",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket suggestionId cannot be empty")

        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-7a"), {
                sourceReviewId: "review-7a",
                sourceSuggestionIds: [],
                filePath: FilePath.create("src/index.ts"),
                category: "bug",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket must include at least one suggestionId")
    })

    test("throws when review id is empty", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-8"), {
                sourceReviewId: "   ",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "performance",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket sourceReviewId cannot be empty")
    })

    test("throws when status is unknown", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-9"), {
                sourceReviewId: "review-9",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "performance",
                occurrenceCount: 1,
                status: "UNKNOWN" as ReviewIssueTicketStatus,
            })
        }).toThrow("Unknown review issue ticket status")
    })

    test("throws when category is empty", () => {
        expect(() => {
            return new ReviewIssueTicket(UniqueId.create("ticket-10"), {
                sourceReviewId: "review-10",
                sourceSuggestionIds: ["suggestion-1"],
                filePath: FilePath.create("src/index.ts"),
                category: "   ",
                occurrenceCount: 1,
                status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
            })
        }).toThrow("ReviewIssueTicket category cannot be empty")
    })
})
