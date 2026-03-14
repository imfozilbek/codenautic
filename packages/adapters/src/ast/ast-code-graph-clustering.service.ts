import {
    CODE_GRAPH_NODE_TYPE,
    FilePath,
    type ICodeGraph,
    type ICodeGraphClusteringInput,
    type ICodeGraphClusteringResult,
    type ICodeGraphClusteringService,
    type ICodeGraphCommunity,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_CLUSTERING_ERROR_CODE,
    AstCodeGraphClusteringError,
} from "./ast-code-graph-clustering.error"

const DEFAULT_RESOLUTION = 1
const DEFAULT_ITERATIONS = 20
const NUMERIC_EPSILON = 1e-12
const PAIR_KEY_SEPARATOR = "\u0000"

interface IResolvedClusteringConfig {
    /**
     * Validated Louvain resolution.
     */
    readonly resolution: number

    /**
     * Validated local optimization pass count.
     */
    readonly iterations: number
}

interface ILouvainGraph {
    /**
     * Sorted candidate file paths used as graph nodes.
     */
    readonly nodeIds: readonly string[]

    /**
     * Weighted undirected neighbors keyed by node id.
     */
    readonly neighbors: ReadonlyMap<string, ReadonlyMap<string, number>>

    /**
     * Weighted degree for each graph node.
     */
    readonly degrees: ReadonlyMap<string, number>

    /**
     * Weighted undirected edge map keyed by deterministic pair key.
     */
    readonly pairWeights: ReadonlyMap<string, number>

    /**
     * Total undirected graph weight.
     */
    readonly totalEdgeWeight: number
}

interface ICommunityState {
    /**
     * Current community assignment for each node.
     */
    readonly nodeToCommunity: Map<string, string>

    /**
     * Sum of node degrees by community id.
     */
    readonly communityTotals: Map<string, number>
}

interface ICommunityAggregation {
    /**
     * Deterministic sorted members of one community.
     */
    readonly members: readonly string[]

    /**
     * Total incident edge weight for all community members.
     */
    readonly totalIncidentEdgeWeight: number

    /**
     * Total internal edge weight inside the community.
     */
    readonly intraCommunityEdgeWeight: number
}

/**
 * Construction options for AST code graph clustering service.
 */
export interface IAstCodeGraphClusteringServiceOptions {
    /**
     * Optional default Louvain resolution.
     */
    readonly defaultResolution?: number

    /**
     * Optional default local optimization pass count.
     */
    readonly defaultIterations?: number
}

/**
 * Tree-sitter graph-backed deterministic Louvain community detection.
 */
export class AstCodeGraphClusteringService implements ICodeGraphClusteringService {
    private readonly defaultResolution: number
    private readonly defaultIterations: number

    /**
     * Creates AST code graph clustering service.
     *
     * @param options Optional default clustering configuration.
     * @throws {AstCodeGraphClusteringError} When defaults are invalid.
     */
    public constructor(options: IAstCodeGraphClusteringServiceOptions = {}) {
        this.defaultResolution = validateResolution(options.defaultResolution ?? DEFAULT_RESOLUTION)
        this.defaultIterations = validateIterations(options.defaultIterations ?? DEFAULT_ITERATIONS)
    }

    /**
     * Detects deterministic Louvain communities for repository files.
     *
     * @param input Graph payload and optional clustering configuration.
     * @returns Deterministic communities and modularity score.
     * @throws {AstCodeGraphClusteringError} When configuration or file paths are invalid.
     */
    public detectCommunities(input: ICodeGraphClusteringInput): Promise<ICodeGraphClusteringResult> {
        const config = this.resolveConfig(input)
        const filePaths = resolveCandidateFilePaths(input.graph, input.filePaths)

        if (filePaths.length === 0) {
            return Promise.resolve({
                communities: [],
                modularity: 0,
            })
        }

        const graph = buildWeightedFileGraph(input.graph, filePaths)
        const partition = detectLouvainPartition(graph, config)
        const communities = buildCommunities(graph, partition)
        const modularity = calculatePartitionModularity(graph, partition, config.resolution)

        return Promise.resolve({
            communities,
            modularity,
        })
    }

    /**
     * Resolves runtime config with validated defaults.
     *
     * @param input Runtime clustering input.
     * @returns Validated clustering configuration.
     */
    private resolveConfig(input: ICodeGraphClusteringInput): IResolvedClusteringConfig {
        return {
            resolution: validateResolution(input.resolution ?? this.defaultResolution),
            iterations: validateIterations(input.iterations ?? this.defaultIterations),
        }
    }
}

