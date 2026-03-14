import {
    FilePath,
    type ICodeGraphDiffInput,
    type ICodeGraphDiffResult,
    type ICodeGraphDiffService,
    type ICodeGraphEdge,
    type ICodeGraphNode,
    type ICodeGraphNodeChange,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_DIFF_ERROR_CODE,
    AstCodeGraphDiffError,
} from "./ast-code-graph-diff.error"

const EDGE_KEY_SEPARATOR = "\u0000"

/**
 * Tree-sitter graph-backed deterministic diff between two graph snapshots.
 */
export class AstCodeGraphDiffService implements ICodeGraphDiffService {
    /**
     * Calculates deterministic graph diff with optional file subset filtering.
     *
     * @param input Baseline and target graph payloads.
     * @returns Deterministic node and edge diff.
     * @throws {AstCodeGraphDiffError} When file filter contains invalid path.
     */
    public calculateDiff(input: ICodeGraphDiffInput): Promise<ICodeGraphDiffResult> {
        const filterSet = resolveFilePathFilter(input.filePaths)
        const baseNodes = filterNodes(input.baseGraph.nodes, filterSet)
        const targetNodes = filterNodes(input.targetGraph.nodes, filterSet)
        const baseNodeMap = createNodeMap(baseNodes)
        const targetNodeMap = createNodeMap(targetNodes)
        const addedNodes = collectAddedNodes(baseNodeMap, targetNodeMap)
        const removedNodes = collectRemovedNodes(baseNodeMap, targetNodeMap)
        const changedNodes = collectChangedNodes(baseNodeMap, targetNodeMap)
        const baseAllowedNodeIds = new Set(baseNodeMap.keys())
        const targetAllowedNodeIds = new Set(targetNodeMap.keys())
        const baseEdges = filterEdges(input.baseGraph.edges, baseAllowedNodeIds)
        const targetEdges = filterEdges(input.targetGraph.edges, targetAllowedNodeIds)
        const addedEdges = collectAddedEdges(baseEdges, targetEdges)
        const removedEdges = collectRemovedEdges(baseEdges, targetEdges)

        return Promise.resolve({
            addedNodes,
            removedNodes,
            changedNodes,
            addedEdges,
            removedEdges,
        })
    }
}

/**
 * Resolves optional file-path filter.
 *
 * @param filePaths Optional requested file paths.
 * @returns Normalized file-path set when provided.
 */
function resolveFilePathFilter(
    filePaths: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    const normalized = new Set<string>()
    for (const filePath of filePaths) {
        normalized.add(normalizeFilePath(filePath))
    }

    return normalized
}

/**
 * Normalizes repository-relative file path or throws typed error.
 *
 * @param value Raw file path.
 * @returns Normalized file path.
 * @throws {AstCodeGraphDiffError} When file path is invalid.
 */
function normalizeFilePath(value: string): string {
    try {
        return FilePath.create(value).toString()
    } catch {
        throw new AstCodeGraphDiffError(
            AST_CODE_GRAPH_DIFF_ERROR_CODE.INVALID_FILE_PATH,
            {filePath: value},
        )
    }
}

/**
 * Filters graph nodes by optional file-path set and sorts deterministically.
 *
 * @param nodes Graph nodes.
 * @param filterSet Optional normalized file filter.
 * @returns Sorted filtered nodes.
 */
function filterNodes(
    nodes: readonly ICodeGraphNode[],
    filterSet: ReadonlySet<string> | undefined,
): readonly ICodeGraphNode[] {
    if (filterSet === undefined) {
        return [...nodes].sort(compareNodeById)
    }

    return nodes
        .filter((node) => {
            const normalized = tryNormalizeFilePath(node.filePath)
            return normalized !== undefined && filterSet.has(normalized)
        })
        .sort(compareNodeById)
}

/**
 * Attempts to normalize file path and suppresses malformed payloads.
 *
 * @param value Raw file path.
 * @returns Normalized file path or undefined.
 */
function tryNormalizeFilePath(value: string): string | undefined {
    try {
        return FilePath.create(value).toString()
    } catch {
        return undefined
    }
}

/**
 * Creates stable node lookup by identifier.
 *
 * @param nodes Sorted graph nodes.
 * @returns Node lookup map.
 */
function createNodeMap(nodes: readonly ICodeGraphNode[]): ReadonlyMap<string, ICodeGraphNode> {
    return new Map(nodes.map((node) => [node.id, node]))
}

/**
 * Collects nodes that exist only in target graph.
 *
 * @param baseNodeMap Baseline node lookup.
 * @param targetNodeMap Target node lookup.
 * @returns Deterministic added node list.
 */
function collectAddedNodes(
    baseNodeMap: ReadonlyMap<string, ICodeGraphNode>,
    targetNodeMap: ReadonlyMap<string, ICodeGraphNode>,
): readonly ICodeGraphNode[] {
    const added: ICodeGraphNode[] = []

    for (const [nodeId, node] of targetNodeMap.entries()) {
        if (baseNodeMap.has(nodeId)) {
            continue
        }

        added.push(node)
    }

    return added.sort(compareNodeById)
}

/**
 * Collects nodes that exist only in baseline graph.
 *
 * @param baseNodeMap Baseline node lookup.
 * @param targetNodeMap Target node lookup.
 * @returns Deterministic removed node list.
 */
function collectRemovedNodes(
    baseNodeMap: ReadonlyMap<string, ICodeGraphNode>,
    targetNodeMap: ReadonlyMap<string, ICodeGraphNode>,
): readonly ICodeGraphNode[] {
    const removed: ICodeGraphNode[] = []

    for (const [nodeId, node] of baseNodeMap.entries()) {
        if (targetNodeMap.has(nodeId)) {
            continue
        }

        removed.push(node)
    }

    return removed.sort(compareNodeById)
}

