import {DiffFile} from "../value-objects/diff-file.value-object"
import {FilePath} from "../value-objects/file-path.value-object"
import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type CodeEdge,
    type CodeGraph,
    type CodeNode,
    type ICircularDependency,
    type ImpactAnalysisResult,
} from "../value-objects/code-graph.value-object"

const MAX_IMPACT_DEPTH = 3
const IMPORT_EXTENSION_CANDIDATES = [".ts", ".tsx", ".js", ".jsx"] as const
const IMPORT_FROM_PATTERN = /import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/
const IMPORT_BARE_PATTERN = /import\s+['"]([^'"]+)['"]/

/**
 * Contract for dependency graph business logic.
 */
export interface IDependencyGraphService {
    /**
     * Builds deterministic code graph from changed files.
     *
     * @param files Scanner or diff payload.
     * @returns Constructed code graph.
     */
    buildGraph(files: readonly DiffFile[]): Promise<CodeGraph>

    /**
     * Calculates impact for changed files using currently built graph.
     *
     * @param changedFiles Changed file paths.
     * @returns Impact result and breaking changes.
     */
    getImpact(changedFiles: readonly FilePath[]): Promise<ImpactAnalysisResult>

    /**
     * Detects circular dependencies in current graph.
     *
     * @returns Found cycles with full path.
     */
    detectCircular(): Promise<readonly ICircularDependency[]>
}

/**
 * Domain service for code graph build and impact analysis.
 */
export class DependencyGraphService implements IDependencyGraphService {
    private graph: CodeGraph = {nodes: [], edges: []}

    /**
     * Builds graph from file-level diff payload.
     *
     * @param files Changed files from scan or diff.
     * @returns Deterministic graph payload.
     */
    public buildGraph(files: readonly DiffFile[]): Promise<CodeGraph> {
        const fileNodes = this.extractNodesFromFiles(files)
        const edges = this.extractEdgesFromFiles(files, fileNodes)

        this.graph = {
            nodes: fileNodes,
            edges,
        }

        return Promise.resolve(this.graph)
    }

    /**
     * Calculates impact result for changed files.
     *
     * @param changedFiles Changed file paths.
     * @returns Impact analysis.
     */
    public getImpact(changedFiles: readonly FilePath[]): Promise<ImpactAnalysisResult> {
        const result = this.calculateImpact(changedFiles)
        return Promise.resolve(result)
    }

    /**
     * Detects circular dependencies in current graph.
     *
     * @returns Circular dependencies.
     */
    public detectCircular(): Promise<readonly ICircularDependency[]> {
        const adjacency = this.buildOutgoingAdjacency(this.graph.edges)
        const cycles = this.collectCircularDependencies(adjacency)
        const sorted = [...cycles.values()].sort((left, right) => left.nodeA.localeCompare(right.nodeA))

        return Promise.resolve(sorted)
    }

    private calculateImpact(changedFiles: readonly FilePath[]): ImpactAnalysisResult {
        const changedNodeIds = new Set<string>()
        const visited = new Map<string, {depth: number}>()
        const breakingChanges: Array<{node: CodeNode; reason: string}> = []

        const filePathByNode = this.mapNodeByFilePath(this.graph.nodes)
        const nodeLookup = this.mapNodeById(this.graph.nodes)

        this.addChangedNodesToTraversal({
            changedFiles,
            changedNodeIds,
            visited,
            breakingChanges,
            filePathByNode,
            nodeLookup,
        })

        const adjacency = this.buildReverseAdjacency(this.graph.edges)
        const affectedNodeIds = this.collectAffectedNodeIds(visited, adjacency)

        const changedNodes = this.sortNodes(
            changedNodeIds,
            nodeLookup,
        )
        const affectedNodes = this.sortNodes(affectedNodeIds, nodeLookup)

        return {
            changedNodes,
            affectedNodes,
            impactRadius: this.getImpactRadius(visited, affectedNodeIds),
            breakingChanges,
        }
    }

    private addChangedNodesToTraversal(params: {
        readonly changedFiles: readonly FilePath[]
        readonly changedNodeIds: Set<string>
        readonly visited: Map<string, {depth: number}>
        readonly breakingChanges: Array<{node: CodeNode; reason: string}>
        readonly filePathByNode: Map<string, CodeNode>
        readonly nodeLookup: Map<string, CodeNode>
    }): void {
        for (const filePath of params.changedFiles) {
            const normalizedPath = filePath.toString()
            const changedNodeId = this.toNodeId(normalizedPath)
            const matchedNode = params.filePathByNode.get(normalizedPath)

            if (matchedNode === undefined) {
                this.addMissingChangedNode({
                    changedNodeId,
                    normalizedPath,
                    changedNodeIds: params.changedNodeIds,
                    visited: params.visited,
                    breakingChanges: params.breakingChanges,
                    nodeLookup: params.nodeLookup,
                })
                continue
            }

            params.changedNodeIds.add(changedNodeId)
            if (params.visited.has(changedNodeId) === false) {
                params.visited.set(changedNodeId, {depth: 0})
            }
        }
    }

