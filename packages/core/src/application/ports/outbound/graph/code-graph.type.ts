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
 * Single code graph node.
 */
export interface ICodeGraphNode {
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
    readonly metadata?: Record<string, string | number | boolean | null>
}

/**
 * Directed edge between code graph nodes.
 */
export interface ICodeGraphEdge {
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
    readonly nodes: readonly ICodeGraphNode[]

    /**
     * Directed graph edges.
     */
    readonly edges: readonly ICodeGraphEdge[]
}
