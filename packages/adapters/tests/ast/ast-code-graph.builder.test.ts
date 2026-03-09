import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_LANGUAGE,
    CODE_GRAPH_NODE_TYPE,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_BUILDER_ERROR_CODE,
    AstCodeGraphBuilder,
    AstCodeGraphBuilderError,
} from "../../src/ast"

const FIXED_NOW = new Date("2026-03-10T08:30:00.000Z")

/**
 * Creates parsed source file DTO with deterministic defaults.
 *
 * @param overrides Partial parsed file payload.
 * @returns Parsed source file DTO.
 */
function createParsedSourceFile(
    overrides: Partial<IParsedSourceFileDTO> & Pick<IParsedSourceFileDTO, "filePath">,
): IParsedSourceFileDTO {
    return {
        filePath: overrides.filePath,
        language: overrides.language ?? AST_LANGUAGE.TYPESCRIPT,
        hasSyntaxErrors: overrides.hasSyntaxErrors ?? false,
        imports: overrides.imports ?? [],
        typeAliases: overrides.typeAliases ?? [],
        interfaces: overrides.interfaces ?? [],
        enums: overrides.enums ?? [],
        classes: overrides.classes ?? [],
        functions: overrides.functions ?? [],
        calls: overrides.calls ?? [],
    }
}

