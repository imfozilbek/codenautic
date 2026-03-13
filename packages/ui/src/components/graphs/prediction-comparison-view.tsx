import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Снимок comparison для prediction history.
 */
export interface IPredictionComparisonSnapshot {
    readonly id: string
    readonly periodLabel: string
    readonly predictedHotspots: number
    readonly actualHotspots: number
    readonly accuracyScore: number
    readonly fileId?: string
    readonly summary: string
}

/**
 * Пропсы prediction comparison view.
 */
export interface IPredictionComparisonViewProps {
    readonly snapshots: ReadonlyArray<IPredictionComparisonSnapshot>
    readonly activeSnapshotId?: string
    readonly onSelectSnapshot?: (snapshot: IPredictionComparisonSnapshot) => void
}

/**
 * Сравнение прогнозов across time с фокусом на "what happened".
 *
 * @param props Snapshot-модель и callback выбора.
 * @returns React-компонент comparison view.
 */
export function PredictionComparisonView(props: IPredictionComparisonViewProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const selectedSnapshot =
        props.snapshots.find((snapshot): boolean => snapshot.id === props.activeSnapshotId) ??
        props.snapshots[0]

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:predictionComparison.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:predictionComparison.description")}
            </p>

            <div aria-label={t("code-city:predictionComparison.ariaLabelSnapshots")} className="mt-3 space-y-2">
                {props.snapshots.map((snapshot): ReactElement => {
                    const isActive = snapshot.id === selectedSnapshot?.id
                    return (
                        <button
                            aria-label={t("code-city:predictionComparison.ariaLabelInspect", { periodLabel: snapshot.periodLabel })}
                            className={`w-full rounded border p-2 text-left text-xs transition ${
                                isActive
                                    ? "border-primary bg-primary/10 text-on-primary"
                                    : "border-border bg-surface text-foreground hover:border-border"
                            }`}
                            key={snapshot.id}
                            onClick={(): void => {
                                props.onSelectSnapshot?.(snapshot)
                            }}
                            type="button"
                        >
                            {t("code-city:predictionComparison.snapshotText", { periodLabel: snapshot.periodLabel, predicted: String(snapshot.predictedHotspots), actual: String(snapshot.actualHotspots), accuracy: String(snapshot.accuracyScore) })}
                        </button>
                    )
                })}
            </div>

            <div
                aria-label={t("code-city:predictionComparison.ariaLabelSummary")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className={TYPOGRAPHY.overline}>
                    {t("code-city:predictionComparison.whatHappened")}
                </p>
                <p className="mt-1 text-xs text-foreground">
                    {selectedSnapshot === undefined
                        ? t("code-city:predictionComparison.noSnapshot")
                        : selectedSnapshot.summary}
                </p>
            </div>
        </section>
    )
}
