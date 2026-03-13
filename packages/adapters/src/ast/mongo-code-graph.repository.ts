import {CODE_GRAPH_EDGE_TYPE} from "@codenautic/core"

import type {
    CodeGraph,
    CodeEdge,
    CodeNode,
    CodeGraphEdgeType,
    CodeGraphNodeType,
    CodeGraphNodeMetadataValue,
    ICodeGraphEdge,
    ICodeGraphNode,
    IGraphEdgeQueryFilter,
    IGraphPathQuery,
    IGraphPathResult,
    IGraphQueryFilter,
    IGraphRepository,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_REPOSITORY_ERROR_CODE,
    AstCodeGraphRepositoryError,
} from "./mongo-code-graph-repository.error"

/**
 * MongoDB snapshot document for one repository + branch code graph.
 */
export interface IMongoCodeGraphDocument {
    /**
     * Stable repository + branch scope key.
     */
    readonly scopeKey: string

    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repositoryId: string

    /**
     * Optional branch reference for this snapshot.
     */
    readonly branch?: string

    /**
     * Optional graph identifier propagated from the core payload.
     */
    readonly graphId?: string

    /**
     * Optional graph generation timestamp.
     */
    readonly generatedAt?: Date

    /**
     * Persisted graph nodes.
     */
    readonly nodes: readonly ICodeGraphNode[]

    /**
     * Persisted graph edges.
     */
    readonly edges: readonly ICodeGraphEdge[]
}

/**
 * Minimal Mongo-like collection contract used by the graph repository.
 */
export interface IMongoCodeGraphCollection<TDocument> {
    /**
     * Finds one document by filter.
     *
     * @param filter Mongo-like filter object.
     * @returns Matching document or null.
     */
    findOne(filter: Readonly<Record<string, unknown>>): Promise<TDocument | null>

    /**
     * Finds many documents by filter.
     *
     * @param filter Mongo-like filter object.
     * @returns Matching documents.
     */
    find(filter: Readonly<Record<string, unknown>>): Promise<readonly TDocument[]>

    /**
     * Replaces one document by filter, optionally upserting it.
     *
     * @param filter Mongo-like filter object.
     * @param replacement Replacement document.
     * @param options Replace options.
     * @returns Nothing.
     */
    replaceOne(
        filter: Readonly<Record<string, unknown>>,
        replacement: TDocument,
        options: Readonly<{upsert: boolean}>,
    ): Promise<void>
}

/**
 * Constructor options for Mongo code graph repository.
 */
export interface IMongoCodeGraphRepositoryOptions {
    /**
     * Mongo-like collection storing full graph snapshots.
     */
    readonly graphs: IMongoCodeGraphCollection<IMongoCodeGraphDocument>
}

/**
 * Mongo-backed snapshot repository for persisted code graphs.
 */
export class MongoCodeGraphRepository implements IGraphRepository {
    private readonly graphs: IMongoCodeGraphCollection<IMongoCodeGraphDocument>

    /**
     * Creates Mongo code graph repository.
     *
     * @param options Repository dependencies.
     */
    public constructor(options: IMongoCodeGraphRepositoryOptions) {
        this.graphs = options.graphs
    }

    /**
     * Loads graph snapshot for repository and optional branch.
     *
     * @param repositoryId Repository identifier.
     * @param branch Optional branch reference.
     * @returns Persisted graph snapshot or null.
     */
    public async loadGraph(
        repositoryId: string,
        branch?: string,
    ): Promise<CodeGraph | null> {
        const normalizedRepositoryId = normalizeRepositoryId(repositoryId)
        const normalizedBranch = normalizeOptionalBranch(branch)
        const document = await this.graphs.findOne({
            scopeKey: createGraphScopeKey(normalizedRepositoryId, normalizedBranch),
        })

        return document === null ? null : mapMongoDocumentToGraph(document)
    }

    /**
     * Persists full graph snapshot for repository and optional branch.
     *
     * @param repositoryId Repository identifier.
     * @param graph Graph snapshot to persist.
     * @param branch Optional branch reference.
     * @returns Nothing.
     */
    public async saveGraph(
        repositoryId: string,
        graph: CodeGraph,
        branch?: string,
    ): Promise<void> {
        const normalizedRepositoryId = normalizeRepositoryId(repositoryId)
        const normalizedBranch = normalizeOptionalBranch(branch)
        validateCodeGraphSnapshot(graph)
        const document = mapGraphToMongoDocument(
            normalizedRepositoryId,
            normalizedBranch,
            graph,
        )

        await this.graphs.replaceOne(
            {
                scopeKey: document.scopeKey,
            },
            document,
            {
                upsert: true,
            },
        )
    }

