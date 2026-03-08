import type { ReactElement } from "react"

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from "recharts"

import { Card, CardBody, CardHeader, Chip } from "@/components/ui"

interface IArchitectureHealthWidgetProps {
    /** Общий health score. */
    readonly healthScore: number
    /** Количество layer violations. */
    readonly layerViolations: number
    /** DDD compliance score. */
    readonly dddCompliance: number
}

/**
 * Architecture health dashboard widget.
 *
 * @param props Метрики архитектурного состояния.
 * @returns Карточка health/violations/compliance.
 */
export function ArchitectureHealthWidget(props: IArchitectureHealthWidgetProps): ReactElement {
    const radarData = [
        { metric: "Health", value: props.healthScore },
        { metric: "DDD", value: props.dddCompliance },
        { metric: "Layer rules", value: Math.max(0, 100 - props.layerViolations * 5) },
    ]

    return (
        <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">Architecture health</p>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip color="primary" size="sm" variant="flat">
                        {`Health ${String(props.healthScore)}`}
                    </Chip>
                    <Chip color="warning" size="sm" variant="flat">
                        {`Violations ${String(props.layerViolations)}`}
                    </Chip>
                    <Chip color="success" size="sm" variant="flat">
                        {`DDD ${String(props.dddCompliance)}%`}
                    </Chip>
                </div>
            </CardHeader>
            <CardBody className="space-y-2">
                <p className="text-sm text-foreground/70">
                    Health score, layer violations and DDD compliance in one architecture widget.
                </p>
                <div className="h-60 w-full">
                    <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
                        <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar
                                dataKey="value"
                                fill="#2563eb"
                                fillOpacity={0.35}
                                name="Architecture"
                                stroke="#1d4ed8"
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </CardBody>
        </Card>
    )
}

export type { IArchitectureHealthWidgetProps }
