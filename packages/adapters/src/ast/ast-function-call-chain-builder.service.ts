import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    FilePath,
    type ICodeGraphEdge,
    type ICodeGraphNode,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {AstCodeGraphBuilder, type IAstCodeGraphBuilder} from "./ast-code-graph.builder"
import {AstCodeGraphEnricher, type IAstCodeGraphEnricher} from "./ast-code-graph.enricher"
import {
    AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE,
    AstFunctionCallChainBuilderError,
} from "./ast-function-call-chain-builder.error"

const DEFAULT_MAX_DEPTH = 2
const DEFAULT_MAX_CHAINS = 250
const INTERNAL_REPOSITORY_ID = "gh:ast-function-call-chain-builder"
const INTERNAL_BRANCH = "analysis"

/**
 * One function node in resolved call chain path.
 */
export interface IAstFunctionCallChainNode {
    /**
     * Stable graph node id for function declaration.
     */
    readonly nodeId: string

    /**
     * Repository-relative file path that owns function declaration.
     */
    readonly filePath: string

    /**
     * Function or method name.
     */
    readonly functionName: string

    /**
     * Optional class name for methods.
     */
    readonly parentClassName?: string

    /**
     * 1-based source-code line where function starts.
     */
    readonly lineStart: number
}

/**
 * One resolved function call chain.
 */
export interface IAstFunctionCallChain {
    /**
     * Stable deterministic chain identifier.
     */
    readonly id: string

    /**
     * Ordered chain of caller-to-callee function nodes.
     */
    readonly nodes: readonly IAstFunctionCallChainNode[]

    /**
     * Number of call hops in chain.
     */
    readonly depth: number
}

/**
 * Aggregated summary for one function call chain build run.
 */
export interface IAstFunctionCallChainBuilderSummary {
    /**
     * Number of analyzed parsed files.
     */
    readonly analyzedFileCount: number

    /**
     * Number of start functions selected for traversal.
     */
    readonly startFunctionCount: number

    /**
     * Number of resolved call chains.
     */
    readonly chainCount: number

    /**
     * Maximum chain depth observed among resolved chains.
     */
    readonly longestChainDepth: number

    /**
     * Indicates whether traversal was truncated by max chain limit.
     */
    readonly truncated: boolean
}

/**
 * Input payload for function call chain build run.
 */
export interface IAstFunctionCallChainBuilderInput {
    /**
     * Parsed source files used for call-chain resolution.
     */
    readonly files: readonly IParsedSourceFileDTO[]

    /**
     * Optional source file-path batch filter for chain starting points.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional maximum chain depth in call hops.
     */
    readonly maxDepth?: number

    /**
     * Optional maximum number of emitted chains.
     */
    readonly maxChains?: number
}

/**
 * Output payload for function call chain build run.
 */
export interface IAstFunctionCallChainBuilderResult {
    /**
     * Deterministic function call chains.
     */
    readonly chains: readonly IAstFunctionCallChain[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstFunctionCallChainBuilderSummary
}

/**
 * Construction options for function call chain builder service.
 */
export interface IAstFunctionCallChainBuilderServiceOptions {
    /**
     * Optional graph builder override.
     */
    readonly graphBuilder?: IAstCodeGraphBuilder

    /**
     * Optional graph enricher override.
     */
    readonly graphEnricher?: IAstCodeGraphEnricher

    /**
     * Optional default chain depth in call hops.
     */
    readonly defaultMaxDepth?: number