/**
 * Collects nodes present in both graphs with changed payload fields.
 *
 * @param baseNodeMap Baseline node lookup.
 * @param targetNodeMap Target node lookup.
 * @returns Deterministic changed node list.
 */
function collectChangedNodes(
    baseNodeMap: ReadonlyMap<string, ICodeGraphNode>,
    targetNodeMap: ReadonlyMap<string, ICodeGraphNode>,
): readonly ICodeGraphNodeChange[] {
    const changed: ICodeGraphNodeChange[] = []

    for (const [nodeId, targetNode] of targetNodeMap.entries()) {
        const baseNode = baseNodeMap.get(nodeId)
        if (baseNode === undefined) {
            continue
        }

        if (areNodesEqual(baseNode, targetNode)) {
            continue
        }

        changed.push({
            before: baseNode,
            after: targetNode,
        })
    }

    return changed.sort((left, right) => left.after.id.localeCompare(right.after.id))
}

/**
 * Checks whether two node payloads are equal by semantic fields.
 *
 * @param left Left node payload.
 * @param right Right node payload.
 * @returns True when payloads are equal.
 */
function areNodesEqual(left: ICodeGraphNode, right: ICodeGraphNode): boolean {
    if (left.type !== right.type || left.name !== right.name || left.filePath !== right.filePath) {
        return false
    }

    return areMetadataEqual(left.metadata, right.metadata)
}

/**
 * Checks metadata equality using sorted key/value comparison.
 *
 * @param left Left metadata record.
 * @param right Right metadata record.
 * @returns True when metadata records are equal.
 */
function areMetadataEqual(
    left: ICodeGraphNode["metadata"],
    right: ICodeGraphNode["metadata"],
): boolean {
    if (left === undefined && right === undefined) {
        return true
    }

    if (left === undefined || right === undefined) {
        return false
    }

    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    if (leftKeys.length !== rightKeys.length) {
        return false
    }

    return areMetadataEntriesEqual(left, right, leftKeys, rightKeys)
}

/**
 * Checks equality for sorted metadata key/value tuples.
 *
 * @param left Left metadata record.
 * @param right Right metadata record.
 * @param leftKeys Sorted left keys.
 * @param rightKeys Sorted right keys.
 * @returns True when all keys and values are equal.
 */
function areMetadataEntriesEqual(
    left: NonNullable<ICodeGraphNode["metadata"]>,
    right: NonNullable<ICodeGraphNode["metadata"]>,
    leftKeys: readonly string[],
    rightKeys: readonly string[],
): boolean {
    for (let index = 0; index < leftKeys.length; index++) {
        const leftKey = leftKeys[index]
        const rightKey = rightKeys[index]
        if (leftKey === undefined || rightKey === undefined) {
            return false
        }

        if (leftKey !== rightKey) {
            return false
        }

        if (left[leftKey] !== right[rightKey]) {
            return false
        }
    }

    return true
}

/**
 * Filters edges to those referencing existing filtered nodes.
 *
 * @param edges Graph edges.
 * @param allowedNodeIds Allowed node id set.
 * @returns Deterministic filtered edges.
 */
function filterEdges(
    edges: readonly ICodeGraphEdge[],
    allowedNodeIds: ReadonlySet<string>,
): readonly ICodeGraphEdge[] {
    return edges
        .filter((edge) => {
            return allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target)
        })
        .sort(compareEdges)
}

/**
 * Collects edges that exist only in target graph.
 *
 * @param baseEdges Baseline filtered edges.
 * @param targetEdges Target filtered edges.
 * @returns Deterministic added edge list.
 */
function collectAddedEdges(
    baseEdges: readonly ICodeGraphEdge[],
    targetEdges: readonly ICodeGraphEdge[],
): readonly ICodeGraphEdge[] {
    const baseKeys = new Set(baseEdges.map((edge) => edgeKey(edge)))
    const added: ICodeGraphEdge[] = []

    for (const edge of targetEdges) {
        if (baseKeys.has(edgeKey(edge))) {
            continue
        }

        added.push(edge)
    }

    return added.sort(compareEdges)
}

/**
 * Collects edges that exist only in baseline graph.
 *
 * @param baseEdges Baseline filtered edges.
 * @param targetEdges Target filtered edges.
 * @returns Deterministic removed edge list.
 */
function collectRemovedEdges(
    baseEdges: readonly ICodeGraphEdge[],
    targetEdges: readonly ICodeGraphEdge[],
): readonly ICodeGraphEdge[] {
    const targetKeys = new Set(targetEdges.map((edge) => edgeKey(edge)))
    const removed: ICodeGraphEdge[] = []

    for (const edge of baseEdges) {
        if (targetKeys.has(edgeKey(edge))) {
            continue
        }

        removed.push(edge)
    }

    return removed.sort(compareEdges)
}

/**
 * Creates deterministic edge key.
 *
 * @param edge Graph edge payload.
 * @returns Deterministic edge key.
 */
function edgeKey(edge: ICodeGraphEdge): string {
    return `${edge.source}${EDGE_KEY_SEPARATOR}${edge.target}${EDGE_KEY_SEPARATOR}${edge.type}`
}

/**
 * Compares graph nodes by stable id.
 *
 * @param left Left node.
 * @param right Right node.
 * @returns Comparator value.
 */
function compareNodeById(left: ICodeGraphNode, right: ICodeGraphNode): number {
    return left.id.localeCompare(right.id)
}

/**
 * Compares graph edges by deterministic key.
 *
 * @param left Left edge.
 * @param right Right edge.
 * @returns Comparator value.
 */
function compareEdges(left: ICodeGraphEdge, right: ICodeGraphEdge): number {
    return edgeKey(left).localeCompare(edgeKey(right))
}
