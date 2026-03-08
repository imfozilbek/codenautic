import type { ReactElement } from "react"

import {
    Area,
    AreaChart,
    CartesianGrid,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from "recharts"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"

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
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-foreground">Token usage dashboard</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-sm text-text-secondary">
                    Usage by model, cost breakdown and trend chart for selected range.
                </p>
                {props.byModel.length === 0 && props.costTrend.length === 0 ? (
                    <EmptyState
                        description="No token usage data available for this period."
                        title="No data"
                    />
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="h-56 w-full">
                            <ResponsiveContainer
                                height="100%"
                                minHeight={1}
                                minWidth={1}
                                width="100%"
                            >
                                <PieChart>
                                    <Pie
                                        cx="50%"
                                        cy="50%"
                                        data={props.byModel}
                                        dataKey="tokens"
                                        nameKey="model"
                                        outerRadius={84}
                                    >
                                        {props.byModel.map(
                                            (entry, index): ReactElement => (
                                                <Cell
                                                    fill={
                                                        PIE_COLORS[index % PIE_COLORS.length] ??
                                                        "#2563eb"
                                                    }
                                                    key={entry.model}
                                                />
                                            ),
                                        )}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-56 w-full">
                            <ResponsiveContainer
                                height="100%"
                                minHeight={1}
                                minWidth={1}
                                width="100%"
                            >
                                <AreaChart data={props.costTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                        dataKey="costUsd"
                                        fill="var(--chart-primary-light)"
                                        name="Cost USD"
                                        stroke="var(--chart-primary)"
                                        type="monotone"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    )
}

export type { ITokenUsageDashboardWidgetProps, ITokenUsageModelPoint, ITokenUsageTrendPoint }
