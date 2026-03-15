import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type IAstCallDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE,
    AstFunctionCallChainBuilderError,
    AstFunctionCallChainBuilderService,
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
 * Creates import statement fixture.
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
 * Creates function declaration fixture.
 *
 * @param name Function name.
 * @param overrides Optional declaration overrides.
 * @returns Function DTO.
 */
function createFunction(
    name: string,
    overrides: Partial<IAstFunctionDTO> = {},
): IAstFunctionDTO {
    return {
        name,
        kind: overrides.kind ?? AST_FUNCTION_KIND.FUNCTION,
        exported: overrides.exported ?? true,
        async: overrides.async ?? false,
        parentClassName: overrides.parentClassName,
        location: overrides.location ?? createLocation(),
    }
}

/**
 * Creates call expression fixture.
 *
 * @param caller Caller function name.
 * @param callee Callee expression.
 * @returns Call DTO.
 */
function createCall(caller: string, callee: string): IAstCallDTO {
    return {
        caller,
        callee,
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
 * Asserts typed function call chain builder error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectFunctionCallChainBuilderError(
    callback: () => unknown,
    code:
        (typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE)[keyof typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstFunctionCallChainBuilderError)

        if (error instanceof AstFunctionCallChainBuilderError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstFunctionCallChainBuilderError to be thrown")
}

/**
 * Asserts typed function call chain builder error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectFunctionCallChainBuilderErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE)[keyof typeof AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstFunctionCallChainBuilderError)

        if (error instanceof AstFunctionCallChainBuilderError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstFunctionCallChainBuilderError to be thrown")
}

/**
 * Converts chain nodes to compact deterministic path string.
 *
 * @param result Build result.
 * @returns Compact chain paths.
 */
function createChainPaths(
    result: Awaited<ReturnType<AstFunctionCallChainBuilderService["build"]>>,
): readonly string[] {
    return result.chains.map((chain) => {
        return chain.nodes
            .map((node) => `${node.filePath}:${node.functionName}`)
            .join("->")
    })
}

describe("AstFunctionCallChainBuilderService", () => {
    test("builds caller to callee to callee chain through imported files", async () => {
        const service = new AstFunctionCallChainBuilderService()
        const result = await service.build({
            files: [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b")],
                    functions: [createFunction("entry")],
                    calls: [createCall("entry", "prepare")],
                }),
                createParsedFile("src/b.ts", {
                    imports: [createImport("./c")],
                    functions: [createFunction("prepare")],
                    calls: [createCall("prepare", "normalize")],
                }),
                createParsedFile("src/c.ts", {
                    functions: [createFunction("normalize")],
                }),
            ],
            filePaths: ["src/a.ts"],
        })

        expect(createChainPaths(result)).toEqual([
            "src/a.ts:entry->src/b.ts:prepare->src/c.ts:normalize",
        ])
        expect(result.summary).toEqual({
            analyzedFileCount: 3,
            startFunctionCount: 1,
            chainCount: 1,
            longestChainDepth: 2,
            truncated: false,
        })
    })

    test("prefers imported callee target when symbol is ambiguous across files", async () => {
        const service = new AstFunctionCallChainBuilderService()
        const result = await service.build({
            files: [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b")],
                    functions: [createFunction("entry")],
                    calls: [createCall("entry", "prepare")],
                }),
                createParsedFile("src/b.ts", {
                    functions: [createFunction("prepare")],
                }),
                createParsedFile("src/c.ts", {
                    functions: [createFunction("prepare")],
                }),
            ],
            filePaths: ["src/a.ts"],
            maxDepth: 1,
        })

        expect(createChainPaths(result)).toEqual([
            "src/a.ts:entry->src/b.ts:prepare",
        ])
    })

    test("respects max depth and max chains cap", async () => {
        const service = new AstFunctionCallChainBuilderService()
        const result = await service.build({
            files: [
                createParsedFile("src/a.ts", {
                    imports: [createImport("./b"), createImport("./c")],
                    functions: [createFunction("entry")],
                    calls: [createCall("entry", "left"), createCall("entry", "right")],
                }),
                createParsedFile("src/b.ts", {
                    functions: [createFunction("left")],
                }),
                createParsedFile("src/c.ts", {
                    functions: [createFunction("right")],
                }),
            ],
            filePaths: ["src/a.ts"],
            maxDepth: 1,
            maxChains: 1,
        })

        expect(result.chains).toHaveLength(1)
        expect(result.summary.truncated).toBe(true)
        expect(result.summary.longestChainDepth).toBe(1)
    })

    test("returns deterministic chains for repeated runs", async () => {
        const files = [
            createParsedFile("src/a.ts", {
                imports: [createImport("./b")],
                functions: [createFunction("entry")],
                calls: [createCall("entry", "prepare")],
            }),
            createParsedFile("src/b.ts", {
                functions: [createFunction("prepare")],
            }),
        ]
        const service = new AstFunctionCallChainBuilderService()
        const first = await service.build({
            files,
        })
        const second = await service.build({
            files,
        })

        expect(second).toEqual(first)
    })

    test("throws typed errors for invalid constructor and runtime input", async () => {
        expectFunctionCallChainBuilderError(
            () => {
                void new AstFunctionCallChainBuilderService({
                    defaultMaxDepth: 0,
                })
            },
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_MAX_DEPTH,
        )

        const service = new AstFunctionCallChainBuilderService()

        await expectFunctionCallChainBuilderErrorAsync(
            async () =>
                service.build({
                    files: [],
                }),
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.EMPTY_FILES,
        )

        await expectFunctionCallChainBuilderErrorAsync(
            async () =>
                service.build({
                    files: [
                        createParsedFile("src/a.ts"),
                        createParsedFile("src/a.ts"),
                    ],
                }),
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH,
        )

        await expectFunctionCallChainBuilderErrorAsync(
            async () =>
                service.build({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: [],
                }),
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectFunctionCallChainBuilderErrorAsync(
            async () =>
                service.build({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: ["  "],
                }),
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectFunctionCallChainBuilderErrorAsync(
            async () =>
                service.build({
                    files: [createParsedFile("src/a.ts")],
                    maxChains: 0,
                }),
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_MAX_CHAINS,
        )
    })
})
