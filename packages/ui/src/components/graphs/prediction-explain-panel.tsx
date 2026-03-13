import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import type { TCodeCityTreemapPredictionRiskLevel } from "@/components/graphs/codecity-treemap"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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

function resolveRiskLabelKey(riskLevel: TCodeCityTreemapPredictionRiskLevel): string {
    if (riskLevel === "high") {
        return "code-city:predictionExplain.riskHigh"
    }
    if (riskLevel === "medium") {
        return "code-city:predictionExplain.riskMedium"
    }
    return "code-city:predictionExplain.riskLow"
}

/**
 * Панель объяснения "почему файл станет hotspot".
 *
 * @param props Набор прогнозных entries и active selection.
 * @returns React-компонент explain-панели.
 */
export function PredictionExplainPanel(props: IPredictionExplainPanelProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const selectedEntry =
        props.entries.find((entry): boolean => entry.fileId === props.activeFileId) ??
        props.entries[0]

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:predictionExplain.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:predictionExplain.description")}
            </p>

            <div aria-label={t("code-city:predictionExplain.ariaLabelEntries")} className="mt-3 space-y-2">
                {props.entries.slice(0, 6).map((entry): ReactElement => {
                    const isActive = selectedEntry?.fileId === entry.fileId
                    const className = isActive
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:border-border"
                    return (
                        <button
                            aria-label={t("code-city:predictionExplain.ariaLabelInspect", { label: entry.label })}
                            className={`w-full rounded-lg border p-2 text-left transition ${className}`}
                            key={entry.fileId}
                            onClick={(): void => {
                                props.onSelectEntry?.(entry)
                            }}
                            type="button"
                        >
                            <p className={TYPOGRAPHY.cardTitle}>{entry.label}</p>
                            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                {t("code-city:predictionExplain.riskAndConfidence", { risk: (t as unknown as (key: string) => string)(resolveRiskLabelKey(entry.riskLevel)), confidence: String(entry.confidenceScore) })}
                            </p>
                        </button>
                    )
                })}
            </div>

            <div
                aria-label={t("code-city:predictionExplain.ariaLabelDetails")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("code-city:predictionExplain.whyHotspot")}
                </p>
                <p className="mt-1 text-xs text-foreground">
                    {selectedEntry === undefined
                        ? t("code-city:predictionExplain.noSelection")
                        : `${selectedEntry.reason}. ${selectedEntry.explanation}`}
                </p>
            </div>
        </section>
    )
}
