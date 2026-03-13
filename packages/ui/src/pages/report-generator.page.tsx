import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { ReportScheduleDialog } from "@/components/reports/report-schedule-dialog"
import { ReportTemplateEditor } from "@/components/reports/report-template-editor"
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TReportType = "architecture" | "delivery" | "quality"
type TReportFormat = "pdf" | "png" | "html"

interface IReportSectionOption {
    readonly id: string
    readonly labelKey: string
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
        labelKey: "reports:generator.sectionExecutiveSummary",
    },
    {
        id: "architecture-drift",
        labelKey: "reports:generator.sectionArchitectureDrift",
    },
    {
        id: "delivery-flow",
        labelKey: "reports:generator.sectionDeliveryFlow",
    },
    {
        id: "risk-hotspots",
        labelKey: "reports:generator.sectionRiskHotspots",
    },
]

/**
 * Экран конфигурации отчётов с превью перед генерацией.
 *
 * @returns UI для настройки report type/sections/date range/format.
 */
export function ReportGeneratorPage(): ReactElement {
    const { t } = useTranslation(["reports"])
    const navigate = useNavigate()
    const [reportType, setReportType] = useState<TReportType>("architecture")
    const [reportFormat, setReportFormat] = useState<TReportFormat>("pdf")
    const [startDate, setStartDate] = useState<string>("2026-01-01")
    const [endDate, setEndDate] = useState<string>("2026-01-31")
    const [selectedSections, setSelectedSections] = useState<ReadonlyArray<string>>([
        "executive-summary",
        "risk-hotspots",
    ])
    const [previewStatus, setPreviewStatus] = useState<string>(
        t("reports:generator.noPreviewYet"),
    )
    const [generationStatus, setGenerationStatus] = useState<string>(
        t("reports:generator.noReportYet"),
    )

    const selectedSectionLabels = useMemo((): ReadonlyArray<string> => {
        return REPORT_SECTION_OPTIONS.filter((option): boolean => {
            return selectedSections.includes(option.id)
        }).map(
            (option): string =>
                (t as unknown as (key: string) => string)(option.labelKey),
        )
    }, [selectedSections, t])
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

    const validateDateRange = (start: string, end: string): string | undefined => {
        if (start.length === 0 || end.length === 0) {
            return t("reports:generator.dateRangeRequired")
        }

        const startTime = new Date(start)
        const endTime = new Date(end)
        if (
            Number.isNaN(startTime.getTime()) === true ||
            Number.isNaN(endTime.getTime()) === true
        ) {
            return t("reports:generator.dateRangeInvalid")
        }

        if (startTime.getTime() > endTime.getTime()) {
            return t("reports:generator.startAfterEnd")
        }

        return undefined
    }

    const handleSectionToggle = (sectionId: string): void => {
        setSelectedSections((currentSections): ReadonlyArray<string> => {
            if (currentSections.includes(sectionId) === true) {
                return currentSections.filter((section): boolean => section !== sectionId)
            }
            return [...currentSections, sectionId]
        })
    }
    const handlePreviewReport = (): void => {
        const dateRangeError = validateDateRange(startDate, endDate)
        if (dateRangeError !== undefined) {
            setPreviewStatus(
                (t as unknown as (key: string, options: Record<string, string>) => string)(
                    "reports:generator.previewBlocked",
                    { error: dateRangeError },
                ),
            )
            showToastError(t("reports:generator.previewBlockedToast"))
            return
        }
        if (selectedSections.length === 0) {
            setPreviewStatus(t("reports:generator.previewBlockedNoSections"))
            showToastError(t("reports:generator.previewBlockedToast"))
            return
        }

        setPreviewStatus(
            (t as unknown as (key: string, options: Record<string, string>) => string)(
                "reports:generator.previewReady",
                {
                    end: endDate,
                    format: reportFormat.toUpperCase(),
                    start: startDate,
                    type: reportType,
                },
            ),
        )
        showToastInfo(t("reports:generator.previewGeneratedToast"))
    }
    const handleGenerateReport = (): void => {
        const dateRangeError = validateDateRange(startDate, endDate)
        if (dateRangeError !== undefined) {
            setGenerationStatus(
                (t as unknown as (key: string, options: Record<string, string>) => string)(
                    "reports:generator.generationBlocked",
                    { error: dateRangeError },
                ),
            )
            showToastError(t("reports:generator.generationBlockedToast"))
            return
        }
        if (selectedSections.length === 0) {
            setGenerationStatus(t("reports:generator.generationBlockedNoSections"))
            showToastError(t("reports:generator.generationBlockedToast"))
            return
        }

        setGenerationStatus(
            (t as unknown as (key: string, options: Record<string, string>) => string)(
                "reports:generator.generationQueued",
                {
                    count: String(selectedSections.length),
                    format: reportFormat.toUpperCase(),
                    type: reportType,
                },
            ),
        )
        showToastSuccess(t("reports:generator.generationStartedToast"))
    }
    const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setStartDate(event.currentTarget.value)
    }
    const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setEndDate(event.currentTarget.value)
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("reports:generator.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("reports:generator.pageSubtitle")}
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
                    {t("reports:generator.openReportsList")}
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
                    {t("reports:generator.openLatestReport")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:generator.configurationTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:generator.reportTypeLabel")}
                            </span>
                            <select
                                aria-label={t("reports:generator.reportTypeLabel")}
                                className={NATIVE_FORM.select}
                                value={reportType}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "architecture" ||
                                        nextValue === "delivery" ||
                                        nextValue === "quality"
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
                            <span className="font-semibold text-foreground">
                                {t("reports:generator.outputFormatLabel")}
                            </span>
                            <select
                                aria-label={t("reports:generator.outputFormatLabel")}
                                className={NATIVE_FORM.select}
                                value={reportFormat}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "pdf" ||
                                        nextValue === "png" ||
                                        nextValue === "html"
                                    ) {
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
                            <span className="font-semibold text-foreground">
                                {t("reports:generator.startDateLabel")}
                            </span>
                            <input
                                aria-label={t("reports:generator.startDateLabel")}
                                className={`w-full rounded border border-border bg-surface px-2 py-1 ${TYPOGRAPHY.body}`}
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:generator.endDateLabel")}
                            </span>
                            <input
                                aria-label={t("reports:generator.endDateLabel")}
                                className={`w-full rounded border border-border bg-surface px-2 py-1 ${TYPOGRAPHY.body}`}
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                            />
                        </label>
                    </div>
                    <fieldset className="space-y-2">
                        <legend className={TYPOGRAPHY.cardTitle}>
                            {t("reports:generator.reportSectionsLegend")}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {REPORT_SECTION_OPTIONS.map(
                                (section): ReactElement => (
                                    <label
                                        className={`flex items-center gap-2 rounded border border-border bg-surface px-2 py-1 ${TYPOGRAPHY.body}`}
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
                                        <span>
                                            {(t as unknown as (key: string) => string)(
                                                section.labelKey,
                                            )}
                                        </span>
                                    </label>
                                ),
                            )}
                        </div>
                    </fieldset>
                    <div className="flex gap-2">
                        <Button onPress={handlePreviewReport}>
                            {t("reports:generator.previewReport")}
                        </Button>
                        <Button variant="flat" onPress={handleGenerateReport}>
                            {t("reports:generator.generateReport")}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <ReportScheduleDialog />
            <ReportTemplateEditor />

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:generator.previewTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Alert
                        color="primary"
                        title={t("reports:generator.previewStatusTitle")}
                        variant="flat"
                    >
                        {previewStatus}
                    </Alert>
                    {selectedSectionLabels.length === 0 ? (
                        <Alert
                            color="warning"
                            title={t("reports:generator.selectedSectionsTitle")}
                            variant="flat"
                        >
                            {t("reports:generator.selectAtLeastOneSection")}
                        </Alert>
                    ) : (
                        <ul aria-label="Selected report sections" className="space-y-1 text-sm">
                            {selectedSectionLabels.map(
                                (label): ReactElement => (
                                    <li key={label}>{label}</li>
                                ),
                            )}
                        </ul>
                    )}
                    <pre
                        aria-label="Report preview payload"
                        className="max-h-56 overflow-auto rounded border border-border bg-code-surface p-3 text-xs text-foreground"
                    >
                        {JSON.stringify(previewPayload, null, 2)}
                    </pre>
                    <Alert
                        color="success"
                        title={t("reports:generator.generationStatusTitle")}
                        variant="flat"
                    >
                        {generationStatus}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
