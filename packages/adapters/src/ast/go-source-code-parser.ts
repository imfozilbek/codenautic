import Parser from "tree-sitter"
import Go from "tree-sitter-go"

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
    type IAstTypeAliasDTO,
    type IParsedSourceFileDTO,
    type ISourceCodeParseRequest,
    type ISourceCodeParser,
    type SupportedLanguage,
} from "@codenautic/core"

import {AST_PARSER_ERROR_CODE, AstParserError} from "./ast-parser.error"

/**
 * Supported go parser language variants.
 */
export type GoParserLanguage = typeof AST_LANGUAGE.GO

/**
 * Construction options for go source parser.
 */
export interface IGoSourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: GoParserLanguage
}

interface IGoTraversalContext {
    readonly functionName?: string
}

interface IGoParsedState {
    readonly imports: IAstImportDTO[]
    readonly typeAliases: IAstTypeAliasDTO[]
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
 * Dedicated tree-sitter parser for go source files.
 */
export class GoSourceCodeParser implements ISourceCodeParser {
    public readonly language: GoParserLanguage

    private readonly parser: Parser

    /**
     * Creates parser for go source files.
     *
     * @param options Canonical go language variant.
     */
    public constructor(options: IGoSourceCodeParserOptions) {
        this.language = options.language
        this.parser = new Parser()
        this.parser.setLanguage(resolveGoGrammar(options.language))
    }

