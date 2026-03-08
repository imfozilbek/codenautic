import type { ReactElement } from "react"

/**
 * Sparkline по одной метрике.
 */
export interface ITrendTimelineSparklineMetric {
    /** Название метрики. */
    readonly label: string
    /** Значения метрики по точкам timeline. */
    readonly points: ReadonlyArray<number>
}

/**
 * Элемент sprint timeline.
 */
export interface ITrendTimelineEntry {
    /** Идентификатор sprint entry. */
    readonly id: string
    /** Название sprint. */
    readonly sprintLabel: string
    /** Короткий период entry. */
    readonly startedAt: string
    /** Краткая интерпретация тренда. */
    readonly summary: string
    /** Sparkline-метрики. */
    readonly metrics: ReadonlyArray<ITrendTimelineSparklineMetric>
    /** Файл-фокус для navigation. */
    readonly focusFileId?: string
    /** Навигационная цепочка для CodeCity. */
    readonly focusFileIds: ReadonlyArray<string>
}

/**
 * Пропсы trend timeline widget.
 */
export interface ITrendTimelineWidgetProps {
    /** Sprint timeline entries. */
    readonly entries: ReadonlyArray<ITrendTimelineEntry>
    /** Активный sprint entry. */
    readonly activeEntryId?: string
    /** Callback выбора entry. */
    readonly onSelectEntry?: (entry: ITrendTimelineEntry) => void
}

function resolveEntryClassName(isActive: boolean): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-50"
        : "border-border bg-surface hover:border-border"
    return `w-full rounded-lg border p-2 text-left transition ${baseClassName}`
}

function resolveSparklinePoints(points: ReadonlyArray<number>): string {
    if (points.length === 0) {
        return ""
    }

    const maxValue = Math.max(...points)
    const minValue = Math.min(...points)
    const span = Math.max(maxValue - minValue, 1)
    return points
        .map((point, index): string => {
            const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
            const normalized = (point - minValue) / span
            const y = 100 - normalized * 100
            return `${x.toFixed(2)},${y.toFixed(2)}`
        })
        .join(" ")
}

/**
 * Trend timeline widget: sprint-over-sprint тренды со sparkline-метриками.
 *
 * @param props Набор timeline entries и callback выбора sprint.
 * @returns React-компонент timeline.
 */
export function TrendTimelineWidget(props: ITrendTimelineWidgetProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Trend timeline widget</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Sprint-over-sprint trends with sparklines. Click a sprint to open detailed
                comparison.
            </p>

            <ul aria-label="Trend timeline entries" className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeEntryId === entry.id
                    return (
                        <li key={entry.id}>
                            <button
                                aria-label={`Inspect trend timeline sprint ${entry.sprintLabel}`}
                                className={resolveEntryClassName(isActive)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {entry.sprintLabel}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {entry.startedAt}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {entry.summary}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                                    {entry.metrics.map((metric): ReactElement => {
                                        return (
                                            <div
                                                className="rounded border border-border bg-white p-1.5"
                                                key={metric.label}
                                            >
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {metric.label}
                                                </p>
                                                <svg
                                                    aria-label={`${metric.label} sparkline`}
                                                    className="mt-1 h-8 w-full"
                                                    role="img"
                                                    viewBox="0 0 100 100"
                                                >
                                                    <polyline
                                                        fill="none"
                                                        points={resolveSparklinePoints(
                                                            metric.points,
                                                        )}
                                                        stroke="currentColor"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="4"
                                                        vectorEffect="non-scaling-stroke"
                                                    />
                                                </svg>
                                            </div>
                                        )
                                    })}
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
