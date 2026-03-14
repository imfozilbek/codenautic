import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"

import { useDynamicTranslation } from "@/lib/i18n"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

import { AiSummaryWidget } from "@/components/reports/ai-summary-widget"
import { Alert, Button, Card, CardContent, CardHeader } from "@heroui/react"
import { PageShell } from "@/components/layout/page-shell"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { ChartContainer } from "@/components/charts/chart-container"
import { CHART_GRID_DASH, CHART_STROKE_WIDTH } from "@/lib/constants/chart-recharts-defaults"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TViewerMetric = "riskScore" | "deliveryVelocity"

interface IReportTrendPoint {
    readonly period: string
    readonly riskScore: number
    readonly deliveryVelocity: number
}

interface ISectionDistributionPoint {
    readonly section: string
    readonly value: number
}

const REPORT_TREND_POINTS: ReadonlyArray<IReportTrendPoint> = [
    {
        deliveryVelocity: 39,
        period: "Week 1",
        riskScore: 72,
    },
    {
        deliveryVelocity: 43,
        period: "Week 2",
        riskScore: 66,
    },
    {
        deliveryVelocity: 48,
        period: "Week 3",
        riskScore: 58,
    },
    {
        deliveryVelocity: 52,
        period: "Week 4",
        riskScore: 51,
    },
]

const SECTION_DISTRIBUTION_POINTS: ReadonlyArray<ISectionDistributionPoint> = [
    {
        section: "Architecture",
        value: 34,
    },
    {
        section: "Delivery",
        value: 28,
    },
    {
        section: "Risk",
        value: 22,
    },
    {
        section: "Quality",
        value: 16,
    },
]

const SECTION_COLORS: ReadonlyArray<string> = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"]

/**
 * Экран просмотра сгенерированного отчёта с интерактивными графиками.
 *
 * @returns UI report viewer с export/share действиями.
 */
export function ReportViewerPage(): ReactElement {
    const { t } = useTranslation(["reports"])
    const { td } = useDynamicTranslation(["reports"])
    const navigate = useNavigate()
    const [selectedMetric, setSelectedMetric] = useState<TViewerMetric>("riskScore")
    const [downloadStatus, setDownloadStatus] = useState<string>(t("reports:viewer.noDownloadYet"))
    const [shareLink, setShareLink] = useState<string>(t("reports:viewer.noShareLinkYet"))

    const metricLabel = useMemo((): string => {
        return selectedMetric === "riskScore"
            ? t("reports:viewer.riskScore")
            : t("reports:viewer.deliveryVelocity")
    }, [selectedMetric, t])
    const reportHealthSummary = useMemo((): string => {
        const latestPoint = REPORT_TREND_POINTS.at(-1)
        if (latestPoint === undefined) {
            return t("reports:viewer.noTrendData")
        }

        return td("reports:viewer.latestMetrics", {
            risk: String(latestPoint.riskScore),
            velocity: String(latestPoint.deliveryVelocity),
        })
    }, [td])

    const handleDownload = (format: "PDF" | "PNG"): void => {
        setDownloadStatus(td("reports:viewer.downloadPrepared", { format }))
        showToastSuccess(td("reports:viewer.downloadPreparedToast", { format }))
    }
    const handleGenerateShareLink = (): void => {
        const generatedLink = `https://codenautic.app/reports/generated/2026-q1-weekly`
        setShareLink(generatedLink)
        showToastInfo(t("reports:viewer.shareLinkGeneratedToast"))
    }

    return (
        <PageShell
            subtitle={t("reports:viewer.pageSubtitle")}
            title={t("reports:viewer.pageTitle")}
        >
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={(): void => {
                        void navigate({
                            to: "/reports",
                        })
                    }}
                >
                    {t("reports:viewer.openReportsList")}
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={(): void => {
                        void navigate({
                            to: "/reports/generate",
                        })
                    }}
                >
                    {t("reports:viewer.openReportGenerator")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("reports:viewer.generatedReportTitle")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Alert status="success">
                        <Alert.Title>{t("reports:viewer.reportSummaryTitle")}</Alert.Title>
                        <Alert.Description>{reportHealthSummary}</Alert.Description>
                    </Alert>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">
                                {t("reports:viewer.chartMetricLabel")}
                            </span>
                            <select
                                aria-label={t("reports:viewer.chartMetricLabel")}
                                className={NATIVE_FORM.select}
                                value={selectedMetric}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "riskScore" ||
                                        nextValue === "deliveryVelocity"
                                    ) {
                                        setSelectedMetric(nextValue)
                                    }
                                }}
                            >
                                <option value="riskScore">{t("reports:viewer.riskScore")}</option>
                                <option value="deliveryVelocity">
                                    {t("reports:viewer.deliveryVelocity")}
                                </option>
                            </select>
                        </label>
                        <div className="flex items-end gap-2">
                            <Button variant="primary" onPress={(): void => handleDownload("PDF")}>
                                {t("reports:viewer.downloadPdf")}
                            </Button>
                            <Button variant="secondary" onPress={(): void => handleDownload("PNG")}>
                                {t("reports:viewer.downloadPng")}
                            </Button>
                        </div>
                    </div>
                    <ChartContainer
                        aria-label={t("reports:ariaLabel.viewer.trendChart")}
                        height="xl"
                    >
                        <LineChart
                            data={REPORT_TREND_POINTS}
                            margin={{ bottom: 8, left: 8, right: 12, top: 12 }}
                        >
                            <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                            <XAxis dataKey="period" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line
                                activeDot={{ r: 6 }}
                                dataKey={selectedMetric}
                                dot={{
                                    fill: "var(--chart-primary)",
                                    r: 3,
                                    stroke: "var(--background)",
                                    strokeWidth: 1,
                                }}
                                name={metricLabel}
                                stroke="var(--chart-primary)"
                                strokeWidth={CHART_STROKE_WIDTH}
                                type="monotone"
                            />
                        </LineChart>
                    </ChartContainer>
                    <ChartContainer
                        aria-label={t("reports:ariaLabel.viewer.sectionsDistributionChart")}
                        height="xl"
                    >
                        <BarChart
                            data={SECTION_DISTRIBUTION_POINTS}
                            margin={{ bottom: 8, left: 8, right: 12, top: 12 }}
                        >
                            <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                            <XAxis dataKey="section" />
                            <YAxis domain={[0, 40]} />
                            <Tooltip />
                            <Bar dataKey="value" name={t("reports:viewer.sectionContribution")}>
                                {SECTION_DISTRIBUTION_POINTS.map(
                                    (entry, index): ReactElement => (
                                        <Cell
                                            fill={SECTION_COLORS[index % SECTION_COLORS.length]}
                                            key={`${entry.section}-${String(index)}`}
                                        />
                                    ),
                                )}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                    <Alert status="accent">
                        <Alert.Title>{t("reports:viewer.downloadStatus")}</Alert.Title>
                        <Alert.Description>{downloadStatus}</Alert.Description>
                    </Alert>
                    <div className="flex gap-2">
                        <Button variant="primary" onPress={handleGenerateShareLink}>
                            {t("reports:viewer.generateShareLink")}
                        </Button>
                    </div>
                    <Alert status="accent">
                        <Alert.Title>{t("reports:viewer.shareLinkTitle")}</Alert.Title>
                        <Alert.Description>
                            <span aria-label={t("reports:ariaLabel.viewer.shareLink")}>
                                {shareLink}
                            </span>
                        </Alert.Description>
                    </Alert>
                </CardContent>
            </Card>

            <AiSummaryWidget initialSummary="Delivery velocity improved while report risk score trended down across the selected period." />
        </PageShell>
    )
}
