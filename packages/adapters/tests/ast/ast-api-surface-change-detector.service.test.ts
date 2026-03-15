import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_LANGUAGE,
    type IAstClassDTO,
    type IAstFunctionDTO,
    type IAstInterfaceDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE,
    AST_API_SURFACE_CHANGE_SEVERITY,
    AST_API_SURFACE_CHANGE_TYPE,
    AstApiSurfaceChangeDetectorError,
    AstApiSurfaceChangeDetectorService,
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
 * Creates class fixture.
 *
 * @param name Class name.
 * @param exported Exported flag.
 * @returns Class DTO.
 */
function createClass(name: string, exported = true): IAstClassDTO {
    return {
        name,
        exported,
        extendsTypes: [],
        implementsTypes: [],
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
function createFunction(name: string, exported = true): IAstFunctionDTO {
    return {
        name,
        kind: AST_FUNCTION_KIND.FUNCTION,
        exported,
        async: false,
        location: createLocation(),
    }
}

/**
 * Creates interface fixture.
 *
 * @param name Interface name.
 * @param exported Exported flag.
 * @returns Interface DTO.
 */
function createInterface(name: string, exported = true): IAstInterfaceDTO {
    return {
        name,
        exported,
        extendsTypes: [],
        location: createLocation(),
    }
}

/**
 * Creates parsed file fixture.
 *
 * @param filePath Repository-relative file path.
 * @param overrides Optional file field overrides.
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
function expectAstApiSurfaceChangeDetectorError(
    callback: () => unknown,
    code:
        (typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstApiSurfaceChangeDetectorError)

        if (error instanceof AstApiSurfaceChangeDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstApiSurfaceChangeDetectorError to be thrown")
}

/**
 * Asserts typed detector error shape for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 */
async function expectAstApiSurfaceChangeDetectorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE)[keyof typeof AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstApiSurfaceChangeDetectorError)

        if (error instanceof AstApiSurfaceChangeDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstApiSurfaceChangeDetectorError to be thrown")
}

describe("AstApiSurfaceChangeDetectorService", () => {
    test("detects deterministic public API surface changes", async () => {
        const detector = new AstApiSurfaceChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/api.ts", {
                    functions: [createFunction("foo"), createFunction("bar")],
                    interfaces: [createInterface("IContract")],
                }),
                createParsedFile("src/old.ts", {
                    classes: [createClass("LegacyApi")],
                }),
            ],
            targetFiles: [
                createParsedFile("src/api.ts", {
                    classes: [createClass("foo")],
                    functions: [createFunction("bar"), createFunction("baz")],
                    interfaces: [createInterface("IContract")],
                }),
                createParsedFile("src/new.ts", {
                    classes: [createClass("FreshApi")],
                }),
            ],
        })

        expect(result.changes).toEqual([
            {
                id: "CHANGED_PUBLIC_SYMBOL_SHAPE|src/api.ts|foo",
                type: AST_API_SURFACE_CHANGE_TYPE.CHANGED_PUBLIC_SYMBOL_SHAPE,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.HIGH,
                filePath: "src/api.ts",
                symbolName: "foo",
                beforeKinds: ["FUNCTION"],
                afterKinds: ["CLASS"],
                reason: "Public symbol shape changed: foo",
            },
            {
                id: "REMOVED_PUBLIC_FILE|src/old.ts",
                type: AST_API_SURFACE_CHANGE_TYPE.REMOVED_PUBLIC_FILE,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.HIGH,
                filePath: "src/old.ts",
                reason: "Public API file was removed: src/old.ts",
            },
            {
                id: "ADDED_PUBLIC_SYMBOL|src/api.ts|baz",
                type: AST_API_SURFACE_CHANGE_TYPE.ADDED_PUBLIC_SYMBOL,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.LOW,
                filePath: "src/api.ts",
                symbolName: "baz",
                afterKinds: ["FUNCTION"],
                reason: "Public symbol was added: baz",
            },
            {
                id: "ADDED_PUBLIC_FILE|src/new.ts",
                type: AST_API_SURFACE_CHANGE_TYPE.ADDED_PUBLIC_FILE,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.LOW,
                filePath: "src/new.ts",
                reason: "Public API file was added: src/new.ts",
            },
        ])
        expect(result.summary).toEqual({
            baseFileCount: 2,
            targetFileCount: 2,
            comparedFileCount: 3,
            changeCount: 4,
            highSeverityCount: 2,
            truncated: false,
            truncatedChangeCount: 0,
            byType: {
                ADDED_PUBLIC_FILE: 1,
                ADDED_PUBLIC_SYMBOL: 1,
                REMOVED_PUBLIC_FILE: 1,
                REMOVED_PUBLIC_SYMBOL: 0,
                CHANGED_PUBLIC_SYMBOL_SHAPE: 1,
            },
        })
    })

    test("applies file-path filter", async () => {
        const detector = new AstApiSurfaceChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/api.ts", {
                    functions: [createFunction("foo"), createFunction("bar")],
                }),
                createParsedFile("src/old.ts", {
                    classes: [createClass("LegacyApi")],
                }),
            ],
            targetFiles: [
                createParsedFile("src/api.ts", {
                    classes: [createClass("foo")],
                    functions: [createFunction("bar"), createFunction("baz")],
                }),
                createParsedFile("src/new.ts", {
                    classes: [createClass("FreshApi")],
                }),
            ],
            filePaths: ["src/api.ts"],
        })

        expect(result.changes).toHaveLength(2)
        expect(result.summary.baseFileCount).toBe(1)
        expect(result.summary.targetFileCount).toBe(1)
        expect(result.summary.comparedFileCount).toBe(1)
    })

    test("truncates changes by maxChanges", async () => {
        const detector = new AstApiSurfaceChangeDetectorService()
        const result = await detector.detect({
            baseFiles: [
                createParsedFile("src/api.ts", {
                    functions: [createFunction("foo"), createFunction("bar")],
                }),
                createParsedFile("src/old.ts", {
                    classes: [createClass("LegacyApi")],
                }),
            ],
            targetFiles: [
                createParsedFile("src/api.ts", {
                    classes: [createClass("foo")],
                    functions: [createFunction("bar"), createFunction("baz")],
                }),
                createParsedFile("src/new.ts", {
                    classes: [createClass("FreshApi")],
                }),
            ],
            maxChanges: 2,
        })

        expect(result.changes).toHaveLength(2)
        expect(result.summary.truncated).toBe(true)
        expect(result.summary.truncatedChangeCount).toBe(2)
    })

    test("throws typed errors for invalid options", async () => {
        expectAstApiSurfaceChangeDetectorError(
            () => {
                void new AstApiSurfaceChangeDetectorService({
                    defaultMaxChanges: 0,
                })
            },
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_CHANGES,
        )

        const detector = new AstApiSurfaceChangeDetectorService()

        await expectAstApiSurfaceChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/a.ts")],
                    targetFiles: [createParsedFile("src/a.ts")],
                    filePaths: [],
                }),
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstApiSurfaceChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/a.ts")],
                    targetFiles: [createParsedFile("src/a.ts")],
                    filePaths: ["   "],
                }),
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstApiSurfaceChangeDetectorErrorAsync(
            async () =>
                detector.detect({
                    baseFiles: [createParsedFile("src/a.ts")],
                    targetFiles: [createParsedFile("src/a.ts")],
                    maxChanges: 0,
                }),
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_CHANGES,
        )
    })
})