    private addMissingChangedNode(params: {
        readonly changedNodeId: string
        readonly normalizedPath: string
        readonly changedNodeIds: Set<string>
        readonly visited: Map<string, {depth: number}>
        readonly breakingChanges: Array<{node: CodeNode; reason: string}>
        readonly nodeLookup: Map<string, CodeNode>
    }): void {
        const {
            changedNodeId,
            normalizedPath,
            changedNodeIds,
            visited,
            breakingChanges,
            nodeLookup,
        } = params

        const syntheticNode = this.createSyntheticNode(normalizedPath)
        nodeLookup.set(syntheticNode.id, syntheticNode)
        breakingChanges.push({
            node: syntheticNode,
            reason: "CHANGED_FILE_NOT_IN_GRAPH",
        })
        changedNodeIds.add(changedNodeId)
        visited.set(changedNodeId, {depth: 0})
    }

    private collectAffectedNodeIds(
        visited: Map<string, {depth: number}>,
        adjacency: Map<string, string[]>,
    ): Set<string> {
        const queue = [...visited.keys()]
        while (queue.length > 0) {
            const nodeId = queue.shift()
            if (nodeId === undefined) {
                continue
            }

            const current = visited.get(nodeId)
            if (current === undefined || current.depth >= MAX_IMPACT_DEPTH) {
                continue
            }

            const predecessors = adjacency.get(nodeId)
            if (predecessors === undefined) {
                continue
            }

            for (const predecessorId of predecessors) {
                if (visited.has(predecessorId)) {
                    continue
                }

                visited.set(predecessorId, {depth: current.depth + 1})
                queue.push(predecessorId)
            }
        }

        return new Set(visited.keys())
    }

    private getImpactRadius(
        visited: Map<string, {depth: number}>,
        affectedNodeIds: Set<string>,
    ): number {
        let impactRadius = 0
        for (const nodeId of affectedNodeIds) {
            const entry = visited.get(nodeId)
            if (entry !== undefined && entry.depth > impactRadius) {
                impactRadius = entry.depth
            }
        }

        return impactRadius
    }

    private sortNodes(
        nodeIds: Iterable<string>,
        nodeLookup: Map<string, CodeNode>,
    ): readonly CodeNode[] {
        return [...nodeIds]
            .map((nodeId): CodeNode | undefined => nodeLookup.get(nodeId))
            .filter((node): node is CodeNode => node !== undefined)
            .sort((left, right) => left.id.localeCompare(right.id))
    }

    private collectCircularDependencies(adjacency: Map<string, string[]>): Map<string, ICircularDependency> {
        const visited = new Set<string>()
        const onStack = new Set<string>()
        const path: string[] = []
        const found = new Map<string, ICircularDependency>()

        const visit = (nodeId: string): void => {
            if (visited.has(nodeId)) {
                return
            }

            visited.add(nodeId)
            onStack.add(nodeId)
            path.push(nodeId)

            const neighbors = adjacency.get(nodeId)
            if (neighbors === undefined) {
                onStack.delete(nodeId)
                path.pop()
                return
            }

            for (const neighbor of neighbors) {
                if (onStack.has(neighbor) === false) {
                    if (visited.has(neighbor) === false) {
                        visit(neighbor)
                    }

                    continue
                }

                const cycleStart = path.indexOf(neighbor)
                if (cycleStart === -1) {
                    continue
                }

                const cyclePath = [...path.slice(cycleStart), neighbor]
                const key = cyclePath.join("->")
                found.set(key, {
                    nodeA: neighbor,
                    nodeB: nodeId,
                    path: cyclePath,
                })
            }

            onStack.delete(nodeId)
            path.pop()
        }

        for (const node of this.graph.nodes) {
            visit(node.id)
        }

        return found
    }

    private extractNodesFromFiles(files: readonly DiffFile[]): readonly CodeNode[] {
        const nodes = new Map<string, CodeNode>()

        for (const file of files) {
            const filePath = file.filePath.toString()
            nodes.set(this.toNodeId(filePath), {
                id: this.toNodeId(filePath),
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: filePath,
                filePath,
                metadata: {
                    status: file.status,
                    patchLength: file.patch.length,
                },
            })
        }

        return [...nodes.values()]
    }

