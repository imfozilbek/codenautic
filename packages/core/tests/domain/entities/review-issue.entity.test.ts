import {describe, expect, test} from "bun:test"

import {
    ReviewIssue,
    ISSUE_CATEGORY,
    type IssueCategory,
} from "../../../src/domain/entities/review-issue.entity"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {LineRange} from "../../../src/domain/value-objects/line-range.value-object"
import {Severity} from "../../../src/domain/value-objects/severity.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("ReviewIssue", () => {
    test("creates issue and exposes normalized properties", () => {
        const issue = new ReviewIssue(UniqueId.create("issue-1"), {
            filePath: FilePath.create("src/app.ts"),
            lineRange: LineRange.create(3, 5),
            severity: Severity.create("HIGH"),
            category: ISSUE_CATEGORY.BUG,
            message: "  Potential null pointer access  ",
            suggestion: "  Add a guard clause  ",
            codeBlock: "  if (value === null) { return }  ",
        })

        expect(issue.id.value).toBe("issue-1")
        expect(issue.filePath.toString()).toBe("src/app.ts")
        expect(issue.lineRange.toString()).toBe("L3-L5")
        expect(issue.severity.toString()).toBe("HIGH")
        expect(issue.category).toBe(ISSUE_CATEGORY.BUG)
        expect(issue.message).toBe("Potential null pointer access")
        expect(issue.suggestion).toBe("Add a guard clause")
        expect(issue.codeBlock).toBe("if (value === null) { return }")
    })

    test("calculates rank score using category and severity weights", () => {
        const issue = new ReviewIssue(UniqueId.create("issue-2"), {
            filePath: FilePath.create("src/security.ts"),
            lineRange: LineRange.create(10, 10),
            severity: Severity.create("CRITICAL"),
            category: ISSUE_CATEGORY.SECURITY,
            message: "Leaked secret in logs",
        })

        expect(issue.calculateRankScore()).toBe(100)
    })

    test("throws when message is empty", () => {
        expect(() => {
            return new ReviewIssue(UniqueId.create("issue-3"), {
                filePath: FilePath.create("src/app.ts"),
                lineRange: LineRange.create(1, 1),
                severity: Severity.create("LOW"),
                category: ISSUE_CATEGORY.STYLE,
                message: "   ",
            })
        }).toThrow("Issue message cannot be empty")
    })

    test("throws when optional fields are provided but empty", () => {
        expect(() => {
            return new ReviewIssue(UniqueId.create("issue-4"), {
                filePath: FilePath.create("src/app.ts"),
                lineRange: LineRange.create(1, 1),
                severity: Severity.create("LOW"),
                category: ISSUE_CATEGORY.STYLE,
                message: "Message",
                suggestion: "   ",
            })
        }).toThrow("Issue suggestion cannot be empty")

        expect(() => {
            return new ReviewIssue(UniqueId.create("issue-5"), {
                filePath: FilePath.create("src/app.ts"),
                lineRange: LineRange.create(1, 1),
                severity: Severity.create("LOW"),
                category: ISSUE_CATEGORY.STYLE,
                message: "Message",
                codeBlock: "   ",
            })
        }).toThrow("Issue code block cannot be empty")
    })

    test("throws when category is unknown", () => {
        expect(() => {
            return new ReviewIssue(UniqueId.create("issue-6"), {
                filePath: FilePath.create("src/app.ts"),
                lineRange: LineRange.create(1, 1),
                severity: Severity.create("LOW"),
                category: "UNKNOWN" as IssueCategory,
                message: "Message",
            })
        }).toThrow("Unknown issue category")
    })
})