/**
 * Validates Louvain resolution as finite positive number.
 *
 * @param resolution Raw resolution value.
 * @returns Validated resolution.
 * @throws {AstCodeGraphClusteringError} When resolution is invalid.
 */
function validateResolution(resolution: number): number {
    if (typeof resolution !== "number" || Number.isFinite(resolution) === false || resolution <= 0) {
        throw new AstCodeGraphClusteringError(
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_RESOLUTION,
            {resolution},
        )
    }

    return resolution
}

/**
 * Validates local optimization pass count.
 *
 * @param iterations Raw iteration count.
 * @returns Validated iteration count.
 * @throws {AstCodeGraphClusteringError} When iteration count is invalid.
 */
function validateIterations(iterations: number): number {
    if (Number.isSafeInteger(iterations) === false || iterations < 1) {
        throw new AstCodeGraphClusteringError(
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_ITERATIONS,
            {iterations},
        )
    }

    return iterations
}

/**
 * Resolves candidate file paths from explicit subset or graph snapshot.
 *
 * @param graph Graph snapshot.
 * @param requestedFilePaths Optional requested file subset.
 * @returns Sorted unique normalized file paths.
 */
function resolveCandidateFilePaths(
    graph: ICodeGraph,
    requestedFilePaths: readonly string[] | undefined,
): readonly string[] {
    if (requestedFilePaths !== undefined) {
        return [...new Set(requestedFilePaths.map((filePath) => normalizeFilePath(filePath)))].sort()
    }

    const filePaths = new Set<string>()
    for (const node of graph.nodes) {
        const normalized = tryNormalizeFilePath(node.filePath)
        if (normalized === undefined) {
            continue
        }

        if (node.type === CODE_GRAPH_NODE_TYPE.FILE) {
            filePaths.add(normalized)
            continue
        }

        filePaths.add(normalized)
    }

    return [...filePaths].sort()
}

/**
 * Normalizes repository-relative file path or throws typed error.
 *
 * @param value Raw file path.
 * @returns Normalized file path.
 * @throws {AstCodeGraphClusteringError} When file path is invalid.
 */
function normalizeFilePath(value: string): string {
    try {
        return FilePath.create(value).toString()
    } catch {
        throw new AstCodeGraphClusteringError(
            AST_CODE_GRAPH_CLUSTERING_ERROR_CODE.INVALID_FILE_PATH,
            {filePath: value},
        )
    }
}

/**
 * Normalizes file path when possible and suppresses malformed graph data.
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
 * Builds weighted undirected file-level graph from node-level edges.
 *
 * @param graph Code graph snapshot.
 * @param filePaths Candidate file paths.
 * @returns Weighted file-level graph.
 */
function buildWeightedFileGraph(graph: ICodeGraph, filePaths: readonly string[]): ILouvainGraph {
    const knownFiles = new Set(filePaths)
    const nodeFileLookup = createNodeFileLookup(graph)
    const pairWeights = new Map<string, number>()

    for (const edge of graph.edges) {
        const source = resolveFileEndpoint(edge.source, nodeFileLookup, knownFiles)
        const target = resolveFileEndpoint(edge.target, nodeFileLookup, knownFiles)
        if (source === undefined || target === undefined || source === target) {
            continue
        }

        const pairKey = createPairKey(source, target)
        pairWeights.set(pairKey, (pairWeights.get(pairKey) ?? 0) + 1)
    }

    const neighbors = createNeighborLookup(filePaths, pairWeights)
    const degrees = calculateDegrees(filePaths, neighbors)
    const totalEdgeWeight = calculateTotalEdgeWeight(pairWeights)

    return {
        nodeIds: filePaths,
        neighbors,
        degrees,
        pairWeights,
        totalEdgeWeight,
    }
}

/**
 * Creates lookup from node ids to canonical file paths.
 *
 * @param graph Code graph snapshot.
 * @returns Node/file endpoint lookup.
 */
function createNodeFileLookup(graph: ICodeGraph): ReadonlyMap<string, string> {
    const lookup = new Map<string, string>()

    for (const node of graph.nodes) {
        const normalized = tryNormalizeFilePath(node.filePath)
        if (normalized === undefined) {
            continue
        }

        lookup.set(node.id, normalized)

        if (node.type === CODE_GRAPH_NODE_TYPE.FILE) {
            lookup.set(normalized, normalized)
        }
    }

    return lookup
}

