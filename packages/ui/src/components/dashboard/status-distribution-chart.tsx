import type { ReactElement } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Chip } from "@/components/ui"
import { RechartsChartWrapper } from "@/components/charts/recharts-chart-wrapper"

/**
 * Строка для Recharts.
 */
export interface IStatusDistributionPoint {
    /** Имя статуса. */
    readonly status: string
    /** Количество элементов. */
    readonly count: number
    /** Цвет сегмента. */
    readonly color: string
}

/**
 * Параметры pie chart.
 */
export interface IStatusDistributionChartProps {
    /** Данные для распределения. */
    readonly data: ReadonlyArray<IStatusDistributionPoint>
    /** Заголовок секции. */
    readonly title?: string
    /** Состояние загрузки данных. */
    readonly isLoading?: boolean
    /** Текст для fallback-состояния. */
    readonly loadingText?: string
}

/**
 * Карточка распределения статусов CCR.
 *
 * @param props Данные статусов и заголовок.
 * @returns Recharts pie диаграмма.
 */
export function StatusDistributionChart(props: IStatusDistributionChartProps): ReactElement {
    const title = props.title ?? "CCR status distribution"

    return (
        <RechartsChartWrapper
            isLoading={props.isLoading === true}
            loadingText={props.loadingText}
            title={title}
        >
            <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                        <Pie
                            data={props.data}
                            dataKey="count"
                            nameKey="status"
                            outerRadius={80}
                            paddingAngle={2}
                        >
                            {props.data.map(
                                (point): ReactElement => (
                                    <Cell key={point.status} fill={point.color} />
                                ),
                            )}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Status legend">
                {props.data.map(
                    (point): ReactElement => (
                        <Chip
                            key={point.status}
                            style={{ backgroundColor: `${point.color}20` }}
                            className="border border-current/20"
                        >
                            {point.status}: {point.count}
                        </Chip>
                    ),
                )}
            </div>
        </RechartsChartWrapper>
    )
}
