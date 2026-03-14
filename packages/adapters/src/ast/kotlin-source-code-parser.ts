import {existsSync} from "node:fs"
import {createRequire} from "node:module"
import path from "node:path"

import Parser from "tree-sitter"

import {
    AST_FUNCTION_KIND,
    AST_IMPORT_KIND,
    AST_LANGUAGE,
    type IAstCallDTO,
    type IAstClassDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type IAstInterfaceDTO,
    type IAstSourceLocationDTO,
    type IParsedSourceFileDTO,
    type ISourceCodeParseRequest,
    type ISourceCodeParser,
    type SupportedLanguage,
} from "@codenautic/core"

import {AST_PARSER_ERROR_CODE, AstParserError} from "./ast-parser.error"

/**
 * Supported kotlin parser language variants.
 */
export type KotlinParserLanguage = typeof AST_LANGUAGE.KOTLIN

/**
 * Construction options for kotlin source parser.
 */
export interface IKotlinSourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: KotlinParserLanguage
}

interface IKotlinTraversalContext {
    readonly className?: string
    readonly functionName?: string
}

interface IKotlinParsedState {
    readonly imports: IAstImportDTO[]
    readonly interfaces: IAstInterfaceDTO[]
    readonly classes: IAstClassDTO[]
    readonly functions: IAstFunctionDTO[]
    readonly calls: IAstCallDTO[]
}

interface ISyntaxNodePosition {
    readonly row: number
    readonly column: number
}

interface ISyntaxNode {
    readonly type: string
    readonly text: string
    readonly namedChildren: readonly ISyntaxNode[]
    readonly parent: ISyntaxNode | null
    readonly hasError: boolean
    readonly startPosition: ISyntaxNodePosition
    readonly endPosition: ISyntaxNodePosition
}

interface IClassInheritance {
    readonly extendsTypes: readonly string[]
    readonly implementsTypes: readonly string[]
}

const requireForKotlin = createRequire(import.meta.url)

const KOTLIN_PACKAGE_NAME = "@tree-sitter-grammars/tree-sitter-kotlin"

const KOTLIN_PREBUILD_FILENAMES = [
    "tree-sitter-kotlin.node",
    "@tree-sitter-grammars+tree-sitter-kotlin.node",
] as const

/**
 * Dedicated tree-sitter parser for kotlin source files.
 */
export class KotlinSourceCodeParser implements ISourceCodeParser {
    public readonly language: KotlinParserLanguage

    private readonly parser: Parser

    /**
     * Creates parser for kotlin source files.
     *
     * @param options Canonical kotlin language variant.
     */
    public constructor(options: IKotlinSourceCodeParserOptions) {
        this.language = options.language
        this.parser = new Parser()
        this.parser.setLanguage(resolveKotlinGrammar(options.language))
    }

    /**
     * Parses one kotlin source file into deterministic AST DTOs.
     *
     * @param request Parse request payload.
     * @returns Parsed source-file snapshot.
     * @throws {AstParserError} When request payload is invalid or parser fails.
     */
    public parse(request: ISourceCodeParseRequest): Promise<IParsedSourceFileDTO> {
        const normalizedRequest = normalizeParseRequest(request)

        try {
            const rootNode = this.parser.parse(normalizedRequest.content).rootNode as unknown as ISyntaxNode
            const state = createParsedState()
            this.traverse(rootNode, state, {})

            return Promise.resolve({
                filePath: normalizedRequest.filePath,
                language: this.language,
                hasSyntaxErrors: rootNode.hasError,
                imports: state.imports,
                typeAliases: [],
                interfaces: state.interfaces,
                enums: [],
                classes: state.classes,
                functions: state.functions,
                calls: state.calls,
            })
        } catch (error) {
            throw new AstParserError(resolveParserFailureMessage(error), {
                code: AST_PARSER_ERROR_CODE.PARSE_FAILED,
                filePath: normalizedRequest.filePath,
            })
        }
    }