    /**
     * Parses one go source file into deterministic AST DTOs.
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
                typeAliases: state.typeAliases,
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
     * Recursively walks go AST and collects normalized entities.
     *
     * @param node Current syntax node.
     * @param state Mutable parse state.
     * @param context Parent traversal context.
     */
    private traverse(node: ISyntaxNode, state: IGoParsedState, context: IGoTraversalContext): void {
        const importEntry = collectImport(node)
        if (importEntry !== null) {
            state.imports.push(importEntry)
        }

        const typeAliasEntry = collectTypeAlias(node)
        if (typeAliasEntry !== null) {
            state.typeAliases.push(typeAliasEntry)
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
 * Resolves tree-sitter grammar module for go language variant.
 *
 * @param _language Canonical go language.
 * @returns Tree-sitter grammar module.
 */
function resolveGoGrammar(_language: GoParserLanguage): Parser.Language {
    return Go as unknown as Parser.Language
}

/**
 * Narrows supported language to go variant.
 *
 * @param language Canonical supported language.
 * @returns Go language variant.
 * @throws Error When language is not go.
 */
export function assertGoParserLanguage(language: SupportedLanguage): GoParserLanguage {
    if (language === AST_LANGUAGE.GO) {
        return language
    }

    throw new Error(`Unsupported Go parser language: ${language}`)
}

/**
 * Creates empty mutable parse-state collections.
 *
 * @returns Initialized parse state.
 */
function createParsedState(): IGoParsedState {
    return {
        imports: [],
        typeAliases: [],
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
 * Collects go import declarations from import spec nodes.
 *
 * @param node Current syntax node.
 * @returns Normalized import DTO or `null`.
 */
function collectImport(node: ISyntaxNode): IAstImportDTO | null {
    if (node.type !== "import_spec") {
        return null
    }

    const sourceNode = findFirstNamedChild(node, [
        "interpreted_string_literal",
        "raw_string_literal",
    ])
    const source = readStringLiteralValue(sourceNode)
    if (source === undefined) {
        return null
    }

    const alias = readNodeText(findFirstNamedChild(node, ["package_identifier"]))
    return {
        source,
        kind: AST_IMPORT_KIND.STATIC,
        specifiers: resolveImportSpecifiers(source, alias),
        typeOnly: false,
        location: createSourceLocation(node),
    }
}

/**
 * Collects go type aliases from type alias declaration nodes.
 *
 * @param node Current syntax node.
 * @returns Normalized type alias DTO or `null`.
 */
function collectTypeAlias(node: ISyntaxNode): IAstTypeAliasDTO | null {
    if (node.type !== "type_alias" && node.type !== "type_spec") {
        return null
    }

    if (node.type === "type_spec") {
        const typeValueNode = node.namedChildren.find((child): boolean => {
            return child.type !== "type_identifier"
        })
        if (typeValueNode?.type === "interface_type" || typeValueNode?.type === "struct_type") {
            return null
        }
    }

    const nameNode = findFirstNamedChild(node, ["type_identifier"])
    const name = readNodeText(nameNode)
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: isGoExportedSymbol(name),
        location: createSourceLocation(node),
    }
}

/**
 * Collects go interface declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized interface DTO or `null`.
 */
function collectInterface(node: ISyntaxNode): IAstInterfaceDTO | null {
    if (node.type !== "type_spec") {
        return null
    }

    const interfaceNode = findFirstNamedChild(node, ["interface_type"])
    if (interfaceNode === undefined) {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["type_identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: isGoExportedSymbol(name),
        extendsTypes: [],
        location: createSourceLocation(node),
    }
}

/**
 * Collects go struct declarations and maps them to class DTOs.
 *
 * @param node Current syntax node.
 * @returns Normalized class DTO or `null`.
 */
function collectClass(node: ISyntaxNode): IAstClassDTO | null {
    if (node.type !== "type_spec") {
        return null
    }

    const structNode = findFirstNamedChild(node, ["struct_type"])
    if (structNode === undefined) {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["type_identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: isGoExportedSymbol(name),
        extendsTypes: [],
        implementsTypes: [],
        location: createSourceLocation(node),
    }
}

/**
 * Collects go function and method declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized function DTO or `null`.
 */
function collectFunction(node: ISyntaxNode): IAstFunctionDTO | null {
    if (node.type === "function_declaration") {
        const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
        if (name === undefined) {
            return null
        }

        return {
            name,
            kind: AST_FUNCTION_KIND.FUNCTION,
            exported: isGoExportedSymbol(name),
            async: false,
            location: createSourceLocation(node),
        }
    }

    if (node.type === "method_declaration") {
        const name = readNodeText(findFirstNamedChild(node, ["field_identifier"]))
        if (name === undefined) {
            return null
        }

        const receiverType = resolveMethodReceiverType(node)
        return {
            name,
            kind: AST_FUNCTION_KIND.METHOD,
            exported: isGoExportedSymbol(name),
            async: false,
            ...(receiverType !== undefined ? {parentClassName: receiverType} : {}),
            location: createSourceLocation(node),
        }
    }

    return null
}

/**
 * Collects go call expressions.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized call DTO or `null`.
 */
function collectCall(node: ISyntaxNode, context: IGoTraversalContext): IAstCallDTO | null {
    if (node.type !== "call_expression") {
        return null
    }

    const callee = readNodeText(node.namedChildren[0])
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
 * Resolves receiver type name for one go method declaration.
 *
 * @param node Method declaration node.
 * @returns Receiver type name or `undefined`.
 */
function resolveMethodReceiverType(node: ISyntaxNode): string | undefined {
    const receiverList = findFirstNamedChild(node, ["parameter_list"])
    const receiverDeclaration = findFirstNamedChild(receiverList, ["parameter_declaration"])
    if (receiverDeclaration === undefined) {
        return undefined
    }

    const receiverTypeNode = findFirstNamedChild(receiverDeclaration, [
        "pointer_type",
        "type_identifier",
        "qualified_type",
    ])
    if (receiverTypeNode === undefined) {
        return undefined
    }

    const receiverType = readNodeText(receiverTypeNode)
    if (receiverType === undefined) {
        return undefined
    }

    const normalizedReceiverType = receiverType.replace(/^\*+/u, "").trim()
    if (normalizedReceiverType.length === 0) {
        return undefined
    }

    return normalizedReceiverType
}

/**
 * Resolves import specifiers for one go import spec.
 *
 * @param source Imported module path.
 * @param alias Optional local alias.
 * @returns Normalized specifiers.
 */
function resolveImportSpecifiers(source: string, alias: string | undefined): readonly string[] {
    if (alias === "_") {
        return []
    }

    if (alias !== undefined && alias.length > 0) {
        return [alias]
    }

    const sourceSegments = source.split("/")
    const packageName = sourceSegments.at(-1)
    if (packageName === undefined || packageName.length === 0) {
        return []
    }

    return [packageName]
}

/**
 * Resolves whether go identifier is publicly exported.
 *
 * @param symbolName Identifier text.
 * @returns `true` when identifier starts with upper-case letter.
 */
function isGoExportedSymbol(symbolName: string): boolean {
    return /^[A-Z]/u.test(symbolName)
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
 * Reads string literal value from go string node.
 *
 * @param node String syntax node.
 * @returns Unquoted string value or `undefined`.
 */
function readStringLiteralValue(node: ISyntaxNode | undefined): string | undefined {
    if (node === undefined) {
        return undefined
    }

    const contentNode = findFirstNamedChild(node, [
        "interpreted_string_literal_content",
        "raw_string_literal_content",
    ])
    const content = readNodeText(contentNode)
    if (content !== undefined) {
        return content
    }

    const text = readNodeText(node)
    if (text === undefined) {
        return undefined
    }

    if (text.length >= 2) {
        const firstCharacter = text[0]
        const lastCharacter = text[text.length - 1]
        if (
            (firstCharacter === '"' || firstCharacter === "'" || firstCharacter === "`") &&
            lastCharacter === firstCharacter
        ) {
            return text.slice(1, -1)
        }
    }

    return text
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
