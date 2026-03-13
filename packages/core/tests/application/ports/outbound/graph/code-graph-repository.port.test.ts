import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type CodeEdge,
    type CodeGraph,
    type CodeGraphEdgeType,
    type CodeNode,
    type ICodeGraphEdge,
    type ICodeGraphNode,
    type IGraphEdgeQueryFilter,
    type IGraphPathQuery,
    type IGraphPathResult,
    type IGraphQueryFilter,
    type IGraphRepository,
} from "../../../../../src"

class InMemoryGraphRepository implements IGraphRepository {
    private readonly graph: CodeGraph

    public constructor(graph: CodeGraph) {
        this.graph = graph
    }

    public loadGraph(_repositoryId: string, _branch?: string): Promise<CodeGraph | null> {
        return Promise.resolve(this.graph)
    }

    public saveGraph(
        _repositoryId: string,
        _graph: CodeGraph,
        _branch?: string,
    ): Promise<void> {
        return Promise.resolve()
    }

    public queryNodes(filter: IGraphQueryFilter): Promise<readonly CodeNode[]> {
        return Promise.resolve(
            this.graph.nodes.filter((node) => {
                if (filter.type !== undefined && node.type !== filter.type) {
                    return false
                }

                if (filter.filePath !== undefined && node.filePath !== filter.filePath) {
                    return false
                }

                return true
            }),
        )
    }

    public queryEdges(filter: IGraphEdgeQueryFilter): Promise<readonly CodeEdge[]> {
        const nodeById = createNodeLookup(this.graph.nodes)

        return Promise.resolve(
            this.graph.edges.filter((edge) => matchesEdgeFilter(edge, nodeById, filter)),
        )
    }

    public queryPaths(query: IGraphPathQuery): Promise<readonly IGraphPathResult[]> {
        return Promise.resolve(resolveBoundedPaths(this.graph, query))
    }
}

