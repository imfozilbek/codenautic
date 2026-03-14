import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type ISourceCodeParseRequest,
} from "@codenautic/core"

import {
    assertRubyParserLanguage,
    RubySourceCodeParser,
} from "../../src/ast"

describe("RubySourceCodeParser", () => {
    test("parses .rb source files with requires, modules, classes, methods, and calls", async () => {
        const parser = new RubySourceCodeParser({
            language: AST_LANGUAGE.RUBY,
        })
        const request: ISourceCodeParseRequest = {
            filePath: "lib/runtime/worker.rb",
            content: [
                'require "json"',
                'require_relative "./support"',
                "",
                "module Runtime",
                "  class Worker < BaseWorker",
                "    def initialize(logger)",
                "      @logger = logger",
                "    end",
                "",
                "    def run",
                "      helper()",
                '      @logger.info("run")',
                "      self.class.boot",
                "    end",
                "  end",
                "",
                "  def self.bootstrap",
                "    Worker.new(nil).run",
                "  end",
                "end",
            ].join("\n"),
        }

        const result = await parser.parse(request)

        expect(result.language).toBe(AST_LANGUAGE.RUBY)
        expect(result.hasSyntaxErrors).toBe(false)
        expect(result.imports).toEqual([
            expect.objectContaining({
                source: "json",
                kind: AST_IMPORT_KIND.REQUIRE,
                specifiers: ["json"],
                typeOnly: false,
            }),
            expect.objectContaining({
                source: "./support",
                kind: AST_IMPORT_KIND.REQUIRE,
                specifiers: ["support"],
                typeOnly: false,
            }),
        ])
        expect(result.interfaces).toEqual([
            expect.objectContaining({
                name: "Runtime",
                exported: true,
                extendsTypes: [],
            }),
        ])
        expect(result.classes).toEqual([
            expect.objectContaining({
                name: "Worker",
                exported: true,
                extendsTypes: ["BaseWorker"],
                implementsTypes: [],
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

        const bootstrapMethod = result.functions.find((entry) => {
            return entry.name === "bootstrap" && entry.parentClassName === "Runtime"
        })
        expect(bootstrapMethod).toBeDefined()
        if (bootstrapMethod === undefined) {
            throw new Error("Expected module singleton method bootstrap to be parsed")
        }

        expect(bootstrapMethod.kind).toBe(AST_FUNCTION_KIND.METHOD)
        expect(bootstrapMethod.exported).toBe(true)

        const callCallees = result.calls.map((entry) => entry.callee)
        expect(callCallees).toContain("helper")
        expect(callCallees).toContain("@logger.info")
        expect(callCallees).toContain("self.class.boot")
        expect(callCallees).toContain("Worker.new(nil).run")

        const chainedCall = result.calls.find((entry) => entry.callee === "Worker.new(nil).run")
        expect(chainedCall).toBeDefined()
        if (chainedCall === undefined) {
            throw new Error("Expected chained call Worker.new(nil).run to be parsed")
        }

        expect(chainedCall.caller).toBe("bootstrap")
    })

    test("narrows only ruby language", () => {
        expect(assertRubyParserLanguage(AST_LANGUAGE.RUBY)).toBe(AST_LANGUAGE.RUBY)
        expect(() => assertRubyParserLanguage(AST_LANGUAGE.JAVASCRIPT)).toThrow(
            "Unsupported Ruby parser language: javascript",
        )
    })
})
