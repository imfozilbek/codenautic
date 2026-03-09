import {
    CODE_GRAPH_NODE_TYPE,
    type CodeGraphNodeMetadataValue,
    FilePath,
    RepositoryId,
    type IAstClassDTO,
    type IAstEnumDTO,
    type IAstFunctionDTO,
    type IAstInterfaceDTO,
    type IAstTypeAliasDTO,
    type ICodeGraph,
    type ICodeGraphNode,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_BUILDER_ERROR_CODE,
    AstCodeGraphBuilderError,
} from "./ast-code-graph-builder.error"

const DEFAULT_GRAPH_BRANCH = "default"
const GLOBAL_FUNCTION_SCOPE = "global"

type IIndexedGraphState = {
    readonly nodes: ICodeGraphNode[]
    readonly nodeIds: Set<string>
    readonly fileNodes: Map<string, ICodeGraphNode>
    readonly functionNodes: Map<string, ICodeGraphNode[]>
    readonly typeNodes: Map<string, ICodeGraphNode[]>
}

type INormalizedParsedSourceFile = Omit<IParsedSourceFileDTO, "filePath"> & {
    readonly filePath: string
}

type IGraphNamedDeclaration = {
    readonly name: string
    readonly location: {
        readonly lineStart: number
        readonly columnStart: number
    }
}

/**
 * Input payload for AST code graph builder.
 */
export interface IAstCodeGraphBuilderBuildInput {
    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repositoryId: string

    /**
     * Optional branch reference for graph snapshot.
     */
    readonly branch?: string

    /**
     * Parsed source file snapshots for one repository branch.
     */
    readonly files: readonly IParsedSourceFileDTO[]
}

/**
 * Deterministic graph snapshot plus lookup indexes for one repository branch.
 */
export interface IAstCodeGraphBuildResult {
    /**
     * Graph payload ready for persistence and analytics use cases.
     */
    readonly graph: ICodeGraph

    /**
     * O(1) lookup of file nodes by normalized repository-relative path.
     */
    readonly fileNodes: ReadonlyMap<string, ICodeGraphNode>

    /**
     * O(1) lookup of function and method nodes by symbol name.
     */
    readonly functionNodes: ReadonlyMap<string, readonly ICodeGraphNode[]>

    /**
     * O(1) lookup of type-level declarations by symbol name.
     */
    readonly typeNodes: ReadonlyMap<string, readonly ICodeGraphNode[]>
}

/**
 * Construction options for AST code graph builder.
 */
export interface IAstCodeGraphBuilderOptions {
    /**
     * Optional clock used for deterministic graph timestamps.
     */
    readonly nowProvider?: () => Date
}

/**
 * AST code graph builder contract.
 */
export interface IAstCodeGraphBuilder {
    /**
     * Builds deterministic graph snapshot and indexes for one repository branch.
     *
     * @param input Repository branch parsed source files.
     * @returns Graph payload with file/function/type indexes.
     * @throws {AstCodeGraphBuilderError} When repository id or parsed files are invalid.
     */
    build(input: IAstCodeGraphBuilderBuildInput): IAstCodeGraphBuildResult
}

/**
 * Builds graph nodes and lookup indexes from parsed AST snapshots.
 */
export class AstCodeGraphBuilder implements IAstCodeGraphBuilder {
    private readonly nowProvider: () => Date

    /**
     * Creates AST code graph builder.
     *
     * @param options Optional deterministic clock.
     */
    public constructor(options: IAstCodeGraphBuilderOptions = {}) {
        this.nowProvider = options.nowProvider ?? (() => new Date())
    }

    /**
     * Builds graph payload and semantic indexes for one repository branch.
     *
     * @param input Repository branch parsed source files.
     * @returns Graph payload with lookup indexes.
     */
    public build(input: IAstCodeGraphBuilderBuildInput): IAstCodeGraphBuildResult {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const branch = normalizeBranch(input.branch)
        const files = normalizeParsedSourceFiles(input.files)
        const state = createIndexedGraphState()

        for (const file of files) {
            this.collectFileGraph(file, state)
        }

        const nodes = [...state.nodes].sort(sortGraphNodesById)

        return {
            graph: {
                id: createGraphId(repositoryId, branch),
                generatedAt: this.nowProvider(),
                nodes,
                edges: [],
            },
            fileNodes: state.fileNodes,
            functionNodes: finalizeNodeIndex(state.functionNodes),
            typeNodes: finalizeNodeIndex(state.typeNodes),
        }
    }

