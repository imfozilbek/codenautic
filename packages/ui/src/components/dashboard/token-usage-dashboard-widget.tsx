import { type ReactElement, useId } from "react"

import {
    Area,
    AreaChart,
    CartesianGrid,
    Pie,
    PieChart,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from "recharts"

import { Card, CardContent, CardHeader } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CHART_FALLBACK_COLOR } from "@/lib/constants/chart-constants"
import { CHART_GRID_DASH, PIE_OUTER_RADIUS } from "@/lib/constants/chart-recharts-defaults"
import { ResponsiveContainer } from "recharts"

interface ITokenUsageModelPoint {
    /** Название модели. */
    readonly model: string
    /** Токены в выбранном диапазоне. */
    readonly tokens: number
}

interface ITokenUsageTrendPoint {
    /** Период точки тренда. */
    readonly period: string
    /** Стоимость в usd. */
    readonly costUsd: number
}

interface ITokenUsageDashboardWidgetProps {
    /** Агрегация usage по моделям. */
    readonly byModel: ReadonlyArray<ITokenUsageModelPoint>
    /** Trend по стоимости. */
    readonly costTrend: ReadonlyArray<ITokenUsageTrendPoint>
}

const PIE_COLORS = [
    "var(--chart-primary)",
    "var(--chart-secondary)",
    "var(--chart-tertiary)",
    "var(--chart-quaternary)",
    "var(--chart-danger)",
]

/**
 * Dashboard widget for token usage, cost breakdown, and trend.
 * Glass morphism card с gradient area fill.
 *
 * @param props Данные usage/cost.
 * @returns Карточка token usage dashboard.
 */
export function TokenUsageDashboardWidget(props: ITokenUsageDashboardWidgetProps): ReactElement {
    const areaGradientId = useId()

    return (
        <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
            <CardHeader className="border-b border-border/30 pb-3">
                <p className={TYPOGRAPHY.sectionTitle}>Token usage dashboard</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
                <p className={TYPOGRAPHY.bodyMuted}>
                    Usage by model, cost breakdown and trend chart for selected range.
                </p>
                {props.byModel.length === 0 && props.costTrend.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <h3 className={TYPOGRAPHY.subsectionTitle}>No data</h3>
                        <p className="max-w-sm text-sm text-muted">No token usage data available for this period.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="h-56 w-full"><ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
                            <PieChart>
                                <Pie
                                    {...{ animationDuration: 0, isAnimationActive: false }}
                                    cx="50%"
                                    cy="50%"
                                    data={props.byModel}
                                    dataKey="tokens"
                                    innerRadius={40}
                                    nameKey="model"
                                    outerRadius={PIE_OUTER_RADIUS}
                                    paddingAngle={2}
                                    strokeWidth={0}
                                >
                                    {props.byModel.map(
                                        (entry, index): ReactElement => (
                                            <Cell
                                                fill={
                                                    PIE_COLORS[index % PIE_COLORS.length] ??
                                                    CHART_FALLBACK_COLOR
                                                }
                                                key={entry.model}
                                            />
                                        ),
                                    )}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer></div>
                        <div className="h-56 w-full"><ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
                            <AreaChart data={props.costTrend}>
                                <defs>
                                    <linearGradient id={areaGradientId} x1="0" x2="0" y1="0" y2="1">
                                        <stop
                                            offset="0%"
                                            stopColor="var(--chart-primary)"
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="var(--chart-primary)"
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
                                    dataKey="period"
                                    stroke="var(--muted)"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="var(--muted)"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                />
                                <Tooltip />
                                <Area
                                    {...{ animationDuration: 0, isAnimationActive: false }}
                                    dataKey="costUsd"
                                    fill={`url(#${areaGradientId})`}
                                    name="Cost USD"
                                    stroke="var(--chart-primary)"
                                    strokeWidth={2}
                                    type="monotone"
                                />
                            </AreaChart>
                        </ResponsiveContainer></div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export type { ITokenUsageDashboardWidgetProps, ITokenUsageModelPoint, ITokenUsageTrendPoint }