    /**
     * Queries persisted nodes across stored graph snapshots.
     *
     * @param filter Optional node filters.
     * @returns Matching nodes in deterministic order.
     */
    public async queryNodes(filter: IGraphQueryFilter): Promise<readonly CodeNode[]> {
        const normalizedFilter = normalizeGraphQueryFilter(filter)
        const documents = await this.graphs.find(
            buildSnapshotFilter(
                normalizedFilter.repositoryId,
                normalizedFilter.branch,
            ),
        )
        const nodes = documents.flatMap((document): readonly ICodeGraphNode[] => {
            return document.nodes
        })

        return nodes
            .filter((node): boolean => {
                return matchesGraphQueryFilter(node, normalizedFilter)
            })
            .map(cloneCodeGraphNode)
            .sort(compareCodeGraphNode)
    }

    /**
     * Queries persisted edges across stored graph snapshots.
     *
     * @param filter Optional edge filters.
     * @returns Matching edges in deterministic order.
     */
    public async queryEdges(
        filter: IGraphEdgeQueryFilter,
    ): Promise<readonly CodeEdge[]> {
        const normalizedFilter = normalizeGraphEdgeQueryFilter(filter)
        const documents = await this.graphs.find(
            buildSnapshotFilter(
                normalizedFilter.repositoryId,
                normalizedFilter.branch,
            ),
        )

        return documents
            .flatMap((document): readonly CodeEdge[] => {
                const nodeById = createNodeLookup(document.nodes)

                return document.edges
                    .filter((edge): boolean => {
                        return matchesGraphEdgeQueryFilter(
                            edge,
                            nodeById,
                            normalizedFilter,
                        )
                    })
                    .map(cloneCodeGraphEdge)
            })
            .sort(compareCodeGraphEdge)
    }

    /**
     * Queries bounded deterministic paths inside one repository snapshot.
     *
     * @param query Path query options.
     * @returns Matching graph paths ordered by length and traversal order.
     */
    public async queryPaths(
        query: IGraphPathQuery,
    ): Promise<readonly IGraphPathResult[]> {
        const normalizedQuery = normalizeGraphPathQuery(query)
        const graph = await this.loadGraph(
            normalizedQuery.repositoryId,
            normalizedQuery.branch,
        )

        if (graph === null) {
            return []
        }

        const nodeById = createNodeLookup(graph.nodes)
        if (
            nodeById.has(normalizedQuery.sourceNodeId) === false ||
            nodeById.has(normalizedQuery.targetNodeId) === false
        ) {
            return []
        }

        return resolveGraphPaths(graph, normalizedQuery)
    }
}

/**
 * Validates graph snapshot before persistence.
 *
 * @param graph Graph snapshot to validate.
 * @returns Nothing.
 */
function validateCodeGraphSnapshot(graph: CodeGraph): void {
    const nodeIds = collectValidatedNodeIds(graph.nodes)

    for (const edge of graph.edges) {
        validateCodeGraphEdge(edge, nodeIds)
    }
}

/**
 * Validates graph nodes and collects unique ids.
 *
 * @param nodes Graph nodes.
 * @returns Unique node id set.
 */
function collectValidatedNodeIds(nodes: readonly ICodeGraphNode[]): ReadonlySet<string> {
    const nodeIds = new Set<string>()

    for (const node of nodes) {
        validateCodeGraphNode(node)

        if (nodeIds.has(node.id)) {
            throw new AstCodeGraphRepositoryError(
                AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.DUPLICATE_NODE_ID,
                {
                    nodeId: node.id,
                },
            )
        }

        nodeIds.add(node.id)
    }

    return nodeIds
}

/**
 * Validates one graph node.
 *
 * @param node Graph node candidate.
 * @returns Nothing.
 */
