import {describe, expect, test} from "bun:test"

import {
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type AstImportKind,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE,
    AST_CIRCULAR_DEPENDENCY_SEVERITY,
    AstCircularDependencyDetectorError,
    AstCircularDependencyDetectorService,
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
 * @returns Import DTO.
 */
function createImport(
    source: string,
    kind: AstImportKind = AST_IMPORT_KIND.STATIC,
): IAstImportDTO {
    return {
        source,
        kind,
        specifiers: [],
        typeOnly: false,
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
function expectAstCircularDependencyDetectorError(
    callback: () => unknown,
    code:
        (typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE)[keyof typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCircularDependencyDetectorError)

        if (error instanceof AstCircularDependencyDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCircularDependencyDetectorError to be thrown")
}

/**
 * Asserts typed detector error shape for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 */
async function expectAstCircularDependencyDetectorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE)[keyof typeof AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCircularDependencyDetectorError)

        if (error instanceof AstCircularDependencyDetectorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCircularDependencyDetectorError to be thrown")
}

describe("AstCircularDependencyDetectorService", () => {
    test("detects circular dependencies with deterministic sorting and summary", async () => {
        const detector = new AstCircularDependencyDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b")],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./c")],
                }),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./a")],
                }),
                createParsedFile("src/d.ts", {
                    imports: [createImport("./e")],
                }),
                createParsedFile("src/e.ts", {
                    imports: [createImport("./d")],
                }),
                createParsedFile("src/f.ts", {
                    imports: [createImport("./g")],
                }),
                createParsedFile("src/g.ts"),
            ],
        })

        expect(result.cycles).toEqual([
            {
                id: "src/a.ts|src/b.ts|src/c.ts",
                severity: AST_CIRCULAR_DEPENDENCY_SEVERITY.MEDIUM,
                filePaths: ["src/a.ts", "src/b.ts", "src/c.ts"],
                cycleSize: 3,
                internalEdgeCount: 3,
            },
            {
                id: "src/d.ts|src/e.ts",
                severity: AST_CIRCULAR_DEPENDENCY_SEVERITY.LOW,
                filePaths: ["src/d.ts", "src/e.ts"],
                cycleSize: 2,
                internalEdgeCount: 2,
            },
        ])
        expect(result.summary).toEqual({
            scannedFileCount: 7,
            nodeCount: 7,
            cycleCount: 2,
            longestCycleSize: 3,
            truncated: false,
            truncatedCycleCount: 0,
            bySeverity: {
                LOW: 1,
                MEDIUM: 1,
                HIGH: 0,
            },
        })
    })

    test("applies file-path filter and max cycle truncation", async () => {
        const detector = new AstCircularDependencyDetectorService()
        const result = await detector.detect({
            files: [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b")],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./c")],
                }),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./a")],
                }),
                createParsedFile("src/d.ts", {
                    imports: [createImport("./e")],
                }),
                createParsedFile("src/e.ts", {
                    imports: [createImport("./d")],
                }),
                createParsedFile("src/x.ts", {
                    imports: [createImport("./a")],
                }),
            ],
            filePaths: [
                "src/a.ts",
                "src/b.ts",
                "src/c.ts",
                "src/d.ts",
                "src/e.ts",
            ],
            maxCycles: 1,
        })

        expect(result.cycles).toEqual([
            {
                id: "src/a.ts|src/b.ts|src/c.ts",
                severity: AST_CIRCULAR_DEPENDENCY_SEVERITY.MEDIUM,
                filePaths: ["src/a.ts", "src/b.ts", "src/c.ts"],
                cycleSize: 3,
                internalEdgeCount: 3,
            },
        ])
        expect(result.summary).toEqual({
            scannedFileCount: 5,
            nodeCount: 5,
            cycleCount: 1,
            longestCycleSize: 3,
            truncated: true,
            truncatedCycleCount: 1,
            bySeverity: {
                LOW: 0,
                MEDIUM: 1,
                HIGH: 0,
            },
        })
    })

    test("throws typed errors for invalid options", async () => {
        expectAstCircularDependencyDetectorError(
            () => {
                void new AstCircularDependencyDetectorService({
                    defaultMinimumCycleSize: 1,
                })
            },
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CYCLE_SIZE,
        )

        expectAstCircularDependencyDetectorError(
            () => {
                void new AstCircularDependencyDetectorService({
                    defaultMaxCycles: 0,
                })
            },
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MAX_CYCLES,
        )

        const detector = new AstCircularDependencyDetectorService()

        await expectAstCircularDependencyDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: [],
                }),
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstCircularDependencyDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: ["   "],
                }),
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstCircularDependencyDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    minimumCycleSize: 1,
                }),
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CYCLE_SIZE,
        )

        await expectAstCircularDependencyDetectorErrorAsync(
            async () =>
                detector.detect({
                    files: [createParsedFile("src/a.ts")],
                    maxCycles: 0,
                }),
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MAX_CYCLES,
        )
    })
})
