import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import {
    FORECAST_CONFIDENCE_FILL,
    FORECAST_HISTORICAL_STROKE,
    FORECAST_LINE_STROKE,
    FORECAST_ZONE_FILL,
} from "@/lib/constants/graph-colors"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Точка trend forecast chart.
 */
export interface ITrendForecastChartPoint {
    /** Уникальный id точки. */
    readonly id: string
    /** Подпись времени. */
    readonly timestamp: string
    /** Исторический quality score. */
    readonly historicalScore: number
    /** Прогнозный quality score. */
    readonly forecastScore: number
    /** Нижняя граница confidence interval. */
    readonly confidenceLow: number
    /** Верхняя граница confidence interval. */
    readonly confidenceHigh: number
    /** Связанный file id для навигации. */
    readonly fileId?: string
}

/**
 * Пропсы trend forecast chart.
 */
export interface ITrendForecastChartProps {
    /** Набор historical + forecast точек. */
    readonly points: ReadonlyArray<ITrendForecastChartPoint>
    /** Активная точка. */
    readonly activePointId?: string
    /** Callback выбора точки. */
    readonly onSelectPoint?: (point: ITrendForecastChartPoint) => void
}

interface IChartCoordinate {
    readonly x: number
    readonly yForecast: number
    readonly yHistorical: number
    readonly yLow: number
    readonly yHigh: number
}

function clampScore(score: number): number {
    return Math.max(0, Math.min(100, score))
}

function toY(score: number, chartHeight: number): number {
    const normalized = clampScore(score) / 100
    return Math.round((1 - normalized) * chartHeight)
}

function buildCoordinates(
    points: ReadonlyArray<ITrendForecastChartPoint>,
    chartWidth: number,
    chartHeight: number,
): ReadonlyArray<IChartCoordinate> {
    if (points.length === 0) {
        return []
    }

    const segmentWidth = points.length === 1 ? 0 : chartWidth / (points.length - 1)
    return points.map((point, index): IChartCoordinate => {
        return {
            x: Math.round(index * segmentWidth),
            yForecast: toY(point.forecastScore, chartHeight),
            yHigh: toY(point.confidenceHigh, chartHeight),
            yHistorical: toY(point.historicalScore, chartHeight),
            yLow: toY(point.confidenceLow, chartHeight),
        }
    })
}

function pointsToPath(points: ReadonlyArray<{ readonly x: number; readonly y: number }>): string {
    if (points.length === 0) {
        return ""
    }
    return points
        .map((point, index): string => {
            const command = index === 0 ? "M" : "L"
            return `${command}${String(point.x)} ${String(point.y)}`
        })
        .join(" ")
}

/**
 * Trend chart с историческими значениями, прогнозной зоной и confidence bands.
 *
 * @param props Точки тренда и callback выбора.
 * @returns React-компонент прогнозного тренда.
 */
export function TrendForecastChart(props: ITrendForecastChartProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const chartWidth = 320
    const chartHeight = 120
    const horizontalPadding = 12
    const verticalPadding = 10
    const forecastStartIndex = Math.max(1, Math.floor(props.points.length / 2))
    const coordinates = buildCoordinates(props.points, chartWidth, chartHeight)
    const historicalPath = pointsToPath(
        coordinates.map((point): { readonly x: number; readonly y: number } => {
            return { x: point.x, y: point.yHistorical }
        }),
    )
    const forecastPath = pointsToPath(
        coordinates.map((point): { readonly x: number; readonly y: number } => {
            return { x: point.x, y: point.yForecast }
        }),
    )
    const confidencePolygon = [
        ...coordinates.map((point): { readonly x: number; readonly y: number } => {
            return { x: point.x, y: point.yHigh }
        }),
        ...coordinates
            .slice()
            .reverse()
            .map((point): { readonly x: number; readonly y: number } => {
                return { x: point.x, y: point.yLow }
            }),
    ]
    const confidencePath = confidencePolygon
        .map((point): string => `${String(point.x)},${String(point.y)}`)
        .join(" ")
    const forecastStartX = coordinates[forecastStartIndex]?.x ?? 0

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">{t("code-city:trendForecast.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
                {t("code-city:trendForecast.description")}
            </p>

            <div
                aria-label={t("code-city:trendForecast.ariaLabelVisualization")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <svg
                    className="h-auto w-full"
                    role="img"
                    viewBox={`0 0 ${String(chartWidth + horizontalPadding * 2)} ${String(chartHeight + verticalPadding * 2)}`}
                >
                    <rect
                        fill={FORECAST_ZONE_FILL}
                        height={String(chartHeight)}
                        opacity="0.35"
                        width={String(chartWidth - forecastStartX)}
                        x={String(horizontalPadding + forecastStartX)}
                        y={String(verticalPadding)}
                    />
                    <polygon
                        fill={FORECAST_CONFIDENCE_FILL}
                        opacity="0.35"
                        points={confidencePath}
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                    <path
                        d={historicalPath}
                        fill="none"
                        stroke={FORECAST_HISTORICAL_STROKE}
                        strokeWidth="2"
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                    <path
                        d={forecastPath}
                        fill="none"
                        stroke={FORECAST_LINE_STROKE}
                        strokeDasharray="6 4"
                        strokeWidth="2"
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                </svg>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
                {t("code-city:trendForecast.forecastZoneNote")}
            </p>

            <div aria-label={t("code-city:trendForecast.ariaLabelPoints")} className="mt-3 space-y-1">
                {props.points.map((point): ReactElement => {
                    const isActive = point.id === props.activePointId
                    return (
                        <button
                            aria-label={t("code-city:trendForecast.ariaLabelInspect", { timestamp: point.timestamp })}
                            className={`w-full rounded border px-2 py-1 text-left text-xs transition ${
                                isActive
                                    ? "border-primary bg-primary/10 text-on-primary"
                                    : "border-border bg-surface text-foreground hover:border-border"
                            }`}
                            key={point.id}
                            onClick={(): void => {
                                props.onSelectPoint?.(point)
                            }}
                            type="button"
                        >
                            {t("code-city:trendForecast.pointText", { timestamp: point.timestamp, historical: String(point.historicalScore), forecast: String(point.forecastScore), low: String(point.confidenceLow), high: String(point.confidenceHigh) })}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
