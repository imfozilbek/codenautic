import type {ICodeGraph, ICodeGraphEdge, ICodeGraphNode} from "./code-graph.type"

/**
 * Input payload for deterministic code graph diff calculation.
 */
export interface ICodeGraphDiffInput {
    /**
     * Source graph snapshot used as baseline.
     */
    readonly baseGraph: ICodeGraph

    /**
     * Target graph snapshot used for comparison.
     */
    readonly targetGraph: ICodeGraph

    /**
     * Optional subset of repository-relative files to include in diff.
     */
    readonly filePaths?: readonly string[]
}

/**
 * One node mutation between graph snapshots.
 */
export interface ICodeGraphNodeChange {
    /**
     * Node payload from baseline snapshot.
     */
    readonly before: ICodeGraphNode

    /**
     * Node payload from target snapshot.
     */
    readonly after: ICodeGraphNode
}

/**
 * Deterministic graph diff output.
 */
export interface ICodeGraphDiffResult {
    /**
     * Nodes present only in target graph.
     */
    readonly addedNodes: readonly ICodeGraphNode[]

    /**
     * Nodes present only in baseline graph.
     */
    readonly removedNodes: readonly ICodeGraphNode[]

    /**
     * Nodes present in both graphs with changed payload.
     */
    readonly changedNodes: readonly ICodeGraphNodeChange[]

    /**
     * Edges present only in target graph.
     */
    readonly addedEdges: readonly ICodeGraphEdge[]

    /**
     * Edges present only in baseline graph.
     */
    readonly removedEdges: readonly ICodeGraphEdge[]
}

/**
 * Outbound contract for deterministic code graph diff.
 */
export interface ICodeGraphDiffService {
    /**
     * Compares two graph snapshots and returns normalized diff.
     *
     * @param input Baseline and target graph payloads.
     * @returns Deterministic added/removed/changed node and edge diff.
     */
    calculateDiff(input: ICodeGraphDiffInput): Promise<ICodeGraphDiffResult>
}
