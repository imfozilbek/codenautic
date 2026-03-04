import type { ReactElement } from "react"

import {
    Legend,
    Line,
    LineChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

import { Card, CardBody, CardHeader, Chip } from "@/components/ui"

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
        <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-[var(--foreground)]">Flow metrics</p>
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
                <p className="text-sm text-[var(--foreground)]/70">
                    Track flow efficiency and delivery capacity dynamics across recent windows.
                </p>
                <div className="h-64 w-full">
                    <ResponsiveContainer height="100%" width="100%">
                        <LineChart data={props.points}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="window" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                dataKey="flowEfficiency"
                                name="Flow efficiency"
                                stroke="#2563eb"
                                strokeWidth={2}
                                type="monotone"
                            />
                            <Line
                                dataKey="deliveryCapacity"
                                name="Delivery capacity"
                                stroke="#059669"
                                strokeWidth={2}
                                type="monotone"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardBody>
        </Card>
    )
}

export type { IFlowMetricsPoint, IFlowMetricsWidgetProps }
