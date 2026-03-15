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
    AST_CROSS_FILE_ANALYZER_ERROR_CODE,
    AST_IMPORT_EXPORT_EDGE_TYPE,
    AstCrossFileAnalyzerError,
    AstImportExportGraphBuilder,
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
 * Creates import/export statement fixture.
 *
 * @param source Import source.
 * @param kind Statement kind.
 * @param specifiers Statement specifiers.
 * @param typeOnly Type-only flag.
 * @returns Import DTO.
 */
function createImport(
    source: string,
    kind: AstImportKind = AST_IMPORT_KIND.STATIC,
    specifiers: readonly string[] = [],
    typeOnly = false,
): IAstImportDTO {
    return {
        source,
        kind,
        specifiers: [...specifiers],
        typeOnly,
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
 * Asserts typed cross-file analyzer error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstCrossFileAnalyzerError(
    callback: () => unknown,
    code: (typeof AST_CROSS_FILE_ANALYZER_ERROR_CODE)[keyof typeof AST_CROSS_FILE_ANALYZER_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCrossFileAnalyzerError)

        if (error instanceof AstCrossFileAnalyzerError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCrossFileAnalyzerError to be thrown")
}

describe("AstImportExportGraphBuilder", () => {
    test("builds deterministic internal import/export edges with unresolved and external summary", async () => {
        const builder = new AstImportExportGraphBuilder()
        const result = await builder.build([
            createParsedFile("src/lib/index.ts"),
            createParsedFile("src/lib/base.ts"),
            createParsedFile("src/feature/entry.ts", {
                imports: [
                    createImport("../lib"),
                    createImport("../lib/base", AST_IMPORT_KIND.EXPORT_FROM, ["BaseService"]),
                    createImport("./missing"),
                    createImport("react"),
                ],
            }),
        ])

        expect(result.nodes).toEqual([
            "src/feature/entry.ts",
            "src/lib/base.ts",
            "src/lib/index.ts",
        ])
        expect(result.edges.map((edge) => edge.type)).toEqual([
            AST_IMPORT_EXPORT_EDGE_TYPE.IMPORT,
            AST_IMPORT_EXPORT_EDGE_TYPE.EXPORT,
        ])
        expect(result.edges.map((edge) => edge.sourceFilePath)).toEqual([
            "src/feature/entry.ts",
            "src/feature/entry.ts",
        ])
        expect(result.edges.map((edge) => edge.targetFilePath)).toEqual([
            "src/lib/index.ts",
            "src/lib/base.ts",
        ])
        expect(result.edges[0]?.sourceImport).toBe("../lib")
        expect(result.edges[1]?.sourceImport).toBe("../lib/base")
        expect(result.edges[1]?.specifiers).toEqual(["BaseService"])
        expect(result.unresolvedReferences).toHaveLength(1)
        expect(result.unresolvedReferences[0]?.sourceImport).toBe("./missing")
        expect(result.unresolvedReferences[0]?.reason).toBe("RELATIVE_IMPORT_NOT_FOUND")
        expect(result.unresolvedReferences[0]?.candidateFilePaths.length).toBe(24)
        expect(result.edgesBySource.get("src/feature/entry.ts")?.length).toBe(2)
        expect(result.edgesByTarget.get("src/lib/base.ts")?.length).toBe(1)
        expect(result.summary).toEqual({
            scannedFileCount: 3,
            nodeCount: 3,
            edgeCount: 2,
            unresolvedReferenceCount: 1,
            externalReferenceCount: 1,
            byType: {
                IMPORT: 1,
                EXPORT: 1,
            },
        })
    })

    test("applies source file-path batch filter", async () => {
        const builder = new AstImportExportGraphBuilder()
        const result = await builder.build(
            [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b")],
                }),
                createParsedFile("src/b.ts"),
                createParsedFile("src/c.ts", {
                    imports: [createImport("./b")],
                }),
            ],
            {
                filePaths: ["src\\a.ts"],
            },
        )

        expect(result.edges).toHaveLength(1)
        expect(result.edges[0]?.sourceFilePath).toBe("src/a.ts")
        expect(result.summary.scannedFileCount).toBe(1)
        expect(result.summary.edgeCount).toBe(1)
    })

    test("deduplicates duplicate resolved edges and remains deterministic across repeated runs", async () => {
        const builder = new AstImportExportGraphBuilder()
        const files = [
            createParsedFile("src/a.ts", {
                imports: [createImport("./b"), createImport("./b")],
            }),
            createParsedFile("src/b.ts"),
        ]

        const first = await builder.build(files)
        const second = await builder.build(files)

        expect(first.edges).toHaveLength(1)
        expect(second).toEqual(first)
    })

    test("throws typed error for duplicate normalized file paths", () => {
        const builder = new AstImportExportGraphBuilder()

        expectAstCrossFileAnalyzerError(
            () => {
                void builder.build([
                    createParsedFile("src/a.ts"),
                    createParsedFile("src\\a.ts"),
                ])
            },
            AST_CROSS_FILE_ANALYZER_ERROR_CODE.DUPLICATE_FILE_PATH,
        )
    })

    test("throws typed error for invalid filtered file path", () => {
        const builder = new AstImportExportGraphBuilder()

        expectAstCrossFileAnalyzerError(
            () => {
                void builder.build([createParsedFile("src/a.ts")], {
                    filePaths: ["   "],
                })
            },
            AST_CROSS_FILE_ANALYZER_ERROR_CODE.INVALID_FILE_PATH,
        )
    })
})
