import {describe, expect, test} from "bun:test"

import {ReviewStatusTransitionError} from "../../../src/domain/errors/review-status-transition.error"
import {ReviewSeverityBudgetExceededError} from "../../../src/domain/errors/review-severity-budget-exceeded.error"
import {ReviewFactory} from "../../../src/domain/factories/review.factory"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {Review, REVIEW_STATUS} from "../../../src/domain/aggregates/review.aggregate"

describe("Review aggregate", () => {
    test("starts from pending and emits ReviewStarted", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            severityBudget: 5,
        })
        const startedAt = new Date("2026-03-01T12:00:00.000Z")

        review.start(startedAt)
        const events = review.pullDomainEvents()

        expect(review.status).toBe("in_progress")
        expect(review.startedAt?.toISOString()).toBe("2026-03-01T12:00:00.000Z")
        expect(events.length).toBe(1)
        expect(events[0]?.eventName).toBe("ReviewStarted")
    })

    test("fails when start is called from non-pending status", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            severityBudget: 3,
        })

        review.start(new Date("2026-03-01T10:00:00.000Z"))

        expect(() => {
            review.start(new Date("2026-03-01T11:00:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("completes in progress review and emits ReviewCompleted", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-2",
            severityBudget: 7,
        })
        const startedAt = new Date("2026-03-01T10:00:00.000Z")
        const completedAt = new Date("2026-03-01T10:05:00.000Z")

        review.start(startedAt)
        review.pullDomainEvents()

        review.complete(4, completedAt)
        const events = review.pullDomainEvents()

        expect(review.status).toBe("completed")
        expect(review.consumedSeverity).toBe(4)
        expect(review.completedAt?.toISOString()).toBe("2026-03-01T10:05:00.000Z")
        expect(events.length).toBe(1)
        expect(events[0]?.eventName).toBe("ReviewCompleted")
    })

    test("fails complete when consumed severity exceeds budget", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-3",
            severityBudget: 2,
        })

        review.start(new Date("2026-03-01T10:00:00.000Z"))

        expect(() => {
            review.complete(3, new Date("2026-03-01T11:00:00.000Z"))
        }).toThrow(ReviewSeverityBudgetExceededError)
    })

    test("fails complete when review is not in progress", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-4",
            severityBudget: 9,
        })

        expect(() => {
            review.complete(1, new Date("2026-03-01T11:00:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("fails from pending or in progress only", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-5",
            severityBudget: 9,
        })
        const failedAt = new Date("2026-03-01T11:00:00.000Z")

        review.fail("provider timeout", failedAt)

        expect(review.status).toBe("failed")
        expect(review.failureReason).toBe("provider timeout")
        expect(review.failedAt?.toISOString()).toBe("2026-03-01T11:00:00.000Z")
        expect(() => {
            review.start(new Date("2026-03-01T12:00:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("clears domain events after pull", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-6",
            severityBudget: 10,
        })

        review.start(new Date("2026-03-01T08:00:00.000Z"))
        const firstPull = review.pullDomainEvents()
        const secondPull = review.pullDomainEvents()

        expect(firstPull.length).toBe(1)
        expect(secondPull.length).toBe(0)
    })

    test("returns null timestamps before transitions", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-7",
            severityBudget: 2,
        })

        expect(review.startedAt).toBeNull()
        expect(review.completedAt).toBeNull()
        expect(review.failedAt).toBeNull()
    })

    test("fails when fail is called from completed status", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-8",
            severityBudget: 2,
        })

        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.complete(1, new Date("2026-03-01T10:01:00.000Z"))

        expect(() => {
            review.fail("late failure", new Date("2026-03-01T10:02:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("fails when failure reason is empty", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-9",
            severityBudget: 2,
        })

        expect(() => {
            review.fail("   ", new Date("2026-03-01T10:00:00.000Z"))
        }).toThrow("Failure reason cannot be empty")
    })

    test("validates invariant on reconstitution when consumed exceeds budget", () => {
        const factory = new ReviewFactory()

        expect(() => {
            factory.reconstitute({
                id: "review-over-budget",
                repositoryId: "repo-10",
                status: REVIEW_STATUS.COMPLETED,
                severityBudget: 1,
                consumedSeverity: 2,
                startedAt: new Date("2026-03-01T10:00:00.000Z"),
                completedAt: new Date("2026-03-01T10:05:00.000Z"),
                failedAt: null,
                failureReason: null,
            })
        }).toThrow(ReviewSeverityBudgetExceededError)
    })

    test("validates severity value shape during aggregate construction", () => {
        expect(() => {
            const invalidBudget = {
                repositoryId: "repo-11",
                status: REVIEW_STATUS.PENDING,
                severityBudget: Number.POSITIVE_INFINITY,
                consumedSeverity: 0,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                failureReason: null,
            }
            return new Review(UniqueId.create("review-invalid-finite"), invalidBudget)
        }).toThrow("Severity must be finite")

        expect(() => {
            const invalidBudget = {
                repositoryId: "repo-12",
                status: REVIEW_STATUS.PENDING,
                severityBudget: -1,
                consumedSeverity: 0,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                failureReason: null,
            }
            return new Review(UniqueId.create("review-invalid-negative"), invalidBudget)
        }).toThrow("Severity must be greater than or equal to zero")
    })
})