    /**
     * Recursively walks kotlin AST and collects normalized entities.
     *
     * @param node Current syntax node.
     * @param state Mutable parse state.
     * @param context Parent traversal context.
     */
    private traverse(node: ISyntaxNode, state: IKotlinParsedState, context: IKotlinTraversalContext): void {
        const importEntry = collectImport(node)
        if (importEntry !== null) {
            state.imports.push(importEntry)
        }

        let nextContext = context

        const interfaceEntry = collectInterface(node)
        if (interfaceEntry !== null) {
            state.interfaces.push(interfaceEntry)
            nextContext = {
                ...nextContext,
                className: interfaceEntry.name,
            }
        }

        const classEntry = collectClass(node)
        if (classEntry !== null) {
            state.classes.push(classEntry)
            nextContext = {
                ...nextContext,
                className: classEntry.name,
            }
        }

        const functionEntry = collectFunction(node, nextContext)
        if (functionEntry !== null) {
            state.functions.push(functionEntry)
            nextContext = {
                ...nextContext,
                functionName: functionEntry.name,
            }
        }

        const callEntry = collectCall(node, nextContext)
        if (callEntry !== null) {
            state.calls.push(callEntry)
        }

        for (const childNode of node.namedChildren) {
            this.traverse(childNode, state, nextContext)
        }
    }
}

/**
 * Resolves tree-sitter grammar module for kotlin language variant.
 *
 * @param _language Canonical kotlin language.
 * @returns Tree-sitter grammar module.
 */
function resolveKotlinGrammar(_language: KotlinParserLanguage): Parser.Language {
    const directGrammar = tryLoadKotlinGrammarFromPackageEntry()
    if (directGrammar !== undefined) {
        return directGrammar
    }

    const packageRoot = resolveKotlinPackageRoot()
    const prebuildDirectory = path.join(packageRoot, "prebuilds", `${process.platform}-${process.arch}`)
    return loadKotlinGrammarFromPrebuild(prebuildDirectory)
}

/**
 * Attempts to load kotlin grammar from package root entrypoint.
 *
 * @returns Loaded grammar or `undefined`.
 */
function tryLoadKotlinGrammarFromPackageEntry(): Parser.Language | undefined {
    try {
        return requireForKotlin(KOTLIN_PACKAGE_NAME) as Parser.Language
    } catch {
        return undefined
    }
}

/**
 * Resolves installed kotlin grammar package root path.
 *
 * @returns Absolute package directory path.
 */
function resolveKotlinPackageRoot(): string {
    const packageJsonPath = requireForKotlin.resolve(`${KOTLIN_PACKAGE_NAME}/package.json`)
    return path.dirname(packageJsonPath)
}

/**
 * Loads kotlin grammar from platform-specific prebuild directory.
 *
 * @param prebuildDirectory Absolute prebuild directory path.
 * @returns Loaded grammar object.
 * @throws Error When no compatible prebuild could be loaded.
 */
function loadKotlinGrammarFromPrebuild(prebuildDirectory: string): Parser.Language {
    for (const prebuildFilename of KOTLIN_PREBUILD_FILENAMES) {
        const prebuildPath = path.join(prebuildDirectory, prebuildFilename)
        if (!existsSync(prebuildPath)) {
            continue
        }

        try {
            return requireForKotlin(prebuildPath) as Parser.Language
        } catch {
            continue
        }
    }

    throw new Error(
        `Unable to load kotlin tree-sitter grammar prebuild for ${process.platform}-${process.arch}`,
    )
}

/**
 * Narrows supported language to kotlin variant.
 *
 * @param language Canonical supported language.
 * @returns Kotlin language variant.
 * @throws Error When language is not kotlin.
 */
