/**
 * DDD compliance violation description.
 */
export type IAnemicModelViolationType = "ANEMIC_MODEL"

/**
 * DDD compliance violation type.
 */
export type IDDDViolationType = IAnemicModelViolationType

/**
 * DDD compliance violation description.
 */
export interface IDDDViolation {
    /**
     * Violation type.
     */
    readonly type: IDDDViolationType

    /**
     * Domain object name.
     */
    readonly entity: string

    /**
     * Human-readable explanation.
     */
    readonly description: string
}

/**
 * Health summary for one domain aggregate.
 */
export interface IDDDAggregateHealth {
    /**
     * Aggregate or domain object name.
     */
    readonly name: string

    /**
     * Number of discovered domain events.
     */
    readonly eventCount: number

    /**
     * Number of domain object methods.
     */
    readonly methodCount: number
}

/**
 * DDD compliance report for analyzed repository.
 */
export interface IDDDComplianceReport {
    /**
     * Flattened list of detected DDD violations.
     */
    readonly violations: readonly IDDDViolation[]

    /**
     * Health snapshot per aggregate-like domain model.
     */
    readonly aggregateHealth: readonly IDDDAggregateHealth[]

    /**
     * Bounded context names found in repository.
     */
    readonly boundedContexts: readonly string[]
}
