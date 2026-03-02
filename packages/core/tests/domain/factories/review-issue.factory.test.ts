import {describe, expect, test} from "bun:test"

import {ISSUE_CATEGORY} from "../../../src/domain/entities/review-issue.entity"
import {ReviewIssueFactory} from "../../../src/domain/factories/review-issue.factory"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {LineRange} from "../../../src/domain/value-objects/line-range.value-object"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"

describe("ReviewIssueFactory", () => {
    test("creates new review issue with generated id", () => {
        const factory = new ReviewIssueFactory()
        const issue = factory.create({
            filePath: FilePath.create("src/review.ts"),
            lineRange: LineRange.create(11, 11),
            severity: Severity.create("HIGH"),
            category: ISSUE_CATEGORY.SECURITY,
            message: "Unsanitized interpolation",
            suggestion: "Escape user-controlled values",
        })

        expect(issue.id.value.length).toBeGreaterThan(0)
        expect(issue.filePath.toString()).toBe("src/review.ts")
        expect(issue.lineRange.toString()).toBe("L11-L11")
        expect(issue.severity.toString()).toBe("HIGH")
        expect(issue.category).toBe(ISSUE_CATEGORY.SECURITY)
        expect(issue.message).toBe("Unsanitized interpolation")
    })

    test("reconstitutes review issue from persistence snapshot", () => {
        const factory = new ReviewIssueFactory()
        const issue = factory.reconstitute({
            id: "issue-123",
            filePath: FilePath.create("src/review.ts"),
            lineRange: LineRange.create(21, 24),
            severity: Severity.create("MEDIUM"),
            category: ISSUE_CATEGORY.PERFORMANCE,
            message: "Repeated expensive call",
            codeBlock: "for (...) expensiveFn()",
        })

        expect(issue.id.value).toBe("issue-123")
        expect(issue.category).toBe(ISSUE_CATEGORY.PERFORMANCE)
        expect(issue.message).toBe("Repeated expensive call")
        expect(issue.codeBlock).toBe("for (...) expensiveFn()")
    })
})
