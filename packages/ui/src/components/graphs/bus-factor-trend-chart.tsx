import type { ReactElement } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { GRAPH_EXPORT_PALETTE } from "@/lib/constants/graph-colors"
import { TYPOGRAPHY } from "@/lib/constants/typography"

const SVG_WIDTH = 520
const SVG_HEIGHT = 260
const CHART_PADDING_LEFT = 34
const CHART_PADDING_RIGHT = 16
const CHART_PADDING_TOP = 16
const CHART_PADDING_BOTTOM = 34

/**
 * Точка тренда bus factor.
 */
export interface IBusFactorTrendPoint {
    /** ISO timestamp измерения. */
    readonly timestamp: string
    /** Значение bus factor. */
    readonly busFactor: number
    /** Аннотация team-change события. */
    readonly annotation?: string
}

/**
 * Серия тренда bus factor по модулю.
 */
export interface IBusFactorTrendSeries {
    /** Идентификатор модуля. */
    readonly moduleId: string
    /** Лейбл модуля. */
    readonly moduleLabel: string
    /** Файл-фокус для CodeCity навигации. */
    readonly primaryFileId: string
    /** Исторические точки тренда. */
    readonly points: ReadonlyArray<IBusFactorTrendPoint>
}

/**
 * Пропсы графика bus factor trend.
 */
export interface IBusFactorTrendChartProps {
    /** Набор module-series. */
    readonly series: ReadonlyArray<IBusFactorTrendSeries>
    /** Активный модуль в легенде. */
    readonly activeModuleId?: string
    /** Callback выбора серии. */
    readonly onSelectSeries?: (series: IBusFactorTrendSeries) => void
}

function resolveBusFactor(value: number): number | undefined {
    if (Number.isFinite(value) === false) {
        return undefined
    }

    return Math.max(1, Math.min(10, Math.round(value)))
}

function resolveDateValue(timestamp: string): Date | undefined {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
        return undefined
    }
    return date
}

function resolveDateLabel(timestamp: string): string {
    const date = resolveDateValue(timestamp)
    if (date === undefined) {
        return timestamp
    }

    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
    }).format(date)
}

function mapX(index: number, pointCount: number): number {
    const plotWidth = SVG_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT
    if (pointCount <= 1) {
        return CHART_PADDING_LEFT + plotWidth / 2
    }

    return CHART_PADDING_LEFT + (index / (pointCount - 1)) * plotWidth
}

function mapY(busFactor: number, maxBusFactor: number): number {
    const plotHeight = SVG_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM
    return SVG_HEIGHT - CHART_PADDING_BOTTOM - (busFactor / maxBusFactor) * plotHeight
}

function buildSeriesPath(
    points: ReadonlyArray<IBusFactorTrendPoint>,
    maxBusFactor: number,
): string {
    return points
        .map((point, index): string => {
            const normalized = resolveBusFactor(point.busFactor)
            if (normalized === undefined) {
                return ""
            }
            const x = mapX(index, points.length)
            const y = mapY(normalized, maxBusFactor)
            return `${index === 0 ? "M" : "L"} ${String(x)} ${String(y)}`
        })
        .join(" ")
}

function resolveLatestBusFactor(points: ReadonlyArray<IBusFactorTrendPoint>): number | undefined {
    const latestPoint = points.at(-1)
    if (latestPoint === undefined) {
        return undefined
    }
    return resolveBusFactor(latestPoint.busFactor)
}

/**
 * Line-chart трендов bus factor по модулям с аннотациями team-change.
 *
 * @param props Series модуля и callback фокуса.
 * @returns React-компонент bus factor trend chart.
 */
