import {FilePath, type IParsedSourceFileDTO} from "@codenautic/core"

import {
    AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE,
    AstCircularDependencyDetectorError,
} from "./ast-circular-dependency-detector.error"
import {
    AstImportExportGraphBuilder,
    type IAstImportExportGraphBuilder,
    type IAstImportExportGraphResult,
} from "./ast-import-export-graph-builder"

const DEFAULT_MINIMUM_CYCLE_SIZE = 2
const DEFAULT_MAX_CYCLES = 100

/**
 * Circular dependency severity bucket.
 */
export const AST_CIRCULAR_DEPENDENCY_SEVERITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
} as const

/**
 * Circular dependency severity literal.
 */
export type AstCircularDependencySeverity =
    (typeof AST_CIRCULAR_DEPENDENCY_SEVERITY)[keyof typeof AST_CIRCULAR_DEPENDENCY_SEVERITY]

/**
 * One detected circular dependency component.
 */
export interface IAstCircularDependency {
    /**
     * Stable deterministic circular dependency identifier.
     */
    readonly id: string

    /**
     * Severity derived from cycle size.
     */
    readonly severity: AstCircularDependencySeverity

    /**
     * Sorted file paths that belong to one cycle component.
     */
    readonly filePaths: readonly string[]

    /**
     * Number of files in cycle component.
     */
    readonly cycleSize: number

    /**
     * Number of internal directed edges inside cycle component.
     */
    readonly internalEdgeCount: number
}

/**
 * Circular dependency detector summary payload.
 */
export interface IAstCircularDependencyDetectorSummary {
    /**
     * Number of source files scanned by graph builder.
     */
    readonly scannedFileCount: number

    /**
     * Number of graph nodes included in cycle detection scope.
     */
    readonly nodeCount: number

    /**
     * Number of returned cycle components.
     */
    readonly cycleCount: number

    /**
     * Largest cycle size in returned payload.
     */
    readonly longestCycleSize: number

    /**
     * Indicates whether output was truncated by max cycle cap.
     */
    readonly truncated: boolean

    /**
     * Number of cycle components omitted by max cycle cap.
     */
    readonly truncatedCycleCount: number

    /**
     * Severity distribution across returned cycle components.
     */
    readonly bySeverity: Record<AstCircularDependencySeverity, number>
}

/**
 * Circular dependency detector result.
 */
export interface IAstCircularDependencyDetectorResult {
    /**
     * Deterministic detected cycle components.
     */
    readonly cycles: readonly IAstCircularDependency[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstCircularDependencyDetectorSummary
}

/**
 * Circular dependency detector input.
 */
export interface IAstCircularDependencyDetectorInput {
    /**
     * Parsed source files used to build import/export graph.
     */
    readonly files: readonly IParsedSourceFileDTO[]

    /**
     * Optional repository-relative file-path subset.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional minimum cycle size in files.
     */
    readonly minimumCycleSize?: number

    /**
     * Optional max number of returned cycle components.
     */
    readonly maxCycles?: number
}

/**
 * Circular dependency detector options.
 */
export interface IAstCircularDependencyDetectorServiceOptions {
    /**
     * Optional import/export graph builder override.
     */
    readonly graphBuilder?: IAstImportExportGraphBuilder

    /**
     * Optional default minimum cycle size in files.
     */
    readonly defaultMinimumCycleSize?: number

