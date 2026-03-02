import {describe, expect, test} from "bun:test"

import {
    AST_ADAPTER_ERROR_CODE,
    AST_LANGUAGE,
    AST_NODE_KIND,
    RegexAstParserAdapter,
} from "../../src/ast"

describe("RegexAstParserAdapter", () => {
    test("parses TypeScript source with normalized nodes and line numbers", () => {
        const parser = new RegexAstParserAdapter()

        const result = parser.parse({
            language: AST_LANGUAGE.TYPESCRIPT,
            filePath: "src/review.ts",
            sourceCode: [
                "function run() {",
                "    return true",
                "}",
                "",
                "class Runner {}",
                "interface RunnerPort {}",
                "type RunnerId = string",
            ].join("\n"),
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful parse")
        }

        expect(result.value).toEqual({
            language: AST_LANGUAGE.TYPESCRIPT,
            filePath: "src/review.ts",
            nodes: [
                {kind: AST_NODE_KIND.FUNCTION, name: "run", startLine: 1, endLine: 1},
                {kind: AST_NODE_KIND.CLASS, name: "Runner", startLine: 5, endLine: 5},
                {kind: AST_NODE_KIND.INTERFACE, name: "RunnerPort", startLine: 6, endLine: 6},
                {kind: AST_NODE_KIND.TYPE_ALIAS, name: "RunnerId", startLine: 7, endLine: 7},
            ],
        })
    })

    test("parses JavaScript source with function and class nodes", () => {
        const parser = new RegexAstParserAdapter()

        const result = parser.parse({
            language: AST_LANGUAGE.JAVASCRIPT,
            sourceCode: ["class JobRunner {}", "", "function processJob() {}", ""].join("\n"),
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful parse")
        }

        expect(result.value.filePath).toBe("")
        expect(result.value.nodes).toEqual([
            {kind: AST_NODE_KIND.CLASS, name: "JobRunner", startLine: 1, endLine: 1},
            {kind: AST_NODE_KIND.FUNCTION, name: "processJob", startLine: 3, endLine: 3},
        ])
    })

    test("returns error for unsupported language", () => {
        const parser = new RegexAstParserAdapter()

        const result = parser.parse({
            language: "python" as (typeof AST_LANGUAGE)[keyof typeof AST_LANGUAGE],
            sourceCode: "def run(): pass",
        })

        expect(result.isFail).toBe(true)
        if (result.isOk) {
            throw new Error("Expected unsupported language failure")
        }

        expect(result.error.code).toBe(AST_ADAPTER_ERROR_CODE.INVALID_SOURCE)
    })

    test("returns error for empty or invalid source", () => {
        const parser = new RegexAstParserAdapter()

        const empty = parser.parse({
            language: AST_LANGUAGE.TYPESCRIPT,
            sourceCode: "   ",
        })
        const invalidType = parser.parse({
            language: AST_LANGUAGE.TYPESCRIPT,
            sourceCode: null as unknown as string,
        })

        expect(empty.isFail).toBe(true)
        expect(invalidType.isFail).toBe(true)
        if (empty.isOk || invalidType.isOk) {
            throw new Error("Expected invalid source failures")
        }

        expect(empty.error.code).toBe(AST_ADAPTER_ERROR_CODE.INVALID_SOURCE)
        expect(invalidType.error.code).toBe(AST_ADAPTER_ERROR_CODE.INVALID_SOURCE)
    })

    test("returns empty node list when no supported declarations are present", () => {
        const parser = new RegexAstParserAdapter()

        const result = parser.parse({
            language: AST_LANGUAGE.JAVASCRIPT,
            sourceCode: "const value = 10\nvalue += 1",
        })

        expect(result.isOk).toBe(true)
        if (result.isFail) {
            throw new Error("Expected successful parse")
        }

        expect(result.value.nodes).toEqual([])
    })
})
