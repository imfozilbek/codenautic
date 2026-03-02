import {describe, expect, test} from "bun:test"

import {ISSUE_CATEGORY} from "../../../src/domain/entities/review-issue.entity"
import {ReviewFactory} from "../../../src/domain/factories/review.factory"
import {ReviewIssueFactory} from "../../../src/domain/factories/review-issue.factory"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {LineRange} from "../../../src/domain/value-objects/line-range.value-object"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"

describe("ReviewFactory", () => {
    test("creates new pending review with generated id", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            mergeRequestId: "mr-1",
            severityBudget: 8,
        })

        expect(review.id.value.length).toBeGreaterThan(0)
        expect(review.status).toBe("pending")
        expect(review.severityBudget).toBe(8)
        expect(review.repositoryId).toBe("repo-1")
        expect(review.mergeRequestId).toBe("mr-1")
        expect(review.issues).toEqual([])
    })

    test("uses repositoryId as default mergeRequestId for backward compatibility", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-legacy",
            severityBudget: 5,
        })

        expect(review.mergeRequestId).toBe("repo-legacy")
    })

    test("reconstitutes review from persistence snapshot", () => {
        const factory = new ReviewFactory()
        const issueFactory = new ReviewIssueFactory()
        const issue = issueFactory.create({
            filePath: FilePath.create("src/review.ts"),
            lineRange: LineRange.create(5, 7),
            severity: Severity.create("MEDIUM"),
            category: ISSUE_CATEGORY.BUG,
            message: "Potential null dereference",
        })
        const review = factory.reconstitute({
            id: "review-123",
            repositoryId: "repo-9",
            mergeRequestId: "mr-9",
            status: "completed",
            issues: [issue],
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
        expect(review.mergeRequestId).toBe("mr-9")
        expect(review.issues).toHaveLength(1)
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

    test("throws when repository id is empty", () => {
        const factory = new ReviewFactory()

        expect(() => {
            factory.create({
                repositoryId: " ",
                severityBudget: 2,
            })
        }).toThrow("Repository id cannot be empty")
    })
})
