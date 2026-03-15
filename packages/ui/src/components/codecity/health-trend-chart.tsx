import type { ReactElement } from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { NATIVE_FORM } from "@/lib/constants/spacing"

const PERIOD_OPTIONS = [
    { label: "30d", value: "30d", days: 30 },
    { label: "90d", value: "90d", days: 90 },
    { label: "180d", value: "180d", days: 180 },
] as const

type IHealthTrendPeriod = (typeof PERIOD_OPTIONS)[number]["value"]

const SVG_WIDTH = 360
const SVG_HEIGHT = 220
const PADDING_LEFT = 28
const PADDING_RIGHT = 16
const PADDING_TOP = 16
const PADDING_BOTTOM = 28

export interface IHealthTrendPoint {
    readonly timestamp: string
    readonly healthScore: number
    readonly annotation?: string
}

export interface IHealthTrendChartProps {
    readonly title?: string
    readonly points: ReadonlyArray<IHealthTrendPoint>
}

function resolveScore(value: number): number | undefined {
    if (Number.isFinite(value) === false) {
        return undefined
    }

    return Math.max(0, Math.min(100, value))
}

function resolveDate(value: string): Date | undefined {
    const date = new Date(value)
    if (Number.isNaN(date.getTime()) === true) {
        return undefined
    }

    return date
}

function resolvePeriodDays(period: IHealthTrendPeriod): number {
    const entry = PERIOD_OPTIONS.find((option): boolean => option.value === period)
    return entry?.days ?? 30
}

function mapX(index: number, total: number): number {
    const plotWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
    if (total <= 1) {
        return PADDING_LEFT + plotWidth / 2
    }

    return PADDING_LEFT + (index / (total - 1)) * plotWidth
}

function mapY(score: number): number {
    const plotHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM
    return SVG_HEIGHT - PADDING_BOTTOM - (score / 100) * plotHeight
}

/**
 * Health trend chart with period selector and event annotations.
 */
