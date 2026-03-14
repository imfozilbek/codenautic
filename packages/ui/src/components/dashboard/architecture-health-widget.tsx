import type { ReactElement } from "react"

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts"

import { Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { EmptyState } from "@/components/states/empty-state"
import { ChartContainer } from "@/components/charts/chart-container"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CHART_FILL_OPACITY, VIOLATION_SCORE_MULTIPLIER } from "@/lib/constants/chart-constants"
import { CHART_DATA_TRANSITION } from "@/lib/motion"

interface IArchitectureHealthWidgetProps {
    /** Общий health score. */
    readonly healthScore: number
    /** Количество layer violations. */
    readonly layerViolations: number
    /** DDD compliance score. */
    readonly dddCompliance: number
}

/**
 * Architecture health dashboard widget с glass morphism.
 *
 * @param props Метрики архитектурного состояния.
 * @returns Карточка health/violations/compliance.
 */
export function ArchitectureHealthWidget(props: IArchitectureHealthWidgetProps): ReactElement {
    const radarData = [
        { metric: "Health", value: props.healthScore },
        { metric: "DDD", value: props.dddCompliance },
        {
            metric: "Layer rules",
            value: Math.max(0, 100 - props.layerViolations * VIOLATION_SCORE_MULTIPLIER),
        },
    ]

    return (
        <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
                <p className={TYPOGRAPHY.sectionTitle}>Architecture health</p>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip color="primary" size="sm" variant="flat">
                        {`Health ${String(props.healthScore)}`}
                    </Chip>
                    <Chip
                        className={props.layerViolations > 5 ? "badge-pulse" : ""}
                        color="warning"
                        size="sm"
                        variant="flat"
                    >
                        {`Violations ${String(props.layerViolations)}`}
                    </Chip>
                    <Chip color="success" size="sm" variant="flat">
                        {`DDD ${String(props.dddCompliance)}%`}
                    </Chip>
                </div>
            </CardHeader>
            <CardBody className="space-y-2 pt-4">
                <p className={TYPOGRAPHY.bodyMuted}>
                    Health score, layer violations and DDD compliance in one architecture widget.
                </p>
                {radarData.length === 0 ? (
                    <EmptyState
                        description="No architecture health data available."
                        title="No data"
                    />
                ) : (
                    <ChartContainer height="md">
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="var(--chart-grid)" strokeOpacity={0.5} />
                            <PolarAngleAxis
                                dataKey="metric"
                                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                            />
                            <Radar
                                {...CHART_DATA_TRANSITION}
                                dataKey="value"
                                fill="var(--chart-primary)"
                                fillOpacity={CHART_FILL_OPACITY}
                                name="Architecture"
                                stroke="var(--chart-primary)"
                                strokeWidth={2}
                            />
                        </RadarChart>
                    </ChartContainer>
                )}
            </CardBody>
        </Card>
    )
}

export type { IArchitectureHealthWidgetProps }
