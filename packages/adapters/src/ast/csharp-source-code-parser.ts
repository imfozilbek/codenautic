import Parser from "tree-sitter"
import CSharp from "tree-sitter-c-sharp"

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
 * Supported csharp parser language variants.
 */
export type CSharpParserLanguage = typeof AST_LANGUAGE.CSHARP

/**
 * Construction options for csharp source parser.
 */
export interface ICSharpSourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: CSharpParserLanguage
}

interface ICSharpTraversalContext {
    readonly className?: string
    readonly functionName?: string
}

interface ICSharpParsedState {
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

interface IClassBaseTypes {
    readonly extendsTypes: readonly string[]
    readonly implementsTypes: readonly string[]
}

/**
 * Dedicated tree-sitter parser for csharp source files.
 */
export class CSharpSourceCodeParser implements ISourceCodeParser {
    public readonly language: CSharpParserLanguage

    private readonly parser: Parser

    /**
     * Creates parser for csharp source files.
     *
     * @param options Canonical csharp language variant.
     */
    public constructor(options: ICSharpSourceCodeParserOptions) {
        this.language = options.language
        this.parser = new Parser()
        this.parser.setLanguage(resolveCSharpGrammar(options.language))
    }

    /**
     * Parses one csharp source file into deterministic AST DTOs.
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
     * Recursively walks csharp AST and collects normalized entities.
     *
     * @param node Current syntax node.
     * @param state Mutable parse state.
     * @param context Parent traversal context.
     */
    private traverse(node: ISyntaxNode, state: ICSharpParsedState, context: ICSharpTraversalContext): void {
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
 * Resolves tree-sitter grammar module for csharp language variant.
 *
 * @param _language Canonical csharp language.
 * @returns Tree-sitter grammar module.
 */
function resolveCSharpGrammar(_language: CSharpParserLanguage): Parser.Language {
    return CSharp as unknown as Parser.Language
}

/**
 * Narrows supported language to csharp variant.
 *
 * @param language Canonical supported language.
 * @returns CSharp language variant.
 * @throws Error When language is not csharp.
 */
export function assertCSharpParserLanguage(language: SupportedLanguage): CSharpParserLanguage {
    if (language === AST_LANGUAGE.CSHARP) {
        return language
    }

    throw new Error(`Unsupported CSharp parser language: ${language}`)
}

/**
 * Creates empty mutable parse-state collections.
 *
 * @returns Initialized parse state.
 */
function createParsedState(): ICSharpParsedState {
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
 * Collects csharp using directives.
 *
 * @param node Current syntax node.
 * @returns Normalized import DTO or `null`.
 */
function collectImport(node: ISyntaxNode): IAstImportDTO | null {
    if (node.type !== "using_directive") {
        return null
    }

    const source = resolveUsingSource(node)
    if (source === undefined) {
        return null
    }

    return {
        source,
        kind: AST_IMPORT_KIND.STATIC,
        specifiers: resolveUsingSpecifiers(node, source),
        typeOnly: false,
        location: createSourceLocation(node),
    }
}

/**
 * Collects csharp interface declarations.
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
        exported: hasModifier(node, "public"),
        extendsTypes: collectTypeNames(findFirstNamedChild(node, ["base_list"])),
        location: createSourceLocation(node),
    }
}

/**
 * Collects csharp class declarations.
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

    const baseTypes = collectTypeNames(findFirstNamedChild(node, ["base_list"]))
    const classBaseTypes = splitClassBaseTypes(baseTypes)
    return {
        name,
        exported: hasModifier(node, "public"),
        extendsTypes: classBaseTypes.extendsTypes,
        implementsTypes: classBaseTypes.implementsTypes,
        location: createSourceLocation(node),
    }
}

/**
 * Collects csharp methods and constructors.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized function DTO or `null`.
 */
function collectFunction(
    node: ISyntaxNode,
    context: ICSharpTraversalContext,
): IAstFunctionDTO | null {
    if (node.type !== "method_declaration" && node.type !== "constructor_declaration") {
        return null
    }

    const name = resolveMethodLikeName(node)
    if (name === undefined) {
        return null
    }

    return {
        name,
        kind: AST_FUNCTION_KIND.METHOD,
        exported: hasModifier(node, "public"),
        async: hasModifier(node, "async"),
        ...(context.className !== undefined ? {parentClassName: context.className} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Resolves deterministic method or constructor name from csharp declaration nodes.
 *
 * @param node Method-like declaration node.
 * @returns Method or constructor name or `undefined`.
 */
function resolveMethodLikeName(node: ISyntaxNode): string | undefined {
    if (node.type === "constructor_declaration") {
        return readNodeText(findFirstNamedChild(node, ["identifier"]))
    }

    const identifiers = findNamedChildren(node, ["identifier"])
    return readNodeText(identifiers.at(-1))
}

/**
 * Collects csharp invocation expressions as call DTOs.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized call DTO or `null`.
 */
function collectCall(node: ISyntaxNode, context: ICSharpTraversalContext): IAstCallDTO | null {
    if (node.type !== "invocation_expression") {
        return null
    }

    const callee = resolveInvocationCallee(node)
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
 * Resolves source from csharp using directive.
 *
 * @param node Using-directive node.
 * @returns Imported source path or `undefined`.
 */
function resolveUsingSource(node: ISyntaxNode): string | undefined {
    const typeNodes = findNamedChildren(node, ["qualified_name", "identifier"])
    const sourceNode = typeNodes.at(-1)
    return readNodeText(sourceNode)
}

/**
 * Resolves local specifiers from csharp using directive.
 *
 * @param node Using-directive node.
 * @param source Imported source path.
 * @returns Local imported specifiers.
 */
function resolveUsingSpecifiers(node: ISyntaxNode, source: string): readonly string[] {
    const alias = resolveUsingAlias(node)
    if (alias !== undefined) {
        return [alias]
    }

    const importedName = source.split(".").at(-1)
    if (importedName === undefined || importedName.length === 0) {
        return []
    }

    return [importedName]
}

/**
 * Resolves alias name from csharp using alias directive.
 *
 * @param node Using-directive node.
 * @returns Alias name or `undefined`.
 */
function resolveUsingAlias(node: ISyntaxNode): string | undefined {
    if (!node.text.includes("=")) {
        return undefined
    }

    const identifiers = findNamedChildren(node, ["identifier"])
    const aliasNode = identifiers[0]
    return readNodeText(aliasNode)
}

/**
 * Resolves call target text from csharp invocation node.
 *
 * @param node Invocation expression node.
 * @returns Callee text or `undefined`.
 */
function resolveInvocationCallee(node: ISyntaxNode): string | undefined {
    const callTarget = findFirstNamedChild(node, [
        "member_access_expression",
        "identifier",
        "qualified_name",
        "generic_name",
    ])
    return readNodeText(callTarget)
}

/**
 * Splits csharp class base list into extends and implements groups.
 *
 * @param baseTypes Ordered base types from class base list.
 * @returns Split extends and implements payload.
 */
function splitClassBaseTypes(baseTypes: readonly string[]): IClassBaseTypes {
    if (baseTypes.length === 0) {
        return {
            extendsTypes: [],
            implementsTypes: [],
        }
    }

    if (baseTypes.length === 1) {
        const onlyType = baseTypes[0]
        if (onlyType === undefined) {
            return {
                extendsTypes: [],
                implementsTypes: [],
            }
        }

        if (looksLikeInterfaceName(onlyType)) {
            return {
                extendsTypes: [],
                implementsTypes: [onlyType],
            }
        }

        return {
            extendsTypes: [onlyType],
            implementsTypes: [],
        }
    }

    const firstType = baseTypes[0]
    if (firstType === undefined) {
        return {
            extendsTypes: [],
            implementsTypes: [],
        }
    }

    const interfaceTypes = baseTypes.slice(1)
    return {
        extendsTypes: [firstType],
        implementsTypes: interfaceTypes,
    }
}

/**
 * Resolves whether one type name follows common C# interface naming convention.
 *
 * @param typeName Candidate type name.
 * @returns `true` when type looks like interface name.
 */
function looksLikeInterfaceName(typeName: string): boolean {
    return /^I[A-Z]/u.test(typeName)
}

/**
 * Collects referenced type names from one node.
 *
 * @param node Node containing type references.
 * @returns Ordered type names.
 */
function collectTypeNames(node: ISyntaxNode | undefined): readonly string[] {
    if (node === undefined) {
        return []
    }

    const typeNames: string[] = []
    const candidates = findNamedChildren(node, [
        "identifier",
        "qualified_name",
        "generic_name",
    ])
    for (const candidate of candidates) {
        pushUnique(typeNames, readNodeText(candidate))
    }

    return typeNames
}

/**
 * Resolves whether syntax node contains one modifier value.
 *
 * @param node Syntax node.
 * @param modifier Modifier token value.
 * @returns `true` when modifier exists on node.
 */
function hasModifier(node: ISyntaxNode, modifier: string): boolean {
    const modifiers = findNamedChildren(node, ["modifier"])
    return modifiers.some((modifierNode): boolean => {
        return modifierNode.text.trim() === modifier
    })
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
