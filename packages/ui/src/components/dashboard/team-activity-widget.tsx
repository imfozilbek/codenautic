import type { ReactElement } from "react"

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"
import { ChartContainer } from "@/components/charts/chart-container"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CARD_SURFACE } from "@/lib/constants/spacing"
import { CHART_GRID_DASH } from "@/lib/constants/chart-constants"
import { CHART_DATA_TRANSITION } from "@/lib/motion"

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
        <Card className={CARD_SURFACE.default}>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>Team activity</p>
            </CardHeader>
            <CardBody className="space-y-2">
                <p className={TYPOGRAPHY.bodyMuted}>
                    CCRs merged by developer in selected date range.
                </p>
                {props.points.length === 0 ? (
                    <EmptyState
                        description="No team activity data available for this period."
                        title="No data"
                    />
                ) : (
                    <ChartContainer height="lg">
                        <BarChart data={props.points}>
                            <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                            <XAxis dataKey="developer" />
                            <YAxis />
                            <Tooltip />
                            <Bar
                                {...CHART_DATA_TRANSITION}
                                dataKey="ccrMerged"
                                fill="var(--chart-primary)"
                                name="CCR merged"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardBody>
        </Card>
    )
}

export type { ITeamActivityPoint, ITeamActivityWidgetProps }
