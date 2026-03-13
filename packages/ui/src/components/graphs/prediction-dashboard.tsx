import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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

function resolveRiskLabelKey(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "code-city:predictionDashboard.riskHigh"
    }
    if (riskLevel === "medium") {
        return "code-city:predictionDashboard.riskMedium"
    }
    return "code-city:predictionDashboard.riskLow"
}

function resolveHotspotClassName(
    isActive: boolean,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): string {
    const baseClassName = isActive
        ? "border-primary bg-primary/10"
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
    const { t } = useTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:predictionDashboard.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:predictionDashboard.description")}
            </p>

            <div aria-label={t("code-city:predictionDashboard.ariaLabelHotspots")} className="mt-3 space-y-2">
                {props.hotspots.slice(0, 4).map((entry): ReactElement => {
                    const isActive = props.activeHotspotId === entry.id
                    return (
                        <button
                            aria-label={t("code-city:predictionDashboard.ariaLabelInspect", { label: entry.label })}
                            className={resolveHotspotClassName(isActive, entry.riskLevel)}
                            key={entry.id}
                            onClick={(): void => {
                                props.onSelectHotspot?.(entry)
                            }}
                            type="button"
                        >
                            <p className={TYPOGRAPHY.cardTitle}>{entry.label}</p>
                            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                {t("code-city:predictionDashboard.hotspotMeta", { risk: (t as unknown as (key: string) => string)(resolveRiskLabelKey(entry.riskLevel)), confidence: String(entry.confidenceScore), increase: String(entry.predictedIssueIncrease) })}
                            </p>
                        </button>
                    )
                })}
            </div>

            <div
                aria-label={t("code-city:predictionDashboard.ariaLabelQualityTrend")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("code-city:predictionDashboard.qualityTrendForecast")}
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
                aria-label={t("code-city:predictionDashboard.ariaLabelBugProne")}
                className="mt-2 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("code-city:predictionDashboard.bugProneFiles")}
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
