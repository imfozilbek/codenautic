import type { ReactElement } from "react"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"

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
 * Team activity widget: CCR merges per developer.
 *
 * @param props Данные активности команды.
 * @returns Виджет активности команды с bar chart.
 */
export function TeamActivityWidget(props: ITeamActivityWidgetProps): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-foreground">Team activity</p>
            </CardHeader>
            <CardBody className="space-y-2">
                <p className="text-sm text-text-secondary">
                    CCRs merged by developer in selected date range.
                </p>
                {props.points.length === 0 ? (
                    <EmptyState
                        description="No team activity data available for this period."
                        title="No data"
                    />
                ) : (
                    <div className="h-64 w-full">
                        <ResponsiveContainer
                            height="100%"
                            minHeight={1}
                            minWidth={1}
                            width="100%"
                        >
                            <BarChart data={props.points}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="developer" />
                                <YAxis />
                                <Tooltip />
                                <Bar
                                    dataKey="ccrMerged"
                                    fill="var(--chart-primary)"
                                    name="CCR merged"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardBody>
        </Card>
    )
}

export type { ITeamActivityPoint, ITeamActivityWidgetProps }
