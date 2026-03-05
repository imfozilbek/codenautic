import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
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
        return "border-emerald-300 bg-emerald-50 text-emerald-700"
    }
    if (status === "queued") {
        return "border-amber-300 bg-amber-50 text-amber-700"
    }
    return "border-rose-300 bg-rose-50 text-rose-700"
}

/**
 * Список сгенерированных отчётов с фильтрами и lifecycle действиями.
 *
 * @returns UI со списком, фильтрами, status badges и delete/regenerate actions.
 */
export function ReportListPage(): ReactElement {
    const navigate = useNavigate()
    const [reportTypeFilter, setReportTypeFilter] = useState<TReportType | "all">("all")
    const [dateFrom, setDateFrom] = useState<string>("")
    const [dateTo, setDateTo] = useState<string>("")
    const [reports, setReports] = useState<ReadonlyArray<IGeneratedReport>>(INITIAL_REPORTS)
    const [actionStatus, setActionStatus] = useState<string>("No report action executed yet.")

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
        setActionStatus(`Deleted report ${reportId}.`)
        showToastSuccess("Report deleted.")
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
        setActionStatus(`Regeneration queued for report ${reportId}.`)
        showToastInfo("Report regeneration queued.")
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
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Report list</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Browse generated reports, apply filters, and trigger lifecycle actions.
            </p>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="flat" onPress={handleOpenGenerator}>
                    Open generator
                </Button>
                <Button size="sm" variant="flat" onPress={handleOpenViewer}>
                    Open viewer
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Report filters</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">
                                Report type
                            </span>
                            <select
                                aria-label="Report list type filter"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                value={reportTypeFilter}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "all"
                                        || nextValue === "architecture"
                                        || nextValue === "delivery"
                                        || nextValue === "quality"
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
                            <span className="font-semibold text-[var(--foreground)]">Date from</span>
                            <input
                                aria-label="Report list date from"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                type="date"
                                value={dateFrom}
                                onChange={handleDateFromChange}
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-[var(--foreground)]">Date to</span>
                            <input
                                aria-label="Report list date to"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                                type="date"
                                value={dateTo}
                                onChange={handleDateToChange}
                            />
                        </label>
                    </div>
                    <Alert color="primary" title="Filter summary" variant="flat">
                        {`Filtered reports: ${String(filteredReports.length)}.`}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Generated reports
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    {filteredReports.length === 0 ? (
                        <Alert color="warning" title="No generated reports found" variant="flat">
                            Adjust filters to see report history.
                        </Alert>
                    ) : (
                        <ul aria-label="Generated reports list" className="space-y-2">
                            {filteredReports.map((report): ReactElement => (
                                <li
                                    aria-label={`Report row ${report.id}`}
                                    className="rounded border border-slate-200 bg-slate-50 p-3"
                                    key={report.id}
                                >
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-slate-900">{report.title}</p>
                                        <span
                                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${resolveReportStatusBadgeClass(
                                                report.status,
                                            )}`}
                                        >
                                            {report.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">
                                        Type: {report.type} · Date: {report.generatedAt}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <Button size="sm" variant="flat" onPress={handleOpenViewer}>
                                            Open viewer
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            onPress={(): void => {
                                                handleRegenerateReport(report.id)
                                            }}
                                        >
                                            {`Regenerate ${report.id}`}
                                        </Button>
                                        <Button
                                            color="danger"
                                            size="sm"
                                            variant="flat"
                                            onPress={(): void => {
                                                handleDeleteReport(report.id)
                                            }}
                                        >
                                            {`Delete ${report.id}`}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Alert color="primary" title="Action status" variant="flat">
                        {actionStatus}
                    </Alert>
                </CardBody>
            </Card>
        </section>
    )
}