    /**
     * Optional default cap of emitted chains.
     */
    readonly defaultMaxChains?: number
}

/**
 * Function call chain builder contract.
 */
export interface IAstFunctionCallChainBuilderService {
    /**
     * Builds deterministic function call chains from parsed source files.
     *
     * @param input Runtime call-chain settings.
     * @returns Deterministic function call chain payload.
     */
    build(
        input: IAstFunctionCallChainBuilderInput,
    ): Promise<IAstFunctionCallChainBuilderResult>
}

interface IResolvedFunctionCallChainConfig {
    readonly filePaths?: readonly string[]
    readonly maxDepth: number
    readonly maxChains: number
}

interface INormalizedParsedSourceFile extends IParsedSourceFileDTO {
    readonly filePath: string
}

interface ICallChainWalkState {
    readonly chainsById: Map<string, IAstFunctionCallChain>
    truncated: boolean
}

interface ICallChainWalkContext {
    readonly functionNodesById: ReadonlyMap<string, ICodeGraphNode>
    readonly outgoingCallsBySourceNodeId: ReadonlyMap<string, readonly string[]>
    readonly maxDepth: number
    readonly maxChains: number
    readonly state: ICallChainWalkState
}

/**
 * Builds deterministic function call chains over enriched AST call graph.
 */
export class AstFunctionCallChainBuilderService implements IAstFunctionCallChainBuilderService {
    private readonly graphBuilder: IAstCodeGraphBuilder
    private readonly graphEnricher: IAstCodeGraphEnricher
    private readonly defaultMaxDepth: number
    private readonly defaultMaxChains: number

    /**
     * Creates function call chain builder service.
     *
     * @param options Optional service defaults.
     */
    public constructor(options: IAstFunctionCallChainBuilderServiceOptions = {}) {
        this.graphBuilder = options.graphBuilder ?? new AstCodeGraphBuilder()
        this.graphEnricher = options.graphEnricher ?? new AstCodeGraphEnricher()
        this.defaultMaxDepth = validateMaxDepth(options.defaultMaxDepth ?? DEFAULT_MAX_DEPTH)
        this.defaultMaxChains = validateMaxChains(options.defaultMaxChains ?? DEFAULT_MAX_CHAINS)
    }

    /**
     * Builds deterministic call chains from parsed files and optional runtime overrides.
     *
     * @param input Runtime call-chain settings.
     * @returns Deterministic call-chain payload.
     */
    public build(
        input: IAstFunctionCallChainBuilderInput,
    ): Promise<IAstFunctionCallChainBuilderResult> {
        const files = normalizeParsedSourceFiles(input.files)
        const config = this.resolveConfig(input)
        const startFilePaths = resolveStartFilePathSet(files, config.filePaths)
        const builtGraph = this.graphBuilder.build({
            repositoryId: INTERNAL_REPOSITORY_ID,
            branch: INTERNAL_BRANCH,
            files,
        })
        const enrichedGraph = this.graphEnricher.enrich({
            graph: builtGraph,
            files,
        })
        const functionNodesById = createFunctionNodeLookup(enrichedGraph.graph.nodes)
        const outgoingCallsBySourceNodeId = createOutgoingCallLookup(
            enrichedGraph.edgesByType.get(CODE_GRAPH_EDGE_TYPE.CALLS) ?? [],
        )
        const startNodeIds = resolveStartNodeIds(functionNodesById, startFilePaths)
        const walkState = collectCallChains(
            startNodeIds,
            functionNodesById,
            outgoingCallsBySourceNodeId,
            config.maxDepth,
            config.maxChains,
        )
        const chains = [...walkState.chainsById.values()].sort(compareChains)

        return Promise.resolve({
            chains,
            summary: createSummary(
                files.length,
                startNodeIds.length,
                chains,
                walkState.truncated,
            ),
        })
    }

    /**
     * Resolves runtime call-chain config with validated defaults.
     *
     * @param input Runtime call-chain settings.
     * @returns Validated run config.
     */
    private resolveConfig(input: IAstFunctionCallChainBuilderInput): IResolvedFunctionCallChainConfig {
        return {
            filePaths: normalizeFilePathFilter(input.filePaths),
            maxDepth: validateMaxDepth(input.maxDepth ?? this.defaultMaxDepth),
            maxChains: validateMaxChains(input.maxChains ?? this.defaultMaxChains),
        }
    }
}

/**
 * Validates one max-depth value.
 *
 * @param maxDepth Raw max depth.
 * @returns Validated max depth.
 */
function validateMaxDepth(maxDepth: number): number {
    if (Number.isSafeInteger(maxDepth) === false || maxDepth < 1) {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_MAX_DEPTH,
            {maxDepth},
        )
    }

