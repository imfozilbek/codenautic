import type { ReactElement } from "react"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"

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

function resolvePredictedLabel(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "incident"
    }
    if (riskLevel === "medium") {
        return "monitor"
    }
    return "stable"
}

/**
 * Виджет accuracy для prediction-модуля.
 *
 * @param props Accuracy points, matrix и cases.
 * @returns React-компонент виджета.
 */
export function PredictionAccuracyWidget(props: IPredictionAccuracyWidgetProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Prediction accuracy widget</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Track forecast accuracy over time with confusion matrix and predicted vs actual
                cases.
            </p>

            <div aria-label="Prediction accuracy trend" className="mt-3 space-y-1">
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
                aria-label="Prediction confusion matrix"
                className="mt-3 grid grid-cols-2 gap-2 rounded border border-border bg-surface p-2"
            >
                <p className="rounded border border-success/30 bg-success/10 px-2 py-1 text-xs text-success">
                    TP {String(props.matrix.truePositive)}
                </p>
                <p className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-800">
                    TN {String(props.matrix.trueNegative)}
                </p>
                <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-warning">
                    FP {String(props.matrix.falsePositive)}
                </p>
                <p className="rounded border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger">
                    FN {String(props.matrix.falseNegative)}
                </p>
            </div>

            <div aria-label="Prediction accuracy cases" className="mt-3 space-y-2">
                {props.cases.slice(0, 4).map((entry): ReactElement => {
                    const isActive = props.activeCaseId === entry.id
                    return (
                        <button
                            aria-label={`Inspect prediction accuracy case ${entry.label}`}
                            className={`w-full rounded border p-2 text-left text-xs transition ${
                                isActive
                                    ? "border-cyan-400 bg-cyan-50 text-cyan-900"
                                    : "border-border bg-surface text-foreground hover:border-border"
                            }`}
                            key={entry.id}
                            onClick={(): void => {
                                props.onSelectCase?.(entry)
                            }}
                            type="button"
                        >
                            We predicted {resolvePredictedLabel(entry.predictedRiskLevel)} on{" "}
                            {entry.label}, actual result: {entry.actualOutcome}.
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