    private extractEdgesFromFiles(
        files: readonly DiffFile[],
        nodes: readonly CodeNode[],
    ): readonly CodeEdge[] {
        const nodeByPath = this.mapPathByNode(nodes)
        const edges: CodeEdge[] = []

        for (const file of files) {
            const fromNodeId = this.toNodeId(file.filePath.toString())
            for (const importPath of this.extractImports(file.patch)) {
                const candidates = this.resolveImportPathCandidates(file.filePath.toString(), importPath)
                const targetNodeId = this.pickTargetNodeId(candidates, nodeByPath)

                if (targetNodeId === undefined) {
                    continue
                }

                edges.push({
                    source: fromNodeId,
                    target: targetNodeId,
                    type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
                })
            }
        }

        return edges
    }

    private extractImports(patch: string): readonly string[] {
        const imports: string[] = []

        for (const line of patch.split("\n")) {
            if (line.length === 0 || line.startsWith("-") === true) {
                continue
            }

            const candidate = this.extractImportFromLine(line)
            if (candidate === undefined) {
                continue
            }

            imports.push(candidate)
        }

        return imports
    }

    private extractImportFromLine(line: string): string | undefined {
        const normalized = line.startsWith("+") ? line.slice(1).trim() : line.trim()
        if (normalized.length === 0) {
            return undefined
        }

        const importFrom = normalized.match(IMPORT_FROM_PATTERN)
        if (importFrom !== null && importFrom[1] !== undefined) {
            const value = importFrom[1].trim()
            if (value.length > 0) {
                return value
            }
        }

        const importBare = normalized.match(IMPORT_BARE_PATTERN)
        if (importBare !== null && importBare[1] !== undefined) {
            const value = importBare[1].trim()
            if (value.length > 0) {
                return value
            }
        }

        return undefined
    }

    private pickTargetNodeId(
        candidates: readonly string[],
        nodeByPath: Map<string, string>,
    ): string | undefined {
        for (const candidatePath of candidates) {
            const targetId = nodeByPath.get(candidatePath)
            if (targetId !== undefined) {
                return targetId
            }
        }

        return undefined
    }

    private resolveImportPathCandidates(currentFilePath: string, importPath: string): readonly string[] {
        if (importPath.startsWith(".") === false) {
            return []
        }

        const baseDirectoryParts = currentFilePath.split("/")
        baseDirectoryParts.pop()
        const normalizedImportPath = importPath.trim().replaceAll("\\", "/")
        const importParts = normalizedImportPath.split("/")

        for (const part of importParts) {
            if (part === "." || part.length === 0) {
                continue
            }

            if (part === "..") {
                baseDirectoryParts.pop()
                continue
            }

            baseDirectoryParts.push(part)
        }

        const joined = baseDirectoryParts.join("/")
        if (joined.length === 0) {
            return []
        }

        const candidates = new Set<string>([joined])
        const hasKnownExtension = this.hasFileExtension(joined)
        if (hasKnownExtension === false) {
            for (const extension of IMPORT_EXTENSION_CANDIDATES) {
                candidates.add(`${joined}${extension}`)
                candidates.add(`${joined}/index${extension}`)
            }
        }

        return [...candidates]
    }

    private toNodeId(filePath: string): string {
        return `file:${filePath}`
    }

    private hasFileExtension(filePath: string): boolean {
        return IMPORT_EXTENSION_CANDIDATES.some((extension) => filePath.endsWith(extension))
    }

    private createSyntheticNode(filePath: string): CodeNode {
        return {
            id: this.toNodeId(filePath),
            type: CODE_GRAPH_NODE_TYPE.FILE,
            name: filePath,
            filePath,
        }
    }

    private mapNodeById(nodes: readonly CodeNode[]): Map<string, CodeNode> {
        const map = new Map<string, CodeNode>()
        for (const node of nodes) {
            map.set(node.id, node)
        }

        return map
    }

    private mapNodeByFilePath(nodes: readonly CodeNode[]): Map<string, CodeNode> {
        const map = new Map<string, CodeNode>()
        for (const node of nodes) {
            map.set(node.filePath, node)
        }

        return map
    }

    private mapPathByNode(nodes: readonly CodeNode[]): Map<string, string> {
        const map = new Map<string, string>()
        for (const node of nodes) {
            map.set(node.filePath, node.id)
        }

        return map
    }

    private buildReverseAdjacency(edges: readonly CodeEdge[]): Map<string, string[]> {
        const map = new Map<string, string[]>()
        for (const edge of edges) {
            const predecessors = map.get(edge.target)
            if (predecessors === undefined) {
                map.set(edge.target, [edge.source])
                continue
            }

            predecessors.push(edge.source)
        }

        return map
    }

    private buildOutgoingAdjacency(edges: readonly CodeEdge[]): Map<string, string[]> {
        const map = new Map<string, string[]>()
        for (const edge of edges) {
            const neighbors = map.get(edge.source)
            if (neighbors === undefined) {
                map.set(edge.source, [edge.target])
                continue
            }

            neighbors.push(edge.target)
        }

        return map
    }
}
