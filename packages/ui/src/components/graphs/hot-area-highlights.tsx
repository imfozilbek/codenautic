import type { ReactElement } from "react"

import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        return "border-danger/40 bg-danger/15 text-danger"
    }
    if (severity === "high") {
        return "border-warning/40 bg-warning/15 text-on-warning"
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
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Hot area highlights</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Critical city zones with short diagnostics labels.
            </p>
            <ul className="mt-3 space-y-2">
                {props.highlights.map(
                    (highlight): ReactElement => (
                        <li
                            className="rounded border border-border bg-surface p-2"
                            key={highlight.fileId}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <span
                                            className={`inline-block h-2 w-2 rounded-full animate-pulse ${highlight.severity === "critical" ? "bg-danger" : highlight.severity === "high" ? "bg-warning" : "bg-sky-500"}`}
                                        />
                                        <span className="truncate">{highlight.label}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {highlight.description}
                                    </p>
                                </div>
                                <span
                                    className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveSeverityClassName(highlight.severity)}`}
                                >
                                    {highlight.severity}
                                </span>
                            </div>
                            <button
                                aria-label={`Focus hot area ${highlight.label}`}
                                className="mt-2 rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                                onClick={(): void => {
                                    props.onFocusHotArea?.(highlight)
                                }}
                                type="button"
                            >
                                Focus in city
                            </button>
                        </li>
                    ),
                )}
            </ul>
        </section>
    )
}
