import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type IAstClassDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE,
    AST_SEMANTIC_MODULE_ROLE,
    AstSemanticCodeUnderstandingError,
    AstSemanticCodeUnderstandingService,
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
 * @returns Import DTO.
 */
function createImport(source: string): IAstImportDTO {
    return {
        source,
        kind: AST_IMPORT_KIND.STATIC,
        specifiers: [],
        typeOnly: false,
        location: createLocation(),
    }
}

/**
 * Creates class fixture.
 *
 * @param name Class name.
 * @returns Class DTO.
 */
function createClass(name: string): IAstClassDTO {
    return {
        name,
        exported: true,
        extendsTypes: [],
        implementsTypes: [],
        location: createLocation(),
    }
}

/**
 * Creates function fixture.
 *
 * @param name Function name.
 * @returns Function DTO.
 */
function createFunction(name: string): IAstFunctionDTO {
    return {
        name,
        kind: AST_FUNCTION_KIND.FUNCTION,
        exported: true,
        async: false,
        location: createLocation(),
    }
}

/**
 * Creates parsed file fixture.
 *
 * @param filePath Repository-relative file path.
 * @param overrides Field overrides.
 * @returns Parsed file DTO.
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
 * Asserts typed semantic-understanding error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstSemanticCodeUnderstandingError(
    callback: () => unknown,
    code:
        (typeof AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE)[keyof typeof AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstSemanticCodeUnderstandingError)

        if (error instanceof AstSemanticCodeUnderstandingError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstSemanticCodeUnderstandingError to be thrown")
}

describe("AstSemanticCodeUnderstandingService", () => {
    test("classifies modules by semantic role with deterministic confidence", async () => {
        const service = new AstSemanticCodeUnderstandingService()
        const result = await service.understand([
            createParsedFile("src/domain/review.entity.ts", {
                classes: [createClass("ReviewEntity")],
                functions: [createFunction("validateInvariants")],
            }),
            createParsedFile("src/adapters/github-provider.ts", {
                imports: [
                    createImport("@octokit/rest"),
                    createImport("axios"),
                ],
                classes: [createClass("GitHubProvider")],
            }),
            createParsedFile("src/utils/math.ts", {
                functions: [
                    createFunction("sum"),
                    createFunction("average"),
                    createFunction("median"),
                ],
            }),
        ])

        expect(result.modules).toHaveLength(3)
        expect(result.modules[0]?.filePath).toBe("src/adapters/github-provider.ts")
        expect(result.modules[0]?.primaryRole).toBe(AST_SEMANTIC_MODULE_ROLE.INFRASTRUCTURE_ADAPTER)
        expect(result.modules[1]?.primaryRole).toBe(AST_SEMANTIC_MODULE_ROLE.DOMAIN_MODEL)
        expect(result.modules[2]?.primaryRole).toBe(AST_SEMANTIC_MODULE_ROLE.UTILITY_MODULE)
        expect(result.summary.roleCounts.INFRASTRUCTURE_ADAPTER).toBe(1)
        expect(result.summary.roleCounts.DOMAIN_MODEL).toBe(1)
        expect(result.summary.roleCounts.UTILITY_MODULE).toBe(1)
    })

    test("detects test modules by file path semantics", async () => {
        const service = new AstSemanticCodeUnderstandingService()
        const result = await service.understand([
            createParsedFile("tests/ast/example.test.ts", {
                functions: [createFunction("itWorks")],
            }),
        ])

        expect(result.modules[0]?.primaryRole).toBe(AST_SEMANTIC_MODULE_ROLE.TEST_MODULE)
        expect(result.modules[0]?.confidence).toBeGreaterThanOrEqual(0.5)
    })

    test("respects file-path filter for batch semantic analysis", async () => {
        const service = new AstSemanticCodeUnderstandingService()
        const result = await service.understand(
            [
                createParsedFile("src/domain/entity.ts", {
                    classes: [createClass("Entity")],
                }),
                createParsedFile("src/utils/math.ts", {
                    functions: [
                        createFunction("sum"),
                        createFunction("avg"),
                        createFunction("median"),
                    ],
                }),
            ],
            {
                filePaths: ["src/utils/math.ts"],
            },
        )

        expect(result.modules).toHaveLength(1)
        expect(result.modules[0]?.filePath).toBe("src/utils/math.ts")
    })

    test("returns unknown role when confidence is below configured threshold", async () => {
        const service = new AstSemanticCodeUnderstandingService({
            defaultMinimumConfidence: 0.9,
        })
        const result = await service.understand([
            createParsedFile("src/misc/unknown.ts", {
                functions: [createFunction("run")],
            }),
        ])

        expect(result.modules[0]?.primaryRole).toBe(AST_SEMANTIC_MODULE_ROLE.UNKNOWN)
    })

    test("throws typed error for invalid confidence threshold", () => {
        expectAstSemanticCodeUnderstandingError(
            () => {
                void new AstSemanticCodeUnderstandingService({
                    defaultMinimumConfidence: 1.5,
                })
            },
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.INVALID_MINIMUM_CONFIDENCE,
        )
    })

    test("throws typed error for invalid file path filter", () => {
        const service = new AstSemanticCodeUnderstandingService()

        expectAstSemanticCodeUnderstandingError(
            () => {
                void service.understand([createParsedFile("src/a.ts")], {
                    filePaths: ["   "],
                })
            },
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.INVALID_FILE_PATH,
        )
    })

    test("throws typed error for empty file collection", () => {
        const service = new AstSemanticCodeUnderstandingService()

        expectAstSemanticCodeUnderstandingError(
            () => {
                void service.understand([])
            },
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.EMPTY_FILES,
        )
    })
})
