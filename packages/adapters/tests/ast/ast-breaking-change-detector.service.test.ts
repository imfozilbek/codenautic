import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type AstImportKind,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE,
    AST_BREAKING_CHANGE_SEVERITY,
    AST_BREAKING_CHANGE_TYPE,
    AstBreakingChangeDetectorError,
    AstBreakingChangeDetectorService,
} from "../../src/ast"

/**
 * Creates stable source location fixture.
 *
 * @returns Source location.
 */
function createLocation(): IAstSourceLocationDTO {
    return {
        lineStart: 1,
        lineEnd: 1,
        columnStart: 1,
        columnEnd: 1,
    }
}

/**
 * Creates import fixture.
 *
 * @param source Import source.
 * @param kind Import kind.
 * @param specifiers Import specifiers.
 * @returns Import DTO.
 */
function createImport(
    source: string,
    kind: AstImportKind = AST_IMPORT_KIND.STATIC,
    specifiers: readonly string[] = [],
): IAstImportDTO {
    return {
        source,
        kind,
        specifiers: [...specifiers],
        typeOnly: false,
        location: createLocation(),
    }
}

/**
 * Creates function fixture.
 *
 * @param name Function name.
 * @param exported Exported flag.
 * @returns Function DTO.
 */
function createFunction(name: string, exported: boolean): IAstFunctionDTO {
    return {
        name,
        kind: AST_FUNCTION_KIND.FUNCTION,
        exported,
        async: false,
        location: createLocation(),
    }
}

/**
 * Creates parsed file fixture.
 *
 * @param filePath Repository-relative file path.
 * @param overrides Optional field overrides.
 * @returns Parsed source file DTO.
 */
function createParsedFile(
    filePath: string,
    overrides: Partial<IParsedSourceFileDTO> = {},
): IParsedSourceFileDTO {
    return {
        filePath,
        language: AST_LANGUAGE.TYPESCRIPT,
        hasSyntaxErrors: false,
        imports: [],
        typeAliases: [],
        interfaces: [],
        enums: [],
        classes: [],
        functions: [],
        calls: [],
        ...overrides,
    }
}

/**
 * Asserts typed detector error shape for synchronous action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstBreakingChangeDetectorError(
    callback: () => unknown,
    code:
        (typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBreakingChangeDetectorError)

        if (error instanceof AstBreakingChangeDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBreakingChangeDetectorError to be thrown")
}

/**
 * Asserts typed detector error shape for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 */
async function expectAstBreakingChangeDetectorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBreakingChangeDetectorError)

        if (error instanceof AstBreakingChangeDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBreakingChangeDetectorError to be thrown")
}

describe("AstBreakingChangeDetectorService", () => {
    test("detects removed exported symbol and affected consumers", async () => {
        const detector = new AstBreakingChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/lib.ts", {
                    functions: [
                        createFunction("foo", true),
                        createFunction("bar", true),
                    ],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["bar"])],
                }),
            ],
            targetFiles: [
                createParsedFile("src/lib.ts", {
                    functions: [createFunction("bar", true)],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["bar"])],
                }),
            ],
        })

        expect(result.breakingChanges).toHaveLength(1)
        expect(result.breakingChanges[0]).toMatchObject({
            type: AST_BREAKING_CHANGE_TYPE.REMOVED_SYMBOL_EXPORT,
            severity: AST_BREAKING_CHANGE_SEVERITY.HIGH,
            providerFilePath: "src/lib.ts",
            symbol: "foo",
            affectedFileCount: 1,
            affectedFilePaths: ["src/a.ts"],
            truncatedAffectedFiles: false,
        })
        expect(result.summary).toEqual({
            providerFileCount: 3,
            breakingChangeCount: 1,
            highSeverityCount: 1,
            affectedFileCount: 1,
            truncatedChangeCount: 0,
        })
    })

    test("detects removed provider export surface", async () => {
        const detector = new AstBreakingChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/lib.ts", {
                    functions: [createFunction("foo", true)],
                }),
                createParsedFile("src/consumer.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
            ],
            targetFiles: [createParsedFile("src/consumer.ts")],
        })

        expect(result.breakingChanges).toHaveLength(1)
        expect(result.breakingChanges[0]).toMatchObject({
            type: AST_BREAKING_CHANGE_TYPE.REMOVED_FILE_EXPORT_SURFACE,
            providerFilePath: "src/lib.ts",
            affectedFilePaths: ["src/consumer.ts"],
            severity: AST_BREAKING_CHANGE_SEVERITY.HIGH,
        })
    })

    test("applies provider file-path filter", async () => {
        const detector = new AstBreakingChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/lib-1.ts", {
                    functions: [createFunction("foo", true)],
                }),
                createParsedFile("src/lib-2.ts", {
                    functions: [createFunction("bar", true)],
                }),
                createParsedFile("src/consumer.ts", {
                    imports: [
                        createImport("./lib-1", AST_IMPORT_KIND.STATIC, ["foo"]),
                        createImport("./lib-2", AST_IMPORT_KIND.STATIC, ["bar"]),
                    ],
                }),
            ],
            targetFiles: [
                createParsedFile("src/lib-1.ts"),
                createParsedFile("src/lib-2.ts"),
                createParsedFile("src/consumer.ts"),
            ],
            filePaths: ["src/lib-1.ts"],
        })

        expect(result.breakingChanges).toHaveLength(1)
        expect(result.breakingChanges[0]?.providerFilePath).toBe("src/lib-1.ts")
    })

    test("truncates affected file list by maxAffectedFiles", async () => {
        const detector = new AstBreakingChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/lib.ts", {
                    functions: [createFunction("foo", true)],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./lib", AST_IMPORT_KIND.STATIC, ["foo"])],
                }),
            ],
            targetFiles: [createParsedFile("src/lib.ts")],
            maxAffectedFiles: 2,
        })

        expect(result.breakingChanges).toHaveLength(1)
        expect(result.breakingChanges[0]).toMatchObject({
            affectedFileCount: 3,
            truncatedAffectedFiles: true,
        })
        expect(result.breakingChanges[0]?.affectedFilePaths).toHaveLength(2)
    })

    test("throws typed errors for invalid options", async () => {
        expectAstBreakingChangeDetectorError(
            () => {
                void new AstBreakingChangeDetectorService({
                    defaultMaxAffectedFiles: 0,
                })
            },
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_AFFECTED_FILES,
        )

        const detector = new AstBreakingChangeDetectorService()

        await expectAstBreakingChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/lib.ts")],
                    targetFiles: [createParsedFile("src/lib.ts")],
                    filePaths: [],
                }),
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstBreakingChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/lib.ts")],
                    targetFiles: [createParsedFile("src/lib.ts")],
                    filePaths: ["   "],
                }),
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstBreakingChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/lib.ts")],
                    targetFiles: [createParsedFile("src/lib.ts")],
                    maxAffectedFiles: 0,
                }),
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_AFFECTED_FILES,
        )
    })
})