    return maxDepth
}

/**
 * Validates one max-chains cap.
 *
 * @param maxChains Raw max chains value.
 * @returns Validated max chains value.
 */
function validateMaxChains(maxChains: number): number {
    if (Number.isSafeInteger(maxChains) === false || maxChains < 1) {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_MAX_CHAINS,
            {maxChains},
        )
    }

    return maxChains
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw filter paths.
 * @returns Sorted unique normalized file paths or undefined.
 */
function normalizeFilePathFilter(filePaths: readonly string[] | undefined): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalized = new Set<string>()

    for (const filePath of filePaths) {
        normalized.add(normalizeFilePath(filePath))
    }

    return [...normalized].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes parsed-file input and validates duplicate file paths.
 *
 * @param files Parsed source files.
 * @returns Sorted normalized parsed files.
 */
function normalizeParsedSourceFiles(
    files: readonly IParsedSourceFileDTO[],
): readonly INormalizedParsedSourceFile[] {
    if (files.length === 0) {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.EMPTY_FILES,
        )
    }

    const normalizedFiles: INormalizedParsedSourceFile[] = []
    const seenPaths = new Set<string>()

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)

        if (seenPaths.has(filePath)) {
            throw new AstFunctionCallChainBuilderError(
                AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath},
            )
        }

        seenPaths.add(filePath)
        normalizedFiles.push({
            ...file,
            filePath,
        })
    }

    return normalizedFiles.sort((left, right) => left.filePath.localeCompare(right.filePath))
}

/**
 * Normalizes one repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized repository-relative file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Resolves file-path scope used for chain starting points.
 *
 * @param files Normalized parsed files.
 * @param filePaths Optional normalized file-path filter.
 * @returns Start file-path set.
 */
function resolveStartFilePathSet(
    files: readonly INormalizedParsedSourceFile[],
    filePaths: readonly string[] | undefined,
): ReadonlySet<string> {
    const available = new Set<string>(files.map((file) => file.filePath))
    if (filePaths === undefined) {
        return available
    }

    const scoped = new Set<string>()
    for (const filePath of filePaths) {
        if (available.has(filePath)) {
            scoped.add(filePath)
        }
    }

    return scoped
}

/**
 * Creates lookup of function graph nodes by node id.
 *
 * @param nodes Graph nodes.
 * @returns Immutable function node lookup.
 */
function createFunctionNodeLookup(nodes: readonly ICodeGraphNode[]): ReadonlyMap<string, ICodeGraphNode> {
    const entries: Array<readonly [string, ICodeGraphNode]> = []

    for (const node of nodes) {
        if (node.type !== CODE_GRAPH_NODE_TYPE.FUNCTION) {
            continue
        }

        entries.push([node.id, node])
    }

    return new Map(entries.sort(([left], [right]) => left.localeCompare(right)))
}

/**
 * Creates lookup of outgoing CALLS targets by source function node id.
 *
 * @param edges CALLS graph edges.
 * @returns Immutable outgoing-calls lookup.
 */
function createOutgoingCallLookup(
    edges: readonly ICodeGraphEdge[],
): ReadonlyMap<string, readonly string[]> {
    const mutableLookup = new Map<string, Set<string>>()

    for (const edge of edges) {
        const bucket = mutableLookup.get(edge.source)

        if (bucket === undefined) {
            mutableLookup.set(edge.source, new Set<string>([edge.target]))
            continue
        }

        bucket.add(edge.target)
    }

    const entries: Array<readonly [string, readonly string[]]> = []
    for (const [sourceNodeId, targets] of mutableLookup) {
        entries.push([sourceNodeId, [...targets].sort((left, right) => left.localeCompare(right))])
    }

    return new Map(entries.sort(([left], [right]) => left.localeCompare(right)))
}

