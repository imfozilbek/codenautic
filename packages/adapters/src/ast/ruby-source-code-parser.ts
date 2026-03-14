import Parser from "tree-sitter"
import Ruby from "tree-sitter-ruby"

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
 * Supported ruby parser language variants.
 */
export type RubyParserLanguage = typeof AST_LANGUAGE.RUBY

/**
 * Construction options for ruby source parser.
 */
export interface IRubySourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: RubyParserLanguage
}

interface IRubyTraversalContext {
    readonly className?: string
    readonly functionName?: string
}

interface IRubyParsedState {
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

interface IRubyRequireImport {
    readonly source: string
    readonly specifiers: readonly string[]
}

/**
 * Dedicated tree-sitter parser for ruby source files.
 */
export class RubySourceCodeParser implements ISourceCodeParser {
    public readonly language: RubyParserLanguage

    private readonly parser: Parser

    /**
     * Creates parser for ruby source files.
     *
     * @param options Canonical ruby language variant.
     */
    public constructor(options: IRubySourceCodeParserOptions) {
        this.language = options.language
        this.parser = new Parser()
        this.parser.setLanguage(resolveRubyGrammar(options.language))
    }

    /**
     * Parses one ruby source file into deterministic AST DTOs.
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
     * Recursively walks ruby AST and collects normalized entities.
     *
     * @param node Current syntax node.
     * @param state Mutable parse state.
     * @param context Parent traversal context.
     */
    private traverse(node: ISyntaxNode, state: IRubyParsedState, context: IRubyTraversalContext): void {
        const importEntry = collectImport(node)
        if (importEntry !== null) {
            state.imports.push(importEntry)
        }

        let nextContext = context

        const moduleEntry = collectModule(node)
        if (moduleEntry !== null) {
            state.interfaces.push(moduleEntry)
            nextContext = {
                ...nextContext,
                className: moduleEntry.name,
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
 * Resolves tree-sitter grammar module for ruby language variant.
 *
 * @param _language Canonical ruby language.
 * @returns Tree-sitter grammar module.
 */
function resolveRubyGrammar(_language: RubyParserLanguage): Parser.Language {
    return Ruby as unknown as Parser.Language
}

/**
 * Narrows supported language to ruby variant.
 *
 * @param language Canonical supported language.
 * @returns Ruby language variant.
 * @throws Error When language is not ruby.
 */
export function assertRubyParserLanguage(language: SupportedLanguage): RubyParserLanguage {
    if (language === AST_LANGUAGE.RUBY) {
        return language
    }

    throw new Error(`Unsupported Ruby parser language: ${language}`)
}

/**
 * Creates empty mutable parse-state collections.
 *
 * @returns Initialized parse state.
 */
function createParsedState(): IRubyParsedState {
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
 * Collects ruby require and require_relative directives as import DTOs.
 *
 * @param node Current syntax node.
 * @returns Normalized import DTO or `null`.
 */
function collectImport(node: ISyntaxNode): IAstImportDTO | null {
    const requireImport = readRequireImport(node)
    if (requireImport === null) {
        return null
    }

    return {
        source: requireImport.source,
        kind: AST_IMPORT_KIND.REQUIRE,
        specifiers: requireImport.specifiers,
        typeOnly: false,
        location: createSourceLocation(node),
    }
}

/**
 * Collects ruby module declarations as interface-like DTOs.
 *
 * @param node Current syntax node.
 * @returns Normalized interface DTO or `null`.
 */
function collectModule(node: ISyntaxNode): IAstInterfaceDTO | null {
    if (node.type !== "module") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["constant"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: true,
        extendsTypes: [],
        location: createSourceLocation(node),
    }
}

/**
 * Collects ruby class declarations.
 *
 * @param node Current syntax node.
 * @returns Normalized class DTO or `null`.
 */
function collectClass(node: ISyntaxNode): IAstClassDTO | null {
    if (node.type !== "class") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["constant"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        exported: true,
        extendsTypes: collectClassExtendsTypes(node),
        implementsTypes: [],
        location: createSourceLocation(node),
    }
}

/**
 * Collects ruby method and singleton method declarations.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized function DTO or `null`.
 */
function collectFunction(
    node: ISyntaxNode,
    context: IRubyTraversalContext,
): IAstFunctionDTO | null {
    if (node.type !== "method" && node.type !== "singleton_method") {
        return null
    }

    const name = readNodeText(findFirstNamedChild(node, ["identifier"]))
    if (name === undefined) {
        return null
    }

    return {
        name,
        kind: AST_FUNCTION_KIND.METHOD,
        exported: true,
        async: false,
        ...(context.className !== undefined ? {parentClassName: context.className} : {}),
        location: createSourceLocation(node),
    }
}

/**
 * Collects ruby call expressions excluding import-like require calls.
 *
 * @param node Current syntax node.
 * @param context Parent traversal context.
 * @returns Normalized call DTO or `null`.
 */
function collectCall(node: ISyntaxNode, context: IRubyTraversalContext): IAstCallDTO | null {
    if (node.type !== "call") {
        return null
    }

    if (isRequireCall(node)) {
        return null
    }

    const callee = resolveRubyCallCallee(node)
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
 * Resolves one ruby require call payload.
 *
 * @param node Candidate syntax node.
 * @returns Require import payload or `null`.
 */
function readRequireImport(node: ISyntaxNode): IRubyRequireImport | null {
    if (!isRequireCall(node)) {
        return null
    }

    const argumentList = findFirstNamedChild(node, ["argument_list"])
    const sourceNode = findFirstNamedChild(argumentList, ["string", "simple_symbol", "symbol"])
    const source = readRubyStringValue(sourceNode)
    if (source === undefined) {
        return null
    }

    return {
        source,
        specifiers: resolveRequireSpecifiers(source),
    }
}

/**
 * Resolves whether ruby call node is require-like import call.
 *
 * @param node Candidate call node.
 * @returns `true` when call is require or require_relative.
 */
function isRequireCall(node: ISyntaxNode): boolean {
    if (node.type !== "call") {
        return false
    }

    const calleeIdentifier = readNodeText(findFirstNamedChild(node, ["identifier"]))
    return calleeIdentifier === "require" || calleeIdentifier === "require_relative"
}

/**
 * Resolves local specifiers for ruby require source path.
 *
 * @param source Require source value.
 * @returns Imported local specifiers.
 */
function resolveRequireSpecifiers(source: string): readonly string[] {
    const sourceSegments = source.split("/")
    const terminalSegment = sourceSegments.at(-1)
    if (terminalSegment === undefined || terminalSegment.length === 0) {
        return []
    }

    const normalizedSegment = terminalSegment.replace(/\.rb$/u, "")
    if (normalizedSegment.length === 0) {
        return []
    }

    return [normalizedSegment]
}

/**
 * Resolves class extends type list from ruby class declaration.
 *
 * @param node Ruby class declaration node.
 * @returns Ordered extends type names.
 */
function collectClassExtendsTypes(node: ISyntaxNode): readonly string[] {
    const superclassNode = findFirstNamedChild(node, ["superclass"])
    if (superclassNode === undefined) {
        return []
    }

    const typeNode = findFirstNamedChild(superclassNode, [
        "constant",
        "scope_resolution",
        "identifier",
    ])
    const extendsType = readNodeText(typeNode)
    if (extendsType === undefined) {
        return []
    }

    return [extendsType]
}

/**
 * Resolves callee text from ruby call node.
 *
 * @param node Ruby call node.
 * @returns Normalized callee text or `undefined`.
 */
function resolveRubyCallCallee(node: ISyntaxNode): string | undefined {
    const receiverNode = node.namedChildren[0]
    const methodNode = node.namedChildren[1]

    const receiver = readNodeText(receiverNode)
    const methodName = readNodeText(methodNode)
    const isMethodIdentifier = methodNode?.type === "identifier"
    if (receiver !== undefined && methodName !== undefined && isMethodIdentifier) {
        return `${receiver}.${methodName}`
    }

    return receiver
}

/**
 * Reads ruby string-like value from syntax node.
 *
 * @param node Ruby string-like syntax node.
 * @returns Unquoted string value or `undefined`.
 */
function readRubyStringValue(node: ISyntaxNode | undefined): string | undefined {
    if (node === undefined) {
        return undefined
    }

    const stringContent = readNodeText(findFirstNamedChild(node, ["string_content"]))
    if (stringContent !== undefined) {
        return stringContent
    }

    const rawValue = readNodeText(node)
    if (rawValue === undefined) {
        return undefined
    }

    if (rawValue.length >= 2) {
        const first = rawValue[0]
        const last = rawValue[rawValue.length - 1]
        if ((first === "\"" || first === "'") && last === first) {
            return rawValue.slice(1, -1)
        }
    }

    return rawValue
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
