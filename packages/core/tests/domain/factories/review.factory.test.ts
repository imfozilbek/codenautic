import {describe, expect, test} from "bun:test"

import {ReviewFactory} from "../../../src/domain/factories/review.factory"

describe("ReviewFactory", () => {
    test("creates new pending review with generated id", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            severityBudget: 8,
        })

        expect(review.id.value.length).toBeGreaterThan(0)
        expect(review.status).toBe("pending")
        expect(review.severityBudget).toBe(8)
        expect(review.repositoryId).toBe("repo-1")
    })

    test("reconstitutes review from persistence snapshot", () => {
        const factory = new ReviewFactory()
        const review = factory.reconstitute({
            id: "review-123",
            repositoryId: "repo-9",
            status: "completed",
            severityBudget: 7,
            consumedSeverity: 5,
            startedAt: new Date("2026-03-01T08:00:00.000Z"),
            completedAt: new Date("2026-03-01T09:00:00.000Z"),
            failedAt: null,
            failureReason: null,
        })

        expect(review.id.value).toBe("review-123")
        expect(review.status).toBe("completed")
        expect(review.consumedSeverity).toBe(5)
        expect(review.startedAt?.toISOString()).toBe("2026-03-01T08:00:00.000Z")
        expect(review.completedAt?.toISOString()).toBe("2026-03-01T09:00:00.000Z")
    })

    test("reconstitutes string timestamps from persistence", () => {
        const factory = new ReviewFactory()
        const review = factory.reconstitute({
            id: "review-124",
            repositoryId: "repo-10",
            status: "failed",
            severityBudget: 7,
            consumedSeverity: 3,
            startedAt: "2026-03-01T08:00:00.000Z",
            completedAt: null,
            failedAt: "2026-03-01T09:00:00.000Z",
            failureReason: "timeout",
        })

        expect(review.startedAt?.toISOString()).toBe("2026-03-01T08:00:00.000Z")
        expect(review.failedAt?.toISOString()).toBe("2026-03-01T09:00:00.000Z")
    })
})