/**
 * Resolves edge endpoint into known canonical file path.
 *
 * @param rawEndpoint Raw graph edge endpoint.
 * @param nodeFileLookup Node/file lookup.
 * @param knownFiles Candidate file set.
 * @returns Canonical file path when endpoint is resolvable.
 */
function resolveFileEndpoint(
    rawEndpoint: string,
    nodeFileLookup: ReadonlyMap<string, string>,
    knownFiles: ReadonlySet<string>,
): string | undefined {
    const direct = nodeFileLookup.get(rawEndpoint)
    if (direct !== undefined && knownFiles.has(direct)) {
        return direct
    }

    const normalized = tryNormalizeFilePath(rawEndpoint)
    if (normalized === undefined) {
        return undefined
    }

    if (knownFiles.has(normalized)) {
        return normalized
    }

    const fromLookup = nodeFileLookup.get(normalized)
    if (fromLookup === undefined || knownFiles.has(fromLookup) === false) {
        return undefined
    }

    return fromLookup
}

/**
 * Creates deterministic pair key for one undirected relation.
 *
 * @param left First endpoint.
 * @param right Second endpoint.
 * @returns Deterministic pair key.
 */
function createPairKey(left: string, right: string): string {
    const [orderedLeft, orderedRight] = orderPair(left, right)
    return `${orderedLeft}${PAIR_KEY_SEPARATOR}${orderedRight}`
}

/**
 * Orders one pair deterministically.
 *
 * @param left First endpoint.
 * @param right Second endpoint.
 * @returns Sorted pair.
 */
function orderPair(left: string, right: string): readonly [string, string] {
    if (left.localeCompare(right) <= 0) {
        return [left, right]
    }

    return [right, left]
}

/**
 * Creates weighted neighbors for each file path.
 *
 * @param filePaths Candidate file paths.
 * @param pairWeights Pair-weight map.
 * @returns Immutable neighbor lookup.
 */
function createNeighborLookup(
    filePaths: readonly string[],
    pairWeights: ReadonlyMap<string, number>,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
    const mutableNeighbors = new Map<string, Map<string, number>>()

    for (const filePath of filePaths) {
        mutableNeighbors.set(filePath, new Map())
    }

    for (const [pairKey, weight] of pairWeights.entries()) {
        const endpoints = splitPairKey(pairKey)
        const left = mutableNeighbors.get(endpoints[0])
        const right = mutableNeighbors.get(endpoints[1])

        if (left === undefined || right === undefined) {
            continue
        }

        left.set(endpoints[1], weight)
        right.set(endpoints[0], weight)
    }

    const result = new Map<string, ReadonlyMap<string, number>>()
    for (const filePath of filePaths) {
        const neighborWeights = mutableNeighbors.get(filePath)
        if (neighborWeights === undefined) {
            result.set(filePath, new Map())
            continue
        }

        const sorted = [...neighborWeights.entries()].sort((left, right) => {
            return left[0].localeCompare(right[0])
        })
        result.set(filePath, new Map(sorted))
    }

    return result
}

/**
 * Splits pair key into ordered endpoints.
 *
 * @param pairKey Deterministic pair key.
 * @returns Ordered endpoints.
 */
function splitPairKey(pairKey: string): readonly [string, string] {
    const [left, right] = pairKey.split(PAIR_KEY_SEPARATOR)
    if (left === undefined || right === undefined) {
        return ["", ""]
    }

    return [left, right]
}

/**
 * Calculates weighted degree for each graph node.
 *
 * @param filePaths Candidate file paths.
 * @param neighbors Neighbor lookup.
 * @returns Degree map.
 */
function calculateDegrees(
    filePaths: readonly string[],
    neighbors: ReadonlyMap<string, ReadonlyMap<string, number>>,
): ReadonlyMap<string, number> {
    const degrees = new Map<string, number>()

    for (const filePath of filePaths) {
        const neighborWeights = neighbors.get(filePath)
        if (neighborWeights === undefined) {
            degrees.set(filePath, 0)
            continue
        }

        let degree = 0
        for (const weight of neighborWeights.values()) {
            degree += weight
        }

        degrees.set(filePath, degree)
    }

    return degrees
}

/**
 * Calculates total undirected graph weight.
 *
 * @param pairWeights Pair-weight map.
 * @returns Total undirected graph weight.
 */