    /**
     * Collects graph nodes and indexes for one parsed source file.
     *
     * @param file Normalized parsed source file.
     * @param state Mutable graph collection state.
     */
    private collectFileGraph(
        file: INormalizedParsedSourceFile,
        state: IIndexedGraphState,
    ): void {
        const fileNode = createFileNode(file)
        registerFileNode(file.filePath, fileNode, state)

        for (const declaration of sortNamedDeclarations(file.classes)) {
            const classNode = createClassNode(file.filePath, declaration)
            registerGraphNode(classNode, state)
            indexNode(state.typeNodes, declaration.name, classNode)
        }

        for (const declaration of sortNamedDeclarations(file.functions)) {
            const functionNode = createFunctionNode(file.filePath, declaration)
            registerGraphNode(functionNode, state)
            indexNode(state.functionNodes, declaration.name, functionNode)

            if (declaration.parentClassName !== undefined) {
                indexNode(
                    state.functionNodes,
                    `${declaration.parentClassName}.${declaration.name}`,
                    functionNode,
                )
            }
        }

        for (const declaration of sortNamedDeclarations(file.typeAliases)) {
            const typeNode = createTypeAliasNode(file.filePath, declaration)
            registerGraphNode(typeNode, state)
            indexNode(state.typeNodes, declaration.name, typeNode)
        }

        for (const declaration of sortNamedDeclarations(file.interfaces)) {
            const typeNode = createInterfaceNode(file.filePath, declaration)
            registerGraphNode(typeNode, state)
            indexNode(state.typeNodes, declaration.name, typeNode)
        }

        for (const declaration of sortNamedDeclarations(file.enums)) {
            const typeNode = createEnumNode(file.filePath, declaration)
            registerGraphNode(typeNode, state)
            indexNode(state.typeNodes, declaration.name, typeNode)
        }
    }
}

/**
 * Creates empty mutable graph collection state.
 *
 * @returns Mutable graph collection state.
 */
function createIndexedGraphState(): IIndexedGraphState {
    return {
        nodes: [],
        nodeIds: new Set<string>(),
        fileNodes: new Map<string, ICodeGraphNode>(),
        functionNodes: new Map<string, ICodeGraphNode[]>(),
        typeNodes: new Map<string, ICodeGraphNode[]>(),
    }
}

/**
 * Normalizes and validates repository id for graph scope.
 *
 * @param repositoryId Raw repository id string.
 * @returns Canonical repository id string.
 * @throws {AstCodeGraphBuilderError} When repository id is invalid.
 */
function normalizeRepositoryId(repositoryId: string): string {
    try {
        return RepositoryId.parse(repositoryId).toString()
    } catch (error) {
        throw new AstCodeGraphBuilderError(
            AST_CODE_GRAPH_BUILDER_ERROR_CODE.INVALID_REPOSITORY_ID,
            {
                repositoryId,
                causeMessage: error instanceof Error ? error.message : undefined,
            },
        )
    }
}

/**
 * Normalizes branch label and applies stable default for absent values.
 *
 * @param branch Raw branch value.
 * @returns Trimmed branch label or stable default.
 */
function normalizeBranch(branch: string | undefined): string {
    if (branch === undefined) {
        return DEFAULT_GRAPH_BRANCH
    }

    const normalizedBranch = branch.trim()
    if (normalizedBranch.length === 0) {
        return DEFAULT_GRAPH_BRANCH
    }

    return normalizedBranch
}

/**
 * Normalizes parsed source files and validates unique file paths.
 *
 * @param files Parsed source file snapshots.
 * @returns Normalized and sorted parsed source files.
 * @throws {AstCodeGraphBuilderError} When file paths are duplicated after normalization.
 */
