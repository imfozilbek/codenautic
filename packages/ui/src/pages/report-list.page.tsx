import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TReportType = "architecture" | "delivery" | "quality"
type TReportStatus = "completed" | "queued" | "failed"

interface IGeneratedReport {
    readonly id: string
    readonly title: string
    readonly type: TReportType
    readonly generatedAt: string
    readonly status: TReportStatus
}

const INITIAL_REPORTS: ReadonlyArray<IGeneratedReport> = [
    {
        generatedAt: "2026-03-01",
        id: "report-001",
        status: "completed",
        title: "Architecture Weekly Snapshot",
        type: "architecture",
    },
    {
        generatedAt: "2026-03-03",
        id: "report-002",
        status: "completed",
        title: "Delivery Throughput Pulse",
        type: "delivery",
    },
    {
        generatedAt: "2026-03-05",
        id: "report-003",
        status: "failed",
        title: "Quality Regression Radar",
        type: "quality",
    },
    {
        generatedAt: "2026-03-06",
        id: "report-004",
        status: "queued",
        title: "Architecture Drift Mid-Sprint",
        type: "architecture",
    },
]

function resolveReportStatusBadgeClass(status: TReportStatus): string {
    if (status === "completed") {
        return "border-success/40 bg-success/10 text-success"
    }
    if (status === "queued") {
        return "border-warning/40 bg-warning/10 text-warning"
    }
    return "border-danger/40 bg-danger/10 text-danger"
}

/**
 * Список сгенерированных отчётов с фильтрами и lifecycle действиями.
 *
 * @returns UI со списком, фильтрами, status badges и delete/regenerate actions.
 */
