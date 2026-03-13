import {describe, expect, test} from "bun:test"

import {
    GIT_REF_COMPARISON_STATUS,
    type IRefDiffResult,
} from "../../../../src/application/dto/git"

describe("IRefDiff DTO contracts", () => {
    test("поддерживает агрегированную статистику и file-level changes", () => {
        const diff: IRefDiffResult = {
            baseRef: "main",
            headRef: "feature/ref-diff",
            comparisonStatus: GIT_REF_COMPARISON_STATUS.AHEAD,
            aheadBy: 2,
            behindBy: 0,
            totalCommits: 2,
            summary: {
                changedFiles: 2,
                addedFiles: 1,
                modifiedFiles: 0,
                deletedFiles: 0,
                renamedFiles: 1,
                additions: 24,
                deletions: 7,
                changes: 31,
            },
            files: [
                {
                    path: "src/new.ts",
                    status: "added",
                    additions: 20,
                    deletions: 0,
                    changes: 20,
                    patch: "@@ -0,0 +1,20 @@",
                    hunks: ["@@ -0,0 +1,20 @@"],
                },
                {
                    path: "src/api.ts",
                    oldPath: "src/http.ts",
                    status: "renamed",
                    additions: 4,
                    deletions: 7,
                    changes: 11,
                    patch: "@@ -1,7 +1,4 @@",
                    hunks: ["@@ -1,7 +1,4 @@"],
                },
            ],
        }

        expect(diff.comparisonStatus).toBe("ahead")
        expect(diff.summary.renamedFiles).toBe(1)
        expect(diff.files[1]?.oldPath).toBe("src/http.ts")
        expect(diff.files[0]?.changes).toBe(20)
    })
})
