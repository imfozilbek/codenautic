import {type ReactElement} from "react"

import {Card, CardBody, CardHeader, Chip} from "@/components/ui"

/**
 * Направление динамики метрики.
 */
export type TMetricTrendDirection = "up" | "down" | "neutral"

/**
 * Параметры карточки KPI.
 */
export interface IMetricCardProps {
    /** Подпись метрики. */
    readonly label: string
    /** Основное числовое значение. */
    readonly value: string
    /** Комментарий под значением. */
    readonly caption?: string
    /** Направление изменения. */
    readonly trendDirection?: TMetricTrendDirection
    /** Значение изменения с меткой (например +8%). */
    readonly trendLabel?: string
}

/**
 * Карточка с метрикой dashboard.
 *
 * @param props Конфигурация карточки.
 * @returns HeroUI card со значением, подписью и трендом.
 */
export function MetricCard(props: IMetricCardProps): ReactElement {
    const hasTrend = props.trendDirection !== undefined && props.trendLabel !== undefined

    const trendColor = props.trendDirection === "up" ? "text-emerald-700" : "text-rose-700"
    const trendLabel = props.trendDirection === "neutral" ? "text-slate-600" : trendColor

    return (
        <Card className="h-full" shadow="sm">
            <CardHeader className="pb-0">
                <p className="text-sm text-slate-600">{props.label}</p>
            </CardHeader>
            <CardBody className="pt-2">
                <p className="text-2xl font-semibold text-slate-900">{props.value}</p>
                {props.caption === undefined ? null : <p className="mt-1 text-sm text-slate-600">{props.caption}</p>}
                {hasTrend ? (
                    <Chip className={`mt-3 ${trendLabel}`} color="default" size="sm" variant="flat">
                        {props.trendLabel}
                    </Chip>
                ) : null}
            </CardBody>
        </Card>
    )
}
