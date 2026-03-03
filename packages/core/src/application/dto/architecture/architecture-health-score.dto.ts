import type {ILayerViolationDTO} from "./layer-violation.dto"

/**
 * Dimension scores that compose the architecture health score.
 */
export interface IArchitectureHealthScoreDimensions {
    /**
     * Coupling quality score.
     */
    readonly coupling: number

    /**
     * Cohesion quality score.
     */
    readonly cohesion: number

    /**
     * Layer dependency compliance score.
     */
    readonly layerCompliance: number

    /**
     * DDD compliance score.
     */
    readonly dddCompliance: number
}

/**
 * Aggregate architecture health score across multiple dimensions.
 */
export interface IArchitectureHealthScore {
    /**
     * Total score in range 0..100.
     */
    readonly overall: number

    /**
     * Per-dimension health values.
     */
    readonly dimensions: IArchitectureHealthScoreDimensions

    /**
     * Layer violations collected during analysis.
     */
    readonly violations: readonly ILayerViolationDTO[]

    /**
     * DDD model quality index where 100 means healthy.
     */
    readonly anemicModelIndex: number
}
