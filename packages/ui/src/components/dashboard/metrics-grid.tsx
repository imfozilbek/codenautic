import type { ReactElement } from "react"
import { motion } from "motion/react"

import { StaggerContainer, STAGGER_ITEM_VARIANTS } from "@/lib/motion"

import { MetricCard, type IMetricCardProps, type TMetricTrendDirection } from "./metric-card"

/**
 * Metric for the dashboard grid.
 */
export interface IMetricGridMetric extends IMetricCardProps {
    /** Metric identifier. */
    readonly id: string
}

/**
 * KPI grid props.
 */
export interface IMetricsGridProps {
    /** Metrics to display. */
    readonly metrics: ReadonlyArray<IMetricGridMetric>
}

/**
 * Renders a staggered KPI card grid.
 *
 * @param props Configuration.
 * @returns Animated grid of metric cards.
 */
export function MetricsGrid(props: IMetricsGridProps): ReactElement {
    return (
        <StaggerContainer
            ariaLabel="KPI metrics"
            as="section"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
            {props.metrics.map((metric): ReactElement => {
                const { id, ...cardProps } = metric
                return (
                    <motion.div key={id} variants={STAGGER_ITEM_VARIANTS}>
                        <MetricCard {...cardProps} />
                    </motion.div>
                )
            })}
        </StaggerContainer>
    )
}

/**
 * Available metric trend directions.
 */
export type { TMetricTrendDirection }
