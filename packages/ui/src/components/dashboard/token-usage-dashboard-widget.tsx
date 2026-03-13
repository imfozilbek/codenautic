import type { ReactElement } from "react"

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

import { Card, CardBody, CardHeader } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"
import { ChartContainer } from "@/components/charts/chart-container"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CARD_SURFACE } from "@/lib/constants/spacing"
import {
    CHART_FALLBACK_COLOR,
    CHART_GRID_DASH,
    PIE_OUTER_RADIUS,
} from "@/lib/constants/chart-constants"
import { CHART_DATA_TRANSITION } from "@/lib/motion"

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
 *
 * @param props Данные usage/cost.
 * @returns Карточка token usage dashboard.
 */
export function TokenUsageDashboardWidget(props: ITokenUsageDashboardWidgetProps): ReactElement {
    return (
        <Card className={CARD_SURFACE.flat}>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Token usage dashboard</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className={TYPOGRAPHY.bodyMuted}>
                    Usage by model, cost breakdown and trend chart for selected range.
                </p>
                {props.byModel.length === 0 && props.costTrend.length === 0 ? (
                    <EmptyState
                        description="No token usage data available for this period."
                        title="No data"
                    />
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <ChartContainer height="sm">
                            <PieChart>
                                <Pie
                                    {...CHART_DATA_TRANSITION}
                                    cx="50%"
                                    cy="50%"
                                    data={props.byModel}
                                    dataKey="tokens"
                                    nameKey="model"
                                    outerRadius={PIE_OUTER_RADIUS}
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
                        </ChartContainer>
                        <ChartContainer height="sm">
                            <AreaChart data={props.costTrend}>
                                <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    {...CHART_DATA_TRANSITION}
                                    dataKey="costUsd"
                                    fill="var(--chart-primary-light)"
                                    name="Cost USD"
                                    stroke="var(--chart-primary)"
                                    type="monotone"
                                />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                )}
            </CardBody>
        </Card>
    )
}

export type { ITokenUsageDashboardWidgetProps, ITokenUsageModelPoint, ITokenUsageTrendPoint }
