import type { ReactElement } from "react"

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
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Trend forecast chart</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Historical quality trend with forecast zone and confidence interval bands.
            </p>

            <div
                aria-label="Trend forecast visualization"
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <svg
                    className="h-auto w-full"
                    role="img"
                    viewBox={`0 0 ${String(chartWidth + horizontalPadding * 2)} ${String(chartHeight + verticalPadding * 2)}`}
                >
                    <rect
                        fill="#e2e8f0"
                        height={String(chartHeight)}
                        opacity="0.35"
                        width={String(chartWidth - forecastStartX)}
                        x={String(horizontalPadding + forecastStartX)}
                        y={String(verticalPadding)}
                    />
                    <polygon
                        fill="#67e8f9"
                        opacity="0.35"
                        points={confidencePath}
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                    <path
                        d={historicalPath}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2"
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                    <path
                        d={forecastPath}
                        fill="none"
                        stroke="#0891b2"
                        strokeDasharray="6 4"
                        strokeWidth="2"
                        transform={`translate(${String(horizontalPadding)} ${String(verticalPadding)})`}
                    />
                </svg>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
                Forecast zone shaded in slate, confidence interval shown in cyan band.
            </p>

            <div aria-label="Trend forecast points" className="mt-3 space-y-1">
                {props.points.map((point): ReactElement => {
                    const isActive = point.id === props.activePointId
                    return (
                        <button
                            aria-label={`Inspect trend forecast point ${point.timestamp}`}
                            className={`w-full rounded border px-2 py-1 text-left text-xs transition ${
                                isActive
                                    ? "border-cyan-400 bg-cyan-50 text-cyan-900"
                                    : "border-border bg-surface text-foreground hover:border-border"
                            }`}
                            key={point.id}
                            onClick={(): void => {
                                props.onSelectPoint?.(point)
                            }}
                            type="button"
                        >
                            {point.timestamp}: {String(point.historicalScore)} to{" "}
                            {String(point.forecastScore)} (CI {String(point.confidenceLow)}-
                            {String(point.confidenceHigh)})
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
