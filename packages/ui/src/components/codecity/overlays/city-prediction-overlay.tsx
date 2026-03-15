import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/codecity/codecity-treemap"
import { useDynamicTranslation } from "@/lib/i18n"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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
        return "border-warning/40 bg-warning/20 text-warning-foreground"
    }
    return "border-sky-300 bg-sky-500/20 text-sky-900"
}

function resolveRiskLabelKey(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "code-city:cityPrediction.highRisk"
    }
    if (riskLevel === "medium") {
        return "code-city:cityPrediction.mediumRisk"
    }
    return "code-city:cityPrediction.lowRisk"
}

function resolveRowClassName(
    isActive: boolean,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): string {
    const baseClassName = isActive
        ? "border-accent bg-accent/10"
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
    const { t } = useTranslation(["code-city"])
    const { td } = useDynamicTranslation(["code-city"])
    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:cityPrediction.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:cityPrediction.description")}
            </p>

            <ul
                aria-label={t("code-city:cityPrediction.ariaLabelHotspots")}
                className="mt-3 space-y-2"
            >
                {props.entries.map((entry): ReactElement => {
                    const isActive = props.activeFileId === entry.fileId
                    const riskLabel = td(resolveRiskLabelKey(entry.riskLevel))

                    return (
                        <li key={entry.fileId}>
                            <button
                                aria-label={t("code-city:cityPrediction.ariaLabelInspect", {
                                    label: entry.label,
                                })}
                                className={resolveRowClassName(isActive, entry.riskLevel)}
                                onClick={(): void => {
                                    props.onSelectEntry?.(entry)
                                }}
                                type="button"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`truncate ${TYPOGRAPHY.cardTitle}`}>
                                            {entry.label}
                                        </p>
                                        <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                            {t("code-city:cityPrediction.confidence", {
                                                score: String(entry.confidenceScore),
                                                reason: entry.reason,
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded border px-2 py-0.5 ${TYPOGRAPHY.micro} ${resolveRiskBadgeClassName(entry.riskLevel)}`}
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