/**
 * Resolves deterministic list of start function node ids by file-path scope.
 *
 * @param functionNodesById Function node lookup by id.
 * @param startFilePaths Start file-path scope.
 * @returns Sorted start node ids.
 */
function resolveStartNodeIds(
    functionNodesById: ReadonlyMap<string, ICodeGraphNode>,
    startFilePaths: ReadonlySet<string>,
): readonly string[] {
    const startNodeIds: string[] = []

    for (const [nodeId, node] of functionNodesById) {
        if (startFilePaths.has(node.filePath)) {
            startNodeIds.push(nodeId)
        }
    }

    return startNodeIds.sort((left, right) => left.localeCompare(right))
}

/**
 * Collects deterministic call chains from start function nodes.
 *
 * @param startNodeIds Start function node ids.
 * @param functionNodesById Function node lookup by id.
 * @param outgoingCallsBySourceNodeId Outgoing calls lookup.
 * @param maxDepth Maximum chain depth.
 * @param maxChains Maximum number of chains.
 * @returns Chain collection state.
 */
function collectCallChains(
    startNodeIds: readonly string[],
    functionNodesById: ReadonlyMap<string, ICodeGraphNode>,
    outgoingCallsBySourceNodeId: ReadonlyMap<string, readonly string[]>,
    maxDepth: number,
    maxChains: number,
): ICallChainWalkState {
    const state: ICallChainWalkState = {
        chainsById: new Map<string, IAstFunctionCallChain>(),
        truncated: false,
    }
    const context: ICallChainWalkContext = {
        functionNodesById,
        outgoingCallsBySourceNodeId,
        maxDepth,
        maxChains,
        state,
    }

    for (const startNodeId of startNodeIds) {
        walkCallChains([startNodeId], 0, context)
        if (state.truncated) {
            break
        }
    }

    return state
}

/**
 * Traverses outgoing call graph recursively and emits deterministic call chains.
 *
 * @param nodePath Ordered function node path.
 * @param depth Current depth in call hops.
 * @param context Walk context.
 */
function walkCallChains(
    nodePath: readonly string[],
    depth: number,
    context: ICallChainWalkContext,
): void {
    if (context.state.truncated) {
        return
    }

    const currentNodeId = nodePath.at(-1)
    if (currentNodeId === undefined) {
        return
    }

    const rawTargets = context.outgoingCallsBySourceNodeId.get(currentNodeId) ?? []
    const nextTargets = rawTargets.filter((targetNodeId) => nodePath.includes(targetNodeId) === false)

    if (depth >= 1 && (depth >= context.maxDepth || nextTargets.length === 0)) {
        addChain(nodePath, context)
        return
    }

    for (const targetNodeId of nextTargets) {
        walkCallChains([...nodePath, targetNodeId], depth + 1, context)
        if (context.state.truncated) {
            return
        }
    }
}

/**
 * Adds one chain to traversal state when it is unique and within max cap.
 *
 * @param nodePath Ordered function node path.
 * @param context Walk context.
 */
function addChain(nodePath: readonly string[], context: ICallChainWalkContext): void {
    if (nodePath.length < 2) {
        return
    }

    const chain = createCallChain(nodePath, context.functionNodesById)
    if (context.state.chainsById.has(chain.id)) {
        return
    }

    if (context.state.chainsById.size >= context.maxChains) {
        context.state.truncated = true
        return
    }

    context.state.chainsById.set(chain.id, chain)
}

/**
 * Creates one call chain from node-id path.
 *
 * @param nodePath Ordered function node path.
 * @param functionNodesById Function node lookup by id.
 * @returns Deterministic call chain.
 */
