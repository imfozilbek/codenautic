import {describe, expect, test} from "bun:test"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type IAstCallDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstSourceLocationDTO,
} from "@codenautic/core"

import {
    AST_FUNCTION_HASH_GENERATOR_ERROR_CODE,
    AstFunctionHashGenerator,
    AstFunctionHashGeneratorError,
    type IAstFunctionHashInput,
} from "../../src/ast"

/**
 * Creates stable source location fixture.
 *
 * @returns Source location.
 */
function createLocation(): IAstSourceLocationDTO {
    return {
        lineStart: 1,
        lineEnd: 10,
        columnStart: 1,
        columnEnd: 20,
    }
}

/**
 * Creates function fixture.
 *
 * @param name Function name.
 * @param kind Function kind.
 * @returns Function fixture.
 */
function createFunction(
    name: string,
    kind: IAstFunctionDTO["kind"] = AST_FUNCTION_KIND.FUNCTION,
): IAstFunctionDTO {
    return {
        name,
        kind,
        exported: true,
        async: false,
        location: createLocation(),
    }
}

/**
 * Creates import fixture.
 *
 * @param source Import source.
 * @returns Import fixture.
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
 * Creates call fixture.
 *
 * @param callee Called symbol.
 * @param caller Optional caller symbol.
 * @returns Call fixture.
 */
function createCall(callee: string, caller?: string): IAstCallDTO {
    return {
        callee,
        caller,
        location: createLocation(),
    }
}

/**
 * Creates hash-input fixture.
 *
 * @param overrides Optional hash-input overrides.
 * @returns Hash input fixture.
 */
function createInput(overrides: Partial<IAstFunctionHashInput> = {}): IAstFunctionHashInput {
    return {
        filePath: "src/review/normalize.ts",
        language: AST_LANGUAGE.TYPESCRIPT,
        function: createFunction("normalizeReview"),
        imports: [
            createImport("zod"),
            createImport("lodash"),
        ],
        calls: [
            createCall("parse", "normalizeReview"),
            createCall("map", "normalizeReview"),
            createCall("ignored", "anotherFunction"),
        ],
        parameterTypes: [
            "ReviewInput",
            "Context",
        ],
        returnType: "NormalizedReview",
        ...overrides,
    }
}

/**
 * Asserts typed function-hash-generator error shape.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstFunctionHashGeneratorError(
    callback: () => unknown,
    code:
        (typeof AST_FUNCTION_HASH_GENERATOR_ERROR_CODE)[keyof typeof AST_FUNCTION_HASH_GENERATOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstFunctionHashGeneratorError)

        if (error instanceof AstFunctionHashGeneratorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstFunctionHashGeneratorError to be thrown")
}

describe("AstFunctionHashGenerator", () => {
    test("generates deterministic function and signature hashes", async () => {
        const generator = new AstFunctionHashGenerator()
        const input = createInput()

        const first = await generator.generateHashes(input)
        const second = await generator.generateHashes(input)

        expect(first).toEqual(second)
        expect(first.functionHash).toHaveLength(64)
        expect(first.signatureHash).toHaveLength(64)
        expect(first.normalizedSignature).toBe("(reviewinput,context)=>normalizedreview")
    })

    test("keeps signature hash stable when body-level features change", async () => {
        const generator = new AstFunctionHashGenerator()
        const baseInput = createInput()
        const changedBodyInput = createInput({
            imports: [createImport("zod")],
            calls: [createCall("safeParse", "normalizeReview")],
        })

        const baseResult = await generator.generateHashes(baseInput)
        const changedBodyResult = await generator.generateHashes(changedBodyInput)

        expect(baseResult.signatureHash).toBe(changedBodyResult.signatureHash)
        expect(baseResult.functionHash).not.toBe(changedBodyResult.functionHash)
    })

    test("normalizes imports calls and signature tokens before hashing", async () => {
        const generator = new AstFunctionHashGenerator()
        const input = createInput({
            imports: [
                createImport("  ZOD "),
                createImport("lodash"),
                createImport("zod"),
            ],
            parameterTypes: [
                " ReviewInput ",
                "Context",
            ],
            returnType: " NORMALIZEDREVIEW ",
        })

        const result = await generator.generateHashes(input)

        expect(result.normalizedSignature).toBe("(reviewinput,context)=>normalizedreview")
        expect(result.normalizedFunctionPayload.includes("imports=lodash,zod")).toBe(true)
    })

    test("throws typed errors for invalid input values", () => {
        const generator = new AstFunctionHashGenerator()

        expectAstFunctionHashGeneratorError(
            () => {
                void generator.generateHashes(createInput({filePath: "   "}))
            },
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        expectAstFunctionHashGeneratorError(
            () => {
                void generator.generateHashes(createInput({function: createFunction("   ")}))
            },
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_FUNCTION_NAME,
        )

        expectAstFunctionHashGeneratorError(
            () => {
                void generator.generateHashes(
                    createInput({
                        parameterTypes: [
                            "ReviewInput",
                            "   ",
                        ],
                    }),
                )
            },
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_PARAMETER_TYPE,
        )

        expectAstFunctionHashGeneratorError(
            () => {
                void generator.generateHashes(
                    createInput({
                        returnType: "   ",
                    }),
                )
            },
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_RETURN_TYPE,
        )
    })
})
