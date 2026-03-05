import {describe, expect, test} from "bun:test"

import {DiffFile, DIFF_FILE_STATUS} from "../../../src/domain/value-objects/diff-file.value-object"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {
    REVIEW_DEPTH_MODE,
    ReviewDepthModeResolver,
} from "../../../src/domain/value-objects/review-depth-mode.value-object"

function createFile(params: {
    readonly patch: string
    readonly hunks?: readonly string[]
}): DiffFile {
    return DiffFile.create({
        filePath: FilePath.create("src/app.ts"),
        status: DIFF_FILE_STATUS.MODIFIED,
        hunks: params.hunks ?? ["@@ -1,1 +1,1 @@"],
        patch: params.patch,
    })
}

describe("ReviewDepthModeResolver", () => {
    test("creates resolver instance", () => {
        const resolver = new ReviewDepthModeResolver()

        expect(resolver).toBeInstanceOf(ReviewDepthModeResolver)
    })

    test("marks heavy when import changes are detected", () => {
        const file = createFile({
            patch: "+import {x} from \"pkg\"\n",
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.HEAVY)
    })

    test("marks heavy when public API declarations change", () => {
        const file = createFile({
            patch: "+export interface ApiShape { value: string }\n",
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.HEAVY)
    })

    test("marks heavy when diff ratio crosses the large-change threshold", () => {
        const file = createFile({
            patch: [
                "+line 1",
                "+line 2",
                "+line 3",
                "+line 4",
                "+line 5",
                "+line 6",
            ].join("\n"),
            hunks: ["@@ -1,10 +1,10 @@"],
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.HEAVY)
    })

    test("marks heavy when hunks are malformed but patch is large", () => {
        const file = createFile({
            patch: Array.from({length: 55}, (_, index) => {
                return `+line ${index + 1}`
            }).join("\n"),
            hunks: ["not-a-hunk"],
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.HEAVY)
    })

    test("returns light for small non-api changes", () => {
        const file = createFile({
            patch: "+console.log(\"ok\")\n",
            hunks: ["@@ -1,5 +1,5 @@"],
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.LIGHT)
    })

    test("treats explicit zero hunk ranges as small change", () => {
        const file = createFile({
            patch: "+console.log(\"ok\")\n",
            hunks: ["@@ -1,0 +1,0 @@"],
        })

        expect(ReviewDepthModeResolver.fromFileChange(file)).toBe(REVIEW_DEPTH_MODE.LIGHT)
    })

    test("parses hunk ranges with explicit helpers", () => {
        const internals = ReviewDepthModeResolver as unknown as {
            parseHunkRange: (hunk: string) => number | undefined
            extractCount: (rawCount: string | undefined, isExplicitZero: boolean) => number | undefined
        }

        expect(internals.extractCount(undefined, false)).toBe(1)
        expect(internals.extractCount(undefined, true)).toBe(0)
        expect(internals.parseHunkRange("@@ -1,2 +1,3 @@")).toBe(3)
    })
})
