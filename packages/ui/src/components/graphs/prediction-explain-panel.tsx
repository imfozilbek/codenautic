import type { ReactElement } from "react"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"

/**
 * Элемент explain-панели для прогнозного hotspot.
 */
export interface IPredictionExplainPanelEntry {
    /** Идентификатор файла. */
    readonly fileId: string
    /** Отображаемый путь файла. */
    readonly label: string
    /** Уровень прогнозного риска. */
    readonly riskLevel: TCodeCityTreemapPredictionRiskLevel
    /** Confidence прогноза. */
    readonly confidenceScore: number
    /** Короткая причина прогноза. */
    readonly reason: string
    /** LLM-style объяснение прогноза. */
    readonly explanation: string
}

/**
 * Пропсы explain-панели.
 */
export interface IPredictionExplainPanelProps {
    /** Набор prediction entries для explain flow. */
    readonly entries: ReadonlyArray<IPredictionExplainPanelEntry>
    /** Активный файл в explain-панели. */
    readonly activeFileId?: string
    /** Callback выбора файла для explain-панели. */
    readonly onSelectEntry?: (entry: IPredictionExplainPanelEntry) => void
}

function resolveRiskLabel(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "High"
    }
    if (riskLevel === "medium") {
        return "Medium"
    }
    return "Low"
}

/**
 * Панель объяснения "почему файл станет hotspot".
 *
 * @param props Набор прогнозных entries и active selection.
 * @returns React-компонент explain-панели.
 */
export function PredictionExplainPanel(props: IPredictionExplainPanelProps): ReactElement {
    const selectedEntry =
        props.entries.find((entry): boolean => entry.fileId === props.activeFileId) ??
        props.entries[0]

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Prediction explain panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Click prediction entries to inspect why this file is forecasted as a hotspot.
            </p>

            <div aria-label="Prediction explain entries" className="mt-3 space-y-2">
                {props.entries.slice(0, 6).map((entry): ReactElement => {
                    const isActive = selectedEntry?.fileId === entry.fileId
                    const className = isActive
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-border bg-surface hover:border-border"
                    return (
                        <button
                            aria-label={`Inspect prediction explanation for ${entry.label}`}
                            className={`w-full rounded-lg border p-2 text-left transition ${className}`}
                            key={entry.fileId}
                            onClick={(): void => {
                                props.onSelectEntry?.(entry)
                            }}
                            type="button"
                        >
                            <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Risk {resolveRiskLabel(entry.riskLevel)} · Confidence{" "}
                                {String(entry.confidenceScore)}%
                            </p>
                        </button>
                    )
                })}
            </div>

            <div
                aria-label="Prediction explanation details"
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Why this file is predicted to become a hotspot
                </p>
                <p className="mt-1 text-xs text-foreground">
                    {selectedEntry === undefined
                        ? "No prediction selected."
                        : `${selectedEntry.reason}. ${selectedEntry.explanation}`}
                </p>
            </div>
        </section>
    )
}
