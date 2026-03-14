import Parser from "tree-sitter"
import Java from "tree-sitter-java"

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
 * Supported java parser language variants.
 */
export type JavaParserLanguage = typeof AST_LANGUAGE.JAVA

/**
 * Construction options for java source parser.
 */
export interface IJavaSourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: JavaParserLanguage
}

interface IJavaTraversalContext {
    readonly functionName?: string
}

interface IJavaParsedState {
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

/**
 * Dedicated tree-sitter parser for java source files.
 */
export class JavaSourceCodeParser implements ISourceCodeParser {
    public readonly language: JavaParserLanguage

    private readonly parser: Parser

    /**
     * Creates parser for java source files.
     *
     * @param options Canonical java language variant.
     */
    public constructor(options: IJavaSourceCodeParserOptions) {
        this.language = options.language
        this.parser = new Parser()
        this.parser.setLanguage(resolveJavaGrammar(options.language))
    }

    /**
     * Parses one java source file into deterministic AST DTOs.
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
     * Recursively walks java AST and collects normalized entities.
     *
     * @param node Current syntax node.
     * @param state Mutable parse state.
     * @param context Parent traversal context.
     */
    private traverse(node: ISyntaxNode, state: IJavaParsedState, context: IJavaTraversalContext): void {
        const importEntry = collectImport(node)
        if (importEntry !== null) {
            state.imports.push(importEntry)
        }

        const interfaceEntry = collectInterface(node)
        if (interfaceEntry !== null) {
            state.interfaces.push(interfaceEntry)
        }

        const classEntry = collectClass(node)
        if (classEntry !== null) {
            state.classes.push(classEntry)
        }

        const functionEntry = collectFunction(node)
        let nextContext = context
        if (functionEntry !== null) {
            state.functions.push(functionEntry)
            nextContext = {
                ...context,
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
 * Resolves tree-sitter grammar module for java language variant.
 *
 * @param _language Canonical java language.
 * @returns Tree-sitter grammar module.
 */
function resolveJavaGrammar(_language: JavaParserLanguage): Parser.Language {
    return Java as unknown as Parser.Language
}

/**
 * Narrows supported language to java variant.
 *
 * @param language Canonical supported language.
 * @returns Java language variant.
 * @throws Error When language is not java.
 */
export function assertJavaParserLanguage(language: SupportedLanguage): JavaParserLanguage {
    if (language === AST_LANGUAGE.JAVA) {
        return language
    }

    throw new Error(`Unsupported Java parser language: ${language}`)
}

/**
 * Creates empty mutable parse-state collections.
 *
 * @returns Initialized parse state.
 */
function createParsedState(): IJavaParsedState {
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
 * Collects java import declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized import DTO or `null`.
 */
function collectImport(node: ISyntaxNode): IAstImportDTO | null {
    if (node.type !== "import_declaration") {
        return null
    }

    const sourceNode = findFirstNamedChild(node, ["scoped_identifier", "identifier"])
    const source = readNodeText(sourceNode)
    if (source === undefined) {
        return null
    }

    const sourceSegments = source.split(".")
    const importedName = sourceSegments.at(-1)
    const specifiers = importedName !== undefined && importedName.length > 0 ? [importedName] : []
    return {
        source,
        kind: AST_IMPORT_KIND.STATIC,
        specifiers,
        typeOnly: false,
        location: createSourceLocation(node),
    }
}

/**
 * Collects java interface declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized interface DTO or `null`.
 */
function collectInterface(node: ISyntaxNode): IAstInterfaceDTO | null {
    if (node.type !== "interface_declaration") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: hasPublicModifier(node),
        extendsTypes: collectTypeListValues(findFirstNamedChild(node, ["extends_interfaces"])),
        location: createSourceLocation(node),
    }
}

/**
 * Collects java class declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized class DTO or `null`.
 */
function collectClass(node: ISyntaxNode): IAstClassDTO | null {
    if (node.type !== "class_declaration") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: hasPublicModifier(node),
        extendsTypes: collectClassExtendsTypes(node),
        implementsTypes: collectTypeListValues(findFirstNamedChild(node, ["super_interfaces"])),
        location: createSourceLocation(node),
    }
}

/**
 * Collects java method and constructor declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized function DTO or `null`.
 */
function collectFunction(node: ISyntaxNode): IAstFunctionDTO | null {
    if (node.type !== "method_declaration" && node.type !== "constructor_declaration") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    const parentClassName = resolveParentClassName(node)
    return {
        name,
        kind: AST_FUNCTION_KIND.METHOD,
        exported: hasPublicModifier(node),
        async: false,
        ...(parentClassName !== undefined ? {parentClassName} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Collects java method invocation expressions.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized call DTO or `null`.
 */
function collectCall(node: ISyntaxNode, context: IJavaTraversalContext): IAstCallDTO | null {
    if (node.type !== "method_invocation") {
        return null
    }

    const callText = readNodeText(node)
    if (callText === undefined) {
        return null
    }

    const openingParenthesisIndex = callText.indexOf("(")
    const callee =
        openingParenthesisIndex >= 0 ? callText.slice(0, openingParenthesisIndex).trim() : callText
    if (callee.length === 0) {
        return null
    }

    return {
        callee,
        ...(context.functionName !== undefined ? {caller: context.functionName} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Collects extends types for java classes.
 *
 * @param node Class declaration node.
 * @returns Parent class names.
 */
function collectClassExtendsTypes(node: ISyntaxNode): readonly string[] {
    const superclassNode = findFirstNamedChild(node, ["superclass"])
    if (superclassNode === undefined) {
        return []
    }

    const typeNode = findFirstNamedChild(superclassNode, [
        "type_identifier",
        "scoped_type_identifier",
        "generic_type",
    ])
    const typeName = readNodeText(typeNode)
    if (typeName === undefined) {
        return []
    }

    return [typeName]
}

/**
 * Collects type names from java type-list wrappers.
 *
 * @param node Type-list wrapper node.
 * @returns Type names in declaration order.
 */
function collectTypeListValues(node: ISyntaxNode | undefined): readonly string[] {
    const typeList = findFirstNamedChild(node, ["type_list"])
    if (typeList === undefined) {
        return []
    }

    const types: string[] = []
    for (const child of typeList.namedChildren) {
        if (
            child.type !== "type_identifier" &&
            child.type !== "scoped_type_identifier" &&
            child.type !== "generic_type"
        ) {
            continue
        }

        const typeName = readNodeText(child)
        if (typeName !== undefined && !types.includes(typeName)) {
            types.push(typeName)
        }
    }

    return types
}

/**
 * Resolves owning class name for class/interface method nodes.
 *
 * @param node Method-like node.
 * @returns Owning class or interface name.
 */
function resolveParentClassName(node: ISyntaxNode): string | undefined {
    const classAncestor = findClosestAncestor(node, "class_declaration")
    if (classAncestor !== null) {
        return readNodeText(findFirstNamedChild(classAncestor, ["identifier"]))
    }

    const interfaceAncestor = findClosestAncestor(node, "interface_declaration")
    if (interfaceAncestor !== null) {
        return readNodeText(findFirstNamedChild(interfaceAncestor, ["identifier"]))
    }

    return undefined
}

/**
 * Resolves whether declaration has explicit public modifier.
 *
 * @param node Declaration node.
 * @returns `true` when declaration has public modifier.
 */
function hasPublicModifier(node: ISyntaxNode): boolean {
    const modifiersNode = findFirstNamedChild(node, ["modifiers"])
    if (modifiersNode === undefined) {
        return false
    }

    return /\bpublic\b/u.test(modifiersNode.text)
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
 * Finds closest ancestor with expected node type.
 *
 * @param node Starting syntax node.
 * @param nodeType Ancestor node type.
 * @returns Matching ancestor or `null`.
 */
function findClosestAncestor(node: ISyntaxNode, nodeType: string): ISyntaxNode | null {
    let current = node.parent

    while (current !== null) {
        if (current.type === nodeType) {
            return current
        }

        current = current.parent
    }

    return null
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
 * Resolves human-readable parser failure message.
 *
 * @param error Unknown thrown value.
 * @returns Safe error message.
 */
function resolveParserFailureMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Tree-sitter parser failed"
}