export function HealthTrendChart(props: IHealthTrendChartProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const title = props.title ?? t("code-city:healthTrendComp.title")
    const [period, setPeriod] = useState<IHealthTrendPeriod>("90d")

    const preparedPoints = useMemo((): ReadonlyArray<IHealthTrendPoint> => {
        return props.points
            .filter((point): boolean => {
                return (
                    resolveScore(point.healthScore) !== undefined &&
                    resolveDate(point.timestamp) !== undefined
                )
            })
            .sort((left, right): number => {
                const leftDate = resolveDate(left.timestamp)
                const rightDate = resolveDate(right.timestamp)
                if (leftDate === undefined || rightDate === undefined) {
                    return 0
                }

                return leftDate.getTime() - rightDate.getTime()
            })
    }, [props.points])

    const visiblePoints = useMemo((): ReadonlyArray<IHealthTrendPoint> => {
        if (preparedPoints.length === 0) {
            return []
        }

        const latestDate = resolveDate(preparedPoints.at(-1)?.timestamp ?? "")
        if (latestDate === undefined) {
            return preparedPoints
        }

        const periodDays = resolvePeriodDays(period)
        const periodStart = new Date(latestDate.getTime() - periodDays * 24 * 60 * 60 * 1000)

        return preparedPoints.filter((point): boolean => {
            const date = resolveDate(point.timestamp)
            if (date === undefined) {
                return false
            }

            return date.getTime() >= periodStart.getTime()
        })
    }, [period, preparedPoints])

    const linePath = useMemo((): string => {
        return visiblePoints
            .map((point, index): string => {
                const score = resolveScore(point.healthScore)
                if (score === undefined) {
                    return ""
                }

                const x = mapX(index, visiblePoints.length)
                const y = mapY(score)

                return `${index === 0 ? "M" : "L"} ${String(x)} ${String(y)}`
            })
            .join(" ")
    }, [visiblePoints])

    const stats = useMemo(():
        | { readonly avg: number; readonly min: number; readonly max: number }
        | undefined => {
        if (visiblePoints.length === 0) {
            return undefined
        }

        const scores = visiblePoints
            .map((point): number | undefined => resolveScore(point.healthScore))
            .filter((value): value is number => value !== undefined)
        if (scores.length === 0) {
            return undefined
        }

        const sum = scores.reduce((total, score): number => total + score, 0)
        const min = Math.min(...scores)
        const max = Math.max(...scores)

        return {
            avg: Math.round((sum / scores.length) * 10) / 10,
            min,
            max,
        }
    }, [visiblePoints])

    if (visiblePoints.length === 0) {
        return (
            <div aria-label={title} className="rounded-md border border-default-200 p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-foreground-500">
                    {t("code-city:healthTrendComp.noData")}
                </p>
            </div>
        )
    }

    return (
        <div aria-label={title} className="space-y-2 rounded-md border border-default-200 p-3">
            <div className="flex flex-wrap items-end gap-2">
                <p className="text-sm font-semibold">{title}</p>
                <label className="text-xs text-foreground-500" htmlFor="health-trend-period">
                    {t("code-city:healthTrendComp.period")}
                </label>
                <select
                    aria-label={t("code-city:healthTrendComp.ariaPeriod")}
                    className={`w-28 ${NATIVE_FORM.select}`}
                    id="health-trend-period"
                    value={period}
                    onChange={(event): void => {
                        const nextPeriod = event.currentTarget.value
                        if (nextPeriod === "30d" || nextPeriod === "180d") {
                            setPeriod(nextPeriod)
                            return
                        }
                        setPeriod("90d")
                    }}
                >
                    {PERIOD_OPTIONS.map(
                        (option): ReactElement => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ),
                    )}
                </select>
            </div>
            <svg
                aria-label={t("code-city:healthTrendComp.ariaChart")}
                className="w-full"
                style={{ height: 260 }}
                viewBox={`0 0 ${String(SVG_WIDTH)} ${String(SVG_HEIGHT)}`}
            >
                <rect
                    fill="hsl(var(--nextui-colors-default-50))"
                    height={SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM}
                    rx={6}
                    width={SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    x={PADDING_LEFT}
                    y={PADDING_TOP}
                />
                <path d={linePath} fill="none" stroke="hsl(214, 92%, 55%)" strokeWidth={2.5} />
                {visiblePoints.map((point, index): ReactElement | null => {
                    const score = resolveScore(point.healthScore)
                    if (score === undefined) {
                        return null
                    }

                    const x = mapX(index, visiblePoints.length)
                    const y = mapY(score)

                    return (
                        <g key={`${point.timestamp}-${String(index)}`}>
                            <circle
                                cx={x}
                                cy={y}
                                fill="hsl(214, 92%, 55%)"
                                r={3}
                                stroke="hsl(var(--nextui-colors-background))"
                                strokeWidth={1}
                            />
                            {point.annotation === undefined ? null : (
                                <>
                                    <line
                                        stroke="hsl(12, 90%, 55%)"
                                        strokeDasharray="4 2"
                                        x1={x}
                                        x2={x}
                                        y1={y - 4}
                                        y2={PADDING_TOP + 8}
                                    />
                                    <text
                                        aria-label={t("code-city:healthTrendComp.ariaEvent", {
                                            annotation: point.annotation,
                                        })}
                                        fill="hsl(12, 90%, 55%)"
                                        fontSize="9"
                                        x={x + 3}
                                        y={PADDING_TOP + 8}
                                    >
                                        {point.annotation}
                                    </text>
                                </>
                            )}
                        </g>
                    )
                })}
            </svg>
            {stats === undefined ? null : (
                <p
                    aria-label={t("code-city:healthTrendComp.ariaStats")}
                    className="text-xs text-foreground-500"
                >
                    {t("code-city:healthTrendComp.stats", {
                        avg: stats.avg,
                        min: stats.min,
                        max: stats.max,
                    })}
                </p>
            )}
        </div>
    )
}
