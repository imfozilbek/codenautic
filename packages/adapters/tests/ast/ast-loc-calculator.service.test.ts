import {describe, expect, test} from "bun:test"

import {
    AST_LANGUAGE,
    type SupportedLanguage,
} from "@codenautic/core"

import {
    AST_LOC_CALCULATOR_ERROR_CODE,
    AstLocCalculatorError,
    AstLocCalculatorService,
    type IAstLocCalculatorFileInput,
} from "../../src/ast"

type AstLocCalculatorErrorCode =
    (typeof AST_LOC_CALCULATOR_ERROR_CODE)[keyof typeof AST_LOC_CALCULATOR_ERROR_CODE]

/**
 * Asserts typed AST LOC calculator error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstLocCalculatorError(
    callback: () => Promise<unknown>,
    code: AstLocCalculatorErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstLocCalculatorError)

        if (error instanceof AstLocCalculatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstLocCalculatorError to be thrown")
}

/**
 * Creates one LOC calculator file input fixture.
 *
 * @param filePath Repository-relative file path.
 * @param language Source language.
 * @param sourceCode Source code payload.
 * @returns LOC calculator file input.
 */
function createFileInput(
    filePath: string,
    language: SupportedLanguage,
    sourceCode: string,
): IAstLocCalculatorFileInput {
    return {
        filePath,
        language,
        sourceCode,
    }
}

describe("AstLocCalculatorService", () => {
    test("calculates LOC for c-style languages excluding blank and comment-only lines", async () => {
        const service = new AstLocCalculatorService()

        const result = await service.calculate({
            files: [
                createFileInput(
                    "src/main.ts",
                    AST_LANGUAGE.TYPESCRIPT,
                    [
                        "const alpha = 1",
                        "",
                        "// one-line comment",
                        "const url = \"https://example.com/a//b\"",
                        "const total = 1 /* inline block comment */ + 2",
                        "/* block comment start",
                        "still comment",
                        "block comment end */",
                        "const done = true",
                    ].join("\n"),
                ),
            ],
        })

        expect(result.items).toEqual([
            {
                filePath: "src/main.ts",
                loc: 4,
            },
        ])
        expect(result.summary).toEqual({
            totalFiles: 1,
            processedFiles: 1,
            totalLoc: 4,
        })
    })

    test("supports python docstring comments and ruby hash comments", async () => {
        const service = new AstLocCalculatorService()

        const result = await service.calculate({
            files: [
                createFileInput(
                    "scripts/job.py",
                    AST_LANGUAGE.PYTHON,
                    [
                        "# header",
                        "def run():",
                        "    \"\"\"docstring",
                        "    inner details",
                        "    \"\"\"",
                        "    return 1  # trailing comment",
                    ].join("\n"),
                ),
                createFileInput(
                    "scripts/app.rb",
                    AST_LANGUAGE.RUBY,
                    [
                        "# setup",
                        "value = \"# not a ruby comment marker\"",
                        "puts value # inline comment",
                    ].join("\n"),
                ),
            ],
        })

        expect(result.items).toEqual([
            {
                filePath: "scripts/app.rb",
                loc: 2,
            },
            {
                filePath: "scripts/job.py",
                loc: 2,
            },
        ])
        expect(result.summary).toEqual({
            totalFiles: 2,
            processedFiles: 2,
            totalLoc: 4,
        })
    })

    test("applies deterministic file-path filter and preserves total files summary", async () => {
        const service = new AstLocCalculatorService()

        const result = await service.calculate({
            files: [
                createFileInput("src/a.ts", AST_LANGUAGE.TYPESCRIPT, "const a = 1"),
                createFileInput("src/b.ts", AST_LANGUAGE.TYPESCRIPT, "const b = 2"),
            ],
            filePaths: [" src/b.ts ", "src/b.ts"],
        })

        expect(result.items).toEqual([
            {
                filePath: "src/b.ts",
                loc: 1,
            },
        ])
        expect(result.summary).toEqual({
            totalFiles: 2,
            processedFiles: 1,
            totalLoc: 1,
        })
    })

    test("throws typed errors for invalid input payloads", async () => {
        const service = new AstLocCalculatorService()

        await expectAstLocCalculatorError(
            () =>
                service.calculate({
                    files: [],
                }),
            AST_LOC_CALCULATOR_ERROR_CODE.EMPTY_FILES,
        )

        await expectAstLocCalculatorError(
            () =>
                service.calculate({
                    files: [
                        createFileInput("src/a.ts", AST_LANGUAGE.TYPESCRIPT, "const a = 1"),
                        createFileInput("src/a.ts", AST_LANGUAGE.TYPESCRIPT, "const b = 2"),
                    ],
                }),
            AST_LOC_CALCULATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
        )

        await expectAstLocCalculatorError(
            () =>
                service.calculate({
                    files: [
                        createFileInput(
                            "src/a.ts",
                            "unsupported-language" as SupportedLanguage,
                            "const a = 1",
                        ),
                    ],
                }),
            AST_LOC_CALCULATOR_ERROR_CODE.INVALID_LANGUAGE,
        )

        await expectAstLocCalculatorError(
            () =>
                service.calculate({
                    files: [createFileInput("src/a.ts", AST_LANGUAGE.TYPESCRIPT, "const a = 1")],
                    filePaths: [],
                }),
            AST_LOC_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATH_FILTER,
        )
    })
})
