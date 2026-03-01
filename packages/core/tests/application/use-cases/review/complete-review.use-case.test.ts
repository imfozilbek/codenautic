import {describe, expect, test} from "bun:test"

import type {IDomainEventBus} from "../../../../src/application/ports/outbound/domain-event-bus.port"
import type {IReviewRepository} from "../../../../src/application/ports/outbound/review-repository.port"
import {CompleteReviewUseCase} from "../../../../src/application/use-cases/review/complete-review.use-case"
import type {Review} from "../../../../src/domain/aggregates/review.aggregate"
import type {BaseDomainEvent, DomainEventPayload} from "../../../../src/domain/events/base-domain-event"
import {ReviewFactory} from "../../../../src/domain/factories/review.factory"
import {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

class InMemoryReviewRepository implements IReviewRepository {
    public readonly store = new Map<string, Review>()
    public saved = 0

    public findById(id: UniqueId): Promise<Review | null> {
        return Promise.resolve(this.store.get(id.value) ?? null)
    }

    public save(review: Review): Promise<void> {
        this.saved += 1
        this.store.set(review.id.value, review)
        return Promise.resolve()
    }
}

class InMemoryDomainEventBus implements IDomainEventBus {
    public published = 0
    public lastPublishedSize = 0

    public publish(events: readonly BaseDomainEvent<DomainEventPayload>[]): Promise<void> {
        this.published += 1
        this.lastPublishedSize = events.length
        return Promise.resolve()
    }
}

describe("CompleteReviewUseCase", () => {
    test("completes review and persists + publishes events", async () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            severityBudget: 4,
        })
        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.pullDomainEvents()

        const repository = new InMemoryReviewRepository()
        repository.store.set(review.id.value, review)
        const eventBus = new InMemoryDomainEventBus()
        const useCase = new CompleteReviewUseCase(repository, eventBus)

        const result = await useCase.execute({
            reviewId: review.id.value,
            consumedSeverity: 2,
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
        })

        expect(result.isSuccess).toBe(true)
        expect(result.isFailure).toBe(false)
        expect(result.value?.status).toBe("completed")
        expect(repository.saved).toBe(1)
        expect(eventBus.published).toBe(1)
        expect(eventBus.lastPublishedSize).toBe(1)
    })

    test("returns failure when review is not found", async () => {
        const repository = new InMemoryReviewRepository()
        const eventBus = new InMemoryDomainEventBus()
        const useCase = new CompleteReviewUseCase(repository, eventBus)

        const result = await useCase.execute({
            reviewId: "missing-review-id",
            consumedSeverity: 1,
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
        })

        expect(result.isFailure).toBe(true)
        expect(result.error?.code).toBe("REVIEW_NOT_FOUND")
        expect(repository.saved).toBe(0)
        expect(eventBus.published).toBe(0)
    })

    test("returns failure on invalid domain transition", async () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-2",
            severityBudget: 4,
        })

        const repository = new InMemoryReviewRepository()
        repository.store.set(review.id.value, review)
        const eventBus = new InMemoryDomainEventBus()
        const useCase = new CompleteReviewUseCase(repository, eventBus)

        const result = await useCase.execute({
            reviewId: review.id.value,
            consumedSeverity: 1,
            completedAt: new Date("2026-03-01T10:05:00.000Z"),
        })

        expect(result.isFailure).toBe(true)
        expect(result.error?.code).toBe("REVIEW_STATUS_TRANSITION_FORBIDDEN")
        expect(repository.saved).toBe(0)
        expect(eventBus.published).toBe(0)
    })
})