export function assertKotlinParserLanguage(language: SupportedLanguage): KotlinParserLanguage {
    if (language === AST_LANGUAGE.KOTLIN) {
        return language
    }

    throw new Error(`Unsupported Kotlin parser language: ${language}`)
}

/**
 * Creates empty mutable parse-state collections.
 *
 * @returns Initialized parse state.
 */
function createParsedState(): IKotlinParsedState {
    return {
        imports: [],
        interfaces: [],
        classes: [],
        functions: [],
        calls: [],
    }
}

/**
 * Validates parse request payload.
 *
 * @param request Raw parse request.
 * @returns Normalized request.
 * @throws {AstParserError} When request payload is invalid.
 */
function normalizeParseRequest(request: ISourceCodeParseRequest): ISourceCodeParseRequest {
    const filePath = request.filePath.trim()
    if (filePath.length === 0) {
        throw new AstParserError("Source-code parser requires non-empty filePath", {
            code: AST_PARSER_ERROR_CODE.INVALID_FILE_PATH,
        })
    }

    if (typeof request.content !== "string") {
        throw new AstParserError("Source-code parser requires string content", {
            code: AST_PARSER_ERROR_CODE.INVALID_SOURCE_CONTENT,
            filePath,
        })
    }

    return {
        filePath,
        content: request.content,
    }
}

/**
 * Collects kotlin import declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized import DTO or `null`.
 */
function collectImport(node: ISyntaxNode): IAstImportDTO | null {
    if (node.type !== "import") {
        return null
    }

    const source = readNodeText(findFirstNamedChild(node, ["qualified_identifier"]))
    if (source === undefined) {
        return null
    }

    return {
        source,
        kind: AST_IMPORT_KIND.STATIC,
        specifiers: resolveImportSpecifiers(node, source),
        typeOnly: false,
        location: createSourceLocation(node),
    }
}

/**
 * Collects kotlin interface declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized interface DTO or `null`.
 */
function collectInterface(node: ISyntaxNode): IAstInterfaceDTO | null {
    if (!isKotlinInterfaceDeclaration(node)) {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: isKotlinDeclarationExported(node),
        extendsTypes: collectDelegationTypes(findFirstNamedChild(node, ["delegation_specifiers"])),
        location: createSourceLocation(node),
    }
}

/**
 * Collects kotlin class declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized class DTO or `null`.
 */
