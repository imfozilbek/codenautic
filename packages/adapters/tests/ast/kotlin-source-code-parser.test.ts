import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertKotlinParserLanguage,
    KotlinSourceCodeParser,
} from "../../src/ast"

describe("KotlinSourceCodeParser", () => {
    test("parses .kt source files with imports, classes, interfaces, methods, and calls", async () => {
        const parser = new KotlinSourceCodeParser({
            language: AST_LANGUAGE.KOTLIN,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "src/runtime/worker.kt",
            content: [
                "package app.runtime",
                "",
                "import kotlin.io.println",
                "import app.services.Worker as RuntimeWorker",
                "",
                "interface Reviewer : BaseReviewer {",
                "    fun run()",
                "}",
                "",
                "open class BaseWorker",
                "",
                "class Worker : BaseWorker(), Reviewer {",
                "    override fun run() {",
                "        helper()",
                "        RuntimeWorker.start()",
                "        println(\"run\")",
                "    }",
                "}",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.KOTLIN)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            expect.objectContaining({
                source: "kotlin.io.println",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["println"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "app.services.Worker",
                kind: AST_IMPORT_KIND.STATIC,
                specifiers: ["RuntimeWorker"],
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
                name: "BaseWorker",
                exported: true,
                extendsTypes: [],
                implementsTypes: [],
            }),
            expect.objectContaining({
                name: "Worker",
                exported: true,
                extendsTypes: ["BaseWorker"],
                implementsTypes: ["Reviewer"],
            }),
        ])

        const runMethod = result.functions.find((entry) => {
            return entry.name === "run" && entry.parentClassName === "Worker"
        })
        expect(runMethod).toBeDefined()
        if (runMethod === undefined) {
            throw new Error("Expected class method run to be parsed")
        }

        expect(runMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(runMethod.exported).toBe(true)
        expect(runMethod.async).toBe(false)

        const callCallees = result.calls.map((entry) => entry.callee)
        expect(callCallees).toContain("helper")
        expect(callCallees).toContain("RuntimeWorker.start")
        expect(callCallees).toContain("println")

        const navigationCall = result.calls.find((entry) => entry.callee === "RuntimeWorker.start")
        expect(navigationCall).toBeDefined()
        if (navigationCall === undefined) {
            throw new Error("Expected call RuntimeWorker.start() to be parsed")
        }

        expect(navigationCall.caller).toBe("run")
    })

    test("narrows only kotlin language", () => {
        expect(assertKotlinParserLanguage(AST_LANGUAGE.KOTLIN)).toBe(AST_LANGUAGE.KOTLIN)
        expect(() => assertKotlinParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toThrow(
            "Unsupported Kotlin parser language: javascript",
        )
    })
})
