import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertJavaScriptParserLanguage,
    JavaScriptSourceCodeParser,
} from "../../src/ast"

describe("JavaScriptSourceCodeParser", () => {
    test("parses .js source files with classes, functions, requires, and exports", async () => {
        const parser = new JavaScriptSourceCodeParser({
            language: AST_LANGUAGE.JAVASCRIPT,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "src/runtime/review.js",
            content: [
                'const sdk = require("sdk")',
                'export class ReviewRuntime extends BaseRuntime {',
                "    render() {",
                "        return sdk.start()",
                "    }",
                "}",
                "export const bootstrap = async () => loadRuntime()",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.JAVASCRIPT)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            {
                source: "sdk",
                kind: AST_IMPORT_KIND.REQUIRE,
                specifiers: [],
                typeOnly: false,
                location: {
                    lineStart: 1,
                    lineEnd: 1,
                    columnStart: 13,
                    columnEnd: 27,
                },
            },
        ])
        expect(result.classes[0]?.name).toBe("ReviewRuntime")
        expect(result.classes[0]?.extendsTypes).toEqual(["BaseRuntime"])
        expect(result.functions).toEqual([
            {
                name: "render",
                kind: AST_FUNCTION_KIND.METHOD,
                exported: false,
                async: false,
                parentClassName: "ReviewRuntime",
                location: {
                    lineStart: 3,
                    lineEnd: 5,
                    columnStart: 5,
                    columnEnd: 6,
                },
            },
            {
                name: "bootstrap",
                kind: AST_FUNCTION_KIND.FUNCTION,
                exported: true,
                async: true,
                location: {
                    lineStart: 7,
                    lineEnd: 7,
                    columnStart: 26,
                    columnEnd: 51,
                },
            },
        ])
        expect(result.calls.map((entry) => entry.callee)).toEqual(["sdk.start", "loadRuntime"])
    })

    test("parses .jsx source files and preserves jsx language marker", async () => {
        const parser = new JavaScriptSourceCodeParser({
            language: AST_LANGUAGE.JSX,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "src/ui/review-card.jsx",
            content: [
                "export function ReviewCard({title}) {",
                "    return <section><h1>{title}</h1></section>",
                "}",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.JSX)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.functions[0]).toEqual({
            name: "ReviewCard",
            kind: AST_FUNCTION_KIND.FUNCTION,
            exported: true,
            async: false,
            location: {
                lineStart: 1,
                lineEnd: 3,
                columnStart: 8,
                columnEnd: 2,
            },
        })
    })

    test("narrows only javascript-family languages", () => {
        expect(assertJavaScriptParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toBe(
            AST_LANGUAGE.JAVASCRIPT,
        )
        expect(assertJavaScriptParserLanguage(AST_LANGUAGE.JSX)).toBe(AST_LANGUAGE.JSX)
        expect(() => assertJavaScriptParserLanguage(AST_LANGUAGE.TYPESCRIPT)).toThrow(
            "Unsupported JavaScript parser language: typescript",
        )
    })
})
