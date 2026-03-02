import {describe, expect, test} from "bun:test"

import {
    Review,
    REVIEW_STATUS,
    type IReviewCompletionMetrics,
} from "../../../src/domain/aggregates/review.aggregate"
import {ReviewSeverityBudgetExceededError} from "../../../src/domain/errors/review-severity-budget-exceeded.error"
import {ReviewStatusTransitionError} from "../../../src/domain/errors/review-status-transition.error"
import {REVIEW_COMPLETION_STATUS} from "../../../src/domain/events/review-completed"
import {ReviewFactory} from "../../../src/domain/factories/review.factory"
import {ReviewIssueFactory} from "../../../src/domain/factories/review-issue.factory"
import {ISSUE_CATEGORY} from "../../../src/domain/entities/review-issue.entity"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {LineRange} from "../../../src/domain/value-objects/line-range.value-object"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("Review aggregate", () => {
    test("starts from pending and emits ReviewStarted payload", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-1",
            mergeRequestId: "mr-1",
            severityBudget: 5,
        })
        const startedAt = new Date("2026-03-01T12:00:00.000Z")

        review.start(startedAt)
        const events = review.pullDomainEvents()

        expect(review.status).toBe("in_progress")
        expect(review.startedAt?.toISOString()).toBe("2026-03-01T12:00:00.000Z")
        expect(events.length).toBe(1)
        expect(events[0]?.eventName).toBe("ReviewStarted")
        expect(events[0]?.payload).toEqual({
            reviewId: review.id.value,
            mergeRequestId: "mr-1",
            startedAt: "2026-03-01T12:00:00.000Z",
        })
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

    test("adds issue in progress and emits IssueFound", () => {
        const reviewFactory = new ReviewFactory()
        const issueFactory = new ReviewIssueFactory()
        const review = reviewFactory.create({
            repositoryId: "repo-2",
            severityBudget: 10,
        })
        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.pullDomainEvents()

        const issue = issueFactory.create({
            filePath: FilePath.create("src/review.ts"),
            lineRange: LineRange.create(10, 12),
            severity: Severity.create("HIGH"),
            category: ISSUE_CATEGORY.SECURITY,
            message: "Unsanitized user input",
        })

        review.addIssue(issue)
        const events = review.pullDomainEvents()

        expect(review.issues).toHaveLength(1)
        expect(review.issues[0]?.id.value).toBe(issue.id.value)
        expect(events.length).toBe(1)
        expect(events[0]?.eventName).toBe("IssueFound")
        expect(events[0]?.payload).toEqual({
            issueId: issue.id.value,
            reviewId: review.id.value,
            severity: "HIGH",
            filePath: "src/review.ts",
            lineRange: "L10-L12",
        })
    })

    test("rejects addIssue outside in-progress status", () => {
        const reviewFactory = new ReviewFactory()
        const issueFactory = new ReviewIssueFactory()
        const review = reviewFactory.create({
            repositoryId: "repo-2",
            severityBudget: 10,
        })
        const issue = issueFactory.create({
            filePath: FilePath.create("src/review.ts"),
            lineRange: LineRange.create(10, 12),
            severity: Severity.create("HIGH"),
            category: ISSUE_CATEGORY.SECURITY,
            message: "Unsanitized user input",
        })

        expect(() => {
            review.addIssue(issue)
        }).toThrow(ReviewStatusTransitionError)
    })

    test("completes in progress review with legacy signature and emits ReviewCompleted", () => {
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
        expect(events[0]?.payload).toEqual({
            reviewId: review.id.value,
            status: REVIEW_COMPLETION_STATUS.COMPLETED,
            issueCount: 0,
            durationMs: 300000,
            consumedSeverity: 4,
            severityBudget: 7,
        })
    })

    test("completes review with explicit metrics payload", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-3",
            severityBudget: 7,
        })
        const startedAt = new Date("2026-03-01T10:00:00.000Z")
        review.start(startedAt)
        review.pullDomainEvents()

        const metrics: IReviewCompletionMetrics = {
            consumedSeverity: 5,
            issueCount: 2,
            durationMs: 42000,
            completedAt: new Date("2026-03-01T10:00:42.000Z"),
        }

        review.complete(metrics)
        const events = review.pullDomainEvents()

        expect(review.status).toBe("completed")
        expect(review.consumedSeverity).toBe(5)
        expect(events[0]?.payload).toEqual({
            reviewId: review.id.value,
            status: REVIEW_COMPLETION_STATUS.COMPLETED,
            issueCount: 2,
            durationMs: 42000,
            consumedSeverity: 5,
            severityBudget: 7,
        })
    })

    test("fails complete when consumed severity exceeds budget", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-4",
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
            repositoryId: "repo-5",
            severityBudget: 9,
        })

        expect(() => {
            review.complete(1, new Date("2026-03-01T11:00:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("fails from pending or in progress only and emits terminal ReviewCompleted event", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-6",
            severityBudget: 9,
        })
        const failedAt = new Date("2026-03-01T11:00:00.000Z")

        review.fail("provider timeout", failedAt)
        const events = review.pullDomainEvents()

        expect(review.status).toBe("failed")
        expect(review.failureReason).toBe("provider timeout")
        expect(review.failedAt?.toISOString()).toBe("2026-03-01T11:00:00.000Z")
        expect(events).toHaveLength(1)
        expect(events[0]?.eventName).toBe("ReviewCompleted")
        expect(events[0]?.payload).toEqual({
            reviewId: review.id.value,
            status: REVIEW_COMPLETION_STATUS.FAILED,
            issueCount: 0,
            durationMs: 0,
            consumedSeverity: 0,
            severityBudget: 9,
        })
        expect(() => {
            review.start(new Date("2026-03-01T12:00:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("clears domain events after pull", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-7",
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
            repositoryId: "repo-8",
            severityBudget: 2,
        })

        expect(review.startedAt).toBeNull()
        expect(review.completedAt).toBeNull()
        expect(review.failedAt).toBeNull()
    })

    test("fails when fail is called from completed status", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-9",
            severityBudget: 2,
        })

        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.complete(1, new Date("2026-03-01T10:01:00.000Z"))
        review.pullDomainEvents()

        expect(() => {
            review.fail("late failure", new Date("2026-03-01T10:02:00.000Z"))
        }).toThrow(ReviewStatusTransitionError)
    })

    test("fails when failure reason is empty", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-10",
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
                repositoryId: "repo-11",
                mergeRequestId: "mr-11",
                status: REVIEW_STATUS.COMPLETED,
                issues: [],
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
                repositoryId: "repo-12",
                mergeRequestId: "mr-12",
                status: REVIEW_STATUS.PENDING,
                issues: [],
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
                repositoryId: "repo-13",
                mergeRequestId: "mr-13",
                status: REVIEW_STATUS.PENDING,
                issues: [],
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

    test("rejects legacy complete signature without completedAt", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-14",
            severityBudget: 5,
        })
        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.pullDomainEvents()

        const unsafeReview = review as unknown as {complete(value: number): void}

        expect(() => {
            unsafeReview.complete(1)
        }).toThrow("completedAt must be provided for legacy completion signature")
    })

    test("rejects invalid completion metrics values", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-15",
            severityBudget: 10,
        })
        review.start(new Date("2026-03-01T10:00:00.000Z"))
        review.pullDomainEvents()

        expect(() => {
            review.complete({
                consumedSeverity: 3,
                issueCount: 1.5,
                durationMs: 1000,
                completedAt: new Date("2026-03-01T10:01:00.000Z"),
            })
        }).toThrow("Issue count must be an integer")

        expect(() => {
            review.complete({
                consumedSeverity: 3,
                issueCount: -1,
                durationMs: 1000,
                completedAt: new Date("2026-03-01T10:01:00.000Z"),
            })
        }).toThrow("Issue count must be greater than or equal to zero")

        expect(() => {
            review.complete({
                consumedSeverity: 3,
                issueCount: 1,
                durationMs: Number.NaN,
                completedAt: new Date("2026-03-01T10:01:00.000Z"),
            })
        }).toThrow("Duration must be finite")

        expect(() => {
            review.complete({
                consumedSeverity: 3,
                issueCount: 1,
                durationMs: -1,
                completedAt: new Date("2026-03-01T10:01:00.000Z"),
            })
        }).toThrow("Duration must be greater than or equal to zero")
    })

    test("rejects invalid issues collection during construction", () => {
        expect(() => {
            const invalidIssueCollection = {
                repositoryId: "repo-16",
                mergeRequestId: "mr-16",
                status: REVIEW_STATUS.PENDING,
                issues: [{} as unknown],
                severityBudget: 1,
                consumedSeverity: 0,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                failureReason: null,
            }
            return new Review(UniqueId.create("review-invalid-issues"), invalidIssueCollection as never)
        }).toThrow("Review issues collection must contain ReviewIssue entities only")
    })

    test("rejects empty repository and merge request identifiers", () => {
        expect(() => {
            const invalidProps = {
                repositoryId: " ",
                mergeRequestId: "mr-17",
                status: REVIEW_STATUS.PENDING,
                issues: [],
                severityBudget: 1,
                consumedSeverity: 0,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                failureReason: null,
            }
            return new Review(UniqueId.create("review-invalid-repo"), invalidProps)
        }).toThrow("Repository id cannot be empty")

        expect(() => {
            const invalidProps = {
                repositoryId: "repo-17",
                mergeRequestId: " ",
                status: REVIEW_STATUS.PENDING,
                issues: [],
                severityBudget: 1,
                consumedSeverity: 0,
                startedAt: null,
                completedAt: null,
                failedAt: null,
                failureReason: null,
            }
            return new Review(UniqueId.create("review-invalid-mr"), invalidProps)
        }).toThrow("Merge request id cannot be empty")
    })

    test("rejects invalid date values for lifecycle transitions", () => {
        const factory = new ReviewFactory()
        const review = factory.create({
            repositoryId: "repo-18",
            severityBudget: 2,
        })

        expect(() => {
            review.start(new Date("invalid-date"))
        }).toThrow("Review startedAt must be valid date")
    })
})
