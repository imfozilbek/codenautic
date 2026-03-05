import {describe, expect, test} from "bun:test"

import {
    enrichSuggestions,
    parseRawSuggestionFields,
    resolveFilePath,
    resolveLineRange,
} from "../../../src/application/shared/suggestion-enrichment"
import {hash} from "../../../src/shared/utils/hash"

const DEFAULTS = {
    category: "code_quality",
    severity: "MEDIUM",
    committable: true,
    rankScore: 50,
}

describe("suggestion enrichment", () => {
    test("parseRawSuggestionFields returns null when message is missing", () => {
        const parsed = parseRawSuggestionFields({}, DEFAULTS)

        expect(parsed).toBeNull()
    })

    test("parseRawSuggestionFields returns null when message is blank", () => {
        const parsed = parseRawSuggestionFields({message: "   "}, DEFAULTS)

        expect(parsed).toBeNull()
    })

    test("parseRawSuggestionFields applies defaults for optional fields", () => {
        const parsed = parseRawSuggestionFields({message: "Check"}, DEFAULTS)

        expect(parsed).toEqual({
            message: "Check",
            category: "code_quality",
            severity: "MEDIUM",
            committable: true,
            rankScore: 50,
        })
    })

    test("parseRawSuggestionFields trims message and code block", () => {
        const parsed = parseRawSuggestionFields({
            message: "  Review  ",
            codeBlock: "  const x = 1  ",
        }, DEFAULTS)

        expect(parsed?.message).toBe("Review")
        expect(parsed?.codeBlock).toBe("const x = 1")
    })

    test("resolveFilePath falls back when value is missing", () => {
        const filePath = resolveFilePath({}, "fallback.ts")

        expect(filePath).toBe("fallback.ts")
    })

    test("resolveFilePath falls back when value is blank", () => {
        const filePath = resolveFilePath({filePath: "   "}, "fallback.ts")

        expect(filePath).toBe("fallback.ts")
    })

    test("resolveLineRange falls back to default start", () => {
        const range = resolveLineRange({lineStart: "bad"}, 5)

        expect(range).toEqual({lineStart: 5, lineEnd: 5})
    })

    test("resolveLineRange falls back to lineStart when lineEnd is invalid", () => {
        const range = resolveLineRange({lineStart: 3, lineEnd: 0}, 1)

        expect(range).toEqual({lineStart: 3, lineEnd: 3})
    })

    test("enrichSuggestions skips non-object items", () => {
        const suggestions = enrichSuggestions([null, "bad"], {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "file.ts",
            defaultLineStart: 1,
            defaults: DEFAULTS,
        })

        expect(suggestions).toEqual([])
    })

    test("enrichSuggestions builds deterministic identifiers", () => {
        const suggestions = enrichSuggestions([
            {
                message: "Use const",
                lineStart: 2,
                lineEnd: 3,
            },
        ], {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "src/index.ts",
            defaultLineStart: 1,
            defaults: DEFAULTS,
        })

        expect(suggestions).toHaveLength(1)
        expect(suggestions[0]?.id).toBe(`file-${hash("src/index.ts|2|3|Use const")}`)
    })

    test("enrichSuggestions applies defaults for missing fields", () => {
        const suggestions = enrichSuggestions([
            {
                message: "Check logic",
            },
        ], {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "app.ts",
            defaultLineStart: 1,
            defaults: DEFAULTS,
        })

        expect(suggestions[0]).toMatchObject({
            filePath: "app.ts",
            lineStart: 1,
            lineEnd: 1,
            category: "code_quality",
            severity: "MEDIUM",
            committable: true,
            rankScore: 50,
        })
    })

    test("enrichSuggestions uses filePath from record when provided", () => {
        const suggestions = enrichSuggestions([
            {
                message: "Update file",
                filePath: "src/custom.ts",
            },
        ], {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "app.ts",
            defaultLineStart: 1,
            defaults: DEFAULTS,
        })

        expect(suggestions[0]?.filePath).toBe("src/custom.ts")
    })

    test("enrichSuggestions keeps trimmed code blocks", () => {
        const suggestions = enrichSuggestions([
            {
                message: "Fix code",
                codeBlock: "  const value = 1  ",
            },
        ], {
            idPrefix: "file",
            idComponents: ["filePath", "lineStart", "lineEnd", "message"],
            defaultFilePath: "app.ts",
            defaultLineStart: 1,
            defaults: DEFAULTS,
        })

        expect(suggestions[0]?.codeBlock).toBe("const value = 1")
    })
})
