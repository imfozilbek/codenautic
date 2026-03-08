import { useState, type ReactElement } from "react"

import {
    exportKnowledgeMapAsPng,
    exportKnowledgeMapAsSvg,
    type IKnowledgeMapExportModel,
} from "@/components/graphs/knowledge-map-export"

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
    const [isPngExporting, setPngExporting] = useState<boolean>(false)
    const [lastExportLabel, setLastExportLabel] = useState<string>("")

    const handleSvgExport = (): void => {
        exportKnowledgeMapAsSvg(props.model)
        props.onExport?.("svg")
        setLastExportLabel("Exported knowledge map as SVG")
    }

    const handlePngExport = async (): Promise<void> => {
        if (isPngExporting) {
            return
        }

        setPngExporting(true)
        try {
            await exportKnowledgeMapAsPng(props.model)
            props.onExport?.("png")
            setLastExportLabel("Exported knowledge map as PNG")
        } finally {
            setPngExporting(false)
        }
    }

    return (
        <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Knowledge map export</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Export knowledge map snapshot for architecture documentation with legend and
                metadata.
            </p>

            <div
                aria-label="Knowledge map metadata"
                className="mt-3 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Metadata
                </p>
                <p className="mt-1 text-xs text-foreground">
                    Repository: {props.model.metadata.repositoryLabel}
                </p>
                <p className="text-xs text-foreground">
                    Metric: {props.model.metadata.metricLabel}
                </p>
                <p className="text-xs text-foreground">
                    Files: {String(props.model.metadata.totalFiles)} · Contributors:{" "}
                    {String(props.model.metadata.totalContributors)}
                </p>
            </div>

            <div
                aria-label="Knowledge map legend"
                className="mt-2 rounded border border-border bg-surface p-2"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Legend
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
                                {entry.ownerName} · files {String(entry.fileCount)}
                            </li>
                        )
                    })}
                    {props.model.districts.slice(0, 2).map((entry): ReactElement => {
                        return (
                            <li className="text-xs text-foreground" key={entry.districtLabel}>
                                {entry.districtLabel} · bus factor {String(entry.busFactor)} ·{" "}
                                {entry.riskLabel}
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    aria-label="Export knowledge map as SVG"
                    className="rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400"
                    onClick={handleSvgExport}
                    type="button"
                >
                    Export SVG
                </button>
                <button
                    aria-label="Export knowledge map as PNG"
                    className="rounded border border-cyan-300 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isPngExporting}
                    onClick={(): void => {
                        void handlePngExport()
                    }}
                    type="button"
                >
                    {isPngExporting ? "Exporting PNG..." : "Export PNG"}
                </button>
            </div>

            {lastExportLabel.length > 0 ? (
                <p className="mt-2 text-xs font-semibold text-success">{lastExportLabel}</p>
            ) : null}
        </section>
    )
}
