import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { ReportScheduleDialog } from "@/components/reports/report-schedule-dialog"
import { ReportTemplateEditor } from "@/components/reports/report-template-editor"
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TReportType = "architecture" | "delivery" | "quality"
type TReportFormat = "pdf" | "png" | "html"

interface IReportSectionOption {
    readonly id: string
    readonly label: string
}

interface IReportPreviewPayload {
    readonly type: TReportType
    readonly format: TReportFormat
    readonly sections: ReadonlyArray<string>
    readonly dateRange: {
        readonly startDate: string
        readonly endDate: string
    }
}

const REPORT_SECTION_OPTIONS: ReadonlyArray<IReportSectionOption> = [
    {
        id: "executive-summary",
        label: "Executive summary",
    },
    {
        id: "architecture-drift",
        label: "Architecture drift",
    },
    {
        id: "delivery-flow",
        label: "Delivery flow",
    },
    {
        id: "risk-hotspots",
        label: "Risk hotspots",
    },
]

function validateReportDateRange(startDate: string, endDate: string): string | undefined {
    if (startDate.length === 0 || endDate.length === 0) {
        return "Date range is required."
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) === true || Number.isNaN(end.getTime()) === true) {
        return "Date range format is invalid."
    }

    if (start.getTime() > end.getTime()) {
        return "Start date cannot be after end date."
    }

    return undefined
}

/**
 * Экран конфигурации отчётов с превью перед генерацией.
 *
 * @returns UI для настройки report type/sections/date range/format.
 */
export function ReportGeneratorPage(): ReactElement {
    const navigate = useNavigate()
    const [reportType, setReportType] = useState<TReportType>("architecture")
    const [reportFormat, setReportFormat] = useState<TReportFormat>("pdf")
    const [startDate, setStartDate] = useState<string>("2026-01-01")
    const [endDate, setEndDate] = useState<string>("2026-01-31")
    const [selectedSections, setSelectedSections] = useState<ReadonlyArray<string>>([
        "executive-summary",
        "risk-hotspots",
    ])
    const [previewStatus, setPreviewStatus] = useState<string>("No preview generated yet.")
    const [generationStatus, setGenerationStatus] = useState<string>("No report generated yet.")

    const selectedSectionLabels = useMemo((): ReadonlyArray<string> => {
        return REPORT_SECTION_OPTIONS.filter((option): boolean => {
            return selectedSections.includes(option.id)
        }).map((option): string => option.label)
    }, [selectedSections])
    const previewPayload = useMemo((): IReportPreviewPayload => {
        return {
            dateRange: {
                endDate,
                startDate,
            },
            format: reportFormat,
            sections: selectedSections,
            type: reportType,
        }
    }, [endDate, reportFormat, reportType, selectedSections, startDate])

    const handleSectionToggle = (sectionId: string): void => {
        setSelectedSections((currentSections): ReadonlyArray<string> => {
            if (currentSections.includes(sectionId) === true) {
                return currentSections.filter((section): boolean => section !== sectionId)
            }
            return [...currentSections, sectionId]
        })
    }
    const handlePreviewReport = (): void => {
        const dateRangeError = validateReportDateRange(startDate, endDate)
        if (dateRangeError !== undefined) {
            setPreviewStatus(`Preview blocked: ${dateRangeError}`)
            showToastError("Report preview blocked.")
            return
        }
        if (selectedSections.length === 0) {
            setPreviewStatus("Preview blocked: select at least one report section.")
            showToastError("Report preview blocked.")
            return
        }

        setPreviewStatus(
            `Preview ready: ${reportType} report from ${startDate} to ${endDate} in ${reportFormat.toUpperCase()}.`,
        )
        showToastInfo("Report preview generated.")
    }
    const handleGenerateReport = (): void => {
        const dateRangeError = validateReportDateRange(startDate, endDate)
        if (dateRangeError !== undefined) {
            setGenerationStatus(`Generation blocked: ${dateRangeError}`)
            showToastError("Report generation blocked.")
            return
        }
        if (selectedSections.length === 0) {
            setGenerationStatus("Generation blocked: select at least one report section.")
            showToastError("Report generation blocked.")
            return
        }

        setGenerationStatus(
            `Report generation queued for ${reportType} (${reportFormat.toUpperCase()}) with ${String(
                selectedSections.length,
            )} sections.`,
        )
        showToastSuccess("Report generation started.")
    }
    const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setStartDate(event.currentTarget.value)
    }
    const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setEndDate(event.currentTarget.value)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Report generator</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Configure report type, sections, date range and output format before generation.
            </p>
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="flat"
                    onPress={(): void => {
                        void navigate({
                            to: "/reports",
                        })
                    }}
                >
                    Open reports list
                </Button>
                <Button
                    size="sm"
                    variant="flat"
                    onPress={(): void => {
                        void navigate({
                            to: "/reports/viewer",
                        })
                    }}
                >
                    Open latest report
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Report configuration
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">
                                Report type
                            </span>
                            <select
                                aria-label="Report type"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                value={reportType}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "architecture"
                                        || nextValue === "delivery"
                                        || nextValue === "quality"
                                    ) {
                                        setReportType(nextValue)
                                    }
                                }}
                            >
                                <option value="architecture">architecture</option>
                                <option value="delivery">delivery</option>
                                <option value="quality">quality</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">
                                Output format
                            </span>
                            <select
                                aria-label="Report format"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                value={reportFormat}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (nextValue === "pdf" || nextValue === "png" || nextValue === "html") {
                                        setReportFormat(nextValue)
                                    }
                                }}
                            >
                                <option value="pdf">pdf</option>
                                <option value="png">png</option>
                                <option value="html">html</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">Start date</span>
                            <input
                                aria-label="Report date range start"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">End date</span>
                            <input
                                aria-label="Report date range end"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                            />
                        </label>
                    </div>
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-[var(--foreground)]">
                            Report sections
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {REPORT_SECTION_OPTIONS.map((section): ReactElement => (
                                <label
                                    className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900"
                                    key={section.id}
                                >
                                    <input
                                        aria-label={`Report section ${section.id}`}
                                        checked={selectedSections.includes(section.id)}
                                        type="checkbox"
                                        onChange={(): void => {
                                            handleSectionToggle(section.id)
                                        }}
                                    />
                                    <span>{section.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="flex gap-2">
                        <Button onPress={handlePreviewReport}>Preview report</Button>
                        <Button variant="flat" onPress={handleGenerateReport}>
                            Generate report
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <ReportScheduleDialog />
            <ReportTemplateEditor />

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Report preview
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Alert color="primary" title="Preview status" variant="flat">
                        {previewStatus}
                    </Alert>
                    {selectedSectionLabels.length === 0 ? (
                        <Alert color="warning" title="Selected sections" variant="flat">
                            Select at least one section to build preview.
                        </Alert>
                    ) : (
                        <ul aria-label="Selected report sections" className="space-y-1 text-sm">
                            {selectedSectionLabels.map((label): ReactElement => (
                                <li key={label}>{label}</li>
                            ))}
                        </ul>
                    )}
                    <pre
                        aria-label="Report preview payload"
                        className="max-h-56 overflow-auto rounded border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100"
                    >
                        {JSON.stringify(previewPayload, null, 2)}
                    </pre>
                    <Alert color="success" title="Generation status" variant="flat">
                        {generationStatus}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