function calculateTotalEdgeWeight(pairWeights: ReadonlyMap<string, number>): number {
    let totalEdgeWeight = 0

    for (const weight of pairWeights.values()) {
        totalEdgeWeight += weight
    }

    return totalEdgeWeight
}

/**
 * Runs deterministic Louvain local-optimization passes.
 *
 * @param graph Weighted file-level graph.
 * @param config Validated clustering config.
 * @returns Deterministic partition map.
 */
function detectLouvainPartition(
    graph: ILouvainGraph,
    config: IResolvedClusteringConfig,
): ReadonlyMap<string, string> {
    if (graph.totalEdgeWeight === 0) {
        return new Map(graph.nodeIds.map((nodeId) => [nodeId, nodeId]))
    }

    const state = initializeCommunityState(graph)
    for (let pass = 0; pass < config.iterations; pass++) {
        const movedCount = runOptimizationPass(graph, state, config.resolution)
        if (movedCount === 0) {
            break
        }
    }

    return state.nodeToCommunity
}

/**
 * Initializes one-node-per-community partition state.
 *
 * @param graph Weighted file-level graph.
 * @returns Mutable community state.
 */
function initializeCommunityState(graph: ILouvainGraph): ICommunityState {
    const nodeToCommunity = new Map<string, string>()
    const communityTotals = new Map<string, number>()

    for (const nodeId of graph.nodeIds) {
        const degree = graph.degrees.get(nodeId) ?? 0
        nodeToCommunity.set(nodeId, nodeId)
        communityTotals.set(nodeId, degree)
    }

    return {
        nodeToCommunity,
        communityTotals,
    }
}

/**
 * Runs one deterministic Louvain local-optimization pass.
 *
 * @param graph Weighted file-level graph.
 * @param state Mutable partition state.
 * @param resolution Louvain resolution.
 * @returns Number of moved nodes.
 */
function runOptimizationPass(
    graph: ILouvainGraph,
    state: ICommunityState,
    resolution: number,
): number {
    let movedCount = 0
    const totalWeightDouble = graph.totalEdgeWeight * 2

    for (const nodeId of graph.nodeIds) {
        const nodeDegree = graph.degrees.get(nodeId) ?? 0
        if (nodeDegree === 0) {
            continue
        }

        const currentCommunity = state.nodeToCommunity.get(nodeId)
        if (currentCommunity === undefined) {
            continue
        }

        const weightsByCommunity = collectNeighborCommunityWeights(nodeId, graph, state)
        removeNodeFromCommunity(nodeDegree, currentCommunity, state.communityTotals)

        const bestCommunity = selectBestCommunity({
            currentCommunity,
            nodeDegree,
            weightsByCommunity,
            communityTotals: state.communityTotals,
            resolution,
            totalWeightDouble,
        })

        addNodeToCommunity(nodeDegree, bestCommunity, state.communityTotals)
        state.nodeToCommunity.set(nodeId, bestCommunity)

        if (bestCommunity !== currentCommunity) {
            movedCount += 1
        }
    }

    return movedCount
}

/**
 * Collects accumulated neighbor weights by neighbor community.
 *
 * @param nodeId Current node id.
 * @param graph Weighted file-level graph.
 * @param state Mutable partition state.
 * @returns Weight sum by community id.
 */
function collectNeighborCommunityWeights(
    nodeId: string,
    graph: ILouvainGraph,
    state: ICommunityState,
): ReadonlyMap<string, number> {
    const result = new Map<string, number>()
    const neighbors = graph.neighbors.get(nodeId)
    if (neighbors === undefined) {
        return result
    }

    for (const [neighborId, weight] of neighbors.entries()) {
        const communityId = state.nodeToCommunity.get(neighborId)
        if (communityId === undefined) {
            continue
        }

        result.set(communityId, (result.get(communityId) ?? 0) + weight)
    }

    return result
}

/**
 * Removes node degree from one community total.
 *
 * @param nodeDegree Weighted node degree.
 * @param communityId Community id.
 * @param communityTotals Mutable community totals.
 */
function removeNodeFromCommunity(
    nodeDegree: number,
    communityId: string,
    communityTotals: Map<string, number>,
): void {
    const currentTotal = communityTotals.get(communityId) ?? 0
    communityTotals.set(communityId, Math.max(0, currentTotal - nodeDegree))
}

