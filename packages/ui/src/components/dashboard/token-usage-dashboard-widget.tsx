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

const PIE_COLORS = ["#2563eb", "#059669", "#f59e0b", "#7c3aed", "#dc2626"]

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
                <p className="text-base font-semibold text-[var(--foreground)]">
                    Token usage dashboard
                </p>
            </CardHeader>
            <CardBody className="space-y-3">
                <p className="text-sm text-[var(--foreground)]/70">
                    Usage by model, cost breakdown and trend chart for selected range.
                </p>
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="h-56 w-full">
                        <ResponsiveContainer height="100%" width="100%">
                            <PieChart>
                                <Pie
                                    cx="50%"
                                    cy="50%"
                                    data={props.byModel}
                                    dataKey="tokens"
                                    nameKey="model"
                                    outerRadius={84}
                                >
                                    {props.byModel.map((entry, index): ReactElement => (
                                        <Cell
                                            fill={PIE_COLORS[index % PIE_COLORS.length] ?? "#2563eb"}
                                            key={entry.model}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer height="100%" width="100%">
                            <AreaChart data={props.costTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    dataKey="costUsd"
                                    fill="#93c5fd"
                                    name="Cost USD"
                                    stroke="#2563eb"
                                    type="monotone"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export type {
    ITokenUsageDashboardWidgetProps,
    ITokenUsageModelPoint,
    ITokenUsageTrendPoint,
}
