import {describe, expect, test} from "bun:test"

import type {ISuggestionDTO} from "../../../../src/application/dto/review/suggestion.dto"
import type {IReviewIssueTicketRepository} from "../../../../src/application/ports/outbound/review/review-issue-ticket-repository.port"
import {
    CreateIssueFromSuggestionUseCase,
    ISSUE_TICKET_ACTION,
    ISSUE_TICKET_SKIP_REASON,
} from "../../../../src/application/use-cases/review/create-issue-from-suggestion.use-case"
import {
    REVIEW_ISSUE_TICKET_STATUS,
    type ReviewIssueTicket,
} from "../../../../src/domain/entities/review-issue-ticket.entity"
import {ReviewIssueTicketFactory} from "../../../../src/domain/factories/review-issue-ticket.factory"
import {FilePath} from "../../../../src/domain/value-objects/file-path.value-object"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory issue-ticket repository for create-issue use-case tests.
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
     * Associates an existing ticket with repository scope.
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

    /**
     * Returns saved ticket count.
     *
     * @returns Number of persisted tickets.
     */
    public count(): number {
        return this.storage.size
    }
}

describe("CreateIssueFromSuggestionUseCase", () => {
    test("skips creation when autoCreateIssues is disabled", async () => {
        const repository = new InMemoryReviewIssueTicketRepository()
        const useCase = new CreateIssueFromSuggestionUseCase({
            reviewIssueTicketRepository: repository,
            reviewIssueTicketFactory: new ReviewIssueTicketFactory(),
        })

        const result = await useCase.execute({
            repositoryId: "gh:repo-1",
            sourceReviewId: "review-1",
            suggestion: createSuggestion(),
            autoCreateIssues: false,
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            action: ISSUE_TICKET_ACTION.SKIPPED,
            skipReason: ISSUE_TICKET_SKIP_REASON.AUTO_CREATE_DISABLED,
        })
        expect(repository.count()).toBe(0)
    })

    test("creates new issue ticket when no matching ticket exists", async () => {
        const repository = new InMemoryReviewIssueTicketRepository()
        const useCase = new CreateIssueFromSuggestionUseCase({
            reviewIssueTicketRepository: repository,
            reviewIssueTicketFactory: new ReviewIssueTicketFactory(),
        })

        const result = await useCase.execute({
            repositoryId: "gh:repo-1",
            sourceReviewId: "review-1",
            suggestion: createSuggestion({
                id: "suggestion-1",
                filePath: " src/review.ts ",
                category: " Security ",
            }),
            autoCreateIssues: true,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.action).toBe(ISSUE_TICKET_ACTION.CREATED)
        expect(result.value.occurrenceCount).toBe(1)
        expect(repository.count()).toBe(1)

        const created = await repository.findBySuggestionId("suggestion-1")
        expect(created?.filePath.toString()).toBe("src/review.ts")
        expect(created?.category).toBe("security")
        expect(created?.sourceReviewId).toBe("review-1")
    })

    test("updates existing open issue ticket with same file and category", async () => {
        const repository = new InMemoryReviewIssueTicketRepository()
        const factory = new ReviewIssueTicketFactory()
        const existing = factory.reconstitute({
            id: "ticket-1",
            sourceReviewId: "review-existing",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/review.ts"),
            category: "security",
            occurrenceCount: 1,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })
        await repository.save(existing)
        repository.assignRepository(existing.id.value, "gh:repo-1")

        const useCase = new CreateIssueFromSuggestionUseCase({
            reviewIssueTicketRepository: repository,
            reviewIssueTicketFactory: factory,
        })

        const result = await useCase.execute({
            repositoryId: "gh:repo-1",
            sourceReviewId: "review-2",
            suggestion: createSuggestion({
                id: "suggestion-2",
                filePath: "src/review.ts",
                category: "security",
            }),
            autoCreateIssues: true,
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            action: ISSUE_TICKET_ACTION.UPDATED,
            ticketId: "ticket-1",
            occurrenceCount: 2,
        })

        const updated = await repository.findById(UniqueId.create("ticket-1"))
        expect(updated?.sourceSuggestionIds).toEqual(["suggestion-1", "suggestion-2"])
        expect(updated?.occurrenceCount).toBe(2)
    })

    test("skips duplicate suggestion when ticket already references it", async () => {
        const repository = new InMemoryReviewIssueTicketRepository()
        const factory = new ReviewIssueTicketFactory()
        const existing = factory.reconstitute({
            id: "ticket-dup",
            sourceReviewId: "review-existing",
            sourceSuggestionIds: ["suggestion-1"],
            filePath: FilePath.create("src/review.ts"),
            category: "security",
            occurrenceCount: 3,
            status: REVIEW_ISSUE_TICKET_STATUS.IN_PROGRESS,
        })
        await repository.save(existing)

        const useCase = new CreateIssueFromSuggestionUseCase({
            reviewIssueTicketRepository: repository,
            reviewIssueTicketFactory: factory,
        })

        const result = await useCase.execute({
            repositoryId: "gh:repo-1",
            sourceReviewId: "review-2",
            suggestion: createSuggestion({
                id: "suggestion-1",
            }),
            autoCreateIssues: true,
        })

        expect(result.isOk).toBe(true)
        expect(result.value).toEqual({
            action: ISSUE_TICKET_ACTION.SKIPPED,
            ticketId: "ticket-dup",
            occurrenceCount: 3,
            skipReason: ISSUE_TICKET_SKIP_REASON.DUPLICATE_SUGGESTION,
        })
    })

    test("returns validation error for invalid input", async () => {
        const repository = new InMemoryReviewIssueTicketRepository()
        const useCase = new CreateIssueFromSuggestionUseCase({
            reviewIssueTicketRepository: repository,
            reviewIssueTicketFactory: new ReviewIssueTicketFactory(),
        })

        const result = await useCase.execute({
            repositoryId: " ",
            sourceReviewId: " ",
            suggestion: createSuggestion({
                id: " ",
                filePath: " ",
                category: " ",
            }),
            autoCreateIssues: true,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.fields).toContainEqual({
            field: "repositoryId",
            message: "must be a non-empty string",
        })
        expect(result.error.fields).toContainEqual({
            field: "sourceReviewId",
            message: "must be a non-empty string",
        })
        expect(result.error.fields).toContainEqual({
            field: "suggestion.id",
            message: "must be a non-empty string",
        })
        expect(result.error.fields).toContainEqual({
            field: "suggestion.filePath",
            message: "must be a non-empty string",
        })
        expect(result.error.fields).toContainEqual({
            field: "suggestion.category",
            message: "must be a non-empty string",
        })
    })
})

/**
 * Builds deterministic suggestion payload for tests.
 *
 * @param overrides Partial payload overrides.
 * @returns Suggestion DTO.
 */
function createSuggestion(overrides: Partial<ISuggestionDTO> = {}): ISuggestionDTO {
    const baseSuggestion: ISuggestionDTO = {
        id: "suggestion-1",
        filePath: "src/review.ts",
        lineStart: 10,
        lineEnd: 10,
        severity: "HIGH",
        category: "security",
        message: "Potential vulnerability",
        committable: true,
        rankScore: 90,
    }

    return {
        ...baseSuggestion,
        ...overrides,
    }
}