    /**
     * Optional default max number of returned cycle components.
     */
    readonly defaultMaxCycles?: number
}

/**
 * Circular dependency detector contract.
 */
export interface IAstCircularDependencyDetectorService {
    /**
     * Detects circular dependencies from parsed source files.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic circular dependency payload.
     */
    detect(
        input: IAstCircularDependencyDetectorInput,
    ): Promise<IAstCircularDependencyDetectorResult>
}

interface IResolvedCircularDependencyConfig {
    readonly filePaths?: readonly string[]
    readonly minimumCycleSize: number
    readonly maxCycles: number
}

/**
 * Detects circular dependencies over import/export graph.
 */
export class AstCircularDependencyDetectorService
    implements IAstCircularDependencyDetectorService
{
    private readonly graphBuilder: IAstImportExportGraphBuilder
    private readonly defaultMinimumCycleSize: number
    private readonly defaultMaxCycles: number

    /**
     * Creates circular dependency detector service.
     *
     * @param options Optional detector configuration.
     */
    public constructor(options: IAstCircularDependencyDetectorServiceOptions = {}) {
        this.graphBuilder = options.graphBuilder ?? new AstImportExportGraphBuilder()
        this.defaultMinimumCycleSize = validateMinimumCycleSize(
            options.defaultMinimumCycleSize ?? DEFAULT_MINIMUM_CYCLE_SIZE,
        )
        this.defaultMaxCycles = validateMaxCycles(
            options.defaultMaxCycles ?? DEFAULT_MAX_CYCLES,
        )
    }

    /**
     * Detects circular dependencies from parsed source files.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic circular dependency payload.
     */
    public async detect(
        input: IAstCircularDependencyDetectorInput,
    ): Promise<IAstCircularDependencyDetectorResult> {
        const config = this.resolveConfig(input)
        const graph = await this.graphBuilder.build(input.files, {
            filePaths: config.filePaths,
        })
        const scopedNodePaths = resolveScopedNodePaths(graph.nodes, config.filePaths)
        const adjacency = createScopedAdjacency(scopedNodePaths, graph)
        const detectedCycles = detectCircularDependencies(adjacency, config.minimumCycleSize)
        const cycles = detectedCycles.slice(0, config.maxCycles)
        const truncatedCycleCount = Math.max(0, detectedCycles.length - cycles.length)

        return {
            cycles,
            summary: createSummary(
                graph.summary.scannedFileCount,
                scopedNodePaths.length,
                cycles,
                truncatedCycleCount,
            ),
        }
    }

    /**
     * Resolves runtime config with validated defaults.
     *
     * @param input Runtime input.
     * @returns Validated runtime config.
     */
    private resolveConfig(
        input: IAstCircularDependencyDetectorInput,
    ): IResolvedCircularDependencyConfig {
        return {
            filePaths: normalizeFilePathFilter(input.filePaths),
            minimumCycleSize: validateMinimumCycleSize(
                input.minimumCycleSize ?? this.defaultMinimumCycleSize,
            ),
            maxCycles: validateMaxCycles(input.maxCycles ?? this.defaultMaxCycles),
        }
    }
}

/**
 * Validates minimum cycle size.
 *
 * @param minimumCycleSize Raw minimum cycle size.
 * @returns Validated minimum cycle size.
 */
function validateMinimumCycleSize(minimumCycleSize: number): number {
    if (Number.isSafeInteger(minimumCycleSize) === false || minimumCycleSize < 2) {
        throw new AstCircularDependencyDetectorError(
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CYCLE_SIZE,
            {minimumCycleSize},
        )
    }

    return minimumCycleSize
}

/**
 * Validates max cycle component cap.
 *
 * @param maxCycles Raw max cycle component cap.
 * @returns Validated max cycle component cap.
 */
function validateMaxCycles(maxCycles: number): number {
    if (Number.isSafeInteger(maxCycles) === false || maxCycles < 1) {
        throw new AstCircularDependencyDetectorError(
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_MAX_CYCLES,
            {maxCycles},
        )
    }

    return maxCycles
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw file-path filter.
 * @returns Sorted unique normalized file-path filter or undefined.
 */
function normalizeFilePathFilter(
    filePaths: readonly string[] | undefined,
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstCircularDependencyDetectorError(
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalizedPathSet = new Set<string>()

    for (const filePath of filePaths) {
        normalizedPathSet.add(normalizeFilePath(filePath))
    }

    return [...normalizedPathSet].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstCircularDependencyDetectorError(
            AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Resolves node scope for cycle detection.
 *
 * @param nodes Graph nodes.
 * @param requestedFilePaths Optional requested file-path scope.
 * @returns Deterministic node scope.
 */
function resolveScopedNodePaths(
    nodes: readonly string[],
    requestedFilePaths: readonly string[] | undefined,
): readonly string[] {
    const orderedNodes = [...new Set(nodes)].sort((left, right) => left.localeCompare(right))

    if (requestedFilePaths === undefined) {
        return orderedNodes
    }

    const nodeSet = new Set<string>(orderedNodes)
    return requestedFilePaths.filter((filePath) => nodeSet.has(filePath))
}

/**
 * Builds scoped directed adjacency from graph edges.
 *
 * @param nodePaths Scoped node paths.
 * @param graph Import/export graph result.
 * @returns Immutable scoped adjacency.
 */
function createScopedAdjacency(
    nodePaths: readonly string[],
    graph: IAstImportExportGraphResult,
): ReadonlyMap<string, ReadonlySet<string>> {
    const adjacency = new Map<string, Set<string>>()
    const nodeSet = new Set<string>(nodePaths)

    for (const nodePath of nodePaths) {
        adjacency.set(nodePath, new Set<string>())
    }

    for (const edge of graph.edges) {
        if (nodeSet.has(edge.sourceFilePath) === false) {
            continue
        }

        if (nodeSet.has(edge.targetFilePath) === false) {
            continue
        }

        adjacency.get(edge.sourceFilePath)?.add(edge.targetFilePath)
    }

    return freezeAdjacency(adjacency)
}

/**
 * Freezes adjacency map for immutable deterministic reads.
 *
 * @param adjacency Mutable adjacency map.
 * @returns Immutable adjacency map.
 */
function freezeAdjacency(
    adjacency: Map<string, Set<string>>,
): ReadonlyMap<string, ReadonlySet<string>> {
    const entries = [...adjacency.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([filePath, targets]): [string, ReadonlySet<string>] => {
            return [filePath, new Set<string>([...targets].sort((left, right) => left.localeCompare(right)))]
        })

    return new Map<string, ReadonlySet<string>>(entries)
}

/**
 * Detects circular dependency components from adjacency map.
 *
 * @param adjacency Scoped directed adjacency.
 * @param minimumCycleSize Minimum cycle size threshold.
 * @returns Deterministic cycle components.
 */
function detectCircularDependencies(
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
    minimumCycleSize: number,
): readonly IAstCircularDependency[] {
    const components = findStronglyConnectedComponents(adjacency)
    const cycles: IAstCircularDependency[] = []

    for (const component of components) {
        if (component.length < minimumCycleSize) {
            continue
        }

        cycles.push(createCircularDependency(component, adjacency))
    }

    return cycles.sort(compareCircularDependencies)
}

/**
 * Creates one circular dependency record from SCC component.
 *
 * @param component Sorted strongly connected component.
 * @param adjacency Scoped adjacency.
 * @returns Circular dependency payload.
 */
function createCircularDependency(
    component: readonly string[],
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): IAstCircularDependency {
    return {
        id: createCircularDependencyId(component),
        severity: resolveSeverity(component.length),
        filePaths: component,
        cycleSize: component.length,
        internalEdgeCount: countInternalEdges(component, adjacency),
    }
}

/**
 * Creates stable circular dependency identifier.
 *
 * @param component Sorted component file paths.
 * @returns Stable circular dependency identifier.
 */
function createCircularDependencyId(component: readonly string[]): string {
    return component.join("|")
}

/**
 * Counts directed edges that stay inside one component.
 *
 * @param component Sorted component file paths.
 * @param adjacency Scoped adjacency.
 * @returns Internal edge count.
 */
function countInternalEdges(
    component: readonly string[],
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): number {
    const componentSet = new Set<string>(component)
    let internalEdgeCount = 0

    for (const source of component) {
        const targets = adjacency.get(source)
        if (targets === undefined) {
            continue
        }

        for (const target of targets) {
            if (componentSet.has(target)) {
                internalEdgeCount += 1
            }
        }
    }

    return internalEdgeCount
}

/**
 * Finds strongly connected components using Tarjan algorithm.
 *
 * @param adjacency Directed adjacency.
 * @returns Deterministic strongly connected components.
 */
function findStronglyConnectedComponents(
    adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): readonly (readonly string[])[] {
    const indexByNode = new Map<string, number>()
    const lowLinkByNode = new Map<string, number>()
    const stack: string[] = []
    const inStack = new Set<string>()
    const components: string[][] = []
    let index = 0

    const updateLowLink = (node: string, candidate: number): void => {
        const currentLowLink = lowLinkByNode.get(node) ?? Number.MAX_SAFE_INTEGER
        lowLinkByNode.set(node, Math.min(currentLowLink, candidate))
    }

    const processNeighbor = (node: string, neighbor: string): void => {
        if (indexByNode.has(neighbor) === false) {
            visit(neighbor)
            updateLowLink(node, lowLinkByNode.get(neighbor) ?? Number.MAX_SAFE_INTEGER)
            return
        }

        if (inStack.has(neighbor)) {
            updateLowLink(node, indexByNode.get(neighbor) ?? Number.MAX_SAFE_INTEGER)
        }
    }

    const processNeighbors = (node: string): void => {
        const neighbors = adjacency.get(node)
        if (neighbors === undefined) {
            return
        }

        for (const neighbor of neighbors) {
            processNeighbor(node, neighbor)
        }
    }

    const visit = (node: string): void => {
        indexByNode.set(node, index)
        lowLinkByNode.set(node, index)
        index += 1
        stack.push(node)
        inStack.add(node)

        processNeighbors(node)

        const nodeIndex = indexByNode.get(node)
        const nodeLowLink = lowLinkByNode.get(node)

        if (nodeIndex !== undefined && nodeLowLink === nodeIndex) {
            const component: string[] = []
            let stackNode: string | undefined = stack.pop()

            while (stackNode !== undefined) {
                inStack.delete(stackNode)
                component.push(stackNode)
                if (stackNode === node) {
                    break
                }
                stackNode = stack.pop()
            }

            components.push(component.sort((left, right) => left.localeCompare(right)))
        }
    }

    const orderedNodes = [...adjacency.keys()].sort((left, right) => left.localeCompare(right))
    for (const node of orderedNodes) {
        if (indexByNode.has(node)) {
            continue
        }

        visit(node)
    }

    return components.sort(compareStringArrayByKey)
}

/**
 * Resolves severity bucket from cycle size.
 *
 * @param cycleSize Cycle size in files.
 * @returns Severity bucket.
 */
function resolveSeverity(cycleSize: number): AstCircularDependencySeverity {
    if (cycleSize >= 5) {
        return AST_CIRCULAR_DEPENDENCY_SEVERITY.HIGH
    }

    if (cycleSize >= 3) {
        return AST_CIRCULAR_DEPENDENCY_SEVERITY.MEDIUM
    }

    return AST_CIRCULAR_DEPENDENCY_SEVERITY.LOW
}

/**
 * Compares circular dependencies by severity footprint and stable id.
 *
 * @param left Left circular dependency.
 * @param right Right circular dependency.
 * @returns Sort result.
 */
function compareCircularDependencies(
    left: IAstCircularDependency,
    right: IAstCircularDependency,
): number {
    if (left.cycleSize !== right.cycleSize) {
        return right.cycleSize - left.cycleSize
    }

    if (left.internalEdgeCount !== right.internalEdgeCount) {
        return right.internalEdgeCount - left.internalEdgeCount
    }

    return left.id.localeCompare(right.id)
}

/**
 * Compares sorted string arrays using stable joined key.
 *
 * @param left Left string array.
 * @param right Right string array.
 * @returns Sort result.
 */
function compareStringArrayByKey(left: readonly string[], right: readonly string[]): number {
    return left.join("|").localeCompare(right.join("|"))
}

/**
 * Builds aggregated summary for cycle detection result.
 *
 * @param scannedFileCount Number of source files scanned by graph builder.
 * @param nodeCount Number of scoped graph nodes.
 * @param cycles Returned circular dependencies.
 * @param truncatedCycleCount Number of omitted cycles.
 * @returns Aggregated summary payload.
 */
function createSummary(
    scannedFileCount: number,
    nodeCount: number,
    cycles: readonly IAstCircularDependency[],
    truncatedCycleCount: number,
): IAstCircularDependencyDetectorSummary {
    let longestCycleSize = 0
    const bySeverity: Record<AstCircularDependencySeverity, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
    }

    for (const cycle of cycles) {
        if (cycle.cycleSize > longestCycleSize) {
            longestCycleSize = cycle.cycleSize
        }

        bySeverity[cycle.severity] += 1
    }

    return {
        scannedFileCount,
        nodeCount,
        cycleCount: cycles.length,
        longestCycleSize,
        truncated: truncatedCycleCount > 0,
        truncatedCycleCount,
        bySeverity,
    }
}
