import { type ReactElement, useId } from "react"

import {
    Bar,
    BarChart,
    CartesianGrid,
    Tooltip,
    type TooltipContentProps,
    XAxis,
    YAxis,
} from "recharts"

import { Card, CardContent, CardHeader } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CHART_GRID_DASH } from "@/lib/constants/chart-recharts-defaults"
import { ResponsiveContainer } from "recharts"

interface ITeamActivityPoint {
    /** Имя разработчика. */
    readonly developer: string
    /** Количество merge CCR. */
    readonly ccrMerged: number
}

interface ITeamActivityWidgetProps {
    /** Данные активности по разработчикам. */
    readonly points: ReadonlyArray<ITeamActivityPoint>
}

/**
 * Custom tooltip для team activity chart.
 *
 * @param props Recharts tooltip props.
 * @returns Styled tooltip element.
 */
function ActivityTooltip(props: TooltipContentProps<number, string>): ReactElement | null {
    const { active, payload, label } = props
    if (active !== true || payload === undefined || payload.length === 0) {
        return null
    }

    return (
        <div className="rounded-lg border border-border/60 bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted">
                {String((payload[0] as { value?: number } | undefined)?.value ?? 0)} CCRs merged
            </p>
        </div>
    )
}

/**
 * Team activity widget: CCR merges per developer с gradient bars.
 *
 * @param props Данные активности команды.
 * @returns Виджет активности команды.
 */
export function TeamActivityWidget(props: ITeamActivityWidgetProps): ReactElement {
    const barGradientId = useId()

    return (
        <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
            <CardHeader className="border-b border-border/30 pb-3">
                <p className={TYPOGRAPHY.sectionTitle}>Team activity</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
                <p className={TYPOGRAPHY.bodyMuted}>
                    CCRs merged by developer in selected date range.
                </p>
                {props.points.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <h3 className={TYPOGRAPHY.subsectionTitle}>No data</h3>
                        <p className="max-w-sm text-sm text-muted">No team activity data available for this period.</p>
                    </div>
                ) : (
                    <div className="h-64 w-full"><ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
                        <BarChart data={props.points}>
                            <defs>
                                <linearGradient id={barGradientId} x1="0" x2="0" y1="0" y2="1">
                                    <stop
                                        offset="0%"
                                        stopColor="var(--chart-primary)"
                                        stopOpacity={0.9}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="var(--chart-primary)"
                                        stopOpacity={0.4}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                stroke="var(--chart-grid)"
                                strokeDasharray={CHART_GRID_DASH}
                                strokeOpacity={0.5}
                                vertical={false}
                            />
                            <XAxis
                                dataKey="developer"
                                stroke="var(--muted)"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                            />
                            <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} tickLine={false} />
                            {}
                            <Tooltip
                                content={ActivityTooltip as never}
                                cursor={{ fill: "var(--surface-secondary)", opacity: 0.5 }}
                            />
                            <Bar
                                {...{ animationDuration: 0, isAnimationActive: false }}
                                dataKey="ccrMerged"
                                fill={`url(#${barGradientId})`}
                                name="CCR merged"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer></div>
                )}
            </CardContent>
        </Card>
    )
}

export type { ITeamActivityPoint, ITeamActivityWidgetProps }
