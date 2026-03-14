import type {ICodeGraph} from "./code-graph.type"

/**
 * Input payload for deterministic code graph community detection.
 */
export interface ICodeGraphClusteringInput {
    /**
     * Code graph snapshot used as clustering source.
     */
    readonly graph: ICodeGraph

    /**
     * Optional subset of repository-relative file paths to include in clustering.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional Louvain resolution factor.
     */
    readonly resolution?: number

    /**
     * Optional maximum local-optimization passes.
     */
    readonly iterations?: number
}

/**
 * One detected file-level community in code graph.
 */
export interface ICodeGraphCommunity {
    /**
     * Stable deterministic community identifier.
     */
    readonly id: string

    /**
     * Repository-relative files belonging to the community.
     */
    readonly filePaths: readonly string[]

    /**
     * Total internal edge weight inside the community.
     */
    readonly intraCommunityEdgeWeight: number

    /**
     * Sum of incident edge weights for all community files.
     */
    readonly totalIncidentEdgeWeight: number
}

/**
 * Output payload for deterministic code graph clustering.
 */
export interface ICodeGraphClusteringResult {
    /**
     * Detected communities sorted in stable order.
     */
    readonly communities: readonly ICodeGraphCommunity[]

    /**
     * Modularity score for resulting partition.
     */
    readonly modularity: number
}

/**
 * Outbound contract for deterministic Louvain community detection.
 */
export interface ICodeGraphClusteringService {
    /**
     * Detects graph communities from one code graph snapshot.
     *
     * @param input Graph payload and optional clustering configuration.
     * @returns Deterministic community partition and modularity.
     */
    detectCommunities(input: ICodeGraphClusteringInput): Promise<ICodeGraphClusteringResult>
}