export function ReportListPage(): ReactElement {
    const { t } = useTranslation(["reports"])
    const navigate = useNavigate()
    const [reportTypeFilter, setReportTypeFilter] = useState<TReportType | "all">("all")
    const [dateFrom, setDateFrom] = useState<string>("")
    const [dateTo, setDateTo] = useState<string>("")
    const [reports, setReports] = useState<ReadonlyArray<IGeneratedReport>>(INITIAL_REPORTS)
    const [actionStatus, setActionStatus] = useState<string>(t("reports:list.noActionYet"))

    const filteredReports = useMemo((): ReadonlyArray<IGeneratedReport> => {
        return reports.filter((report): boolean => {
            if (reportTypeFilter !== "all" && report.type !== reportTypeFilter) {
                return false
            }

            if (dateFrom.length > 0 && report.generatedAt < dateFrom) {
                return false
            }
            if (dateTo.length > 0 && report.generatedAt > dateTo) {
                return false
            }

            return true
        })
    }, [dateFrom, dateTo, reportTypeFilter, reports])

    const handleDateFromChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setDateFrom(event.currentTarget.value)
    }
    const handleDateToChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setDateTo(event.currentTarget.value)
    }
    const handleDeleteReport = (reportId: string): void => {
        setReports((currentReports): ReadonlyArray<IGeneratedReport> => {
            return currentReports.filter((report): boolean => report.id !== reportId)
        })
        setActionStatus(
            (t as unknown as (key: string, options: Record<string, string>) => string)(
                "reports:list.deletedReport",
                { id: reportId },
            ),
        )
        showToastSuccess(t("reports:list.deletedToast"))
    }
    const handleRegenerateReport = (reportId: string): void => {
        setReports((currentReports): ReadonlyArray<IGeneratedReport> => {
            return currentReports.map((report): IGeneratedReport => {
                if (report.id !== reportId) {
                    return report
                }

                return {
                    ...report,
                    generatedAt: "2026-03-07",
                    status: "queued",
                }
            })
        })
        setActionStatus(
            (t as unknown as (key: string, options: Record<string, string>) => string)(
                "reports:list.regenerationQueued",
                { id: reportId },
            ),
        )
        showToastInfo(t("reports:list.regenerationQueuedToast"))
    }
    const handleOpenGenerator = (): void => {
        void navigate({
            to: "/reports/generate",
        })
    }
    const handleOpenViewer = (): void => {
        void navigate({
            to: "/reports/viewer",
        })
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("reports:list.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("reports:list.pageSubtitle")}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="flat" onPress={handleOpenGenerator}>
                    {t("reports:list.openGenerator")}
                </Button>
                <Button size="sm" variant="flat" onPress={handleOpenViewer}>
                    {t("reports:list.openViewer")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:list.filtersTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:list.reportTypeLabel")}
                            </span>
                            <select
                                aria-label={t("reports:list.reportTypeLabel")}
                                className={NATIVE_FORM.select}
                                value={reportTypeFilter}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "all" ||
                                        nextValue === "architecture" ||
                                        nextValue === "delivery" ||
                                        nextValue === "quality"
                                    ) {
                                        setReportTypeFilter(nextValue)
                                    }
                                }}
                            >
                                <option value="all">all</option>
                                <option value="architecture">architecture</option>
                                <option value="delivery">delivery</option>
                                <option value="quality">quality</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:list.dateFromLabel")}
                            </span>
                            <input
                                aria-label={t("reports:list.dateFromLabel")}
                                className={`w-full rounded border border-border bg-surface px-2 py-1 ${TYPOGRAPHY.body}`}
                                type="date"
                                value={dateFrom}
                                onChange={handleDateFromChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:list.dateToLabel")}
                            </span>
                            <input
                                aria-label={t("reports:list.dateToLabel")}
                                className={`w-full rounded border border-border bg-surface px-2 py-1 ${TYPOGRAPHY.body}`}
                                type="date"
                                value={dateTo}
                                onChange={handleDateToChange}
                            />
                        </label>
                    </div>
                    <Alert
                        color="primary"
                        title={t("reports:list.filterSummaryTitle")}
                        variant="flat"
                    >
                        {(t as unknown as (key: string, options: Record<string, string>) => string)(
                            "reports:list.filteredReports",
                            { count: String(filteredReports.length) },
                        )}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:list.generatedReportsTitle")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    {filteredReports.length === 0 ? (
                        <Alert
                            color="warning"
                            title={t("reports:list.noReportsTitle")}
                            variant="flat"
                        >
                            {t("reports:list.noReportsHint")}
                        </Alert>
                    ) : (
                        <ul aria-label="Generated reports list" className="space-y-2">
                            {filteredReports.map(
                                (report): ReactElement => (
                                    <li
                                        aria-label={`Report row ${report.id}`}
                                        className="rounded border border-border bg-surface p-3"
                                        key={report.id}
                                    >
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-foreground">
                                                {report.title}
                                            </p>
                                            <span
                                                className={`rounded border px-1.5 py-0.5 ${TYPOGRAPHY.micro} ${resolveReportStatusBadgeClass(
                                                    report.status,
                                                )}`}
                                            >
                                                {report.status}
                                            </span>
                                        </div>
                                        <p className={TYPOGRAPHY.body}>
                                            {(t as unknown as (key: string, options: Record<string, string>) => string)(
                                                "reports:list.typeAndDate",
                                                {
                                                    date: report.generatedAt,
                                                    type: report.type,
                                                },
                                            )}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={handleOpenViewer}
                                            >
                                                {t("reports:list.openViewer")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleRegenerateReport(report.id)
                                                }}
                                            >
                                                {(t as unknown as (key: string, options: Record<string, string>) => string)(
                                                    "reports:list.regenerate",
                                                    { id: report.id },
                                                )}
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleDeleteReport(report.id)
                                                }}
                                            >
                                                {(t as unknown as (key: string, options: Record<string, string>) => string)(
                                                    "reports:list.delete",
                                                    { id: report.id },
                                                )}
                                            </Button>
                                        </div>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                    <Alert
                        color="primary"
                        title={t("reports:list.actionStatusTitle")}
                        variant="flat"
                    >
                        {actionStatus}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
