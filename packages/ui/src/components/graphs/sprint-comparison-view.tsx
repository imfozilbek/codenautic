import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Метрика before/after для sprint comparison.
 */
export interface ISprintComparisonMetric {
    readonly label: string
    readonly beforeValue: number
    readonly afterValue: number
}

/**
 * Snapshot сравнения спринтов.
 */
export interface ISprintComparisonSnapshot {
    readonly id: string
    readonly title: string
    readonly fileId?: string
    readonly metrics: ReadonlyArray<ISprintComparisonMetric>
    readonly improvementScore: number
}

/**
 * Пропсы sprint comparison view.
 */
export interface ISprintComparisonViewProps {
    readonly snapshots: ReadonlyArray<ISprintComparisonSnapshot>
    readonly activeSnapshotId?: string
    readonly onSelectSnapshot?: (snapshot: ISprintComparisonSnapshot) => void
}

function resolveDeltaClassName(delta: number): string {
    if (delta < 0) {
        return "border-success/30 bg-success/10 text-success"
    }
    if (delta > 0) {
        return "border-danger/30 bg-danger/10 text-danger"
    }
    return "border-border bg-surface-muted text-foreground"
}

/**
 * Side-by-side sprint comparison view для before/after CodeCity среза.
 *
 * @param props Snapshot-модель и callback выбора.
 * @returns React-компонент sprint comparison.
 */
export function SprintComparisonView(props: ISprintComparisonViewProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const selectedSnapshot =
        props.snapshots.find((snapshot): boolean => snapshot.id === props.activeSnapshotId) ??
        props.snapshots[0]

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:sprintComparison.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:sprintComparison.description")}
            </p>

            <div aria-label={t("code-city:sprintComparison.ariaLabelSnapshots")} className="mt-3 space-y-2">
                {props.snapshots.map((snapshot): ReactElement => {
                    const isActive = snapshot.id === selectedSnapshot?.id
                    return (
                        <button
                            aria-label={t("code-city:sprintComparison.ariaLabelInspect", { title: snapshot.title })}
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
                            {t("code-city:sprintComparison.snapshotText", { title: snapshot.title, score: String(snapshot.improvementScore) })}
                        </button>
                    )
                })}
            </div>

            <div
                aria-label={t("code-city:sprintComparison.ariaLabelMetrics")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className={TYPOGRAPHY.overline}>
                    {t("code-city:sprintComparison.beforeVsAfter")}
                </p>
                <div className="mt-2 space-y-2">
                    {(selectedSnapshot?.metrics ?? []).map((metric): ReactElement => {
                        const delta = metric.afterValue - metric.beforeValue
                        const progressWidth = Math.max(
                            8,
                            Math.min(
                                100,
                                Math.round(
                                    (metric.afterValue / Math.max(metric.beforeValue, 1)) * 100,
                                ),
                            ),
                        )
                        return (
                            <div key={metric.label}>
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <p className="font-semibold text-foreground">{metric.label}</p>
                                    <p
                                        className={`rounded border px-1 py-0.5 ${resolveDeltaClassName(delta)}`}
                                    >
                                        {delta > 0 ? "+" : ""}
                                        {String(delta)}
                                    </p>
                                </div>
                                <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                    {t("code-city:sprintComparison.beforeToAfter", { before: String(metric.beforeValue), after: String(metric.afterValue) })}
                                </p>
                                <div className="mt-1 h-1.5 overflow-hidden rounded bg-surface-muted">
                                    <div
                                        className="h-full rounded bg-primary transition-all duration-500"
                                        style={{ width: `${String(progressWidth)}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