/**
 * Adds node degree to one community total.
 *
 * @param nodeDegree Weighted node degree.
 * @param communityId Community id.
 * @param communityTotals Mutable community totals.
 */
function addNodeToCommunity(
    nodeDegree: number,
    communityId: string,
    communityTotals: Map<string, number>,
): void {
    const currentTotal = communityTotals.get(communityId) ?? 0
    communityTotals.set(communityId, currentTotal + nodeDegree)
}

/**
 * Selects best community by Louvain gain with deterministic tie-breaking.
 *
 * @param params Weighted node context.
 * @returns Community id selected for node.
 */
function selectBestCommunity(params: {
    readonly currentCommunity: string
    readonly nodeDegree: number
    readonly weightsByCommunity: ReadonlyMap<string, number>
    readonly communityTotals: ReadonlyMap<string, number>
    readonly resolution: number
    readonly totalWeightDouble: number
}): string {
    const candidateCommunities = new Set<string>(params.weightsByCommunity.keys())
    candidateCommunities.add(params.currentCommunity)

    let bestCommunity = params.currentCommunity
    let bestGain = 0

    for (const communityId of [...candidateCommunities].sort()) {
        const communityTotal = params.communityTotals.get(communityId) ?? 0
        const weightToCommunity = params.weightsByCommunity.get(communityId) ?? 0
        const gain = calculateGain({
            weightToCommunity,
            communityTotal,
            nodeDegree: params.nodeDegree,
            resolution: params.resolution,
            totalWeightDouble: params.totalWeightDouble,
        })

        if (gain > bestGain + NUMERIC_EPSILON) {
            bestGain = gain
            bestCommunity = communityId
            continue
        }

        if (Math.abs(gain - bestGain) <= NUMERIC_EPSILON && communityId.localeCompare(bestCommunity) < 0) {
            bestCommunity = communityId
        }
    }

    if (bestGain <= NUMERIC_EPSILON) {
        return params.currentCommunity
    }

    return bestCommunity
}

/**
 * Calculates Louvain gain term for one candidate community.
 *
 * @param params Candidate-move context.
 * @returns Gain score.
 */
function calculateGain(params: {
    readonly weightToCommunity: number
    readonly communityTotal: number
    readonly nodeDegree: number
    readonly resolution: number
    readonly totalWeightDouble: number
}): number {
    const regularization =
        (params.resolution * params.communityTotal * params.nodeDegree) / params.totalWeightDouble
    return params.weightToCommunity - regularization
}

/**
 * Builds deterministic community payload list from partition map.
 *
 * @param graph Weighted file-level graph.
 * @param partition Node-to-community map.
 * @returns Sorted community list.
 */
function buildCommunities(
    graph: ILouvainGraph,
    partition: ReadonlyMap<string, string>,
): readonly ICodeGraphCommunity[] {
    const aggregations = aggregateCommunities(graph, partition)
    const ordered = [...aggregations.values()].sort(compareCommunityAggregation)

    return ordered.map((aggregation, index): ICodeGraphCommunity => {
        return {
            id: `community-${String(index + 1).padStart(3, "0")}`,
            filePaths: aggregation.members,
            intraCommunityEdgeWeight: aggregation.intraCommunityEdgeWeight,
            totalIncidentEdgeWeight: aggregation.totalIncidentEdgeWeight,
        }
    })
}

/**
 * Aggregates community metrics for output and modularity calculations.
 *
 * @param graph Weighted file-level graph.
 * @param partition Node-to-community map.
 * @returns Aggregation keyed by community id.
 */
function aggregateCommunities(
    graph: ILouvainGraph,
    partition: ReadonlyMap<string, string>,
): ReadonlyMap<string, ICommunityAggregation> {
    const membersByCommunity = collectMembersByCommunity(graph.nodeIds, partition)
    const totalIncidentByCommunity = calculateTotalIncidentByCommunity(
        membersByCommunity,
        graph.degrees,
    )
    const intraByCommunity = calculateIntraByCommunity(partition, graph.pairWeights)

    return createCommunityAggregationMap({
        membersByCommunity,
        totalIncidentByCommunity,
        intraByCommunity,
    })
}

/**
 * Collects deterministic sorted community members.
 *
 * @param nodeIds Graph node ids.
 * @param partition Node-to-community map.
 * @returns Sorted members keyed by community id.
 */
