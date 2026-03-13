/**
 * Supported node levels in code graph.
 */
export const CODE_GRAPH_NODE_TYPE = {
    FILE: "file",
    FUNCTION: "function",
    CLASS: "class",
    TYPE: "type",
    VARIABLE: "variable",
} as const

/**
 * Supported edge semantics in code graph.
 */
export const CODE_GRAPH_EDGE_TYPE = {
    CALLS: "CALLS",
    IMPORTS: "IMPORTS",
    HAS_METHOD: "HAS_METHOD",
    EXTENDS: "EXTENDS",
    IMPLEMENTS: "IMPLEMENTS",
} as const

/**
 * Node type union for code graph.
 */
export type CodeGraphNodeType =
    (typeof CODE_GRAPH_NODE_TYPE)[keyof typeof CODE_GRAPH_NODE_TYPE]

/**
 * Edge type union for code graph.
 */
export type CodeGraphEdgeType =
    (typeof CODE_GRAPH_EDGE_TYPE)[keyof typeof CODE_GRAPH_EDGE_TYPE]

/**
 * Supported scalar node metadata values.
 */
export type CodeGraphNodeMetadataValue = string | number | boolean | null

/**
 * Single code graph node.
 */
export interface ICodeNode {
    /**
     * Node unique identifier.
     */
    readonly id: string

    /**
     * Graph node kind.
     */
    readonly type: CodeGraphNodeType

    /**
     * Node display name.
     */
    readonly name: string

    /**
     * Source file path.
     */
    readonly filePath: string

    /**
     * Optional static metadata.
     */
    readonly metadata?: Record<string, CodeGraphNodeMetadataValue>
}

/**
 * Directed edge between code graph nodes.
 */
export interface ICodeEdge {
    /**
     * Edge source node identifier.
     */
    readonly source: string

    /**
     * Edge target node identifier.
     */
    readonly target: string

    /**
     * Edge semantic type.
     */
    readonly type: CodeGraphEdgeType
}

/**
 * Code graph aggregated from repository scan.
 */
export interface ICodeGraph {
    /**
     * Graph unique id if available.
     */
    readonly id?: string

    /**
     * Graph generation timestamp.
     */
    readonly generatedAt?: Date

    /**
     * Repository nodes.
     */
    readonly nodes: readonly ICodeNode[]

    /**
     * Directed graph edges.
     */
    readonly edges: readonly ICodeEdge[]
}

/**
 * Backward-compatible type aliases for existing integrations.
 */
export type CodeNode = ICodeNode
export type CodeEdge = ICodeEdge
export type CodeGraph = ICodeGraph
export type ICodeGraphNode = ICodeNode
export type ICodeGraphEdge = ICodeEdge

/**
 * Filter options for node queries.
 */
export interface IGraphQueryFilter {
    /**
     * Optional repository identifier to scope lookup to one snapshot family.
     */
    readonly repositoryId?: string

    /**
     * Optional branch reference to scope lookup to one snapshot.
     */
    readonly branch?: string

    /**
     * Optional node kind filter.
     */
    readonly type?: CodeGraphNodeType

    /**
     * Optional file path filter.
     */
    readonly filePath?: string
}

/**
 * Backward-compatible query filter interface.
 */
export type ICodeGraphQueryFilter = IGraphQueryFilter

/**
 * Filter options for edge queries.
 */
export interface IGraphEdgeQueryFilter {
    /**
     * Optional repository identifier to scope lookup to one snapshot family.
     */
    readonly repositoryId?: string

    /**
     * Optional branch reference to scope lookup to one snapshot.
     */
    readonly branch?: string

    /**
     * Optional edge semantic type filter.
     */
    readonly type?: CodeGraphEdgeType

    /**
     * Optional exact source node identifier filter.
     */
    readonly sourceNodeId?: string

    /**
     * Optional exact target node identifier filter.
     */
    readonly targetNodeId?: string

    /**
     * Optional node identifier matched against either edge endpoint.
     */
    readonly nodeId?: string

    /**
     * Optional repository-relative file path matched against either endpoint node.
     */
    readonly filePath?: string
}

/**
 * Bounded path query between two nodes in one repository snapshot.
 */
export interface IGraphPathQuery {
    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repositoryId: string

    /**
     * Optional branch reference when querying non-default snapshot.
     */
    readonly branch?: string

    /**
     * Source node identifier.
     */
    readonly sourceNodeId: string

    /**
     * Target node identifier.
     */
    readonly targetNodeId: string

    /**
     * Optional edge-type subset allowed in traversal.
     */
    readonly edgeTypes?: readonly CodeGraphEdgeType[]

    /**
     * Maximum traversal depth in edges.
     */
    readonly maxDepth?: number

    /**
     * Maximum number of paths to return.
     */
    readonly maxPaths?: number
}

/**
 * One resolved graph path between two nodes.
 */
export interface IGraphPathResult {
    /**
     * Ordered nodes included in the path.
     */
    readonly nodes: readonly ICodeNode[]

    /**
     * Ordered edges connecting the path nodes.
     */
    readonly edges: readonly ICodeEdge[]
}

/**
 * One possible breaking change during impact analysis.
 */
export interface IBreakingChange {
    /**
     * Graph node that may be affected.
     */
    readonly node: ICodeNode

    /**
     * Human-readable root cause.
     */
    readonly reason: string
}

/**
 * Impact analysis result for changed files.
 */
export interface IImpactAnalysisResult {
    /**
     * Nodes that were explicitly changed.
     */
    readonly changedNodes: readonly ICodeNode[]

    /**
     * Nodes influenced by changes.
     */
    readonly affectedNodes: readonly ICodeNode[]

    /**
     * Traversal depth to reach affected nodes.
     */
    readonly impactRadius: number

    /**
     * Identified breaking risks for impacted nodes.
     */
    readonly breakingChanges: readonly IBreakingChange[]
}

/**
 * Backward-compatible impact analysis type.
 */
export type ImpactAnalysisResult = IImpactAnalysisResult

/**
 * Circular dependency report item.
 */
export interface ICircularDependency {
    /**
     * Entry point node of cycle.
     */
    readonly nodeA: string

    /**
     * Closing node of cycle.
     */
    readonly nodeB: string

    /**
     * Path describing the cycle.
     */
    readonly path: readonly string[]
}

/**
 * Backward-compatible circular dependency type.
 */
export type ICircularDependencyPath = ICircularDependency
