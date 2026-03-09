import {describe, expect, test} from "bun:test"

import type {IParsedSourceFileDTO, ISourceCodeParser} from "@codenautic/core"
import {AST_LANGUAGE} from "@codenautic/core"

import {
    AST_PARSER_FACTORY_ERROR_CODE,
    AstParserFactory,
    AstParserFactoryError,
    JavaScriptSourceCodeParser,
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

        expect(typescriptParser).toBe(typescriptParserByCanonicalName)
        expect(javascriptParser).toBe(factory.create("javascript"))
        expect(typescriptParser).not.toBe(javascriptParser)
        expect(typescriptParser).toBeInstanceOf(TypeScriptSourceCodeParser)
        expect(javascriptParser).toBeInstanceOf(JavaScriptSourceCodeParser)
    })

    test("creates typescript, tsx, javascript and jsx parsers", async () => {
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

        expect(typescriptResult.language).toBe(AST_LANGUAGE.TYPESCRIPT)
        expect(typescriptResult.hasSyntaxErrors).toBe(false)
        expect(tsxResult.language).toBe(AST_LANGUAGE.TSX)
        expect(tsxResult.hasSyntaxErrors).toBe(false)
        expect(javascriptResult.language).toBe(AST_LANGUAGE.JAVASCRIPT)
        expect(javascriptResult.hasSyntaxErrors).toBe(false)
        expect(jsxResult.language).toBe(AST_LANGUAGE.JSX)
        expect(jsxResult.hasSyntaxErrors).toBe(false)
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

    test("throws typed error for known but not yet supported language", () => {
        const factory = new AstParserFactory()

        expectAstParserFactoryError(
            () => factory.create("python"),
            AST_PARSER_FACTORY_ERROR_CODE.LANGUAGE_NOT_SUPPORTED,
            "python",
        )
        expect(() => factory.create("python")).toThrow(
            "AST parser is not supported for language: python",
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
