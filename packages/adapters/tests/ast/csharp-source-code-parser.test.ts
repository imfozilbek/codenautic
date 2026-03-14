import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertCSharpParserLanguage,
    CSharpSourceCodeParser,
} from "../../src/ast"

describe("CSharpSourceCodeParser", () => {
    test("parses .cs source files with using directives, interfaces, classes, methods, and calls", async () => {
        const parser = new CSharpSourceCodeParser({
            language: AST_LANGUAGE.CSHARP,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "src/runtime/worker.cs",
            content: [
                "using System;",
                "using static System.Math;",
                "using Alias = Company.Product.Service;",
                "using System.Threading.Tasks;",
                "",
                "public interface IReviewer : IBaseReviewer {",
                "    void Run();",
                "}",
                "",
                "public class Worker : BaseWorker, IReviewer {",
                "    private void Boot() {",
                '        Console.WriteLine("boot");',
                "    }",
                "",
                "    public async Task Run() {",
                "        Boot();",
                '        Console.WriteLine("run");',
                "    }",
                "}",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.CSHARP)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            expect.objectContaining({
                source: "System",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["System"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "System.Math",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["Math"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "Company.Product.Service",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["Alias"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "System.Threading.Tasks",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["Tasks"],
                typeOnly: false,
            }),
        ])
        expect(result.interfaces).toEqual([
            expect.objectContaining({
                name: "IReviewer",
                exported: true,
                extendsTypes: ["IBaseReviewer"],
            }),
        ])
        expect(result.classes).toEqual([
            expect.objectContaining({
                name: "Worker",
                exported: true,
                extendsTypes: ["BaseWorker"],
                implementsTypes: ["IReviewer"],
            }),
        ])

        const bootMethod = result.functions.find((entry) => entry.name === "Boot")
        expect(bootMethod).toBeDefined()
        if (bootMethod === undefined) {
            throw new Error("Expected method Boot to be parsed")
        }

        expect(bootMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(bootMethod.parentClassName).toBe("Worker")
        expect(bootMethod.exported).toBe(false)
        expect(bootMethod.async).toBe(false)

        const runMethod = result.functions.find((entry) => {
            return entry.name === "Run" && entry.parentClassName === "Worker"
        })
        expect(runMethod).toBeDefined()
        if (runMethod === undefined) {
            throw new Error("Expected class method Run to be parsed")
        }

        expect(runMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(runMethod.exported).toBe(true)
        expect(runMethod.async).toBe(true)

        const callCallees = result.calls.map((entry) => entry.callee)
        expect(callCallees).toContain("Boot")
        expect(callCallees).toContain("Console.WriteLine")

        const bootCall = result.calls.find((entry) => entry.callee === "Boot")
        expect(bootCall).toBeDefined()
        if (bootCall === undefined) {
            throw new Error("Expected invocation Boot() to be parsed")
        }

        expect(bootCall.caller).toBe("Run")
    })

    test("narrows only csharp language", () => {
        expect(assertCSharpParserLanguage(AST_LANGUAGE.CSHARP)).toBe(AST_LANGUAGE.CSHARP)
        expect(() => assertCSharpParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toThrow(
            "Unsupported CSharp parser language: javascript",
        )
    })
})
