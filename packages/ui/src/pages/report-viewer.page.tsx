import { type ReactElement, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
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
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { ChartContainer } from "@/components/charts/chart-container"
import { CHART_GRID_DASH, CHART_STROKE_WIDTH } from "@/lib/constants/chart-constants"
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
    const navigate = useNavigate()
    const [selectedMetric, setSelectedMetric] = useState<TViewerMetric>("riskScore")
    const [downloadStatus, setDownloadStatus] = useState<string>("No download requested yet.")
    const [shareLink, setShareLink] = useState<string>("No share link generated yet.")

    const metricLabel = useMemo((): string => {
        return selectedMetric === "riskScore" ? "Risk score" : "Delivery velocity"
    }, [selectedMetric])
    const reportHealthSummary = useMemo((): string => {
        const latestPoint = REPORT_TREND_POINTS.at(-1)
        if (latestPoint === undefined) {
            return "No report trend data available."
        }

        return `Latest metrics: risk ${String(latestPoint.riskScore)} · velocity ${String(
            latestPoint.deliveryVelocity,
        )}.`
    }, [])

    const handleDownload = (format: "PDF" | "PNG"): void => {
        setDownloadStatus(`Download prepared in ${format} format.`)
        showToastSuccess(`Report ${format} download prepared.`)
    }
    const handleGenerateShareLink = (): void => {
        const generatedLink = `https://codenautic.app/reports/generated/2026-q1-weekly`
        setShareLink(generatedLink)
        showToastInfo("Share link generated.")
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>Report viewer</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                View generated reports in-browser, inspect interactive charts, and export/share
                report artifacts.
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
                            to: "/reports/generate",
                        })
                    }}
                >
                    Open report generator
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Generated report</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <Alert color="success" title="Report summary" variant="flat">
                        {reportHealthSummary}
                    </Alert>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-foreground">Chart metric</span>
                            <select
                                aria-label="Report chart metric"
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
                                <option value="riskScore">Risk score</option>
                                <option value="deliveryVelocity">Delivery velocity</option>
                            </select>
                        </label>
                        <div className="flex items-end gap-2">
                            <Button onPress={(): void => handleDownload("PDF")}>
                                Download PDF
                            </Button>
                            <Button variant="flat" onPress={(): void => handleDownload("PNG")}>
                                Download PNG
                            </Button>
                        </div>
                    </div>
                    <ChartContainer aria-label="Report trend chart" height="xl">
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
                    <ChartContainer aria-label="Report sections distribution chart" height="xl">
                        <BarChart
                            data={SECTION_DISTRIBUTION_POINTS}
                            margin={{ bottom: 8, left: 8, right: 12, top: 12 }}
                        >
                            <CartesianGrid strokeDasharray={CHART_GRID_DASH} />
                            <XAxis dataKey="section" />
                            <YAxis domain={[0, 40]} />
                            <Tooltip />
                            <Bar dataKey="value" name="Section contribution">
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
                    <Alert color="primary" title="Download status" variant="flat">
                        {downloadStatus}
                    </Alert>
                    <div className="flex gap-2">
                        <Button onPress={handleGenerateShareLink}>Generate share link</Button>
                    </div>
                    <Alert color="primary" title="Share link" variant="flat">
                        <span aria-label="Report share link">{shareLink}</span>
                    </Alert>
                </CardBody>
            </Card>

            <AiSummaryWidget initialSummary="Delivery velocity improved while report risk score trended down across the selected period." />
        </section>
    )
}
