import {describe, expect, test} from "bun:test"

import {CodeChunk} from "../../../src/domain/value-objects/code-chunk.value-object"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {LineRange} from "../../../src/domain/value-objects/line-range.value-object"

describe("CodeChunk", () => {
    test("creates chunk with typed props", () => {
        const filePath = FilePath.create("src/domain/review.aggregate.ts")
        const lineRange = LineRange.create(10, 20)

        const codeChunk = CodeChunk.create({
            content: "export class Review {}",
            filePath,
            lineRange,
            language: "typescript",
        })

        expect(codeChunk.content).toBe("export class Review {}")
        expect(codeChunk.filePath).toBe(filePath)
        expect(codeChunk.lineRange).toBe(lineRange)
        expect(codeChunk.language).toBe("typescript")
    })

    test("throws when content is empty after trim", () => {
        const filePath = FilePath.create("src/domain/review.aggregate.ts")
        const lineRange = LineRange.create(10, 20)

        expect(() => {
            CodeChunk.create({
                content: "   ",
                filePath,
                lineRange,
                language: "typescript",
            })
        }).toThrow("CodeChunk content cannot be empty")
    })
})
