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