function validateCodeGraphNode(node: ICodeGraphNode): void {
    try {
        normalizeRequiredText(node.id, "nodeId")
        normalizeRequiredText(node.type, "nodeType")
        normalizeRequiredText(node.name, "nodeName")
        normalizeRequiredText(node.filePath, "filePath")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_GRAPH_NODE,
            {
                nodeId: node.id,
                filePath: node.filePath,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }
}

/**
 * Validates one graph edge and its referential integrity.
 *
 * @param edge Graph edge candidate.
 * @param nodeIds Known graph node ids.
 * @returns Nothing.
 */
function validateCodeGraphEdge(
    edge: ICodeGraphEdge,
    nodeIds: ReadonlySet<string>,
): void {
    const sourceNodeId = normalizeRequiredText(edge.source, "sourceNodeId")
    const targetNodeId = normalizeRequiredText(edge.target, "targetNodeId")

    try {
        normalizeRequiredText(edge.type, "edgeType")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_GRAPH_EDGE,
            {
                sourceNodeId,
                targetNodeId,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }

    if (nodeIds.has(sourceNodeId) && nodeIds.has(targetNodeId)) {
        return
    }

    throw new AstCodeGraphRepositoryError(
        AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.EDGE_REFERENTIAL_INTEGRITY_VIOLATION,
        {
            sourceNodeId,
            targetNodeId,
        },
    )
}

/**
 * Maps persisted Mongo snapshot document back to core graph payload.
 *
 * @param document Mongo snapshot document.
 * @returns Core graph payload.
 */
function mapMongoDocumentToGraph(document: IMongoCodeGraphDocument): CodeGraph {
    return {
        id: document.graphId,
        generatedAt: document.generatedAt === undefined
            ? undefined
            : new Date(document.generatedAt.getTime()),
        nodes: document.nodes.map(cloneCodeGraphNode),
        edges: document.edges.map(cloneCodeGraphEdge),
    }
}

/**
 * Maps core graph payload to persisted Mongo snapshot document.
 *
 * @param repositoryId Normalized repository identifier.
 * @param branch Normalized optional branch reference.
 * @param graph Core graph payload.
 * @returns Mongo snapshot document.
 */
function mapGraphToMongoDocument(
    repositoryId: string,
    branch: string | undefined,
    graph: CodeGraph,
): IMongoCodeGraphDocument {
    return {
        scopeKey: createGraphScopeKey(repositoryId, branch),
        repositoryId,
        branch,
        graphId: graph.id,
        generatedAt: graph.generatedAt === undefined
            ? undefined
            : new Date(graph.generatedAt.getTime()),
        nodes: graph.nodes.map(cloneCodeGraphNode),
        edges: graph.edges.map(cloneCodeGraphEdge),
    }
}

/**
 * Clones one code graph node to keep repository boundaries immutable.
 *
 * @param node Graph node.
 * @returns Cloned graph node.
 */
function cloneCodeGraphNode(node: ICodeGraphNode): ICodeGraphNode {
    return {
        id: node.id,
        type: node.type,
        name: node.name,
        filePath: node.filePath,
        metadata: cloneCodeGraphNodeMetadata(node.metadata),
    }
}

/**
 * Clones optional node metadata object.
 *
 * @param metadata Optional node metadata.
 * @returns Cloned metadata object or undefined.
 */
function cloneCodeGraphNodeMetadata(
    metadata: Record<string, CodeGraphNodeMetadataValue> | undefined,
): Record<string, CodeGraphNodeMetadataValue> | undefined {
    if (metadata === undefined) {
        return undefined
    }

    return Object.fromEntries(Object.entries(metadata))
}

/**
 * Clones one code graph edge.
 *
 * @param edge Graph edge.
 * @returns Cloned graph edge.
 */
function cloneCodeGraphEdge(edge: ICodeGraphEdge): ICodeGraphEdge {
    return {
        source: edge.source,
        target: edge.target,
        type: edge.type,
    }
}

/**
 * Builds node lookup map by identifier.
 *
 * @param nodes Graph nodes.
 * @returns Node lookup map.
 */
function createNodeLookup(
    nodes: readonly ICodeGraphNode[],
): ReadonlyMap<string, ICodeGraphNode> {
    return new Map(
        nodes.map((node): readonly [string, ICodeGraphNode] => {
            return [node.id, node]
        }),
    )
}

/**
 * Checks whether node matches query filter.
 *
 * @param node Graph node candidate.
 * @param filter Normalized query filter.
 * @returns True when node matches filter.
 */
function matchesGraphQueryFilter(
    node: ICodeGraphNode,
    filter: Readonly<{
        repositoryId?: string
        branch?: string
        type?: CodeGraphNodeType
        filePath?: string
    }>,
): boolean {
    if (filter.type !== undefined && node.type !== filter.type) {
        return false
    }

    if (filter.filePath !== undefined && node.filePath !== filter.filePath) {
        return false
    }

    return true
}

/**
 * Checks whether edge matches query filter.
 *
 * @param edge Graph edge candidate.
 * @param nodeById Node lookup for endpoint file path checks.
 * @param filter Normalized query filter.
 * @returns True when edge matches filter.
 */
function matchesGraphEdgeQueryFilter(
    edge: ICodeGraphEdge,
    nodeById: ReadonlyMap<string, ICodeGraphNode>,
    filter: Readonly<{
        repositoryId?: string
        branch?: string
        type?: CodeGraphEdgeType
        sourceNodeId?: string
        targetNodeId?: string
        nodeId?: string
        filePath?: string
    }>,
): boolean {
    return (
        matchesOptionalEdgeTypeFilter(edge, filter.type) &&
        matchesOptionalSourceNodeFilter(edge, filter.sourceNodeId) &&
        matchesOptionalTargetNodeFilter(edge, filter.targetNodeId) &&
        matchesOptionalEndpointNodeFilter(edge, filter.nodeId) &&
        matchesOptionalEndpointFilePathFilter(edge, nodeById, filter.filePath)
    )
}

/**
 * Checks optional edge type constraint.
 *
 * @param edge Graph edge candidate.
 * @param edgeType Optional expected edge type.
 * @returns True when type matches or filter is absent.
 */
function matchesOptionalEdgeTypeFilter(
    edge: ICodeGraphEdge,
    edgeType: CodeGraphEdgeType | undefined,
): boolean {
    return edgeType === undefined || edge.type === edgeType
}

/**
 * Checks optional edge source-node constraint.
 *
 * @param edge Graph edge candidate.
 * @param sourceNodeId Optional expected source node id.
 * @returns True when source matches or filter is absent.
 */
function matchesOptionalSourceNodeFilter(
    edge: ICodeGraphEdge,
    sourceNodeId: string | undefined,
): boolean {
    return sourceNodeId === undefined || edge.source === sourceNodeId
}

/**
 * Checks optional edge target-node constraint.
 *
 * @param edge Graph edge candidate.
 * @param targetNodeId Optional expected target node id.
 * @returns True when target matches or filter is absent.
 */
function matchesOptionalTargetNodeFilter(
    edge: ICodeGraphEdge,
    targetNodeId: string | undefined,
): boolean {
    return targetNodeId === undefined || edge.target === targetNodeId
}

/**
 * Checks optional endpoint node-id constraint.
 *
 * @param edge Graph edge candidate.
 * @param nodeId Optional expected node id on either endpoint.
 * @returns True when endpoint matches or filter is absent.
 */
function matchesOptionalEndpointNodeFilter(
    edge: ICodeGraphEdge,
    nodeId: string | undefined,
): boolean {
    return nodeId === undefined || edge.source === nodeId || edge.target === nodeId
}

/**
 * Checks optional endpoint file-path constraint.
 *
 * @param edge Graph edge candidate.
 * @param nodeById Node lookup for endpoint file paths.
 * @param filePath Optional expected endpoint file path.
 * @returns True when endpoint matches or filter is absent.
 */
function matchesOptionalEndpointFilePathFilter(
    edge: ICodeGraphEdge,
    nodeById: ReadonlyMap<string, ICodeGraphNode>,
    filePath: string | undefined,
): boolean {
    if (filePath === undefined) {
        return true
    }

    return (
        nodeById.get(edge.source)?.filePath === filePath ||
        nodeById.get(edge.target)?.filePath === filePath
    )
}

/**
 * Orders graph nodes deterministically for stable queries.
 *
 * @param left Left graph node.
 * @param right Right graph node.
 * @returns Sort comparison result.
 */
function compareCodeGraphNode(left: ICodeGraphNode, right: ICodeGraphNode): number {
    if (left.filePath !== right.filePath) {
        return left.filePath.localeCompare(right.filePath)
    }

    if (left.type !== right.type) {
        return left.type.localeCompare(right.type)
    }

    return left.id.localeCompare(right.id)
}

/**
 * Orders graph edges deterministically for stable queries and traversal.
 *
 * @param left Left graph edge.
 * @param right Right graph edge.
 * @returns Sort comparison result.
 */
function compareCodeGraphEdge(left: ICodeGraphEdge, right: ICodeGraphEdge): number {
    if (left.source !== right.source) {
        return left.source.localeCompare(right.source)
    }

    if (left.target !== right.target) {
        return left.target.localeCompare(right.target)
    }

    return left.type.localeCompare(right.type)
}

/**
 * Normalizes graph query filter.
 *
 * @param filter Raw query filter.
 * @returns Normalized query filter.
 */
function normalizeGraphQueryFilter(
    filter: IGraphQueryFilter,
): Readonly<{
    repositoryId?: string
    branch?: string
    type?: CodeGraphNodeType
    filePath?: string
}> {
    if (filter.filePath === undefined) {
        return {
            repositoryId: normalizeOptionalRepositoryId(filter.repositoryId),
            branch: normalizeOptionalBranch(filter.branch),
            type: filter.type,
        }
    }

    return {
        repositoryId: normalizeOptionalRepositoryId(filter.repositoryId),
        branch: normalizeOptionalBranch(filter.branch),
        type: filter.type,
        filePath: normalizeFilePath(filter.filePath),
    }
}

/**
 * Normalizes graph edge query filter.
 *
 * @param filter Raw edge query filter.
 * @returns Normalized edge query filter.
 */
function normalizeGraphEdgeQueryFilter(
    filter: IGraphEdgeQueryFilter,
): Readonly<{
    repositoryId?: string
    branch?: string
    type?: CodeGraphEdgeType
    sourceNodeId?: string
    targetNodeId?: string
    nodeId?: string
    filePath?: string
}> {
    return {
        repositoryId: normalizeOptionalRepositoryId(filter.repositoryId),
        branch: normalizeOptionalBranch(filter.branch),
        type: normalizeOptionalEdgeType(filter.type),
        sourceNodeId: normalizeOptionalNodeId(filter.sourceNodeId),
        targetNodeId: normalizeOptionalNodeId(filter.targetNodeId),
        nodeId: normalizeOptionalNodeId(filter.nodeId),
        filePath: normalizeOptionalFilePath(filter.filePath),
    }
}

/**
 * Normalizes bounded graph path query input.
 *
 * @param query Raw path query.
 * @returns Normalized path query.
 */
function normalizeGraphPathQuery(
    query: IGraphPathQuery,
): Readonly<{
    repositoryId: string
    branch?: string
    sourceNodeId: string
    targetNodeId: string
    edgeTypes?: readonly CodeGraphEdgeType[]
    maxDepth: number
    maxPaths: number
}> {
    return {
        repositoryId: normalizeRepositoryId(query.repositoryId),
        branch: normalizeOptionalBranch(query.branch),
        sourceNodeId: normalizeNodeId(query.sourceNodeId),
        targetNodeId: normalizeNodeId(query.targetNodeId),
        edgeTypes: normalizeOptionalEdgeTypeList(query.edgeTypes),
        maxDepth: normalizePositiveInteger(
            query.maxDepth,
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_MAX_DEPTH,
            "maxDepth",
        ) ?? 4,
        maxPaths: normalizePositiveInteger(
            query.maxPaths,
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_MAX_PATHS,
            "maxPaths",
        ) ?? 10,
    }
}

/**
 * Resolves bounded deterministic paths inside one graph snapshot.
 *
 * @param graph Graph snapshot.
 * @param query Normalized path query.
 * @returns Matching graph paths.
 */
function resolveGraphPaths(
    graph: CodeGraph,
    query: Readonly<{
        repositoryId: string
        branch?: string
        sourceNodeId: string
        targetNodeId: string
        edgeTypes?: readonly CodeGraphEdgeType[]
        maxDepth: number
        maxPaths: number
    }>,
): readonly IGraphPathResult[] {
    const nodeById = createNodeLookup(graph.nodes)
    const adjacency = buildPathAdjacency(graph.edges, query.edgeTypes)
    const queue: Array<{
        readonly nodeIds: readonly string[]
        readonly edges: readonly ICodeGraphEdge[]
    }> = [{
        nodeIds: [query.sourceNodeId],
        edges: [],
    }]
    const paths: IGraphPathResult[] = []

    while (queue.length > 0 && paths.length < query.maxPaths) {
        const current = queue.shift()
        if (current === undefined) {
            continue
        }

        const currentNodeId = current.nodeIds.at(-1)
        if (currentNodeId === undefined) {
            continue
        }

        if (currentNodeId === query.targetNodeId) {
            paths.push({
                nodes: current.nodeIds.map((nodeId): ICodeGraphNode => {
                    const node = nodeById.get(nodeId)

                    if (node === undefined) {
                        throw new AstCodeGraphRepositoryError(
                            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.EDGE_REFERENTIAL_INTEGRITY_VIOLATION,
                            {
                                sourceNodeId: current.nodeIds[0],
                                targetNodeId: nodeId,
                            },
                        )
                    }

                    return cloneCodeGraphNode(node)
                }),
                edges: current.edges.map(cloneCodeGraphEdge),
            })
            continue
        }

        if (current.edges.length >= query.maxDepth) {
            continue
        }

        const nextEdges = adjacency.get(currentNodeId) ?? []
        for (const edge of nextEdges) {
            if (current.nodeIds.includes(edge.target)) {
                continue
            }

            queue.push({
                nodeIds: [...current.nodeIds, edge.target],
                edges: [...current.edges, edge],
            })
        }
    }

    return paths
}

/**
 * Builds deterministic adjacency for bounded path traversal.
 *
 * @param edges Graph edges.
 * @param edgeTypes Optional allowed edge types.
 * @returns Sorted adjacency map.
 */
function buildPathAdjacency(
    edges: readonly ICodeGraphEdge[],
    edgeTypes: readonly CodeGraphEdgeType[] | undefined,
): ReadonlyMap<string, readonly ICodeGraphEdge[]> {
    const allowedEdgeTypes = edgeTypes === undefined ? undefined : new Set(edgeTypes)
    const adjacency = new Map<string, ICodeGraphEdge[]>()

    for (const edge of edges) {
        if (
            allowedEdgeTypes !== undefined &&
            allowedEdgeTypes.has(edge.type) === false
        ) {
            continue
        }

        const currentEdges = adjacency.get(edge.source) ?? []
        currentEdges.push(edge)
        currentEdges.sort(compareCodeGraphEdge)
        adjacency.set(edge.source, currentEdges)
    }

    return adjacency
}

/**
 * Normalizes repository identifier.
 *
 * @param repositoryId Raw repository identifier.
 * @returns Trimmed repository identifier.
 */
function normalizeRepositoryId(repositoryId: string): string {
    try {
        return normalizeRequiredText(repositoryId, "repositoryId")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_REPOSITORY_ID,
            {
                repositoryId,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }
}

/**
 * Normalizes optional repository identifier.
 *
 * @param repositoryId Optional repository identifier.
 * @returns Normalized repository identifier or undefined.
 */
function normalizeOptionalRepositoryId(
    repositoryId: string | undefined,
): string | undefined {
    if (repositoryId === undefined) {
        return undefined
    }

    return normalizeRepositoryId(repositoryId)
}

/**
 * Normalizes optional branch reference.
 *
 * @param branch Optional branch reference.
 * @returns Normalized branch or undefined.
 */
function normalizeOptionalBranch(branch: string | undefined): string | undefined {
    if (branch === undefined) {
        return undefined
    }

    try {
        return normalizeRequiredText(branch, "branch")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_BRANCH,
            {
                branch,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }
}

/**
 * Normalizes repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return normalizeRequiredText(filePath, "filePath")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_FILE_PATH,
            {
                filePath,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }
}

/**
 * Normalizes optional file path.
 *
 * @param filePath Optional file path.
 * @returns Normalized file path or undefined.
 */
function normalizeOptionalFilePath(
    filePath: string | undefined,
): string | undefined {
    if (filePath === undefined) {
        return undefined
    }

    return normalizeFilePath(filePath)
}

/**
 * Normalizes graph node identifier.
 *
 * @param nodeId Raw node identifier.
 * @returns Normalized node identifier.
 */
function normalizeNodeId(nodeId: string): string {
    try {
        return normalizeRequiredText(nodeId, "nodeId")
    } catch (error) {
        throw new AstCodeGraphRepositoryError(
            AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_NODE_ID,
            {
                nodeId,
                causeMessage: error instanceof Error ? error.message : String(error),
            },
        )
    }
}

/**
 * Normalizes optional graph node identifier.
 *
 * @param nodeId Optional node identifier.
 * @returns Normalized node identifier or undefined.
 */
function normalizeOptionalNodeId(nodeId: string | undefined): string | undefined {
    if (nodeId === undefined) {
        return undefined
    }

    return normalizeNodeId(nodeId)
}

/**
 * Normalizes optional edge type.
 *
 * @param edgeType Optional edge type.
 * @returns Normalized edge type or undefined.
 */
function normalizeOptionalEdgeType(
    edgeType: CodeGraphEdgeType | undefined,
): CodeGraphEdgeType | undefined {
    if (edgeType === undefined) {
        return undefined
    }

    if (Object.values(CODE_GRAPH_EDGE_TYPE).includes(edgeType)) {
        return edgeType
    }

    throw new AstCodeGraphRepositoryError(
        AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_EDGE_TYPE,
        {
            edgeType,
        },
    )
}

/**
 * Normalizes optional edge type list with stable deduplication.
 *
 * @param edgeTypes Optional edge type list.
 * @returns Normalized edge type list or undefined.
 */
function normalizeOptionalEdgeTypeList(
    edgeTypes: readonly CodeGraphEdgeType[] | undefined,
): readonly CodeGraphEdgeType[] | undefined {
    if (edgeTypes === undefined) {
        return undefined
    }

    const normalizedEdgeTypes = new Set<CodeGraphEdgeType>()

    for (const edgeType of edgeTypes) {
        const normalizedEdgeType = normalizeOptionalEdgeType(edgeType)
        if (normalizedEdgeType === undefined) {
            continue
        }

        normalizedEdgeTypes.add(normalizedEdgeType)
    }

    return normalizedEdgeTypes.size > 0 ? Array.from(normalizedEdgeTypes) : undefined
}

/**
 * Normalizes positive integer bounds used by graph queries.
 *
 * @param value Optional numeric value.
 * @param code Typed repository error code.
 * @param fieldName Field label.
 * @returns Normalized positive integer or undefined.
 */
function normalizePositiveInteger(
    value: number | undefined,
    code: typeof AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_MAX_DEPTH
        | typeof AST_CODE_GRAPH_REPOSITORY_ERROR_CODE.INVALID_MAX_PATHS,
    fieldName: string,
): number | undefined {
    if (value === undefined) {
        return undefined
    }

    if (Number.isInteger(value) && value > 0) {
        return value
    }

    throw new AstCodeGraphRepositoryError(code, {
        numericValue: value,
        causeMessage: `${fieldName} must be positive integer`,
    })
}

/**
 * Builds Mongo-like snapshot filter for repository-scoped queries.
 *
 * @param repositoryId Optional normalized repository identifier.
 * @param branch Optional normalized branch reference.
 * @returns Mongo-like snapshot filter.
 */
function buildSnapshotFilter(
    repositoryId: string | undefined,
    branch: string | undefined,
): Readonly<Record<string, unknown>> {
    return {
        ...(repositoryId === undefined ? {} : {repositoryId}),
        ...(branch === undefined ? {} : {branch}),
    }
}

/**
 * Creates stable repository + branch scope key.
 *
 * @param repositoryId Normalized repository identifier.
 * @param branch Normalized optional branch reference.
 * @returns Stable scope key.
 */
function createGraphScopeKey(
    repositoryId: string,
    branch: string | undefined,
): string {
    return `${repositoryId}@${branch ?? "<default>"}`
}

/**
 * Normalizes required text fields.
 *
 * @param value Raw string value.
 * @param fieldName Field label.
 * @returns Trimmed non-empty string.
 */
function normalizeRequiredText(value: string, fieldName: string): string {
    const normalizedValue = value.trim()

    if (normalizedValue.length === 0) {
        throw new Error(`${fieldName} cannot be empty`)
    }

    return normalizedValue
}
