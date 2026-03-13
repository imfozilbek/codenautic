import type { ReactElement } from "react"

import { Legend, Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"
import { ChartContainer } from "@/components/charts/chart-container"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CARD_SURFACE } from "@/lib/constants/spacing"
import { CHART_GRID_DASH, CHART_STROKE_WIDTH } from "@/lib/constants/chart-constants"
import { CHART_DATA_TRANSITION } from "@/lib/motion"

interface IFlowMetricsPoint {
    /** Метка периода. */
    readonly window: string
    /** Эффективность потока (0-100). */
    readonly flowEfficiency: number
    /** Delivery capacity (story points / reviews). */
    readonly deliveryCapacity: number
}

interface IFlowMetricsWidgetProps {
    /** Набор точек flow-метрик. */
    readonly points: ReadonlyArray<IFlowMetricsPoint>
    /** Тренд эффективности. */
    readonly flowTrendLabel: string
    /** Тренд capacity. */
    readonly capacityTrendLabel: string
}

/**
 * Flow metrics widget: efficiency + delivery capacity with trend indicators.
 *
 * @param props Данные виджета.
 * @returns Карточка flow metrics.
 */
export function FlowMetricsWidget(props: IFlowMetricsWidgetProps): ReactElement {
    return (
        <Card className={CARD_SURFACE.default}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <p className={TYPOGRAPHY.sectionTitle}>Flow metrics</p>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip color="primary" size="sm" variant="flat">
                        {`Flow efficiency ${props.flowTrendLabel}`}
                    </Chip>
                    <Chip color="success" size="sm" variant="flat">
                        {`Delivery capacity ${props.capacityTrendLabel}`}
                    </Chip>
                </div>
            </CardHeader>
            <CardBody className="space-y-2">
                <p className={TYPOGRAPHY.bodyMuted}>
                    Track flow efficiency and delivery capacity dynamics across recent windows.
                </p>
                {props.points.length === 0 ? (
                    <EmptyState
                        description="No flow metrics data available for this period."
                        title="No data"
                    />
                ) : (
                    <ChartContainer height="lg">
                        <LineChart data={props.points}>
                            <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                            <XAxis dataKey="window" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                {...CHART_DATA_TRANSITION}
                                dataKey="flowEfficiency"
                                name="Flow efficiency"
                                stroke="var(--chart-primary)"
                                strokeWidth={CHART_STROKE_WIDTH}
                                type="monotone"
                            />
                            <Line
                                {...CHART_DATA_TRANSITION}
                                dataKey="deliveryCapacity"
                                name="Delivery capacity"
                                stroke="var(--chart-secondary)"
                                strokeWidth={CHART_STROKE_WIDTH}
                                type="monotone"
                            />
                        </LineChart>
                    </ChartContainer>
                )}
            </CardBody>
        </Card>
    )
}

export type { IFlowMetricsPoint, IFlowMetricsWidgetProps }
