import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertJavaParserLanguage,
    JavaSourceCodeParser,
} from "../../src/ast"

describe("JavaSourceCodeParser", () => {
    test("parses .java source files with imports, classes, interfaces, methods, and calls", async () => {
        const parser = new JavaSourceCodeParser({
            language: AST_LANGUAGE.JAVA,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "src/main/java/com/codenautic/runtime/Worker.java",
            content: [
                "package com.codenautic.runtime;",
                "",
                "import java.util.List;",
                "import static java.util.Collections.emptyList;",
                "",
                "public interface Reviewer extends BaseReviewer {",
                "    void run();",
                "}",
                "",
                "public class Worker extends BaseWorker implements Reviewer, AutoCloseable {",
                "    public String execute(List<String> values) {",
                '        return String.join(",", values);',
                "    }",
                "}",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.JAVA)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            expect.objectContaining({
                source: "java.util.List",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["List"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "java.util.Collections.emptyList",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["emptyList"],
                typeOnly: false,
            }),
        ])
        expect(result.interfaces).toEqual([
            expect.objectContaining({
                name: "Reviewer",
                exported: true,
                extendsTypes: ["BaseReviewer"],
            }),
        ])
        expect(result.classes).toEqual([
            expect.objectContaining({
                name: "Worker",
                exported: true,
                extendsTypes: ["BaseWorker"],
                implementsTypes: ["Reviewer", "AutoCloseable"],
            }),
        ])

        const runMethod = result.functions.find((entry) => entry.name === "run")
        expect(runMethod).toBeDefined()
        if (runMethod === undefined) {
            throw new Error("Expected method run to be parsed")
        }

        expect(runMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(runMethod.parentClassName).toBe("Reviewer")

        const executeMethod = result.functions.find((entry) => entry.name === "execute")
        expect(executeMethod).toBeDefined()
        if (executeMethod === undefined) {
            throw new Error("Expected method execute to be parsed")
        }

        expect(executeMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(executeMethod.parentClassName).toBe("Worker")
        expect(executeMethod.exported).toBe(true)
        expect(executeMethod.async).toBe(false)
        expect(result.calls.map((entry) => entry.callee)).toEqual(["String.join"])
    })

    test("narrows only java language", () => {
        expect(assertJavaParserLanguage(AST_LANGUAGE.JAVA)).toBe(AST_LANGUAGE.JAVA)
        expect(() => assertJavaParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toThrow(
            "Unsupported Java parser language: javascript",
        )
    })
})
