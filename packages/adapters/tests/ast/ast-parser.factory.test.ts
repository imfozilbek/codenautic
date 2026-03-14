import {describe, expect, test} from "bun:test"

import type {IParsedSourceFileDTO, ISourceCodeParser} from "@codenautic/core"
import {AST_LANGUAGE} from "@codenautic/core"

import {
    AST_PARSER_FACTORY_ERROR_CODE,
    AstParserFactory,
    AstParserFactoryError,
    CSharpSourceCodeParser,
    GoSourceCodeParser,
    JavaSourceCodeParser,
    JavaScriptSourceCodeParser,
    KotlinSourceCodeParser,
    PhpSourceCodeParser,
    PythonSourceCodeParser,
    RubySourceCodeParser,
    RustSourceCodeParser,
    TypeScriptSourceCodeParser,
    normalizeAstParserLanguage,
} from "../../src/ast"

class InMemorySourceCodeParser implements ISourceCodeParser {
    public readonly language = AST_LANGUAGE.TYPESCRIPT

    public parse(): Promise<IParsedSourceFileDTO> {
        return Promise.resolve({
            filePath: "src/factory.ts",
            language: this.language,
            hasSyntaxErrors: false,
            imports: [],
            typeAliases: [],
            interfaces: [],
            enums: [],
            classes: [],
            functions: [],
            calls: [],
        })
    }
}

/**
 * Asserts typed AST parser factory error payload.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 * @param language Expected raw language input.
 */
function expectAstParserFactoryError(
    callback: () => unknown,
    code: (typeof AST_PARSER_FACTORY_ERROR_CODE)[keyof typeof AST_PARSER_FACTORY_ERROR_CODE],
    language: string,
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstParserFactoryError)

        if (error instanceof AstParserFactoryError) {
            expect(error.code).toBe(code)
            expect(error.language).toBe(language)
            return
        }
    }

    throw new Error("Expected AstParserFactoryError to be thrown")
}

