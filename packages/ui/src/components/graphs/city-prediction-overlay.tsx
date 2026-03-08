import type { ReactElement } from "react"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"

/**
 * Элемент prediction overlay на уровне файла.
 */
export interface ICityPredictionOverlayEntry {
    /** Идентификатор файла. */
    readonly fileId: string
    /** Лейбл файла в списке hotspot-ов. */
    readonly label: string
    /** Прогнозный уровень риска. */
    readonly riskLevel: TCodeCityTreemapPredictionRiskLevel
    /** Confidence прогноза в процентах. */
    readonly confidenceScore: number
    /** Короткая причина прогноза. */
    readonly reason: string
}

/**
 * Пропсы prediction overlay для CodeCity.
 */
export interface ICityPredictionOverlayProps {
    /** Набор прогнозных hotspots. */
    readonly entries: ReadonlyArray<ICityPredictionOverlayEntry>
    /** Активный hotspot. */
    readonly activeFileId?: string
    /** Callback выбора hotspot. */
    readonly onSelectEntry?: (entry: ICityPredictionOverlayEntry) => void
}

function resolveRiskBadgeClassName(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "border-danger/40 bg-danger/20 text-danger"
    }
    if (riskLevel === "medium") {
        return "border-amber-300 bg-warning/20 text-amber-900"
    }
    return "border-sky-300 bg-sky-500/20 text-sky-900"
}

function resolveRiskLabel(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "High risk forecast"
    }
    if (riskLevel === "medium") {
        return "Medium risk forecast"
    }
    return "Low risk forecast"
}

function resolveRowClassName(
    isActive: boolean,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): string {
    const baseClassName = isActive
        ? "border-cyan-400 bg-cyan-50"
        : "border-border bg-surface hover:border-border"
    const dashedClassName = riskLevel === "high" ? "border-dashed" : ""

    return ["w-full rounded-lg border p-2 text-left transition", baseClassName, dashedClassName]
        .filter((entry): boolean => entry.length > 0)
        .join(" ")
}

/**
 * Prediction overlay: показывает прогнозные hotspots и позволяет сфокусировать файл в CodeCity.
 *
 * @param props Набор prediction entries и callback выбора.
 * @returns React-компонент prediction overlay.
 */
export function CityPredictionOverlay(props: ICityPredictionOverlayProps): ReactElement {
    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Prediction overlay</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Predicted hotspots are outlined on buildings. High-risk forecasts use dashed
                borders.
            </p>

            <ul aria-label="Prediction hotspots" className="mt-3 space-y-2">
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeFileId === entry.fileId
                    const riskLabel = resolveRiskLabel(entry.riskLevel)

                    return (
                        <li key={entry.fileId}>
                            <button
                                aria-label={`Inspect prediction hotspot ${entry.label}`}
                                className={resolveRowClassName(isActive, entry.riskLevel)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {entry.label}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Confidence {String(entry.confidenceScore)}% ·{" "}
                                            {entry.reason}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveRiskBadgeClassName(entry.riskLevel)}`}
                                    >
                                        {riskLabel}
                                    </span>
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
