import { useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import {
    exportKnowledgeMapAsPng,
    exportKnowledgeMapAsSvg,
    type IKnowledgeMapExportModel,
} from "@/components/graphs/knowledge-map-export"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Формат экспорта knowledge map.
 */
export type TKnowledgeMapExportFormat = "svg" | "png"

/**
 * Пропсы knowledge map export widget.
 */
export interface IKnowledgeMapExportWidgetProps {
    /** Snapshot модель для export payload. */
    readonly model: IKnowledgeMapExportModel
    /** Callback завершенного экспорта. */
    readonly onExport?: (format: TKnowledgeMapExportFormat) => void
}

/**
 * Виджет экспорта knowledge map (PNG/SVG) с legend и metadata preview.
 *
 * @param props Snapshot-модель и callback после экспорта.
 * @returns React-компонент knowledge map export.
 */
export function KnowledgeMapExportWidget(props: IKnowledgeMapExportWidgetProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [isPngExporting, setPngExporting] = useState<boolean>(false)
    const [lastExportLabel, setLastExportLabel] = useState<string>("")

    const handleSvgExport = (): void => {
        exportKnowledgeMapAsSvg(props.model)
        props.onExport?.("svg")
        setLastExportLabel(t("code-city:knowledgeMapExportComp.exportedSvg"))
    }

    const handlePngExport = async (): Promise<void> => {
        if (isPngExporting) {
            return
        }

        setPngExporting(true)
        try {
            await exportKnowledgeMapAsPng(props.model)
            props.onExport?.("png")
            setLastExportLabel(t("code-city:knowledgeMapExportComp.exportedPng"))
        } finally {
            setPngExporting(false)
        }
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:knowledgeMapExportComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:knowledgeMapExportComp.description")}
            </p>

            <div
                aria-label={t("code-city:knowledgeMapExportComp.ariaMetadata")}
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className={TYPOGRAPHY.overline}>
                    {t("code-city:knowledgeMapExportComp.metadata")}
                </p>
                <p className="mt-1 text-xs text-foreground">
                    {t("code-city:knowledgeMapExportComp.repository", { name: props.model.metadata.repositoryLabel })}
                </p>
                <p className="text-xs text-foreground">
                    {t("code-city:knowledgeMapExportComp.metric", { name: props.model.metadata.metricLabel })}
                </p>
                <p className="text-xs text-foreground">
                    {t("code-city:knowledgeMapExportComp.filesContributors", { files: props.model.metadata.totalFiles, contributors: props.model.metadata.totalContributors })}
                </p>
            </div>

            <div
                aria-label={t("code-city:knowledgeMapExportComp.ariaLegend")}
                className="mt-2 rounded border border-border bg-surface p-2"
            >
                <p className={TYPOGRAPHY.overline}>
                    {t("code-city:knowledgeMapExportComp.legend")}
                </p>
                <ul className="mt-1 space-y-1">
                    {props.model.owners.slice(0, 3).map((entry): ReactElement => {
                        return (
                            <li
                                className="flex items-center gap-2 text-xs text-foreground"
                                key={entry.ownerName}
                            >
                                <span
                                    aria-hidden={true}
                                    className="inline-flex h-3 w-3 rounded-full border border-border"
                                    style={{ backgroundColor: entry.color }}
                                />
                                {t("code-city:knowledgeMapExportComp.ownerFiles", { owner: entry.ownerName, count: entry.fileCount })}
                            </li>
                        )
                    })}
                    {props.model.districts.slice(0, 2).map((entry): ReactElement => {
                        return (
                            <li className="text-xs text-foreground" key={entry.districtLabel}>
                                {t("code-city:knowledgeMapExportComp.districtInfo", { district: entry.districtLabel, busFactor: entry.busFactor, riskLabel: entry.riskLabel })}
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    aria-label={t("code-city:knowledgeMapExportComp.ariaExportSvg")}
                    className="rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary"
                    onClick={handleSvgExport}
                    type="button"
                >
                    {t("code-city:knowledgeMapExportComp.exportSvg")}
                </button>
                <button
                    aria-label={t("code-city:knowledgeMapExportComp.ariaExportPng")}
                    className="rounded border border-primary/40 bg-primary/20 px-2 py-1 text-xs font-semibold text-on-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isPngExporting}
                    onClick={(): void => {
                        void handlePngExport()
                    }}
                    type="button"
                >
                    {isPngExporting ? t("code-city:knowledgeMapExportComp.exportingPng") : t("code-city:knowledgeMapExportComp.exportPng")}
                </button>
            </div>

            {lastExportLabel.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-success">{lastExportLabel}</p>
            ) : null}
        </section>
    )
}