function collectMembersByCommunity(
    nodeIds: readonly string[],
    partition: ReadonlyMap<string, string>,
): ReadonlyMap<string, readonly string[]> {
    const grouped = new Map<string, string[]>()

    for (const nodeId of nodeIds) {
        const communityId = partition.get(nodeId) ?? nodeId
        const bucket = grouped.get(communityId)

        if (bucket === undefined) {
            grouped.set(communityId, [nodeId])
            continue
        }

        bucket.push(nodeId)
    }

    const result = new Map<string, readonly string[]>()
    for (const [communityId, members] of grouped.entries()) {
        result.set(communityId, [...members].sort())
    }

    return result
}

/**
 * Calculates total incident edge weight for each community.
 *
 * @param membersByCommunity Sorted members keyed by community id.
 * @param degrees Weighted node degree map.
 * @returns Incident edge weights keyed by community id.
 */
function calculateTotalIncidentByCommunity(
    membersByCommunity: ReadonlyMap<string, readonly string[]>,
    degrees: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
    const totals = new Map<string, number>()

    for (const [communityId, members] of membersByCommunity.entries()) {
        let totalIncidentEdgeWeight = 0
        for (const member of members) {
            totalIncidentEdgeWeight += degrees.get(member) ?? 0
        }

        totals.set(communityId, totalIncidentEdgeWeight)
    }

    return totals
}

/**
 * Calculates internal edge weight for each community.
 *
 * @param partition Node-to-community map.
 * @param pairWeights Weighted undirected pair map.
 * @returns Internal weights keyed by community id.
 */
function calculateIntraByCommunity(
    partition: ReadonlyMap<string, string>,
    pairWeights: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
    const totals = new Map<string, number>()

    for (const [pairKey, weight] of pairWeights.entries()) {
        const [left, right] = splitPairKey(pairKey)
        const leftCommunity = partition.get(left)
        const rightCommunity = partition.get(right)

        if (
            leftCommunity === undefined ||
            rightCommunity === undefined ||
            leftCommunity !== rightCommunity
        ) {
            continue
        }

        totals.set(leftCommunity, (totals.get(leftCommunity) ?? 0) + weight)
    }

    return totals
}

/**
 * Creates immutable community aggregation map from calculated metrics.
 *
 * @param input Aggregation inputs.
 * @returns Aggregation map keyed by community id.
 */
function createCommunityAggregationMap(input: {
    readonly membersByCommunity: ReadonlyMap<string, readonly string[]>
    readonly totalIncidentByCommunity: ReadonlyMap<string, number>
    readonly intraByCommunity: ReadonlyMap<string, number>
}): ReadonlyMap<string, ICommunityAggregation> {
    const result = new Map<string, ICommunityAggregation>()

    for (const [communityId, members] of input.membersByCommunity.entries()) {
        result.set(communityId, {
            members,
            totalIncidentEdgeWeight: input.totalIncidentByCommunity.get(communityId) ?? 0,
            intraCommunityEdgeWeight: input.intraByCommunity.get(communityId) ?? 0,
        })
    }

    return result
}

/**
 * Compares community aggregations in deterministic output order.
 *
 * @param left Left aggregation.
 * @param right Right aggregation.
 * @returns Ordering comparator result.
 */
function compareCommunityAggregation(
    left: ICommunityAggregation,
    right: ICommunityAggregation,
): number {
    if (left.members.length !== right.members.length) {
        return right.members.length - left.members.length
    }

    const leftFirst = left.members[0] ?? ""
    const rightFirst = right.members[0] ?? ""
    return leftFirst.localeCompare(rightFirst)
}

/**
 * Calculates modularity for one partition.
 *
 * @param graph Weighted file-level graph.
 * @param partition Node-to-community map.
 * @param resolution Louvain resolution.
 * @returns Weighted modularity score.
 */
function calculatePartitionModularity(
    graph: ILouvainGraph,
    partition: ReadonlyMap<string, string>,
    resolution: number,
): number {
    if (graph.totalEdgeWeight === 0) {
        return 0
    }

    const communityAggregation = aggregateCommunities(graph, partition)
    const totalWeightDouble = graph.totalEdgeWeight * 2
    let modularity = 0

    for (const aggregation of communityAggregation.values()) {
        const internalComponent = aggregation.intraCommunityEdgeWeight / graph.totalEdgeWeight
        const normalizedTotal = aggregation.totalIncidentEdgeWeight / totalWeightDouble
        const expectedComponent = resolution * normalizedTotal * normalizedTotal
        modularity += internalComponent - expectedComponent
    }

    return modularity
}