function createCallChain(
    nodePath: readonly string[],
    functionNodesById: ReadonlyMap<string, ICodeGraphNode>,
): IAstFunctionCallChain {
    const nodes = nodePath.map((nodeId) => {
        return createCallChainNode(resolveFunctionNode(nodeId, functionNodesById))
    })

    return {
        id: nodes.map(createChainNodeReference).join("->"),
        nodes,
        depth: nodes.length - 1,
    }
}

/**
 * Resolves one function graph node from lookup.
 *
 * @param nodeId Function node id.
 * @param functionNodesById Function node lookup by id.
 * @returns Function node.
 */
function resolveFunctionNode(
    nodeId: string,
    functionNodesById: ReadonlyMap<string, ICodeGraphNode>,
): ICodeGraphNode {
    const node = functionNodesById.get(nodeId)
    if (node === undefined) {
        throw new AstFunctionCallChainBuilderError(
            AST_FUNCTION_CALL_CHAIN_BUILDER_ERROR_CODE.FUNCTION_NODE_NOT_FOUND,
            {nodeId},
        )
    }

    return node
}

/**
 * Converts graph node to public call-chain node payload.
 *
 * @param node Function graph node.
 * @returns Public call-chain node payload.
 */
function createCallChainNode(node: ICodeGraphNode): IAstFunctionCallChainNode {
    const lineStart = readMetadataNumber(node, "lineStart") ?? 0

    return {
        nodeId: node.id,
        filePath: node.filePath,
        functionName: node.name,
        ...(readMetadataString(node, "parentClassName") !== undefined
            ? {parentClassName: readMetadataString(node, "parentClassName")}
            : {}),
        lineStart,
    }
}

/**
 * Creates deterministic short reference for one call-chain node.
 *
 * @param node Call-chain node payload.
 * @returns Stable node reference.
 */
function createChainNodeReference(node: IAstFunctionCallChainNode): string {
    const qualifiedName =
        node.parentClassName !== undefined
            ? `${node.parentClassName}.${node.functionName}`
            : node.functionName

    return `${node.filePath}:${qualifiedName}:${node.lineStart}`
}

/**
 * Reads string metadata from one graph node.
 *
 * @param node Graph node.
 * @param key Metadata key.
 * @returns String metadata value when available.
 */
function readMetadataString(node: ICodeGraphNode, key: string): string | undefined {
    const metadata = node.metadata
    if (metadata === undefined) {
        return undefined
    }

    const value = metadata[key]
    return typeof value === "string" ? value : undefined
}

/**
 * Reads numeric metadata from one graph node.
 *
 * @param node Graph node.
 * @param key Metadata key.
 * @returns Numeric metadata value when available.
 */
function readMetadataNumber(node: ICodeGraphNode, key: string): number | undefined {
    const metadata = node.metadata
    if (metadata === undefined) {
        return undefined
    }

    const value = metadata[key]
    return typeof value === "number" ? value : undefined
}

/**
 * Compares two call chains deterministically.
 *
 * @param left Left chain.
 * @param right Right chain.
 * @returns Sort result.
 */
function compareChains(left: IAstFunctionCallChain, right: IAstFunctionCallChain): number {
    return left.id.localeCompare(right.id)
}

/**
 * Creates aggregated summary for call-chain run.
 *
 * @param analyzedFileCount Number of analyzed files.
 * @param startFunctionCount Number of traversal start functions.
 * @param chains Resolved chains.
 * @param truncated Truncation flag.
 * @returns Deterministic summary.
 */
function createSummary(
    analyzedFileCount: number,
    startFunctionCount: number,
    chains: readonly IAstFunctionCallChain[],
    truncated: boolean,
): IAstFunctionCallChainBuilderSummary {
    let longestChainDepth = 0

    for (const chain of chains) {
        if (chain.depth > longestChainDepth) {
            longestChainDepth = chain.depth
        }
    }

    return {
        analyzedFileCount,
        startFunctionCount,
        chainCount: chains.length,
        longestChainDepth,
        truncated,
    }
}