/**
 * Asserts typed AST code graph builder error.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstCodeGraphBuilderError(
    callback: () => unknown,
    code: (typeof AST_CODE_GRAPH_BUILDER_ERROR_CODE)[keyof typeof AST_CODE_GRAPH_BUILDER_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstCodeGraphBuilderError)

        if (error instanceof AstCodeGraphBuilderError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstCodeGraphBuilderError to be thrown")
}

describe("AstCodeGraphBuilder", () => {
    test("builds deterministic graph with file, function, class, and type indexes", () => {
        const builder = new AstCodeGraphBuilder({
            nowProvider: () => FIXED_NOW,
        })

        const result = builder.build({
            repositoryId: "gh:repo-1",
            branch: "main",
            files: [
                createParsedSourceFile({
                    filePath: "src/review/helpers.ts",
                    functions: [
                        {
                            name: "formatReview",
                            kind: AST_FUNCTION_KIND.FUNCTION,
                            exported: false,
                            async: false,
                            location: {
                                lineStart: 3,
                                lineEnd: 5,
                                columnStart: 1,
                                columnEnd: 2,
                            },
                        },
                    ],
                }),
                createParsedSourceFile({
                    filePath: "src/review/service.ts",
                    imports: [
                        {
                            source: "./helpers",
                            kind: "static",
                            specifiers: ["formatReview"],
                            typeOnly: false,
                            location: {
                                lineStart: 1,
                                lineEnd: 1,
                                columnStart: 1,
                                columnEnd: 40,
                            },
                        },
                    ],
                    typeAliases: [
                        {
                            name: "ReviewOutput",
                            exported: true,
                            location: {
                                lineStart: 3,
                                lineEnd: 3,
                                columnStart: 1,
                                columnEnd: 34,
                            },
                        },
                    ],
                    interfaces: [
                        {
                            name: "ReviewContract",
                            exported: true,
                            extendsTypes: ["Disposable"],
                            location: {
                                lineStart: 5,
                                lineEnd: 5,
                                columnStart: 1,
                                columnEnd: 45,
                            },
                        },
                    ],
                    enums: [
                        {
                            name: "ReviewMode",
                            exported: true,
                            members: ["FAST", "SAFE"],
                            location: {
                                lineStart: 7,
                                lineEnd: 7,
                                columnStart: 1,
                                columnEnd: 31,
                            },
                        },
                    ],
                    classes: [
                        {
                            name: "ReviewService",
                            exported: true,
                            extendsTypes: ["BaseService"],
                            implementsTypes: ["ReviewContract"],
                            location: {
                                lineStart: 9,
                                lineEnd: 18,
                                columnStart: 1,
                                columnEnd: 2,
                            },
                        },
                    ],
                    functions: [
                        {
                            name: "run",
                            kind: AST_FUNCTION_KIND.METHOD,
                            exported: false,
                            async: false,
                            parentClassName: "ReviewService",
                            location: {
                                lineStart: 11,
                                lineEnd: 14,
                                columnStart: 5,
                                columnEnd: 6,
                            },
                        },
                        {
                            name: "bootstrap",
                            kind: AST_FUNCTION_KIND.FUNCTION,
                            exported: true,
                            async: true,
                            location: {
                                lineStart: 20,
                                lineEnd: 20,
                                columnStart: 1,
                                columnEnd: 44,
                            },
                        },
                    ],
                }),
            ],
        })

        expect(result.graph.id).toBe("gh:repo-1@main")
        expect(result.graph.generatedAt).toEqual(FIXED_NOW)
        expect(result.graph.edges).toEqual([])
        expect(result.graph.nodes).toHaveLength(9)
        expect(result.graph.nodes.map((node) => node.id)).toEqual(
            [...result.graph.nodes.map((node) => node.id)].sort((left, right) =>
                left.localeCompare(right),
            ),
        )

        expect(Array.from(result.fileNodes.keys())).toEqual([
            "src/review/helpers.ts",
            "src/review/service.ts",
        ])
        expect(result.fileNodes.get("src/review/service.ts")).toEqual({
            id: "file:src/review/service.ts",
            type: CODE_GRAPH_NODE_TYPE.FILE,
            name: "service.ts",
            filePath: "src/review/service.ts",
            metadata: {
                language: AST_LANGUAGE.TYPESCRIPT,
                hasSyntaxErrors: false,
                importCount: 1,
                functionCount: 2,
                classCount: 1,
                typeCount: 3,
            },
        })

        expect(result.functionNodes.get("bootstrap")?.map((node) => node.id)).toEqual([
            "function:src/review/service.ts:global:bootstrap:20",
        ])
        expect(result.functionNodes.get("run")?.map((node) => node.id)).toEqual([
            "function:src/review/service.ts:ReviewService:run:11",
        ])
        expect(result.functionNodes.get("ReviewService.run")?.map((node) => node.id)).toEqual([
            "function:src/review/service.ts:ReviewService:run:11",
        ])

        expect(result.typeNodes.get("ReviewService")?.map((node) => node.type)).toEqual([
            CODE_GRAPH_NODE_TYPE.CLASS,
        ])
        expect(result.typeNodes.get("ReviewOutput")?.map((node) => node.id)).toEqual([
            "type:src/review/service.ts:type-alias:ReviewOutput:3",
        ])
        expect(result.typeNodes.get("ReviewContract")?.map((node) => node.id)).toEqual([
            "type:src/review/service.ts:interface:ReviewContract:5",
        ])
        expect(result.typeNodes.get("ReviewMode")?.map((node) => node.id)).toEqual([
            "type:src/review/service.ts:enum:ReviewMode:7",
        ])
    })

    test("uses default branch label and empty indexes when branch is blank", () => {
        const builder = new AstCodeGraphBuilder({
            nowProvider: () => FIXED_NOW,
        })

        const result = builder.build({
            repositoryId: "gh:repo-1",
            branch: "   ",
            files: [],
        })

        expect(result.graph.id).toBe("gh:repo-1@default")
        expect(result.graph.generatedAt).toEqual(FIXED_NOW)
        expect(result.graph.nodes).toEqual([])
        expect(result.graph.edges).toEqual([])
        expect(result.fileNodes.size).toBe(0)
        expect(result.functionNodes.size).toBe(0)
        expect(result.typeNodes.size).toBe(0)
    })

    test("throws typed error for invalid repository identifiers", () => {
        const builder = new AstCodeGraphBuilder()

        expectAstCodeGraphBuilderError(
            () =>
                builder.build({
                    repositoryId: "repo-1",
                    branch: "main",
                    files: [],
                }),
            AST_CODE_GRAPH_BUILDER_ERROR_CODE.INVALID_REPOSITORY_ID,
        )
        expect(() =>
            builder.build({
                repositoryId: "repo-1",
                branch: "main",
                files: [],
            }),
        ).toThrow("Invalid repository id for AST code graph builder: repo-1")
    })

    test("throws typed error for duplicate file paths after normalization", () => {
        const builder = new AstCodeGraphBuilder()

        expectAstCodeGraphBuilderError(
            () =>
                builder.build({
                    repositoryId: "gh:repo-1",
                    branch: "main",
                    files: [
                        createParsedSourceFile({
                            filePath: "src\\review\\service.ts",
                        }),
                        createParsedSourceFile({
                            filePath: "src/review/service.ts",
                        }),
                    ],
                }),
            AST_CODE_GRAPH_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH,
        )
        expect(() =>
            builder.build({
                repositoryId: "gh:repo-1",
                branch: "main",
                files: [
                    createParsedSourceFile({
                        filePath: "src\\review\\service.ts",
                    }),
                    createParsedSourceFile({
                        filePath: "src/review/service.ts",
                    }),
                ],
            }),
        ).toThrow("Duplicate parsed source file path for AST code graph builder: src/review/service.ts")
    })
})
