import type { ReactElement } from "react"

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
export function PredictionComparisonView(
    props: IPredictionComparisonViewProps,
): ReactElement {
    const selectedSnapshot =
        props.snapshots.find((snapshot): boolean => snapshot.id === props.activeSnapshotId)
        ?? props.snapshots[0]

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Prediction comparison view</p>
            <p className="mt-1 text-xs text-slate-500">
                Compare historical forecasts with what actually happened.
            </p>

            <div aria-label="Prediction comparison snapshots" className="mt-3 space-y-2">
                {props.snapshots.map((snapshot): ReactElement => {
                    const isActive = snapshot.id === selectedSnapshot?.id
                    return (
                        <button
                            aria-label={`Inspect prediction comparison ${snapshot.periodLabel}`}
                            className={`w-full rounded border p-2 text-left text-xs transition ${
                                isActive
                                    ? "border-cyan-400 bg-cyan-50 text-cyan-900"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                            }`}
                            key={snapshot.id}
                            onClick={(): void => {
                                props.onSelectSnapshot?.(snapshot)
                            }}
                            type="button"
                        >
                            {snapshot.periodLabel}: predicted {String(snapshot.predictedHotspots)}
                            , actual {String(snapshot.actualHotspots)}, accuracy{" "}
                            {String(snapshot.accuracyScore)}%
                        </button>
                    )
                })}
            </div>

            <div
                aria-label="Prediction comparison summary"
                className="mt-3 rounded border border-slate-200 bg-slate-50 p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What happened since prediction
                </p>
                <p className="mt-1 text-xs text-slate-700">
                    {selectedSnapshot === undefined
                        ? "No comparison snapshot selected."
                        : selectedSnapshot.summary}
                </p>
            </div>
        </section>
    )
}

