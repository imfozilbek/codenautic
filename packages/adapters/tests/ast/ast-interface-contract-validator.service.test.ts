import {describe, expect, test} from "bun:test"

import {
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type AstImportKind,
    type IAstClassDTO,
    type IAstImportDTO,
    type IAstInterfaceDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_INTERFACE_CONTRACT_ISSUE_TYPE,
    AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE,
    AstInterfaceContractValidatorError,
    AstInterfaceContractValidatorService,
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
 * Creates interface declaration fixture.
 *
 * @param name Interface name.
 * @param extendsTypes Interface extends list.
 * @returns Interface DTO.
 */
function createInterface(
    name: string,
    extendsTypes: readonly string[] = [],
): IAstInterfaceDTO {
    return {
        name,
        exported: true,
        extendsTypes: [...extendsTypes],
        location: createLocation(),
    }
}

/**
 * Creates class declaration fixture.
 *
 * @param name Class name.
 * @param implementsTypes Class implements list.
 * @returns Class DTO.
 */
function createClass(
    name: string,
    implementsTypes: readonly string[] = [],
): IAstClassDTO {
    return {
        name,
        exported: true,
        extendsTypes: [],
        implementsTypes: [...implementsTypes],
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
 * Asserts typed validator error shape for synchronous action.
 *
 * @param callback Action expected to throw.
 * @param code Expected typed error code.
 */
function expectAstInterfaceContractValidatorError(
    callback: () => unknown,
    code:
        (typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE)[keyof typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstInterfaceContractValidatorError)

        if (error instanceof AstInterfaceContractValidatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstInterfaceContractValidatorError to be thrown")
}

/**
 * Asserts typed validator error shape for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected typed error code.
 */
async function expectAstInterfaceContractValidatorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE)[keyof typeof AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstInterfaceContractValidatorError)

        if (error instanceof AstInterfaceContractValidatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstInterfaceContractValidatorError to be thrown")
}

describe("AstInterfaceContractValidatorService", () => {
    test("validates class and interface contracts without issues", async () => {
        const validator = new AstInterfaceContractValidatorService()
        const result = await validator.validate({
            files: [
                createParsedFile("src/contracts/base.ts", {
                    interfaces: [createInterface("IBase")],
                }),
                createParsedFile("src/contracts/service.ts", {
                    imports: [createImport("./base")],
                    interfaces: [createInterface("IService", ["IBase"])],
                }),
                createParsedFile("src/impl/service-impl.ts", {
                    imports: [createImport("../contracts/service")],
                    classes: [createClass("ServiceImpl", ["IService"])],
                }),
            ],
        })

        expect(result.issues).toEqual([])
        expect(result.summary).toEqual({
            scannedFileCount: 3,
            checkedClassCount: 1,
            checkedInterfaceCount: 2,
            issueCount: 0,
            highSeverityCount: 0,
            truncated: false,
            truncatedIssueCount: 0,
            byType: {
                MISSING_IMPLEMENTED_INTERFACE: 0,
                AMBIGUOUS_IMPLEMENTED_INTERFACE: 0,
                DUPLICATE_IMPLEMENTED_INTERFACE: 0,
                MISSING_EXTENDED_INTERFACE: 0,
                AMBIGUOUS_EXTENDED_INTERFACE: 0,
                DUPLICATE_EXTENDED_INTERFACE: 0,
            },
        })
    })

    test("detects missing, ambiguous and duplicate contracts", async () => {
        const validator = new AstInterfaceContractValidatorService()
        const result = await validator.validate({
            files: [
                createParsedFile("src/contracts/shared-a.ts", {
                    interfaces: [createInterface("IShared")],
                }),
                createParsedFile("src/contracts/shared-b.ts", {
                    interfaces: [createInterface("IShared")],
                }),
                createParsedFile("src/contracts/child.ts", {
                    imports: [createImport("./shared-a"), createImport("./shared-b")],
                    interfaces: [
                        createInterface("IChild", ["IMissingBase", "IShared", "IShared"]),
                    ],
                }),
                createParsedFile("src/impl/a.ts", {
                    imports: [
                        createImport("../contracts/shared-a"),
                        createImport("../contracts/shared-b"),
                    ],
                    classes: [createClass("A", ["IMissing", "IShared", "IShared"])],
                }),
            ],
        })

        expect(result.issues).toHaveLength(6)
        expect(result.issues.map((issue) => issue.type)).toEqual([
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.MISSING_IMPLEMENTED_INTERFACE,
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.MISSING_EXTENDED_INTERFACE,
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.AMBIGUOUS_IMPLEMENTED_INTERFACE,
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.AMBIGUOUS_EXTENDED_INTERFACE,
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.DUPLICATE_IMPLEMENTED_INTERFACE,
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.DUPLICATE_EXTENDED_INTERFACE,
        ])
        expect(result.issues[2]?.candidateFilePaths).toEqual([
            "src/contracts/shared-a.ts",
            "src/contracts/shared-b.ts",
        ])
        expect(result.issues[3]?.candidateFilePaths).toEqual([
            "src/contracts/shared-a.ts",
            "src/contracts/shared-b.ts",
        ])
        expect(result.summary).toEqual({
            scannedFileCount: 4,
            checkedClassCount: 1,
            checkedInterfaceCount: 3,
            issueCount: 6,
            highSeverityCount: 2,
            truncated: false,
            truncatedIssueCount: 0,
            byType: {
                MISSING_IMPLEMENTED_INTERFACE: 1,
                AMBIGUOUS_IMPLEMENTED_INTERFACE: 1,
                DUPLICATE_IMPLEMENTED_INTERFACE: 1,
                MISSING_EXTENDED_INTERFACE: 1,
                AMBIGUOUS_EXTENDED_INTERFACE: 1,
                DUPLICATE_EXTENDED_INTERFACE: 1,
            },
        })
    })

    test("applies file path filter and max issue truncation", async () => {
        const validator = new AstInterfaceContractValidatorService()
        const result = await validator.validate({
            files: [
                createParsedFile("src/contracts/shared-a.ts", {
                    interfaces: [createInterface("IShared")],
                }),
                createParsedFile("src/contracts/shared-b.ts", {
                    interfaces: [createInterface("IShared")],
                }),
                createParsedFile("src/impl/a.ts", {
                    imports: [
                        createImport("../contracts/shared-a"),
                        createImport("../contracts/shared-b"),
                    ],
                    classes: [createClass("A", ["IMissing", "IShared", "IShared"])],
                }),
            ],
            filePaths: ["src/impl/a.ts"],
            maxIssues: 2,
        })

        expect(result.issues).toHaveLength(2)
        expect(result.issues[0]?.type).toBe(
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.MISSING_IMPLEMENTED_INTERFACE,
        )
        expect(result.issues[1]?.type).toBe(
            AST_INTERFACE_CONTRACT_ISSUE_TYPE.AMBIGUOUS_IMPLEMENTED_INTERFACE,
        )
        expect(result.summary).toEqual({
            scannedFileCount: 1,
            checkedClassCount: 1,
            checkedInterfaceCount: 0,
            issueCount: 2,
            highSeverityCount: 1,
            truncated: true,
            truncatedIssueCount: 1,
            byType: {
                MISSING_IMPLEMENTED_INTERFACE: 1,
                AMBIGUOUS_IMPLEMENTED_INTERFACE: 1,
                DUPLICATE_IMPLEMENTED_INTERFACE: 0,
                MISSING_EXTENDED_INTERFACE: 0,
                AMBIGUOUS_EXTENDED_INTERFACE: 0,
                DUPLICATE_EXTENDED_INTERFACE: 0,
            },
        })
    })

    test("throws typed errors for invalid options", async () => {
        expectAstInterfaceContractValidatorError(
            () => {
                void new AstInterfaceContractValidatorService({
                    defaultMaxIssues: 0,
                })
            },
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.INVALID_MAX_ISSUES,
        )

        const validator = new AstInterfaceContractValidatorService()

        await expectAstInterfaceContractValidatorErrorAsync(
            async () =>
                validator.validate({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: [],
                }),
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )

        await expectAstInterfaceContractValidatorErrorAsync(
            async () =>
                validator.validate({
                    files: [createParsedFile("src/a.ts")],
                    filePaths: ["   "],
                }),
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstInterfaceContractValidatorErrorAsync(
            async () =>
                validator.validate({
                    files: [createParsedFile("src/a.ts")],
                    maxIssues: 0,
                }),
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.INVALID_MAX_ISSUES,
        )
    })
})
