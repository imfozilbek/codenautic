import type { ReactElement } from "react"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"

/**
 * Прогнозный hotspot для prediction dashboard.
 */
export interface IPredictionDashboardHotspotEntry {
    /** Идентификатор hotspot. */
    readonly id: string
    /** Целевой file id. */
    readonly fileId: string
    /** Отображаемый лейбл файла. */
    readonly label: string
    /** Уровень прогнозного риска. */
    readonly riskLevel: TCodeCityTreemapPredictionRiskLevel
    /** Confidence прогноза. */
    readonly confidenceScore: number
    /** Прогноз роста issue density. */
    readonly predictedIssueIncrease: number
}

/**
 * Точка quality trend c прогнозом.
 */
export interface IPredictionDashboardQualityTrendPoint {
    /** ISO timestamp точки. */
    readonly timestamp: string
    /** Историческое значение quality score. */
    readonly qualityScore: number
    /** Прогноз quality score. */
    readonly forecastQualityScore: number
}

/**
 * Bug-prone файл в prediction dashboard.
 */
export interface IPredictionDashboardBugProneFile {
    /** Идентификатор файла. */
    readonly fileId: string
    /** Лейбл файла. */
    readonly label: string
    /** Количество bug introductions в окне 30d. */
    readonly bugIntroductions30d: number
    /** Confidence прогноза bug-prone статуса. */
    readonly confidenceScore: number
}

/**
 * Пропсы prediction dashboard.
 */
export interface IPredictionDashboardProps {
    /** Прогнозные hotspots. */
    readonly hotspots: ReadonlyArray<IPredictionDashboardHotspotEntry>
    /** Точки quality trend + forecast. */
    readonly qualityTrendPoints: ReadonlyArray<IPredictionDashboardQualityTrendPoint>
    /** Список bug-prone файлов. */
    readonly bugProneFiles: ReadonlyArray<IPredictionDashboardBugProneFile>
    /** Активный hotspot. */
    readonly activeHotspotId?: string
    /** Callback выбора hotspot. */
    readonly onSelectHotspot?: (entry: IPredictionDashboardHotspotEntry) => void
}

function resolveRiskLabel(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "High"
    }
    if (riskLevel === "medium") {
        return "Medium"
    }
    return "Low"
}

function resolveHotspotClassName(
    isActive: boolean,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-50"
        : "border-border bg-surface hover:border-border"
    const highRiskClassName = riskLevel === "high" ? "border-dashed" : ""

    return ["w-full rounded-lg border p-2 text-left transition", baseClassName, highRiskClassName]
        .filter((entry): boolean => entry.length > 0)
        .join(" ")
}

/**
 * Prediction dashboard с блоками hotspot, quality trend и bug-prone files.
 *
 * @param props Наборы прогнозных метрик и callbacks выбора.
 * @returns React-компонент prediction dashboard.
 */
export function PredictionDashboard(props: IPredictionDashboardProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Prediction dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Predicted hotspots, quality trend forecast, and bug-prone files with confidence
                scores.
            </p>

            <div aria-label="Prediction hotspots list" className="mt-3 space-y-2">
                {props.hotspots.slice(0, 4).map((entry): ReactElement => {
                    const isActive = props.activeHotspotId === entry.id
                    return (
                        <button
                            aria-label={`Inspect prediction dashboard hotspot ${entry.label}`}
                            className={resolveHotspotClassName(isActive, entry.riskLevel)}
                            key={entry.id}
                            onClick={(): void => {
                                props.onSelectHotspot?.(entry)
                            }}
                            type="button"
                        >
                            <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Risk {resolveRiskLabel(entry.riskLevel)} · Confidence{" "}
                                {String(entry.confidenceScore)}% · Forecast +
                                {String(entry.predictedIssueIncrease)} issues
                            </p>
                        </button>
                    )
                })}
            </div>

            <div
                aria-label="Prediction quality trend"
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quality trend forecast
                </p>
                <ul className="mt-1 space-y-1">
                    {props.qualityTrendPoints.map((point): ReactElement => {
                        return (
                            <li className="text-xs text-foreground" key={point.timestamp}>
                                {point.timestamp}: {String(point.qualityScore)} →{" "}
                                {String(point.forecastQualityScore)}
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div
                aria-label="Prediction bug-prone files"
                className="mt-2 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bug-prone files
                </p>
                <ul className="mt-1 space-y-1">
                    {props.bugProneFiles.slice(0, 4).map((entry): ReactElement => {
                        return (
                            <li className="text-xs text-foreground" key={entry.fileId}>
                                {entry.label} · bugs 30d {String(entry.bugIntroductions30d)} ·
                                confidence {String(entry.confidenceScore)}%
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}
