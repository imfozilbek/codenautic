import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertGoParserLanguage,
    GoSourceCodeParser,
} from "../../src/ast"

describe("GoSourceCodeParser", () => {
    test("parses .go source files with imports, types, functions, and calls", async () => {
        const parser = new GoSourceCodeParser({
            language: AST_LANGUAGE.GO,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "internal/runtime/reviewer.go",
            content: [
                "package runtime",
                "",
                "import (",
                '    "fmt"',
                '    sdk "example.com/sdk"',
                ")",
                "",
                "type Reviewer interface {",
                "    Run() error",
                "}",
                "",
                "type Worker struct {",
                "    Name string",
                "}",
                "",
                "type ReviewID = string",
                "",
                "func (w *Worker) Execute(input ReviewID) error {",
                '    return fmt.Errorf("failed: %s", input)',
                "}",
                "",
                "func Bootstrap() {",
                "    sdk.Start()",
                "}",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.GO)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            expect.objectContaining({
                source: "fmt",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["fmt"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "example.com/sdk",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["sdk"],
                typeOnly: false,
            }),
        ])
        expect(result.interfaces).toEqual([
            expect.objectContaining({
                name: "Reviewer",
                exported: true,
            }),
        ])
        expect(result.classes).toEqual([
            expect.objectContaining({
                name: "Worker",
                exported: true,
                extendsTypes: [],
                implementsTypes: [],
            }),
        ])
        expect(result.typeAliases).toEqual([
            expect.objectContaining({
                name: "ReviewID",
                exported: true,
            }),
        ])

        const executeMethod = result.functions.find((entry) => entry.name === "Execute")
        expect(executeMethod).toBeDefined()
        if (executeMethod === undefined) {
            throw new Error("Expected method Execute to be parsed")
        }

        expect(executeMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(executeMethod.parentClassName).toBe("Worker")
        expect(executeMethod.async).toBe(false)

        const bootstrapFunction = result.functions.find((entry) => entry.name === "Bootstrap")
        expect(bootstrapFunction).toBeDefined()
        if (bootstrapFunction === undefined) {
            throw new Error("Expected function Bootstrap to be parsed")
        }

        expect(bootstrapFunction.kind).toBe(AST_FUNCTION_KIND.FUNCTION)
        expect(bootstrapFunction.parentClassName).toBeUndefined()
        expect(bootstrapFunction.async).toBe(false)
        expect(result.calls.map((entry) => entry.callee)).toEqual(["fmt.Errorf", "sdk.Start"])
    })

    test("narrows only go language", () => {
        expect(assertGoParserLanguage(AST_LANGUAGE.GO)).toBe(AST_LANGUAGE.GO)
        expect(() => assertGoParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toThrow(
            "Unsupported Go parser language: javascript",
        )
    })
})
