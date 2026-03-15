import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"
import { useDynamicTranslation } from "@/lib/i18n"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Максимум отображаемых accuracy case записей.
 */
const MAX_VISIBLE_ACCURACY_CASES = 4

/**
 * Точка accuracy-trend.
 */
export interface IPredictionAccuracyPoint {
    /** Временная метка. */
    readonly timestamp: string
    /** Количество предсказанных инцидентов. */
    readonly predictedIncidents: number
    /** Количество фактических инцидентов. */
    readonly actualIncidents: number
    /** Accuracy процента. */
    readonly accuracyScore: number
}

/**
 * Лёгкая confusion matrix для prediction-модуля.
 */
export interface IPredictionConfusionMatrix {
    readonly truePositive: number
    readonly trueNegative: number
    readonly falsePositive: number
    readonly falseNegative: number
}

/**
 * Кейc сравнения "predicted vs actual".
 */
export interface IPredictionAccuracyCase {
    readonly id: string
    readonly fileId: string
    readonly label: string
    readonly predictedRiskLevel: TCodeCityTreemapPredictionRiskLevel
    readonly actualOutcome: "incident" | "stable"
}

/**
 * Пропсы prediction accuracy widget.
 */
export interface IPredictionAccuracyWidgetProps {
    readonly points: ReadonlyArray<IPredictionAccuracyPoint>
    readonly matrix: IPredictionConfusionMatrix
    readonly cases: ReadonlyArray<IPredictionAccuracyCase>
    readonly activeCaseId?: string
    readonly onSelectCase?: (entry: IPredictionAccuracyCase) => void
}

function resolvePredictedLabelKey(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "code-city:predictionAccuracy.predictedIncident"
    }
    if (riskLevel === "medium") {
        return "code-city:predictionAccuracy.predictedMonitor"
    }
    return "code-city:predictionAccuracy.predictedStable"
}

/**
 * Виджет accuracy для prediction-модуля.
 *
 * @param props Accuracy points, matrix и cases.
 * @returns React-компонент виджета.
 */
export function PredictionAccuracyWidget(props: IPredictionAccuracyWidgetProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const { td } = useDynamicTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:predictionAccuracy.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:predictionAccuracy.description")}
            </p>

            <div
                aria-label={t("code-city:predictionAccuracy.ariaLabelTrend")}
                className="mt-3 space-y-1"
            >
                {props.points.map((point): ReactElement => {
                    return (
                        <p className="text-xs text-foreground" key={point.timestamp}>
                            {point.timestamp}: predicted {String(point.predictedIncidents)} / actual{" "}
                            {String(point.actualIncidents)} / accuracy {String(point.accuracyScore)}
                            %
                        </p>
                    )
                })}
            </div>

            <div
                aria-label={t("code-city:predictionAccuracy.ariaLabelMatrix")}
                className="mt-3 grid grid-cols-2 gap-2 rounded border border-border bg-surface p-2"
            >
                <p className="rounded border border-success/30 bg-success/10 px-2 py-1 text-xs text-success">
                    TP {String(props.matrix.truePositive)}
                </p>
                <p className="rounded border border-accent/30 bg-accent/10 px-2 py-1 text-xs text-accent-foreground">
                    TN {String(props.matrix.trueNegative)}
                </p>
                <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-warning">
                    FP {String(props.matrix.falsePositive)}
                </p>
                <p className="rounded border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger">
                    FN {String(props.matrix.falseNegative)}
                </p>
            </div>

            <div
                aria-label={t("code-city:predictionAccuracy.ariaLabelCases")}
                className="mt-3 space-y-2"
            >
                {props.cases.slice(0, MAX_VISIBLE_ACCURACY_CASES).map((entry): ReactElement => {
                    const isActive = props.activeCaseId === entry.id
                    return (
                        <button
                            aria-label={t("code-city:predictionAccuracy.ariaLabelInspect", {
                                label: entry.label,
                            })}
                            className={`w-full rounded border p-2 text-left text-xs transition ${
                                isActive
                                    ? "border-accent bg-accent/10 text-accent-foreground"
                                    : "border-border bg-surface text-foreground hover:border-border"
                            }`}
                            key={entry.id}
                            onClick={(): void => {
                                props.onSelectCase?.(entry)
                            }}
                            type="button"
                        >
                            {t("code-city:predictionAccuracy.caseText", {
                                predicted: td(resolvePredictedLabelKey(entry.predictedRiskLevel)),
                                label: entry.label,
                                outcome: entry.actualOutcome,
                            })}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
