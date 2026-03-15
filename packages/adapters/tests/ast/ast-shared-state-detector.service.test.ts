import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type AstFunctionKind,
    type AstImportKind,
    type IAstClassDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_SHARED_STATE_DETECTOR_ERROR_CODE,
    AST_SHARED_STATE_ISSUE_TYPE,
    AST_SHARED_STATE_SEVERITY,
    AstSharedStateDetectorError,
    AstSharedStateDetectorService,
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
 * @param specifiers Import specifiers.
 * @param kind Import kind.
 * @returns Import DTO.
 */
function createImport(
    source: string,
    specifiers: readonly string[] = [],
    kind: AstImportKind = AST_IMPORT_KIND.STATIC,
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
 * Creates class declaration fixture.
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
 * @param name Function or method name.
 * @param kind Function kind.
 * @param exported Exported flag.
 * @param parentClassName Parent class name for methods.
 * @returns Function DTO.
 */
function createFunction(
    name: string,
    kind: AstFunctionKind,
    exported = false,
    parentClassName?: string,
): IAstFunctionDTO {
    return {
        name,
        kind,
        exported,
        async: false,
        parentClassName,
        location: createLocation(),
    }
}

/**
 * Creates parsed source file fixture.
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
function expectAstSharedStateDetectorError(
    callback: () => unknown,
    code:
        (typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE)[keyof typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstSharedStateDetectorError)

        if (error instanceof AstSharedStateDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstSharedStateDetectorError to be thrown")
}

/**
 * Asserts typed detector error shape for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 */
async function expectAstSharedStateDetectorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE)[keyof typeof AST_SHARED_STATE_DETECTOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstSharedStateDetectorError)

        if (error instanceof AstSharedStateDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstSharedStateDetectorError to be thrown")
}

describe("AstSharedStateDetectorService", () => {
    test("detects shared mutable class exports", async () => {
        const detector = new AstSharedStateDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/store.ts", {
                    classes: [createClass("Store")],
                    functions: [
                        createFunction(
                            "setValue",
                            AST_FUNCTION_KIND.METHOD,
                            false,
                            "Store",
                        ),
                    ],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
            ],
        })

        expect(result.issues).toEqual([
            {
                id: "SHARED_MUTABLE_CLASS|src/store.ts|Store|src/a.ts,src/b.ts",
                type: AST_SHARED_STATE_ISSUE_TYPE.SHARED_MUTABLE_CLASS,
                severity: AST_SHARED_STATE_SEVERITY.MEDIUM,
                filePath: "src/store.ts",
                exportedSymbol: "Store",
                consumerCount: 2,
                consumerFilePaths: ["src/a.ts", "src/b.ts"],
                reason: "Exported class Store has mutator methods (setValue) and is consumed by multiple files",
            },
        ])
        expect(result.summary).toEqual({
            scannedFileCount: 3,
            issueCount: 1,
            highSeverityCount: 0,
            truncatedIssueCount: 0,
            truncated: false,
            byType: {
                SHARED_MUTABLE_CLASS: 1,
                SHARED_MUTABLE_FUNCTION_API: 0,
            },
        })
    })

    test("detects high-severity shared mutable function API", async () => {
        const detector = new AstSharedStateDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/cache.ts", {
                    functions: [
                        createFunction("setCache", AST_FUNCTION_KIND.FUNCTION, true),
                        createFunction("getCache", AST_FUNCTION_KIND.FUNCTION, true),
                    ],
                }),
                createParsedFile("src/c1.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/c2.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/c3.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/c4.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/c5.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
            ],
        })

        expect(result.issues).toHaveLength(1)
        expect(result.issues[0]).toMatchObject({
            type: AST_SHARED_STATE_ISSUE_TYPE.SHARED_MUTABLE_FUNCTION_API,
            severity: AST_SHARED_STATE_SEVERITY.HIGH,
            filePath: "src/cache.ts",
            exportedSymbol: "setCache",
            consumerCount: 5,
        })
        expect(result.summary.highSeverityCount).toBe(1)
    })

    test("truncates issue output by maxIssues", async () => {
        const detector = new AstSharedStateDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/store.ts", {
                    classes: [createClass("Store")],
                    functions: [
                        createFunction(
                            "setValue",
                            AST_FUNCTION_KIND.METHOD,
                            false,
                            "Store",
                        ),
                    ],
                }),
                createParsedFile("src/cache.ts", {
                    functions: [createFunction("setCache", AST_FUNCTION_KIND.FUNCTION, true)],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/d.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
            ],
            maxIssues: 1,
        })

        expect(result.issues).toHaveLength(1)
        expect(result.summary.truncated).toBe(true)
        expect(result.summary.truncatedIssueCount).toBe(1)
    })

    test("applies provider file path filter", async () => {
        const detector = new AstSharedStateDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/store.ts", {
                    classes: [createClass("Store")],
                    functions: [
                        createFunction(
                            "setValue",
                            AST_FUNCTION_KIND.METHOD,
                            false,
                            "Store",
                        ),
                    ],
                }),
                createParsedFile("src/cache.ts", {
                    functions: [createFunction("setCache", AST_FUNCTION_KIND.FUNCTION, true)],
                }),
                createParsedFile("src/a.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./store", ["Store"])],
                }),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
                createParsedFile("src/d.ts", {
                    imports: [createImport("./cache", ["setCache"])],
                }),
            ],
            filePaths: ["src/cache.ts"],
        })

        expect(result.issues).toHaveLength(1)
        expect(result.issues[0]?.filePath).toBe("src/cache.ts")
        expect(result.summary.scannedFileCount).toBe(1)
    })

    test("throws typed errors for invalid options", async () => {
        expectAstSharedStateDetectorError(
            () => {
                void new AstSharedStateDetectorService({
                    defaultMinimumConsumerCount: 0,
                })
            },
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CONSUMER_COUNT,
        )

        expectAstSharedStateDetectorError(
            () => {
                void new AstSharedStateDetectorService({
                    defaultMaxIssues: 0,
                })
            },
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MAX_ISSUES,
        )

        const detector = new AstSharedStateDetectorService()

        await expectAstSharedStateDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: [],
                }),
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstSharedStateDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: ["   "],
                }),
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstSharedStateDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    minimumConsumerCount: 0,
                }),
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CONSUMER_COUNT,
        )

        await expectAstSharedStateDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    maxIssues: 0,
                }),
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MAX_ISSUES,
        )
    })
})