describe("AstParserFactory", () => {
    test("normalizes parser language aliases to canonical values", () => {
        expect(normalizeAstParserLanguage("ts")).toBe(AST_LANGUAGE.TYPESCRIPT)
        expect(normalizeAstParserLanguage(" TypeScript ")).toBe(AST_LANGUAGE.TYPESCRIPT)
        expect(normalizeAstParserLanguage("tsx")).toBe(AST_LANGUAGE.TSX)
        expect(normalizeAstParserLanguage("js")).toBe(AST_LANGUAGE.JAVASCRIPT)
        expect(normalizeAstParserLanguage("javascript")).toBe(AST_LANGUAGE.JAVASCRIPT)
        expect(normalizeAstParserLanguage("JSX")).toBe(AST_LANGUAGE.JSX)
        expect(normalizeAstParserLanguage("py")).toBe(AST_LANGUAGE.PYTHON)
        expect(normalizeAstParserLanguage("golang")).toBe(AST_LANGUAGE.GO)
        expect(normalizeAstParserLanguage("c#")).toBe(AST_LANGUAGE.CSHARP)
        expect(normalizeAstParserLanguage("kt")).toBe(AST_LANGUAGE.KOTLIN)
    })

    test("creates cached parser instances per canonical language", () => {
        const factory = new AstParserFactory()

        const typescriptParser = factory.create("ts")
        const typescriptParserByCanonicalName = factory.create("typescript")
        const javascriptParser = factory.create("js")
        const pythonParser = factory.create("py")
        const goParser = factory.create("go")
        const javaParser = factory.create("java")
        const rustParser = factory.create("rs")
        const phpParser = factory.create("php")
        const csharpParser = factory.create("c#")
        const rubyParser = factory.create("rb")
        const kotlinParser = factory.create("kt")

        expect(typescriptParser).toBe(typescriptParserByCanonicalName)
        expect(javascriptParser).toBe(factory.create("javascript"))
        expect(pythonParser).toBe(factory.create("python"))
        expect(goParser).toBe(factory.create("golang"))
        expect(javaParser).toBe(factory.create("java"))
        expect(rustParser).toBe(factory.create("rust"))
        expect(typescriptParser).not.toBe(javascriptParser)
        expect(pythonParser).not.toBe(typescriptParser)
        expect(goParser).not.toBe(pythonParser)
        expect(javaParser).not.toBe(goParser)
        expect(rustParser).not.toBe(javaParser)
        expect(phpParser).not.toBe(rustParser)
        expect(csharpParser).not.toBe(phpParser)
        expect(rubyParser).not.toBe(csharpParser)
        expect(kotlinParser).not.toBe(rubyParser)
        expect(typescriptParser).toBeInstanceOf(TypeScriptSourceCodeParser)
        expect(javascriptParser).toBeInstanceOf(JavaScriptSourceCodeParser)
        expect(pythonParser).toBeInstanceOf(PythonSourceCodeParser)
        expect(goParser).toBeInstanceOf(GoSourceCodeParser)
        expect(javaParser).toBeInstanceOf(JavaSourceCodeParser)
        expect(rustParser).toBeInstanceOf(RustSourceCodeParser)
        expect(phpParser).toBeInstanceOf(PhpSourceCodeParser)
        expect(csharpParser).toBeInstanceOf(CSharpSourceCodeParser)
        expect(rubyParser).toBeInstanceOf(RubySourceCodeParser)
        expect(kotlinParser).toBeInstanceOf(KotlinSourceCodeParser)
    })

    test("creates typescript, tsx, javascript, jsx, python, go, java, rust, php, csharp, ruby and kotlin parsers", async () => {
        const factory = new AstParserFactory()
        const typescriptResult = await factory.create("typescript").parse({
            filePath: "src/parser.ts",
            content: "export const answer: number = 42",
        })
        const tsxResult = await factory.create("tsx").parse({
            filePath: "src/view.tsx",
            content: "export const View = () => <main />",
        })
        const javascriptResult = await factory.create("javascript").parse({
            filePath: "src/parser.js",
            content: "export const answer = 42",
        })
        const jsxResult = await factory.create("jsx").parse({
            filePath: "src/view.jsx",
            content: "export const View = () => <main />",
        })
        const pythonResult = await factory.create("python").parse({
            filePath: "src/parser.py",
            content: "import os\n\nclass Parser:\n    def parse(self):\n        return os.getcwd()\n",
        })
        const goResult = await factory.create("go").parse({
            filePath: "src/parser.go",
            content: 'package parser\n\nimport "fmt"\n\nfunc Parse() { fmt.Println("ok") }\n',
        })
        const javaResult = await factory.create("java").parse({
            filePath: "src/Parser.java",
            content: "class Parser { void run() { System.out.println(\"ok\"); } }",
        })
        const rustResult = await factory.create("rust").parse({
            filePath: "src/parser.rs",
            content: "struct Parser; fn run() { Parser::run(); }",
        })
        const phpResult = await factory.create("php").parse({
            filePath: "src/parser.php",
            content: "<?php class Parser { public function run(): void {} }",
        })
        const csharpResult = await factory.create("csharp").parse({
            filePath: "src/parser.cs",
            content: "public class Parser { public void Run() { Parse(); } private void Parse() {} }",
        })
        const rubyResult = await factory.create("ruby").parse({
            filePath: "src/parser.rb",
            content: "class Parser; def run; helper(); end; end",
        })
        const kotlinResult = await factory.create("kotlin").parse({
            filePath: "src/parser.kt",
            content: 'class Parser {\n    fun run() {\n        println("ok")\n    }\n}',
        })

        expect(typescriptResult.language).toBe(AST_LANGUAGE.TYPESCRIPT)
        expect(typescriptResult.hasSyntaxErrors).toBe(false)
        expect(tsxResult.language).toBe(AST_LANGUAGE.TSX)
        expect(tsxResult.hasSyntaxErrors).toBe(false)
        expect(javascriptResult.language).toBe(AST_LANGUAGE.JAVASCRIPT)
        expect(javascriptResult.hasSyntaxErrors).toBe(false)
        expect(jsxResult.language).toBe(AST_LANGUAGE.JSX)
        expect(jsxResult.hasSyntaxErrors).toBe(false)
        expect(pythonResult.language).toBe(AST_LANGUAGE.PYTHON)
        expect(pythonResult.hasSyntaxErrors).toBe(false)
        expect(goResult.language).toBe(AST_LANGUAGE.GO)
        expect(goResult.hasSyntaxErrors).toBe(false)
        expect(javaResult.language).toBe(AST_LANGUAGE.JAVA)
        expect(javaResult.hasSyntaxErrors).toBe(false)
        expect(rustResult.language).toBe(AST_LANGUAGE.RUST)
        expect(rustResult.hasSyntaxErrors).toBe(false)
        expect(phpResult.language).toBe(AST_LANGUAGE.PHP)
        expect(phpResult.hasSyntaxErrors).toBe(false)
        expect(csharpResult.language).toBe(AST_LANGUAGE.CSHARP)
        expect(csharpResult.hasSyntaxErrors).toBe(false)
        expect(rubyResult.language).toBe(AST_LANGUAGE.RUBY)
        expect(rubyResult.hasSyntaxErrors).toBe(false)
        expect(kotlinResult.language).toBe(AST_LANGUAGE.KOTLIN)
        expect(kotlinResult.hasSyntaxErrors).toBe(false)
    })

    test("throws typed error for unknown language", () => {
        const factory = new AstParserFactory()

        expectAstParserFactoryError(
            () => factory.create("brainfuck"),
            AST_PARSER_FACTORY_ERROR_CODE.UNKNOWN_LANGUAGE,
            "brainfuck",
        )
        expect(() => factory.create("brainfuck")).toThrow(
            "Unknown AST parser language: brainfuck",
        )
    })

    test("wraps creator failures in typed factory error", () => {
        const factory = new AstParserFactory({
            creators: {
                [AST_LANGUAGE.TYPESCRIPT](): ISourceCodeParser {
                    throw new Error("synthetic factory failure")
                },
            },
        })

        expectAstParserFactoryError(
            () => factory.create("typescript"),
            AST_PARSER_FACTORY_ERROR_CODE.PARSER_CREATION_FAILED,
            "typescript",
        )
        expect(() => factory.create("typescript")).toThrow(
            "Failed to create AST parser for language: typescript",
        )
    })

    test("returns injected parser creators from custom registry", async () => {
        const parser = new InMemorySourceCodeParser()
        const factory = new AstParserFactory({
            creators: {
                [AST_LANGUAGE.TYPESCRIPT](): ISourceCodeParser {
                    return parser
                },
            },
        })

        const result = await factory.create("typescript").parse({
            filePath: "src/factory.ts",
            content: "export const value = 1",
        })

        expect(factory.create("ts")).toBe(parser)
        expect(result.filePath).toBe("src/factory.ts")
    })
})
