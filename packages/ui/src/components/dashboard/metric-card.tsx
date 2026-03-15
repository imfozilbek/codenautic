import { type ReactElement } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "@/components/icons/app-icons"

import CountUp from "react-countup"

import { Card, CardContent } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
 * Определяет конфигурацию отображения тренда по направлению.
 *
 * @param direction Направление тренда.
 * @returns Объект с цветами, фоном и иконкой.
 */
function resolveTrendConfig(direction: TMetricTrendDirection): {
    readonly textClass: string
    readonly bgClass: string
    readonly Icon: typeof ArrowUpRight
} {
    if (direction === "up") {
        return {
            Icon: ArrowUpRight,
            bgClass: "bg-success/10",
            textClass: "text-success",
        }
    }
    if (direction === "down") {
        return {
            Icon: ArrowDownRight,
            bgClass: "bg-danger/10",
            textClass: "text-danger",
        }
    }
    return {
        Icon: Minus,
        bgClass: "bg-muted/10",
        textClass: "text-muted",
    }
}

/**
 * Карточка с метрикой dashboard.
 * Glass morphism эффект, trend arrows, hover glow.
 *
 * @param props Конфигурация карточки.
 * @returns Premium KPI card.
 */
export function MetricCard(props: IMetricCardProps): ReactElement {
    const hasTrend = props.trendDirection !== undefined && props.trendLabel !== undefined

    const parsed = parseInt(props.value.replace(/,/g, ""), 10)
    const isNumeric = !Number.isNaN(parsed)

    return (
        <Card
            className={[
                "group h-full",
                "border border-border/50",
                "bg-surface/80 backdrop-blur-sm",
                "shadow-sm transition-all duration-200",
                "hover:border-accent/30 hover:shadow-md",
            ].join(" ")}
        >
            <CardContent className="flex flex-col justify-between gap-3 p-4">
                {/* Label */}
                <p className={TYPOGRAPHY.bodyMuted}>{props.label}</p>

                {/* Value + Trend */}
                <div className="flex items-end justify-between gap-2">
                    <p className="font-display text-3xl font-bold tracking-tight text-foreground">
                        {isNumeric ? (
                            <CountUp
                                duration={0.6}
                                end={parsed}
                                formattingFn={(value: number): string =>
                                    value.toLocaleString("en-US")
                                }
                            />
                        ) : (
                            props.value
                        )}
                    </p>

                    {hasTrend ? (
                        <TrendBadge direction={props.trendDirection} label={props.trendLabel} />
                    ) : null}
                </div>

                {/* Caption */}
                {props.caption !== undefined ? (
                    <p className={TYPOGRAPHY.caption}>{props.caption}</p>
                ) : null}
            </CardContent>
        </Card>
    )
}

/**
 * Параметры бейджа тренда.
 */
interface ITrendBadgeProps {
    /** Направление тренда. */
    readonly direction: TMetricTrendDirection
    /** Текстовое значение тренда. */
    readonly label: string
}

/**
 * Компактный бейдж тренда с иконкой и цветовой индикацией.
 *
 * @param props Параметры бейджа.
 * @returns Trend badge element.
 */
function TrendBadge(props: ITrendBadgeProps): ReactElement {
    const config = resolveTrendConfig(props.direction)

    return (
        <span
            className={[
                "inline-flex items-center gap-0.5",
                "rounded-md px-1.5 py-0.5",
                "text-xs font-semibold",
                config.bgClass,
                config.textClass,
            ].join(" ")}
        >
            <config.Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {props.label}
        </span>
    )
}
