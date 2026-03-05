import type { ReactElement } from "react"

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
        return "border-emerald-200 bg-emerald-50 text-emerald-800"
    }
    if (delta > 0) {
        return "border-rose-200 bg-rose-50 text-rose-800"
    }
    return "border-slate-200 bg-slate-100 text-slate-700"
}

/**
 * Side-by-side sprint comparison view для before/after CodeCity среза.
 *
 * @param props Snapshot-модель и callback выбора.
 * @returns React-компонент sprint comparison.
 */
export function SprintComparisonView(props: ISprintComparisonViewProps): ReactElement {
    const selectedSnapshot =
        props.snapshots.find((snapshot): boolean => snapshot.id === props.activeSnapshotId)
        ?? props.snapshots[0]

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Sprint comparison view</p>
            <p className="mt-1 text-xs text-slate-500">
                Side-by-side before/after sprint comparison with metric deltas and improvement
                score.
            </p>

            <div aria-label="Sprint comparison snapshots" className="mt-3 space-y-2">
                {props.snapshots.map((snapshot): ReactElement => {
                    const isActive = snapshot.id === selectedSnapshot?.id
                    return (
                        <button
                            aria-label={`Inspect sprint comparison ${snapshot.title}`}
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
                            {snapshot.title} · improvement {String(snapshot.improvementScore)}%
                        </button>
                    )
                })}
            </div>

            <div
                aria-label="Sprint comparison metrics"
                className="mt-3 rounded border border-slate-200 bg-slate-50 p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Before vs after metrics
                </p>
                <div className="mt-2 space-y-2">
                    {(selectedSnapshot?.metrics ?? []).map((metric): ReactElement => {
                        const delta = metric.afterValue - metric.beforeValue
                        const progressWidth = Math.max(
                            8,
                            Math.min(100, Math.round((metric.afterValue / Math.max(metric.beforeValue, 1)) * 100)),
                        )
                        return (
                            <div key={metric.label}>
                                <div className="flex items-center justify-between gap-2 text-xs">
                                    <p className="font-semibold text-slate-800">{metric.label}</p>
                                    <p className={`rounded border px-1 py-0.5 ${resolveDeltaClassName(delta)}`}>
                                        {delta > 0 ? "+" : ""}
                                        {String(delta)}
                                    </p>
                                </div>
                                <p className="mt-1 text-xs text-slate-600">
                                    before {String(metric.beforeValue)} to after{" "}
                                    {String(metric.afterValue)}
                                </p>
                                <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200">
                                    <div
                                        className="h-full rounded bg-cyan-500 transition-all duration-500"
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
