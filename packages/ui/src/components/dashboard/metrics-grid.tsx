import type {ReactElement} from "react"

import {MetricCard, type IMetricCardProps, type TMetricTrendDirection} from "./metric-card"

/**
 * Метрика для сетки dashboard.
 */
export interface IMetricGridMetric extends IMetricCardProps {
    /** Идентификатор метрики. */
    readonly id: string
}

/**
 * Пропсы сетки KPI.
 */
export interface IMetricsGridProps {
    /** Набор метрик для отображения. */
    readonly metrics: ReadonlyArray<IMetricGridMetric>
}

/**
 * Рендерит сетку KPI-карточек.
 *
 * @param props Конфигурация.
 * @returns Гибкая grid-сетка метрик.
 */
export function MetricsGrid(props: IMetricsGridProps): ReactElement {
    return (
        <section aria-label="KPI metrics" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {props.metrics.map((metric): ReactElement => {
                const {id, ...cardProps} = metric
                return <MetricCard key={id} {...cardProps} />
            })}
        </section>
    )
}

/**
 * Доступные направления тренда метрики.
 */
export type {TMetricTrendDirection}
