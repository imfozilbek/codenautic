import { type ReactElement } from "react"

import { Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { useCountUp } from "@/lib/motion"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { CARD_SURFACE } from "@/lib/constants/spacing"

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

    const parsed = parseInt(props.value.replace(/,/g, ""), 10)
    const isNumeric = !Number.isNaN(parsed)
    const animatedValue = useCountUp({ target: isNumeric ? parsed : 0 })
    const displayValue = isNumeric ? animatedValue.toLocaleString("en-US") : props.value

    const trendColor = props.trendDirection === "up" ? "text-success" : "text-danger"
    const trendLabel = props.trendDirection === "neutral" ? "text-muted-foreground" : trendColor

    return (
        <Card className={`h-full ${CARD_SURFACE.elevated}`}>
            <CardHeader className="pb-1">
                <p className="text-sm text-muted-foreground">{props.label}</p>
            </CardHeader>
            <CardBody className="pt-0">
                <p className={`${TYPOGRAPHY.display} text-foreground`}>{displayValue}</p>
                {props.caption === undefined ? null : (
                    <p className="mt-1 text-sm text-muted-foreground">{props.caption}</p>
                )}
                {hasTrend ? (
                    <Chip
                        className={`mt-3 ${trendLabel}${props.trendDirection === "down" ? " badge-pulse" : ""}`}
                        color="accent"
                        size="sm"
                        variant="soft"
                    >
                        {props.trendLabel}
                    </Chip>
                ) : null}
            </CardBody>
        </Card>
    )
}