function normalizeParsedSourceFiles(
    files: readonly IParsedSourceFileDTO[],
): readonly INormalizedParsedSourceFile[] {
    const normalizedFiles: INormalizedParsedSourceFile[] = []
    const seenPaths = new Set<string>()

    for (const file of files) {
        const normalizedFilePath = FilePath.create(file.filePath).toString()

        if (seenPaths.has(normalizedFilePath)) {
            throw new AstCodeGraphBuilderError(
                AST_CODE_GRAPH_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH,
                {
                    filePath: normalizedFilePath,
                },
            )
        }

        seenPaths.add(normalizedFilePath)
        normalizedFiles.push({
            ...file,
            filePath: normalizedFilePath,
        })
    }

    return normalizedFiles.sort((left, right) => left.filePath.localeCompare(right.filePath))
}

/**
 * Creates deterministic graph id for repository branch snapshot.
 *
 * @param repositoryId Canonical repository id.
 * @param branch Normalized branch label.
 * @returns Stable graph identifier.
 */
function createGraphId(repositoryId: string, branch: string): string {
    return `${repositoryId}@${branch}`
}

/**
 * Creates file-level graph node.
 *
 * @param file Normalized parsed source file.
 * @returns File graph node.
 */
function createFileNode(file: INormalizedParsedSourceFile): ICodeGraphNode {
    return {
        id: `file:${file.filePath}`,
        type: CODE_GRAPH_NODE_TYPE.FILE,
        name: FilePath.create(file.filePath).fileName(),
        filePath: file.filePath,
        metadata: {
            language: file.language,
            hasSyntaxErrors: file.hasSyntaxErrors,
            importCount: file.imports.length,
            functionCount: file.functions.length,
            classCount: file.classes.length,
            typeCount: file.typeAliases.length + file.interfaces.length + file.enums.length,
        },
    }
}

/**
 * Creates class-level graph node.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed class declaration.
 * @returns Class graph node.
 */
function createClassNode(filePath: string, declaration: IAstClassDTO): ICodeGraphNode {
    return {
        id: `class:${filePath}:${declaration.name}:${declaration.location.lineStart}`,
        type: CODE_GRAPH_NODE_TYPE.CLASS,
        name: declaration.name,
        filePath,
        metadata: {
            category: "class",
            exported: declaration.exported,
            lineStart: declaration.location.lineStart,
            lineEnd: declaration.location.lineEnd,
            columnStart: declaration.location.columnStart,
            columnEnd: declaration.location.columnEnd,
            extendsCount: declaration.extendsTypes.length,
            implementsCount: declaration.implementsTypes.length,
        },
    }
}

/**
 * Creates function or method graph node.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed function or method declaration.
 * @returns Function graph node.
 */
function createFunctionNode(filePath: string, declaration: IAstFunctionDTO): ICodeGraphNode {
    const parentClassName = declaration.parentClassName ?? GLOBAL_FUNCTION_SCOPE

    return {
        id: `function:${filePath}:${parentClassName}:${declaration.name}:${declaration.location.lineStart}`,
        type: CODE_GRAPH_NODE_TYPE.FUNCTION,
        name:
            declaration.parentClassName !== undefined
                ? `${declaration.parentClassName}.${declaration.name}`
                : declaration.name,
        filePath,
        metadata: {
            kind: declaration.kind,
            exported: declaration.exported,
            async: declaration.async,
            parentClassName: declaration.parentClassName ?? null,
            lineStart: declaration.location.lineStart,
            lineEnd: declaration.location.lineEnd,
            columnStart: declaration.location.columnStart,
            columnEnd: declaration.location.columnEnd,
        },
    }
}

/**
 * Creates type-alias graph node.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed type-alias declaration.
 * @returns Type-alias graph node.
 */
function createTypeAliasNode(filePath: string, declaration: IAstTypeAliasDTO): ICodeGraphNode {
    return createTypeLevelNode(filePath, declaration, "type-alias")
}

/**
 * Creates interface graph node.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed interface declaration.
 * @returns Interface graph node.
 */
function createInterfaceNode(filePath: string, declaration: IAstInterfaceDTO): ICodeGraphNode {
    return createTypeLevelNode(filePath, declaration, "interface", {
        extendsCount: declaration.extendsTypes.length,
    })
}

/**
 * Creates enum graph node.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed enum declaration.
 * @returns Enum graph node.
 */
function createEnumNode(filePath: string, declaration: IAstEnumDTO): ICodeGraphNode {
    return createTypeLevelNode(filePath, declaration, "enum", {
        memberCount: declaration.members.length,
    })
}

