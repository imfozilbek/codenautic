import { type ReactElement, useId } from "react"

import {
    Area,
    ComposedChart,
    CartesianGrid,
    Line,
    Tooltip,
    type TooltipContentProps,
    XAxis,
    YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, Chip } from "@heroui/react"
import { EmptyState } from "@/components/states/empty-state"
import { ChartContainer } from "@/components/charts/chart-container"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CHART_GRID_DASH, CHART_STROKE_WIDTH } from "@/lib/constants/chart-recharts-defaults"
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
 * Custom tooltip с glass morphism стилем.
 *
 * @param props Recharts tooltip props.
 * @returns Styled tooltip element.
 */
function FlowTooltip(props: TooltipContentProps<number, string>): ReactElement | null {
    const { active, payload, label } = props
    if (active !== true || payload === undefined || payload.length === 0) {
        return null
    }

    return (
        <div className="rounded-lg border border-border/60 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md">
            <p className={TYPOGRAPHY.overline}>{label}</p>
            {payload.map((raw, idx): ReactElement => {
                const entry = raw as {
                    dataKey?: string
                    color?: string
                    name?: string
                    value?: number
                }
                return (
                    <div
                        key={String(entry.dataKey ?? idx)}
                        className="mt-1 flex items-center gap-2"
                    >
                        <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: String(entry.color ?? "") }}
                        />
                        <span className="text-xs text-muted">
                            {String(entry.name ?? "")}:
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                            {String(entry.value ?? "")}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

/**
 * Flow metrics widget: efficiency + delivery capacity с gradient fills.
 *
 * @param props Данные виджета.
 * @returns Карточка flow metrics.
 */
export function FlowMetricsWidget(props: IFlowMetricsWidgetProps): ReactElement {
    const gradientPrimary = useId()
    const gradientSecondary = useId()

    return (
        <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
                <p className={TYPOGRAPHY.sectionTitle}>Flow metrics</p>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip color="accent" size="sm" variant="soft">
                        {`Flow efficiency ${props.flowTrendLabel}`}
                    </Chip>
                    <Chip color="accent" size="sm" variant="soft">
                        {`Delivery capacity ${props.capacityTrendLabel}`}
                    </Chip>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
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
                        <ComposedChart data={props.points}>
                            <defs>
                                <linearGradient id={gradientPrimary} x1="0" x2="0" y1="0" y2="1">
                                    <stop
                                        offset="0%"
                                        stopColor="var(--chart-primary)"
                                        stopOpacity={0.25}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="var(--chart-primary)"
                                        stopOpacity={0.02}
                                    />
                                </linearGradient>
                                <linearGradient id={gradientSecondary} x1="0" x2="0" y1="0" y2="1">
                                    <stop
                                        offset="0%"
                                        stopColor="var(--chart-secondary)"
                                        stopOpacity={0.2}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="var(--chart-secondary)"
                                        stopOpacity={0.02}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                stroke="var(--chart-grid)"
                                strokeDasharray={CHART_GRID_DASH}
                                strokeOpacity={0.5}
                            />
                            <XAxis
                                dataKey="window"
                                stroke="var(--muted)"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="var(--muted)"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                            />
                            {}
                            <Tooltip content={FlowTooltip as never} />

                            {/* Gradient area fills */}
                            <Area
                                dataKey="flowEfficiency"
                                fill={`url(#${gradientPrimary})`}
                                stroke="none"
                                type="monotone"
                            />
                            <Area
                                dataKey="deliveryCapacity"
                                fill={`url(#${gradientSecondary})`}
                                stroke="none"
                                type="monotone"
                            />

                            {/* Lines on top */}
                            <Line
                                {...CHART_DATA_TRANSITION}
                                dataKey="flowEfficiency"
                                dot={{ fill: "var(--chart-primary)", r: 3, strokeWidth: 0 }}
                                name="Flow efficiency"
                                stroke="var(--chart-primary)"
                                strokeWidth={CHART_STROKE_WIDTH}
                                type="monotone"
                            />
                            <Line
                                {...CHART_DATA_TRANSITION}
                                dataKey="deliveryCapacity"
                                dot={{ fill: "var(--chart-secondary)", r: 3, strokeWidth: 0 }}
                                name="Delivery capacity"
                                stroke="var(--chart-secondary)"
                                strokeWidth={CHART_STROKE_WIDTH}
                                type="monotone"
                            />
                        </ComposedChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}

export type { IFlowMetricsPoint, IFlowMetricsWidgetProps }
