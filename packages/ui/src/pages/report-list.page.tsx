import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { useDynamicTranslation } from "@/lib/i18n"
import type { IReport, TReportStatus, TReportType } from "@/lib/api/endpoints/reports.endpoint"
import { useReports } from "@/lib/hooks/queries/use-reports"
import { Alert, Button, Card, CardContent, CardHeader } from "@heroui/react"
import { PageShell } from "@/components/layout/page-shell"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

function resolveReportStatusBadgeClass(status: TReportStatus): string {
    if (status === "completed") {
        return "border-success/40 bg-success/10 text-success"
    }
    if (status === "queued") {
        return "border-warning/40 bg-warning/10 text-warning"
    }
    return "border-danger/40 bg-danger/10 text-danger"
}

function resolveReportStatusBorderClass(status: TReportStatus): string {
    if (status === "completed") {
        return "border-l-2 border-l-success"
    }
    if (status === "queued") {
        return "border-l-2 border-l-warning"
    }
    return "border-l-2 border-l-danger"
}

/**
 * Список сгенерированных отчётов с фильтрами и lifecycle действиями.
 *
 * @returns UI со списком, фильтрами, status badges и delete/regenerate actions.
 */
export function ReportListPage(): ReactElement {
    const { t } = useTranslation(["reports"])
    const { td } = useDynamicTranslation(["reports"])
    const navigate = useNavigate()
    const { reportsQuery, deleteReport } = useReports()
    const [reportTypeFilter, setReportTypeFilter] = useState<TReportType | "all">("all")
    const [dateFrom, setDateFrom] = useState<string>("")
    const [dateTo, setDateTo] = useState<string>("")
    const [actionStatus, setActionStatus] = useState<string>(t("reports:list.noActionYet"))
    const [regeneratedIds, setRegeneratedIds] = useState<ReadonlySet<string>>(new Set())

    const reports: ReadonlyArray<IReport> = useMemo((): ReadonlyArray<IReport> => {
        const rawReports = reportsQuery.data?.reports ?? []
        if (regeneratedIds.size === 0) {
            return rawReports
        }
        return rawReports.map((report): IReport => {
            if (regeneratedIds.has(report.id)) {
                return { ...report, status: "queued" as TReportStatus }
            }
            return report
        })
    }, [reportsQuery.data?.reports, regeneratedIds])

    const filteredReports = useMemo((): ReadonlyArray<IReport> => {
        return reports.filter((report): boolean => {
            if (reportTypeFilter !== "all" && report.type !== reportTypeFilter) {
                return false
            }

            if (dateFrom.length > 0 && report.createdAt < dateFrom) {
                return false
            }
            if (dateTo.length > 0 && report.createdAt > dateTo) {
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
        deleteReport.mutate(reportId, {
            onSuccess: (): void => {
                setActionStatus(td("reports:list.deletedReport", { id: reportId }))
                showToastSuccess(t("reports:list.deletedToast"))
            },
        })
    }
    const handleRegenerateReport = (reportId: string): void => {
        setRegeneratedIds(
            (previous): ReadonlySet<string> => new Set([...previous, reportId]),
        )
        setActionStatus(td("reports:list.regenerationQueued", { id: reportId }))
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
        <PageShell subtitle={t("reports:list.pageSubtitle")} title={t("reports:list.pageTitle")}>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onPress={handleOpenGenerator}>
                    {t("reports:list.openGenerator")}
                </Button>
                <Button size="sm" variant="secondary" onPress={handleOpenViewer}>
                    {t("reports:list.openViewer")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("reports:list.filtersTitle")}</p>
                </CardHeader>
                <CardContent className="space-y-3">
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
                    <Alert status="accent">
                        <Alert.Title>{t("reports:list.filterSummaryTitle")}</Alert.Title>
                        <Alert.Description>
                            {td("reports:list.filteredReports", {
                                count: String(filteredReports.length),
                            })}
                        </Alert.Description>
                    </Alert>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:list.generatedReportsTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {filteredReports.length === 0 ? (
                        <Alert status="warning">
                            <Alert.Title>{t("reports:list.noReportsTitle")}</Alert.Title>
                            <Alert.Description>{t("reports:list.noReportsHint")}</Alert.Description>
                        </Alert>
                    ) : (
                        <ul
                            aria-label={t("reports:ariaLabel.list.generatedReportsList")}
                            className="space-y-2"
                        >
                            {filteredReports.map(
                                (report): ReactElement => (
                                    <li
                                        aria-label={`Report row ${report.id}`}
                                        className={`rounded border border-border bg-surface p-3 ${resolveReportStatusBorderClass(report.status)}`}
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
                                            {td("reports:list.typeAndDate", {
                                                date: report.createdAt,
                                                type: report.type,
                                            })}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onPress={handleOpenViewer}
                                            >
                                                {t("reports:list.openViewer")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onPress={(): void => {
                                                    handleRegenerateReport(report.id)
                                                }}
                                            >
                                                {td("reports:list.regenerate", {
                                                    id: report.id,
                                                })}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onPress={(): void => {
                                                    handleDeleteReport(report.id)
                                                }}
                                            >
                                                {td("reports:list.delete", {
                                                    id: report.id,
                                                })}
                                            </Button>
                                        </div>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                    <Alert status="accent">
                        <Alert.Title>{t("reports:list.actionStatusTitle")}</Alert.Title>
                        <Alert.Description>{actionStatus}</Alert.Description>
                    </Alert>
                </CardContent>
            </Card>
        </PageShell>
    )
}