/**
 * Creates shared type-level graph node payload.
 *
 * @param filePath Normalized repository-relative file path.
 * @param declaration Parsed type-level declaration.
 * @param category Stable type category label.
 * @param metadataExtras Optional extra metadata fields.
 * @returns Type graph node.
 */
function createTypeLevelNode(
    filePath: string,
    declaration: IAstTypeAliasDTO | IAstInterfaceDTO | IAstEnumDTO,
    category: string,
    metadataExtras: Record<string, CodeGraphNodeMetadataValue> = {},
): ICodeGraphNode {
    return {
        id: `type:${filePath}:${category}:${declaration.name}:${declaration.location.lineStart}`,
        type: CODE_GRAPH_NODE_TYPE.TYPE,
        name: declaration.name,
        filePath,
        metadata: {
            category,
            exported: declaration.exported,
            lineStart: declaration.location.lineStart,
            lineEnd: declaration.location.lineEnd,
            columnStart: declaration.location.columnStart,
            columnEnd: declaration.location.columnEnd,
            ...metadataExtras,
        },
    }
}

/**
 * Registers file node in graph and file lookup map.
 *
 * @param filePath Normalized repository-relative file path.
 * @param node File graph node.
 * @param state Mutable graph collection state.
 */
function registerFileNode(
    filePath: string,
    node: ICodeGraphNode,
    state: IIndexedGraphState,
): void {
    if (state.fileNodes.has(filePath)) {
        throw new AstCodeGraphBuilderError(
            AST_CODE_GRAPH_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH,
            {
                filePath,
            },
        )
    }

    state.fileNodes.set(filePath, node)
    registerGraphNode(node, state)
}

/**
 * Registers one graph node and prevents identifier collisions.
 *
 * @param node Graph node to register.
 * @param state Mutable graph collection state.
 */
function registerGraphNode(node: ICodeGraphNode, state: IIndexedGraphState): void {
    if (state.nodeIds.has(node.id)) {
        throw new AstCodeGraphBuilderError(
            AST_CODE_GRAPH_BUILDER_ERROR_CODE.DUPLICATE_NODE_ID,
            {
                nodeId: node.id,
            },
        )
    }

    state.nodeIds.add(node.id)
    state.nodes.push(node)
}

/**
 * Adds graph node to semantic lookup index.
 *
 * @param index Mutable semantic lookup index.
 * @param key Semantic lookup key.
 * @param node Graph node to append.
 */
function indexNode(
    index: Map<string, ICodeGraphNode[]>,
    key: string,
    node: ICodeGraphNode,
): void {
    const existing = index.get(key)

    if (existing === undefined) {
        index.set(key, [node])
        return
    }

    existing.push(node)
}

/**
 * Sorts named declarations deterministically by location and name.
 *
 * @param declarations Parsed declarations.
 * @returns Sorted declaration snapshot.
 */
function sortNamedDeclarations<T extends IGraphNamedDeclaration>(
    declarations: readonly T[],
): readonly T[] {
    return [...declarations].sort((left, right) => {
        if (left.location.lineStart !== right.location.lineStart) {
            return left.location.lineStart - right.location.lineStart
        }

        if (left.location.columnStart !== right.location.columnStart) {
            return left.location.columnStart - right.location.columnStart
        }

        return left.name.localeCompare(right.name)
    })
}

/**
 * Finalizes mutable semantic index into deterministic readonly snapshot.
 *
 * @param index Mutable semantic lookup index.
 * @returns Readonly semantic lookup index.
 */
function finalizeNodeIndex(
    index: Map<string, ICodeGraphNode[]>,
): ReadonlyMap<string, readonly ICodeGraphNode[]> {
    const entries = [...index.entries()]
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, nodes]): [string, readonly ICodeGraphNode[]] => {
            return [key, [...nodes].sort(sortGraphNodesById)]
        })

    return new Map<string, readonly ICodeGraphNode[]>(entries)
}

/**
 * Sorts graph nodes by stable identifier.
 *
 * @param left Left graph node.
 * @param right Right graph node.
 * @returns Stable comparison result.
 */
function sortGraphNodesById(left: ICodeGraphNode, right: ICodeGraphNode): number {
    return left.id.localeCompare(right.id)
}
