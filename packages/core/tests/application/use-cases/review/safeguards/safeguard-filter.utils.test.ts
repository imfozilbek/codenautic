import {describe, expect, test} from "bun:test"

import {
    buildDeduplicationKey,
    collectPatchContents,
    createDiscardedSuggestion,
    isCodeBlockInFile,
    normalizePatchContent,
    normalizeSuggestionMessage,
    normalizeTrimmedText,
    resolveCategoryWeight,
    resolveSeverityLevel,
    resolveSeverityWeight,
} from "../../../../../src/application/use-cases/review/safeguards/safeguard-filter.utils"
import {Severity, SEVERITY_LEVEL} from "../../../../../src/domain/value-objects/severity.value-object"
import type {ISuggestionDTO} from "../../../../../src/application/dto/review/suggestion.dto"

const baseSuggestion: ISuggestionDTO = {
    id: "s-1",
    filePath: "src/app.ts",
    lineStart: 5,
    lineEnd: 6,
    severity: "HIGH",
    category: "bug",
    message: "  Potential  BUG  ",
    codeBlock: "const a = 1",
    committable: true,
    rankScore: 0.5,
}

describe("safeguard-filter utils", () => {
    test("normalizes trimmed values and messages", () => {
        expect(normalizeTrimmedText(5)).toBeUndefined()
        expect(normalizeTrimmedText("   ")).toBeUndefined()
        expect(normalizeTrimmedText("  ok ")).toBe("ok")
        expect(normalizeSuggestionMessage("  Foo   BAR ")).toBe("foo bar")
    })

    test("resolves severity and category weights", () => {
        expect(resolveSeverityWeight("HIGH")).toBe(Severity.create("HIGH").weight)
        expect(resolveSeverityWeight("unknown")).toBe(Severity.create(SEVERITY_LEVEL.INFO).weight)
        expect(resolveSeverityLevel("unknown")).toBe(SEVERITY_LEVEL.INFO)
        expect(resolveCategoryWeight("Code Quality")).toBe(20)
        expect(resolveCategoryWeight("unknown")).toBe(0)
    })

    test("builds dedup key and discarded payload", () => {
        const key = buildDeduplicationKey(baseSuggestion)
        expect(key).toBeDefined()

        const discarded = createDiscardedSuggestion(baseSuggestion, "filter", "reason")
        expect(discarded.filterName).toBe("filter")
        expect(discarded.discardReason).toBe("reason")
        expect(discarded.id).toBe(baseSuggestion.id)
    })

    test("normalizes patch content and extracts hunks", () => {
        const normalized = normalizePatchContent("+const x = 1\n-const y = 2\n context\n")
        expect(normalized).toBe("const x = 1\nconst y = 2\ncontext")

        const contents = collectPatchContents({
            patch: "+const x = 1\n",
            hunks: ["-const y = 2", "  ", "context"],
        })
        expect(contents).toEqual(["const x = 1", "const y = 2", "context"])
    })

    test("detects code block presence in file payload", () => {
        const file = {
            path: "src/app.ts",
            patch: "+function example() {}\n",
            hunks: [" context", "+const a = 1"],
        }

        expect(isCodeBlockInFile(file, "function example() {}")).toBe(true)
        expect(isCodeBlockInFile(file, "missing block")).toBe(false)
    })

    test("returns false for empty code block", () => {
        const file = {
            path: "src/app.ts",
            patch: "+function example() {}\n",
        }

        expect(isCodeBlockInFile(file, "   ")).toBe(false)
    })
})
