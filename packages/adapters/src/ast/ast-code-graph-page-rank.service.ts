import {
    CODE_GRAPH_NODE_TYPE,
    FilePath,
    type ICodeGraph,
    type ICodeGraphNode,
    type ICodeGraphPageRankInput,
    type ICodeGraphPageRankService,
    type IHotspotMetric,
} from "@codenautic/core"

import {
    AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE,
    AstCodeGraphPageRankError,
} from "./ast-code-graph-page-rank.error"

const DEFAULT_DAMPING_FACTOR = 0.85
const DEFAULT_ITERATIONS = 20

/**
 * Construction options for AST code graph PageRank service.
 */
export interface IAstCodeGraphPageRankServiceOptions {
    /**
     * Optional default damping factor used when input omits custom value.
     */
    readonly defaultDampingFactor?: number

    /**
     * Optional default iteration count used when input omits custom value.
     */
    readonly defaultIterations?: number
}

interface IResolvedPageRankConfig {
    /**
     * Validated damping factor.
     */
    readonly dampingFactor: number

    /**
     * Validated deterministic iteration count.
     */
    readonly iterations: number
}

/**
 * Tree-sitter graph-backed PageRank implementation for hotspot identification.
 */
export class AstCodeGraphPageRankService implements ICodeGraphPageRankService {
    private readonly defaultDampingFactor: number
    private readonly defaultIterations: number

    /**
     * Creates AST code graph PageRank service.
     *
     * @param options Optional default ranking configuration.
     * @throws {AstCodeGraphPageRankError} When defaults are invalid.
     */
    public constructor(options: IAstCodeGraphPageRankServiceOptions = {}) {
        this.defaultDampingFactor = validateDampingFactor(
            options.defaultDampingFactor ?? DEFAULT_DAMPING_FACTOR,
        )
        this.defaultIterations = validateIterations(
            options.defaultIterations ?? DEFAULT_ITERATIONS,
        )
    }

    /**
     * Calculates deterministic hotspot ranking from code graph edges.
     *
     * @param input Graph payload and optional ranking configuration.
     * @returns Ranked hotspot metrics sorted by score.
     * @throws {AstCodeGraphPageRankError} When options or file paths are invalid.
     */
    public calculateHotspots(
        input: ICodeGraphPageRankInput,
    ): Promise<readonly IHotspotMetric[]> {
        const config = this.resolveConfig(input)
        const filePaths = resolveCandidateFilePaths(input.graph, input.filePaths)
        if (filePaths.length === 0) {
            return Promise.resolve([])
        }

        const adjacency = buildFileAdjacency(input.graph, filePaths)
        const scores = computePageRank(filePaths, adjacency, config)

        return Promise.resolve(buildHotspots(filePaths, scores))
    }

    /**
     * Resolves input configuration with validated defaults.
     *
     * @param input Runtime ranking input.
     * @returns Validated config.
     */
    private resolveConfig(input: ICodeGraphPageRankInput): IResolvedPageRankConfig {
        return {
            dampingFactor: validateDampingFactor(input.dampingFactor ?? this.defaultDampingFactor),
            iterations: validateIterations(input.iterations ?? this.defaultIterations),
        }
    }
}

/**
 * Resolves candidate file paths from input or graph snapshot.
 *
 * @param graph Graph snapshot.
 * @param requestedFilePaths Optional requested file subset.
 * @returns Sorted unique candidate file paths.
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
        if (node.type !== CODE_GRAPH_NODE_TYPE.FILE) {
            continue
        }

        const normalized = tryNormalizeFilePath(node.filePath)
        if (normalized !== undefined) {
            filePaths.add(normalized)
        }
    }

    return [...filePaths].sort()
}

/**
 * Builds outgoing file-level adjacency from graph node relations.
 *
 * @param graph Graph snapshot.
 * @param filePaths Ranked file subset.
 * @returns File-level adjacency.
 */
function buildFileAdjacency(
    graph: ICodeGraph,
    filePaths: readonly string[],
): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>()
    const knownFiles = new Set(filePaths)
    const nodeFileLookup = createNodeFileLookup(graph.nodes)

    for (const edge of graph.edges) {
        const source = resolveFileEndpoint(edge.source, nodeFileLookup, knownFiles)
        const target = resolveFileEndpoint(edge.target, nodeFileLookup, knownFiles)
        if (source === undefined || target === undefined || source === target) {
            continue
        }

        const bucket = adjacency.get(source)
        if (bucket === undefined) {
            adjacency.set(source, new Set([target]))
            continue
        }

        bucket.add(target)
    }

    return adjacency
}

/**
 * Builds lookup of graph node ids to normalized file paths.
 *
 * @param nodes Graph nodes.
 * @returns Node id to file path lookup.
 */
