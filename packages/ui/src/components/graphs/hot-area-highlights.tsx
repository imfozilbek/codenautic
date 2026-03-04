import type { ReactElement } from "react"

/**
 * Уровень критичности hot area.
 */
export type THotAreaSeverity = "critical" | "high" | "medium"

/**
 * Дескриптор hot area для подсветки.
 */
export interface IHotAreaHighlightDescriptor {
    /** Идентификатор файла/района. */
    readonly fileId: string
    /** Короткий label. */
    readonly label: string
    /** Короткое пояснение причины риска. */
    readonly description: string
    /** Критичность зоны. */
    readonly severity: THotAreaSeverity
}

/**
 * Пропсы панели hot area highlights.
 */
export interface IHotAreaHighlightsProps {
    /** Набор зон для подсветки. */
    readonly highlights: ReadonlyArray<IHotAreaHighlightDescriptor>
    /** Callback фокуса на выбранной зоне. */
    readonly onFocusHotArea?: (highlight: IHotAreaHighlightDescriptor) => void
}

/**
 * Определяет цветовую схему severity-бейджа.
 *
 * @param severity Уровень критичности.
 * @returns Tailwind CSS class names.
 */
function resolveSeverityClassName(severity: THotAreaSeverity): string {
    if (severity === "critical") {
        return "border-rose-300 bg-rose-500/15 text-rose-800"
    }
    if (severity === "high") {
        return "border-amber-300 bg-amber-500/15 text-amber-900"
    }
    return "border-sky-300 bg-sky-500/15 text-sky-800"
}

/**
 * Виджет hot area highlights: пульсирующие зоны + поясняющие labels.
 *
 * @param props Список зон и callback фокуса.
 * @returns React-компонент виджета.
 */
export function HotAreaHighlights(props: IHotAreaHighlightsProps): ReactElement {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Hot area highlights</p>
            <p className="mt-1 text-xs text-slate-500">
                Critical city zones with short diagnostics labels.
            </p>
            <ul className="mt-3 space-y-2">
                {props.highlights.map((highlight): ReactElement => (
                    <li
                        className="rounded border border-slate-200 bg-slate-50 p-2"
                        key={highlight.fileId}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full animate-pulse ${highlight.severity === "critical" ? "bg-rose-500" : highlight.severity === "high" ? "bg-amber-500" : "bg-sky-500"}`}
                                    />
                                    <span className="truncate">{highlight.label}</span>
                                </p>
                                <p className="mt-1 text-xs text-slate-600">{highlight.description}</p>
                            </div>
                            <span
                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveSeverityClassName(highlight.severity)}`}
                            >
                                {highlight.severity}
                            </span>
                        </div>
                        <button
                            aria-label={`Focus hot area ${highlight.label}`}
                            className="mt-2 rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                            onClick={(): void => {
                                props.onFocusHotArea?.(highlight)
                            }}
                            type="button"
                        >
                            Focus in city
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    )
}
