import {describe, expect, test} from "bun:test"

import {
    DIFF_FILE_STATUS,
    DiffFile,
    type DiffFileStatus,
} from "../../../src/domain/value-objects/diff-file.value-object"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"

describe("DiffFile", () => {
    test("creates value object with expected immutable fields", () => {
        const diffFile = DiffFile.create({
            filePath: FilePath.create("src/core/review.ts"),
            status: DIFF_FILE_STATUS.MODIFIED,
            hunks: ["@@ -1,2 +1,3 @@"],
            patch: "patch-content",
        })

        expect(diffFile.filePath.toString()).toBe("src/core/review.ts")
        expect(diffFile.status).toBe(DIFF_FILE_STATUS.MODIFIED)
        expect(diffFile.hunks).toEqual(["@@ -1,2 +1,3 @@"])
        expect(diffFile.patch).toBe("patch-content")
        expect(diffFile.toString()).toBe("src/core/review.ts")
        expect(diffFile.oldPath).toBeUndefined()
    })

    test("matches ignore pattern by current file path", () => {
        const diffFile = DiffFile.create({
            filePath: FilePath.create("src/core/review.ts"),
            status: DIFF_FILE_STATUS.MODIFIED,
            hunks: ["@@ -1,2 +1,3 @@"],
            patch: "patch-content",
        })

        expect(diffFile.matchesIgnorePattern(["src/**/*.ts"])).toBe(true)
        expect(diffFile.matchesIgnorePattern(["docs/**/*.md"])).toBe(false)
    })

    test("matches ignore pattern by old path for renamed files", () => {
        const diffFile = DiffFile.create({
            filePath: FilePath.create("src/new/review.ts"),
            oldPath: FilePath.create("src/legacy/review.ts"),
            status: DIFF_FILE_STATUS.RENAMED,
            hunks: ["@@ -1,2 +1,3 @@"],
            patch: "patch-content",
        })

        expect(diffFile.matchesIgnorePattern(["src/legacy/*.ts"])).toBe(true)
    })

    test("throws when renamed file is missing oldPath", () => {
        expect(() => {
            DiffFile.create({
                filePath: FilePath.create("src/new/review.ts"),
                status: DIFF_FILE_STATUS.RENAMED,
                hunks: ["@@ -1,2 +1,3 @@"],
                patch: "patch-content",
            })
        }).toThrow("Renamed diff file requires oldPath")
    })

    test("throws when non-renamed file contains oldPath", () => {
        expect(() => {
            DiffFile.create({
                filePath: FilePath.create("src/new/review.ts"),
                oldPath: FilePath.create("src/legacy/review.ts"),
                status: DIFF_FILE_STATUS.MODIFIED,
                hunks: ["@@ -1,2 +1,3 @@"],
                patch: "patch-content",
            })
        }).toThrow("oldPath is allowed only for renamed diff files")
    })

    test("throws when hunk is empty", () => {
        expect(() => {
            DiffFile.create({
                filePath: FilePath.create("src/new/review.ts"),
                status: DIFF_FILE_STATUS.ADDED,
                hunks: ["  "],
                patch: "patch-content",
            })
        }).toThrow("Diff hunk cannot be empty")
    })

    test("throws when status is unsupported", () => {
        expect(() => {
            DiffFile.create({
                filePath: FilePath.create("src/new/review.ts"),
                status: "copied" as DiffFileStatus,
                hunks: ["@@ -1,2 +1,3 @@"],
                patch: "patch-content",
            })
        }).toThrow("Unsupported diff file status")
    })
})
