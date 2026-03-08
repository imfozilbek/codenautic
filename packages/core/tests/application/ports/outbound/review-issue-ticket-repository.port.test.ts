import {describe, expect, test} from "bun:test"

import type {IReviewIssueTicketRepository} from "../../../../src/application/ports/outbound/review/review-issue-ticket-repository.port"
import {
    REVIEW_ISSUE_TICKET_STATUS,
    type ReviewIssueTicket,
} from "../../../../src/domain/entities/review-issue-ticket.entity"
import {ReviewIssueTicketFactory} from "../../../../src/domain/factories/review-issue-ticket.factory"
import {FilePath} from "../../../../src/domain/value-objects/file-path.value-object"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory implementation for `IReviewIssueTicketRepository`.
 */
class InMemoryReviewIssueTicketRepository implements IReviewIssueTicketRepository {
    private readonly storage: Map<string, ReviewIssueTicket>
    private readonly repositoryByTicketId: Map<string, string>

    public constructor() {
        this.storage = new Map<string, ReviewIssueTicket>()
        this.repositoryByTicketId = new Map<string, string>()
    }

    public findById(id: UniqueId): Promise<ReviewIssueTicket | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(ticket: ReviewIssueTicket): Promise<void> {
        this.storage.set(ticket.id.value, ticket)
        return Promise.resolve()
    }

    /**
     * Associates a saved ticket with repository scope for contract tests.
     *
     * @param ticketId Ticket identifier.
     * @param repositoryId Repository identifier.
     */
    public assignRepository(ticketId: string, repositoryId: string): void {
        this.repositoryByTicketId.set(ticketId, repositoryId)
    }

    public findByFilePath(path: FilePath): Promise<readonly ReviewIssueTicket[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((ticket) => {
                return ticket.filePath.toString() === path.toString()
            }),
        )
    }

    public findOpenByRepository(repositoryId: string): Promise<readonly ReviewIssueTicket[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((ticket) => {
                return (
                    ticket.status === REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS &&
                    this.repositoryByTicketId.get(ticket.id.value) === repositoryId
                )
            }),
        )
    }

    public findBySuggestionId(suggestionId: string): Promise<ReviewIssueTicket | null> {
        for (const ticket of this.storage.values()) {
            if (ticket.sourceSuggestionIds.includes(suggestionId)) {
                return Promise.resolve(ticket)
            }
        }

        return Promise.resolve(null)
    }
}

describe("IReviewIssueTicketRepository contract", () => {
    test("saves and finds review issue ticket by identifier", async () => {
        const factory = new ReviewIssueTicketFactory()
        const repository = new InMemoryReviewIssueTicketRepository()
        const ticket = factory.create({
            sourceReviewId: "review-1",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/review.ts"),
            category: "security",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })

        await repository.save(ticket)
        const found = await repository.findById(ticket.id)

        expect(found).not.toBeNull()
        if (found === null) {
            throw new Error("Saved issue ticket must be retrievable by id")
        }
        expect(found.id.equals(ticket.id)).toBe(true)
    })

    test("finds review issue tickets by file path and suggestion id", async () => {
        const factory = new ReviewIssueTicketFactory()
        const repository = new InMemoryReviewIssueTicketRepository()
        const first = factory.reconstitute({
            id: "ticket-1",
            sourceReviewId: "review-1",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/review.ts"),
            category: "bug",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })
        const second = factory.reconstitute({
            id: "ticket-2",
            sourceReviewId: "review-2",
            sourceSuggestionIds: ["suggestion-2"],
            filePath: FilePath.create("src/review.ts"),
            category: "maintainability",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.RESOLVED,
        })

        await repository.save(first)
        await repository.save(second)

        const byFilePath = await repository.findByFilePath(FilePath.create("src/review.ts"))
        const bySuggestionId = await repository.findBySuggestionId("suggestion-2")

        expect(byFilePath).toHaveLength(2)
        expect(bySuggestionId?.id.value).toBe("ticket-2")
    })

    test("finds only open review issue tickets by repository", async () => {
        const factory = new ReviewIssueTicketFactory()
        const repository = new InMemoryReviewIssueTicketRepository()
        const openTicket = factory.reconstitute({
            id: "ticket-open",
            sourceReviewId: "review-3",
            sourceSuggestionIds: ["suggestion-3"],
            filePath: FilePath.create("src/security.ts"),
            category: "security",
            occurrenceCount: 2,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })
        const resolvedTicket = factory.reconstitute({
            id: "ticket-resolved",
            sourceReviewId: "review-4",
            sourceSuggestionIds: ["suggestion-4"],
            filePath: FilePath.create("src/security.ts"),
            category: "security",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.RESOLVED,
        })

        await repository.save(openTicket)
        await repository.save(resolvedTicket)
        repository.assignRepository("ticket-open", "gh:repo-1")
        repository.assignRepository("ticket-resolved", "gh:repo-1")

        const found = await repository.findOpenByRepository("gh:repo-1")

        expect(found).toHaveLength(1)
        expect(found[0]?.id.value).toBe("ticket-open")
    })
})