describe("IGraphRepository contract", () => {
    test("queries graph nodes and edges with deterministic filters", async () => {
        const repository = new InMemoryGraphRepository(createGraph())

        const nodes = await repository.queryNodes({
            type: CODE_GRAPH_NODE_TYPE.FILE,
        })
        const edges = await repository.queryEdges({
            type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            nodeId: "file:src/a.ts",
        })

        expect(nodes.map((node) => node.filePath)).toEqual([
            "src/a.ts",
            "src/b.ts",
            "src/c.ts",
        ])
        expect(edges).toEqual([
            {
                source: "file:src/a.ts",
                target: "file:src/b.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
            {
                source: "file:src/a.ts",
                target: "file:src/c.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ])
    })

    test("queries bounded graph paths with optional edge type filter", async () => {
        const repository = new InMemoryGraphRepository(createGraph())

        const paths = await repository.queryPaths({
            repositoryId: "gh:repo-1",
            branch: "main",
            sourceNodeId: "file:src/a.ts",
            targetNodeId: "file:src/c.ts",
            edgeTypes: [CODE_GRAPH_EDGE_TYPE.IMPORTS],
            maxDepth: 2,
            maxPaths: 2,
        })

        expect(paths).toHaveLength(2)
        expect(paths[0]?.nodes.map((node) => node.id)).toEqual([
            "file:src/a.ts",
            "file:src/c.ts",
        ])
        expect(paths[1]?.nodes.map((node) => node.id)).toEqual([
            "file:src/a.ts",
            "file:src/b.ts",
            "file:src/c.ts",
        ])
        expect(paths[0]?.edges.map((edge) => edge.type)).toEqual([
            CODE_GRAPH_EDGE_TYPE.IMPORTS,
        ])
    })
})

/**
 * Creates deterministic graph fixture for repository contract tests.
 *
 * @returns Graph fixture.
 */
function createGraph(): CodeGraph {
    return {
        nodes: [
            createNode("file:src/a.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/a.ts"),
            createNode("file:src/b.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/b.ts"),
            createNode("file:src/c.ts", CODE_GRAPH_NODE_TYPE.FILE, "src/c.ts"),
            createNode("function:src/b.ts:run", CODE_GRAPH_NODE_TYPE.FUNCTION, "src/b.ts"),
        ],
        edges: [
            createEdge("file:src/a.ts", "file:src/b.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createEdge("file:src/b.ts", "file:src/c.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createEdge("file:src/a.ts", "file:src/c.ts", CODE_GRAPH_EDGE_TYPE.IMPORTS),
            createEdge(
                "file:src/b.ts",
                "function:src/b.ts:run",
                CODE_GRAPH_EDGE_TYPE.HAS_METHOD,
            ),
        ],
    }
}

/**
 * Creates deterministic graph node fixture.
 *
 * @param id Stable node id.
 * @param type Graph node type.
 * @param filePath Repository-relative file path.
 * @returns Graph node fixture.
 */
function createNode(
    id: string,
    type: ICodeGraphNode["type"],
    filePath: string,
): ICodeGraphNode {
    return {
        id,
        type,
        name: id,
        filePath,
    }
}

/**
 * Creates deterministic graph edge fixture.
 *
 * @param source Source node id.
 * @param target Target node id.
 * @param type Graph edge type.
 * @returns Graph edge fixture.
 */
function createEdge(
    source: string,
    target: string,
    type: CodeGraphEdgeType,
): ICodeGraphEdge {
    return {
        source,
        target,
        type,
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
 * Matches one edge against repository query filters.
 *
 * @param edge Candidate edge.
 * @param nodeById Node lookup by id.
 * @param filter Edge query filter.
 * @returns True when edge matches.
 */
function matchesEdgeFilter(
    edge: ICodeGraphEdge,
    nodeById: ReadonlyMap<string, ICodeGraphNode>,
    filter: IGraphEdgeQueryFilter,
): boolean {
    return (
        matchesOptionalEdgeType(edge, filter.type) &&
        matchesOptionalNodeId(edge.source, filter.sourceNodeId) &&
        matchesOptionalNodeId(edge.target, filter.targetNodeId) &&
        matchesEitherEndpoint(edge, filter.nodeId) &&
        matchesFilePath(edge, nodeById, filter.filePath)
    )
}

/**
 * Checks optional edge type equality.
 *
 * @param edge Candidate edge.
 * @param edgeType Optional expected edge type.
 * @returns True when type matches or filter is absent.
 */
function matchesOptionalEdgeType(
    edge: ICodeGraphEdge,
    edgeType: CodeGraphEdgeType | undefined,
): boolean {
    return edgeType === undefined || edge.type === edgeType
}

/**
 * Checks optional node identifier equality.
 *
 * @param actual Actual node id.
 * @param expected Optional expected node id.
 * @returns True when ids match or filter is absent.
 */
function matchesOptionalNodeId(
    actual: string,
    expected: string | undefined,
): boolean {
    return expected === undefined || actual === expected
}

/**
 * Checks whether either edge endpoint matches node id filter.
 *
 * @param edge Candidate edge.
 * @param nodeId Optional endpoint node id.
 * @returns True when filter is absent or one endpoint matches.
 */
function matchesEitherEndpoint(
    edge: ICodeGraphEdge,
    nodeId: string | undefined,
): boolean {
    return nodeId === undefined || edge.source === nodeId || edge.target === nodeId
}

/**
 * Checks optional endpoint file path.
 *
 * @param edge Candidate edge.
 * @param nodeById Node lookup by id.
 * @param filePath Optional expected file path.
 * @returns True when filter is absent or one endpoint matches.
 */
function matchesFilePath(
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
 * Resolves bounded graph paths using deterministic BFS order.
 *
 * @param graph Graph fixture.
 * @param query Path query filter.
 * @returns Matching paths.
 */
function resolveBoundedPaths(
    graph: CodeGraph,
    query: IGraphPathQuery,
): readonly IGraphPathResult[] {
    const nodeById = createNodeLookup(graph.nodes)
    const adjacency = buildAdjacency(graph.edges, createAllowedEdgeTypeSet(query))
    const queue: Array<{
        readonly nodeIds: readonly string[]
        readonly edges: readonly ICodeGraphEdge[]
    }> = [{nodeIds: [query.sourceNodeId], edges: []}]
    const resolvedPaths: IGraphPathResult[] = []
    const maxDepth = query.maxDepth ?? 4
    const maxPaths = query.maxPaths ?? 5

    while (queue.length > 0 && resolvedPaths.length < maxPaths) {
        const current = queue.shift()
        if (current === undefined) {
            continue
        }

        const resolvedPath = tryResolveCompletedPath(current, nodeById, query)
        if (resolvedPath !== undefined) {
            resolvedPaths.push(resolvedPath)
            continue
        }

        if (current.edges.length >= maxDepth) {
            continue
        }

        enqueueNextPaths(queue, current, adjacency)
    }

    return resolvedPaths
}

/**
 * Creates optional allowed edge-type set from query.
 *
 * @param query Path query.
 * @returns Allowed edge-type set or undefined.
 */
function createAllowedEdgeTypeSet(
    query: IGraphPathQuery,
): ReadonlySet<CodeGraphEdgeType> | undefined {
    return query.edgeTypes === undefined ? undefined : new Set(query.edgeTypes)
}

/**
 * Resolves current state into final path when it reaches target.
 *
 * @param current Current traversal state.
 * @param nodeById Node lookup by id.
 * @param query Path query.
 * @returns Final path or undefined when traversal should continue.
 */
function tryResolveCompletedPath(
    current: Readonly<{
        readonly nodeIds: readonly string[]
        readonly edges: readonly ICodeGraphEdge[]
    }>,
    nodeById: ReadonlyMap<string, ICodeGraphNode>,
    query: IGraphPathQuery,
): IGraphPathResult | undefined {
    const currentNodeId = current.nodeIds.at(-1)

    if (currentNodeId === undefined || currentNodeId !== query.targetNodeId) {
        return undefined
    }

    return {
        nodes: current.nodeIds.map((nodeId) => resolvePathNode(nodeById, nodeId)),
        edges: current.edges,
    }
}

/**
 * Resolves one node from lookup or throws on invalid test graph.
 *
 * @param nodeById Node lookup by id.
 * @param nodeId Node identifier.
 * @returns Resolved node.
 */
function resolvePathNode(
    nodeById: ReadonlyMap<string, ICodeGraphNode>,
    nodeId: string,
): ICodeGraphNode {
    const node = nodeById.get(nodeId)

    if (node === undefined) {
        throw new Error(`Missing node ${nodeId} in path resolution`)
    }

    return node
}

/**
 * Enqueues next BFS states in deterministic order.
 *
 * @param queue Mutable BFS queue.
 * @param current Current traversal state.
 * @param adjacency Adjacency map.
 * @returns Nothing.
 */
function enqueueNextPaths(
    queue: Array<{
        readonly nodeIds: readonly string[]
        readonly edges: readonly ICodeGraphEdge[]
    }>,
    current: Readonly<{
        readonly nodeIds: readonly string[]
        readonly edges: readonly ICodeGraphEdge[]
    }>,
    adjacency: ReadonlyMap<string, readonly ICodeGraphEdge[]>,
): void {
    const currentNodeId = current.nodeIds.at(-1)
    if (currentNodeId === undefined) {
        return
    }

    for (const edge of adjacency.get(currentNodeId) ?? []) {
        if (current.nodeIds.includes(edge.target)) {
            continue
        }

        queue.push({
            nodeIds: [...current.nodeIds, edge.target],
            edges: [...current.edges, edge],
        })
    }
}

/**
 * Builds deterministic adjacency list for graph traversal.
 *
 * @param edges Graph edges.
 * @param allowedEdgeTypes Optional allowed edge type set.
 * @returns Adjacency map.
 */
function buildAdjacency(
    edges: readonly ICodeGraphEdge[],
    allowedEdgeTypes: ReadonlySet<CodeGraphEdgeType> | undefined,
): ReadonlyMap<string, readonly ICodeGraphEdge[]> {
    const adjacency = new Map<string, ICodeGraphEdge[]>()

    for (const edge of edges) {
        if (
            allowedEdgeTypes !== undefined
            && allowedEdgeTypes.has(edge.type) === false
        ) {
            continue
        }

        const currentEdges = adjacency.get(edge.source) ?? []
        currentEdges.push(edge)
        currentEdges.sort(compareEdge)
        adjacency.set(edge.source, currentEdges)
    }

    return adjacency
}

/**
 * Orders edges deterministically for path traversal.
 *
 * @param left Left edge.
 * @param right Right edge.
 * @returns Sort comparison result.
 */
function compareEdge(left: ICodeGraphEdge, right: ICodeGraphEdge): number {
    if (left.type !== right.type) {
        return left.type.localeCompare(right.type)
    }

    if (left.target !== right.target) {
        return left.target.localeCompare(right.target)
    }

    return left.source.localeCompare(right.source)
}
