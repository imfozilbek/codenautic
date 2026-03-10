import type {IHotspotMetric} from "../../../dto/analytics/code-city-data.dto"

import type {ICodeGraph} from "./code-graph.type"

/**
 * Input payload for code graph PageRank hotspot calculation.
 */
export interface ICodeGraphPageRankInput {
    /**
     * Code graph snapshot used as dependency source.
     */
    readonly graph: ICodeGraph

    /**
     * Optional subset of repository-relative file paths to include in result.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional PageRank damping factor.
     */
    readonly dampingFactor?: number

    /**
     * Optional iteration count for deterministic convergence.
     */
    readonly iterations?: number
}

/**
 * Outbound contract for deterministic code graph hotspot ranking.
 */
export interface ICodeGraphPageRankService {
    /**
     * Calculates hotspot scores from code graph structure.
     *
     * @param input Graph payload and optional ranking configuration.
     * @returns Ranked hotspot metrics sorted by score.
     */
    calculateHotspots(input: ICodeGraphPageRankInput): Promise<readonly IHotspotMetric[]>
}