function collectClass(node: ISyntaxNode): IAstClassDTO | null {
    if (!isKotlinClassDeclaration(node)) {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    const inheritance = collectClassInheritance(findFirstNamedChild(node, ["delegation_specifiers"]))
    return {
        name,
        exported: isKotlinDeclarationExported(node),
        extendsTypes: inheritance.extendsTypes,
        implementsTypes: inheritance.implementsTypes,
        location: createSourceLocation(node),
    }
}

/**
 * Collects kotlin function declarations.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized function DTO or `null`.
 */
function collectFunction(
    node: ISyntaxNode,
    context: IKotlinTraversalContext,
): IAstFunctionDTO | null {
    if (node.type !== "function_declaration") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    const isMethod = context.className !== undefined
    return {
        name,
        kind: isMethod ? AST_FUNCTION_KIND.METHOD : AST_FUNCTION_KIND.FUNCTION,
        exported: isKotlinDeclarationExported(node),
        async: false,
        ...(isMethod ? {parentClassName: context.className} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Collects kotlin call expressions.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized call DTO or `null`.
 */
function collectCall(node: ISyntaxNode, context: IKotlinTraversalContext): IAstCallDTO | null {
    if (node.type !== "call_expression") {
        return null
    }

    const callee = resolveCallCallee(node)
    if (callee === undefined) {
        return null
    }

    return {
        callee,
        ...(context.functionName !== undefined ? {caller: context.functionName} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Resolves local import specifiers from kotlin import declaration.
 *
 * @param node Kotlin import node.
 * @param source Fully qualified import source.
 * @returns Imported local specifier names.
 */
function resolveImportSpecifiers(node: ISyntaxNode, source: string): readonly string[] {
    const aliasName = readNodeText(findNamedChildren(node, ["identifier"]).at(-1))
    if (aliasName !== undefined) {
        const sourceLastSegment = source.split(".").at(-1)
        if (sourceLastSegment !== aliasName) {
            return [aliasName]
        }
    }

    const importedName = source.split(".").at(-1)
    if (importedName === undefined || importedName.length === 0) {
        return []
    }

    return [importedName]
}

/**
 * Resolves whether class declaration node represents kotlin interface.
 *
 * @param node Candidate class declaration node.
 * @returns `true` when declaration starts with interface keyword.
 */
function isKotlinInterfaceDeclaration(node: ISyntaxNode): boolean {
    return node.type === "class_declaration" && /^\s*interface\b/u.test(node.text)
}

/**
 * Resolves whether class declaration node represents kotlin class.
 *
 * @param node Candidate class declaration node.
 * @returns `true` when declaration is non-interface class.
 */
function isKotlinClassDeclaration(node: ISyntaxNode): boolean {
    if (node.type !== "class_declaration") {
        return false
    }

    return !isKotlinInterfaceDeclaration(node)
}

/**
 * Resolves kotlin declaration visibility for top-level parser contract.
 *
 * @param node Kotlin declaration node.
 * @returns `true` when declaration is publicly visible.
 */
function isKotlinDeclarationExported(node: ISyntaxNode): boolean {
    const modifiersNode = findFirstNamedChild(node, ["modifiers"])
    if (modifiersNode === undefined) {
        return true
    }

    const hiddenModifier = findFirstNamedChild(modifiersNode, [
        "visibility_modifier",
        "inheritance_modifier",
        "member_modifier",
    ])
    if (hiddenModifier === undefined) {
        return true
    }

    const modifierText = hiddenModifier.text.trim()
    if (modifierText === "private" || modifierText === "internal") {
        return false
    }

    return true
}

/**
 * Collects ordered delegation types from kotlin delegation specifier list.
 *
 * @param node Delegation-specifiers node.
 * @returns Ordered delegation type names.
 */
function collectDelegationTypes(node: ISyntaxNode | undefined): readonly string[] {
    if (node === undefined) {
        return []
    }

    const delegationTypes: string[] = []
    const delegationSpecifiers = findNamedChildren(node, ["delegation_specifier"])
    for (const delegationSpecifier of delegationSpecifiers) {
        const delegationType = resolveDelegationSpecifierType(delegationSpecifier)
        pushUnique(delegationTypes, delegationType)
    }

    return delegationTypes
}

/**
 * Splits kotlin class inheritance into extends and implements groups.
 *
 * @param node Delegation-specifiers node.
 * @returns Class inheritance payload.
 */
function collectClassInheritance(node: ISyntaxNode | undefined): IClassInheritance {
    if (node === undefined) {
        return {
            extendsTypes: [],
            implementsTypes: [],
        }
    }

    const extendsTypes: string[] = []
    const implementsTypes: string[] = []

    const delegationSpecifiers = findNamedChildren(node, ["delegation_specifier"])
    for (const delegationSpecifier of delegationSpecifiers) {
        const delegationType = resolveDelegationSpecifierType(delegationSpecifier)
        if (delegationType === undefined) {
            continue
        }

        if (containsConstructorInvocation(delegationSpecifier) && extendsTypes.length === 0) {
            extendsTypes.push(delegationType)
            continue
        }

        if (extendsTypes.length === 0 && looksLikeInterfaceName(delegationType)) {
            implementsTypes.push(delegationType)
            continue
        }

        if (extendsTypes.length === 0) {
            extendsTypes.push(delegationType)
            continue
        }

        pushUnique(implementsTypes, delegationType)
    }

    return {
        extendsTypes,
        implementsTypes,
    }
}

/**
 * Resolves type name from one kotlin delegation specifier.
 *
 * @param node Delegation-specifier node.
 * @returns Type name or `undefined`.
 */
function resolveDelegationSpecifierType(node: ISyntaxNode): string | undefined {
    const constructorInvocation = findFirstNamedChild(node, ["constructor_invocation"])
    if (constructorInvocation !== undefined) {
        return readNodeText(findFirstNamedChild(constructorInvocation, ["user_type", "identifier"]))
    }

    const userTypeNode = findFirstNamedChild(node, ["user_type", "identifier", "qualified_identifier"])
    return readNodeText(userTypeNode)
}

/**
 * Resolves whether delegation specifier contains constructor invocation.
 *
 * @param node Delegation-specifier node.
 * @returns `true` when specifier references constructor call.
 */
function containsConstructorInvocation(node: ISyntaxNode): boolean {
    return findFirstNamedChild(node, ["constructor_invocation"]) !== undefined
}

/**
 * Resolves whether one type name follows common kotlin interface naming convention.
 *
 * @param typeName Candidate type name.
 * @returns `true` when type looks like interface name.
 */
function looksLikeInterfaceName(typeName: string): boolean {
    return /^I[A-Z]/u.test(typeName)
}

/**
 * Resolves callee text from kotlin call expression.
 *
 * @param node Kotlin call expression node.
 * @returns Callee text or `undefined`.
 */
function resolveCallCallee(node: ISyntaxNode): string | undefined {
    const calleeNode = findFirstNamedChild(node, [
        "navigation_expression",
        "identifier",
        "qualified_identifier",
    ])
    return readNodeText(calleeNode)
}

/**
 * Pushes string value to array only when non-empty and unique.
 *
 * @param target Target mutable array.
 * @param value Candidate value.
 */
function pushUnique(target: string[], value: string | undefined): void {
    if (value === undefined || value.length === 0 || target.includes(value)) {
        return
    }

    target.push(value)
}

/**
 * Builds 1-based source location from tree-sitter node.
 *
 * @param node Syntax node.
 * @returns Normalized source location.
 */
function createSourceLocation(node: ISyntaxNode): IAstSourceLocationDTO {
    return {
        lineStart: node.startPosition.row + 1,
        lineEnd: node.endPosition.row + 1,
        columnStart: node.startPosition.column + 1,
        columnEnd: node.endPosition.column + 1,
    }
}

/**
 * Finds first direct named child with one of expected node types.
 *
 * @param node Parent syntax node.
 * @param nodeTypes Candidate node types.
 * @returns Matching child or `undefined`.
 */
function findFirstNamedChild(
    node: ISyntaxNode | undefined,
    nodeTypes: readonly string[],
): ISyntaxNode | undefined {
    if (node === undefined) {
        return undefined
    }

    return node.namedChildren.find((child): boolean => {
        return nodeTypes.includes(child.type)
    })
}

/**
 * Finds all direct named children matching one of candidate node types.
 *
 * @param node Parent syntax node.
 * @param nodeTypes Candidate node types.
 * @returns Ordered matching children.
 */
function findNamedChildren(node: ISyntaxNode, nodeTypes: readonly string[]): readonly ISyntaxNode[] {
    return node.namedChildren.filter((child): boolean => {
        return nodeTypes.includes(child.type)
    })
}

/**
 * Reads trimmed syntax-node text.
 *
 * @param node Syntax node.
 * @returns Trimmed text or `undefined`.
 */
function readNodeText(node: ISyntaxNode | undefined): string | undefined {
    if (node === undefined) {
        return undefined
    }

    const trimmed = node.text.trim()
    if (trimmed.length === 0) {
        return undefined
    }

    return trimmed
}

/**
 * Resolves human-readable parser failure message.
 *
 * @param error Unknown thrown value.
 * @returns Stable error message.
 */
function resolveParserFailureMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown parser failure"
}