function createNodeFileLookup(nodes: readonly ICodeGraphNode[]): ReadonlyMap<string, string> {
    const lookup = new Map<string, string>()

    for (const node of nodes) {
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
 * Resolves raw graph endpoint into known canonical file path.
 *
 * @param rawEndpoint Raw graph edge endpoint.
 * @param nodeFileLookup Node-to-file lookup.
 * @param knownFiles Ranked file subset.
 * @returns Canonical file path when resolvable.
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
 * Computes deterministic PageRank scores for ranked files.
 *
 * @param filePaths Sorted file paths.
 * @param adjacency Outgoing adjacency.
 * @param config Validated PageRank configuration.
 * @returns Score map by file path.
 */
function computePageRank(
    filePaths: readonly string[],
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
    config: IResolvedPageRankConfig,
): ReadonlyMap<string, number> {
    const result = new Map<string, number>()
    if (filePaths.length === 0) {
        return result
    }

    const initialRank = 1 / filePaths.length
    let current = initializeRanks(filePaths, initialRank)

    for (let iteration = 0; iteration < config.iterations; iteration++) {
        const next = initializeRanks(
            filePaths,
            (1 - config.dampingFactor) / filePaths.length,
        )
        const sinkRank = distributeRanks(filePaths, current, adjacency, next, config.dampingFactor)
        distributeSinkRank(next, sinkRank, filePaths.length, config.dampingFactor)
        current = next
    }

    return current
}

/**
 * Creates initial rank map with equal distribution.
 *
 * @param filePaths Sorted file paths.
 * @param value Initial rank value.
 * @returns Rank map.
 */
function initializeRanks(filePaths: readonly string[], value: number): Map<string, number> {
    const ranks = new Map<string, number>()

    for (const filePath of filePaths) {
        ranks.set(filePath, value)
    }

    return ranks
}

/**
 * Distributes rank across outgoing adjacency and returns total sink rank.
 *
 * @param filePaths Sorted file paths.
 * @param current Current rank map.
 * @param adjacency Outgoing adjacency.
 * @param next Next rank accumulator.
 * @param dampingFactor Validated damping factor.
 * @returns Collected sink rank.
 */
function distributeRanks(
    filePaths: readonly string[],
    current: ReadonlyMap<string, number>,
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
    next: Map<string, number>,
    dampingFactor: number,
): number {
    let sinkRank = 0

    for (const filePath of filePaths) {
        const rank = current.get(filePath) ?? 0
        const targets = adjacency.get(filePath)
        if (targets === undefined || targets.size === 0) {
            sinkRank += rank
            continue
        }

        const shared = (rank * dampingFactor) / targets.size
        for (const target of targets) {
            next.set(target, (next.get(target) ?? 0) + shared)
        }
    }

    return sinkRank
}

/**
 * Distributes sink rank equally across all candidate files.
 *
 * @param next Next rank accumulator.
 * @param sinkRank Collected sink rank.
 * @param fileCount Number of candidate files.
 * @param dampingFactor Validated damping factor.
 */
function distributeSinkRank(
    next: Map<string, number>,
    sinkRank: number,
    fileCount: number,
    dampingFactor: number,
): void {
    const sinkShare = sinkRank / fileCount
    const sinkContribution = dampingFactor * sinkShare

    for (const filePath of next.keys()) {
        next.set(filePath, (next.get(filePath) ?? 0) + sinkContribution)
    }
}

/**
 * Builds sorted hotspot output from PageRank scores.
 *
 * @param filePaths Ranked file set.
 * @param scores Score map by file path.
 * @returns Sorted hotspot metrics.
 */
function buildHotspots(
    filePaths: readonly string[],
    scores: ReadonlyMap<string, number>,
): readonly IHotspotMetric[] {
    const hotspots = filePaths.map((filePath) => {
        return {
            filePath,
            score: scores.get(filePath) ?? 0,
        }
    })

    hotspots.sort((left, right) => {
        if (left.score === right.score) {
            return left.filePath.localeCompare(right.filePath)
        }

        return right.score - left.score
    })

    return hotspots
}

/**
 * Validates damping factor value.
 *
 * @param value Raw damping factor.
 * @returns Validated damping factor.
 * @throws {AstCodeGraphPageRankError} When damping factor is invalid.
 */
function validateDampingFactor(value: number): number {
    if (typeof value !== "number" || Number.isFinite(value) === false || value <= 0 || value >= 1) {
        throw new AstCodeGraphPageRankError(
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_DAMPING_FACTOR,
            {dampingFactor: value},
        )
    }

    return value
}

/**
 * Validates iteration count value.
 *
 * @param value Raw iteration count.
 * @returns Validated iteration count.
 * @throws {AstCodeGraphPageRankError} When iteration count is invalid.
 */
function validateIterations(value: number): number {
    if (Number.isInteger(value) === false || value < 1) {
        throw new AstCodeGraphPageRankError(
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_ITERATIONS,
            {iterations: value},
        )
    }

    return value
}

/**
 * Normalizes repository-relative file path or throws typed error.
 *
 * @param value Raw file path.
 * @returns Normalized file path.
 * @throws {AstCodeGraphPageRankError} When file path is invalid.
 */
function normalizeFilePath(value: string): string {
    try {
        return FilePath.create(value).toString()
    } catch {
        throw new AstCodeGraphPageRankError(
            AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE.INVALID_FILE_PATH,
            {filePath: value},
        )
    }
}

/**
 * Normalizes file path when possible and suppresses malformed graph node data.
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