export function BusFactorTrendChart(props: IBusFactorTrendChartProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const preparedSeries = useMemo((): ReadonlyArray<IBusFactorTrendSeries> => {
        return props.series
            .map((series): IBusFactorTrendSeries => {
                const normalizedPoints = series.points
                    .filter((point): boolean => {
                        return (
                            resolveBusFactor(point.busFactor) !== undefined &&
                            resolveDateValue(point.timestamp) !== undefined
                        )
                    })
                    .sort((leftPoint, rightPoint): number => {
                        const leftDate = resolveDateValue(leftPoint.timestamp)
                        const rightDate = resolveDateValue(rightPoint.timestamp)
                        if (leftDate === undefined || rightDate === undefined) {
                            return 0
                        }
                        return leftDate.getTime() - rightDate.getTime()
                    })

                return {
                    ...series,
                    points: normalizedPoints,
                }
            })
            .filter((series): boolean => series.points.length > 0)
    }, [props.series])

    const maxBusFactor = useMemo((): number => {
        const values = preparedSeries.flatMap((series): ReadonlyArray<number> => {
            return series.points
                .map((point): number | undefined => resolveBusFactor(point.busFactor))
                .filter((value): value is number => value !== undefined)
        })
        if (values.length === 0) {
            return 1
        }
        return Math.max(...values, 1)
    }, [preparedSeries])

    if (preparedSeries.length === 0) {
        return (
            <div
                aria-label={t("code-city:busFactorTrend.ariaLabel")}
                className="rounded-md border border-default-200 p-3"
            >
                <p className="text-sm font-semibold">{t("code-city:busFactorTrend.title")}</p>
                <p className="text-sm text-foreground-500">
                    {t("code-city:busFactorTrend.emptyState")}
                </p>
            </div>
        )
    }

    return (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:busFactorTrend.title")}</p>
            <p className={TYPOGRAPHY.captionMuted}>{t("code-city:busFactorTrend.description")}</p>
            <div
                aria-label={t("code-city:busFactorTrend.ariaLabel")}
                className="grid gap-3 lg:grid-cols-[1.4fr_1fr]"
            >
                <svg
                    aria-label={t("code-city:busFactorTrend.ariaLabelLines")}
                    className="h-auto w-full"
                    viewBox={`0 0 ${String(SVG_WIDTH)} ${String(SVG_HEIGHT)}`}
                >
                    <rect
                        fill="var(--surface-secondary)"
                        height={SVG_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM}
                        rx={6}
                        width={SVG_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT}
                        x={CHART_PADDING_LEFT}
                        y={CHART_PADDING_TOP}
                    />
                    {preparedSeries.map((series, seriesIndex): ReactElement => {
                        const color =
                            GRAPH_EXPORT_PALETTE.busFactor.seriesColors[
                                seriesIndex % GRAPH_EXPORT_PALETTE.busFactor.seriesColors.length
                            ] ?? GRAPH_EXPORT_PALETTE.busFactor.seriesColors[0]
                        return (
                            <g key={series.moduleId}>
                                <path
                                    d={buildSeriesPath(series.points, maxBusFactor)}
                                    data-testid={`bus-factor-line-${series.moduleId}`}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={2.5}
                                />
                                {series.points.map((point, pointIndex): ReactElement | null => {
                                    const normalized = resolveBusFactor(point.busFactor)
                                    if (normalized === undefined) {
                                        return null
                                    }
                                    const x = mapX(pointIndex, series.points.length)
                                    const y = mapY(normalized, maxBusFactor)

                                    return (
                                        <g key={`${series.moduleId}-${point.timestamp}`}>
                                            <circle
                                                cx={x}
                                                cy={y}
                                                fill={color}
                                                r={3}
                                                stroke="hsl(0 0% 100%)"
                                                strokeWidth={1}
                                            />
                                            {point.annotation === undefined ? null : (
                                                <>
                                                    <line
                                                        stroke={color}
                                                        strokeDasharray="4 2"
                                                        x1={x}
                                                        x2={x}
                                                        y1={y - 4}
                                                        y2={CHART_PADDING_TOP + 6}
                                                    />
                                                    <text
                                                        aria-label={t(
                                                            "code-city:busFactorTrend.ariaLabelAnnotation",
                                                            {
                                                                moduleLabel: series.moduleLabel,
                                                                annotation: point.annotation,
                                                            },
                                                        )}
                                                        fill={color}
                                                        fontSize={9}
                                                        x={x + 3}
                                                        y={CHART_PADDING_TOP + 6}
                                                    >
                                                        {point.annotation}
                                                    </text>
                                                </>
                                            )}
                                        </g>
                                    )
                                })}
                            </g>
                        )
                    })}
                    {preparedSeries[0]?.points.map((point, index): ReactElement => {
                        return (
                            <text
                                fill="var(--muted)"
                                fontSize={9}
                                key={point.timestamp}
                                textAnchor="middle"
                                x={mapX(index, preparedSeries[0]?.points.length ?? 1)}
                                y={SVG_HEIGHT - 10}
                            >
                                {resolveDateLabel(point.timestamp)}
                            </text>
                        )
                    })}
                </svg>
                <ul
                    aria-label={t("code-city:busFactorTrend.ariaLabelModules")}
                    className="space-y-2"
                >
                    {preparedSeries.map((series): ReactElement => {
                        const latestBusFactor = resolveLatestBusFactor(series.points)
                        const isActive = props.activeModuleId === series.moduleId

                        return (
                            <li
                                className={
                                    isActive
                                        ? "rounded border border-accent/40 bg-accent/10 p-2"
                                        : "rounded border border-border bg-surface p-2"
                                }
                                key={series.moduleId}
                            >
                                <p className={TYPOGRAPHY.cardTitle}>{series.moduleLabel}</p>
                                <p className={TYPOGRAPHY.captionMuted}>
                                    {t("code-city:busFactorTrend.latestBusFactor", {
                                        value: String(latestBusFactor ?? "n/a"),
                                    })}
                                </p>
                                <button
                                    aria-label={t("code-city:busFactorTrend.ariaLabelInspect", {
                                        moduleLabel: series.moduleLabel,
                                    })}
                                    className="mt-2 rounded border border-accent/40 bg-accent/20 px-2 py-1 text-xs font-semibold text-accent-foreground hover:border-accent"
                                    onClick={(): void => {
                                        props.onSelectSeries?.(series)
                                    }}
                                    type="button"
                                >
                                    {t("code-city:busFactorTrend.focusModuleTrend")}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}
