import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
    DataFreshnessPanel,
    type IProvenanceContext,
} from "@/components/infrastructure/data-freshness-panel"
import { EnterpriseDataTable } from "@/components/infrastructure/enterprise-data-table"
import { ExplainabilityPanel } from "@/components/infrastructure/explainability-panel"
import {
    DashboardDateRangeFilter,
    type TDashboardDateRange,
} from "@/components/dashboard/dashboard-date-range-filter"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { FormLayout } from "@/components/forms/form-layout"
import { TYPOGRAPHY } from "@/lib/constants/typography"

type TUsageTab = "by-ccr" | "by-developer" | "by-model"
type TModelName = "claude-3-7-sonnet" | "gpt-4.1-mini" | "gpt-4o-mini" | "mistral-small-latest"

interface ITokenUsageRecord {
    /** Идентификатор usage строки. */
    readonly id: string
    /** LLM model. */
    readonly model: TModelName
    /** Имя разработчика. */
    readonly developer: string
    /** Идентификатор CCR. */
    readonly ccr: string
    /** Prompt tokens. */
    readonly promptTokens: number
    /** Completion tokens. */
    readonly completionTokens: number
}

interface IModelPricing {
    /** Цена за 1k input tokens. */
    readonly inputPer1kUsd: number
    /** Цена за 1k output tokens. */
    readonly outputPer1kUsd: number
}

interface IAggregatedUsageRow {
    /** Группа (model/dev/CCR). */
    readonly key: string
    /** Prompt tokens. */
    readonly promptTokens: number
    /** Completion tokens. */
    readonly completionTokens: number
    /** Total tokens. */
    readonly totalTokens: number
    /** Estimated cost in USD. */
    readonly estimatedCostUsd: number
}

const MODEL_PRICING: Readonly<Record<TModelName, IModelPricing>> = {
    "claude-3-7-sonnet": {
        inputPer1kUsd: 0.003,
        outputPer1kUsd: 0.015,
    },
    "gpt-4.1-mini": {
        inputPer1kUsd: 0.0004,
        outputPer1kUsd: 0.0016,
    },
    "gpt-4o-mini": {
        inputPer1kUsd: 0.0003,
        outputPer1kUsd: 0.0012,
    },
    "mistral-small-latest": {
        inputPer1kUsd: 0.0006,
        outputPer1kUsd: 0.0018,
    },
}

const BASE_USAGE_RECORDS: ReadonlyArray<ITokenUsageRecord> = [
    {
        ccr: "ccr-9001",
        completionTokens: 22000,
        developer: "Neo",
        id: "usage-1",
        model: "gpt-4o-mini",
        promptTokens: 63000,
    },
    {
        ccr: "ccr-9002",
        completionTokens: 9100,
        developer: "Trinity",
        id: "usage-2",
        model: "claude-3-7-sonnet",
        promptTokens: 41000,
    },
    {
        ccr: "ccr-9003",
        completionTokens: 14800,
        developer: "Morpheus",
        id: "usage-3",
        model: "gpt-4.1-mini",
        promptTokens: 52000,
    },
    {
        ccr: "ccr-9004",
        completionTokens: 13200,
        developer: "Niobe",
        id: "usage-4",
        model: "mistral-small-latest",
        promptTokens: 48000,
    },
    {
        ccr: "ccr-9005",
        completionTokens: 7400,
        developer: "Neo",
        id: "usage-5",
        model: "gpt-4o-mini",
        promptTokens: 27000,
    },
    {
        ccr: "ccr-9006",
        completionTokens: 11600,
        developer: "Trinity",
        id: "usage-6",
        model: "gpt-4.1-mini",
        promptTokens: 39000,
    },
    {
        ccr: "ccr-9007",
        completionTokens: 19800,
        developer: "Neo",
        id: "usage-7",
        model: "claude-3-7-sonnet",
        promptTokens: 57000,
    },
]

function getRangeScale(range: TDashboardDateRange): number {
    if (range === "1d") {
        return 0.2
    }

    if (range === "30d") {
        return 3.8
    }

    if (range === "90d") {
        return 9.5
    }

    return 1
}

function toScaledUsageRecords(
    records: ReadonlyArray<ITokenUsageRecord>,
    range: TDashboardDateRange,
): ReadonlyArray<ITokenUsageRecord> {
    const scale = getRangeScale(range)
    return records.map(
        (record): ITokenUsageRecord => ({
            ...record,
            completionTokens: Math.round(record.completionTokens * scale),
            promptTokens: Math.round(record.promptTokens * scale),
        }),
    )
}

function estimateCostForRecord(record: ITokenUsageRecord): number {
    const pricing = MODEL_PRICING[record.model]
    const promptCost = (record.promptTokens / 1000) * pricing.inputPer1kUsd
    const completionCost = (record.completionTokens / 1000) * pricing.outputPer1kUsd

    return promptCost + completionCost
}

function aggregateUsageBy(
    records: ReadonlyArray<ITokenUsageRecord>,
    keySelector: (record: ITokenUsageRecord) => string,
): ReadonlyArray<IAggregatedUsageRow> {
    const map = new Map<string, IAggregatedUsageRow>()

    for (const record of records) {
        const key = keySelector(record)
        const current = map.get(key)
        const nextPrompt = (current?.promptTokens ?? 0) + record.promptTokens
        const nextCompletion = (current?.completionTokens ?? 0) + record.completionTokens
        const nextCost = (current?.estimatedCostUsd ?? 0) + estimateCostForRecord(record)

        map.set(key, {
            completionTokens: nextCompletion,
            estimatedCostUsd: nextCost,
            key,
            promptTokens: nextPrompt,
            totalTokens: nextPrompt + nextCompletion,
        })
    }

    return [...map.values()].sort((left, right): number => right.totalTokens - left.totalTokens)
}

function formatCostUsd(value: number): string {
    return `$${value.toFixed(2)}`
}

function formatTokens(value: number): string {
    return value.toLocaleString("en-US")
}

function buildKpiMetrics(
    records: ReadonlyArray<ITokenUsageRecord>,
    t: ReturnType<typeof useTranslation<readonly ["settings"]>>["t"],
): ReadonlyArray<IMetricGridMetric> {
    const totalPrompt = records.reduce(
        (accumulator, record): number => accumulator + record.promptTokens,
        0,
    )
    const totalCompletion = records.reduce(
        (accumulator, record): number => accumulator + record.completionTokens,
        0,
    )
    const totalCost = records.reduce(
        (accumulator, record): number => accumulator + estimateCostForRecord(record),
        0,
    )
    const activeDevelopers = new Set(records.map((record): string => record.developer)).size
    const activeCcr = new Set(records.map((record): string => record.ccr)).size
    const totalTokens = totalPrompt + totalCompletion

    return [
        {
            caption: t("settings:tokenUsage.totalTokensCaption"),
            id: "total-tokens",
            label: t("settings:tokenUsage.totalTokensLabel"),
            trendDirection: "up",
            trendLabel: t("settings:tokenUsage.promptTrend", { value: formatTokens(totalPrompt) }),
            value: formatTokens(totalTokens),
        },
        {
            caption: t("settings:tokenUsage.estimatedCostCaption"),
            id: "estimated-cost",
            label: t("settings:tokenUsage.estimatedCostLabel"),
            trendDirection: "up",
            trendLabel: t("settings:tokenUsage.completionTrend", { value: formatTokens(totalCompletion) }),
            value: formatCostUsd(totalCost),
        },
        {
            caption: t("settings:tokenUsage.activeDevelopersCaption"),
            id: "active-developers",
            label: t("settings:tokenUsage.activeDevelopersLabel"),
            trendDirection: "neutral",
            trendLabel: t("settings:tokenUsage.usageTracked"),
            value: String(activeDevelopers),
        },
        {
            caption: t("settings:tokenUsage.activeCcrCaption"),
            id: "active-ccr",
            label: t("settings:tokenUsage.activeCcrLabel"),
            trendDirection: "neutral",
            trendLabel: t("settings:tokenUsage.linkedToReviewFlow"),
            value: String(activeCcr),
        },
    ]
}

function getDataWindowLabel(
    range: TDashboardDateRange,
    t: ReturnType<typeof useTranslation<readonly ["settings"]>>["t"],
): string {
    if (range === "1d") {
        return t("settings:tokenUsage.last24Hours")
    }
    if (range === "30d") {
        return t("settings:tokenUsage.last30Days")
    }
    if (range === "90d") {
        return t("settings:tokenUsage.last90Days")
    }
    return t("settings:tokenUsage.last7Days")
}

function UsageTable(props: {
    readonly title: string
    readonly rows: ReadonlyArray<IAggregatedUsageRow>
}): ReactElement {
    const { t } = useTranslation(["settings"])
    return (
        <Card>
            <CardHeader>
                <p className={TYPOGRAPHY.sectionTitle}>{props.title}</p>
            </CardHeader>
            <CardBody>
                <EnterpriseDataTable
                    ariaLabel={`${props.title} token usage`}
                    columns={[
                        {
                            accessor: (row): string => row.key,
                            header: t("settings:tokenUsage.columnGroup"),
                            id: "group",
                            pin: "left",
                            size: 220,
                        },
                        {
                            accessor: (row): string => formatTokens(row.promptTokens),
                            header: t("settings:tokenUsage.columnPromptTokens"),
                            id: "promptTokens",
                            size: 170,
                        },
                        {
                            accessor: (row): string => formatTokens(row.completionTokens),
                            header: t("settings:tokenUsage.columnCompletionTokens"),
                            id: "completionTokens",
                            size: 180,
                        },
                        {
                            accessor: (row): string => formatTokens(row.totalTokens),
                            header: t("settings:tokenUsage.columnTotalTokens"),
                            id: "totalTokens",
                            size: 170,
                        },
                        {
                            accessor: (row): string => formatCostUsd(row.estimatedCostUsd),
                            header: t("settings:tokenUsage.columnEstimatedCost"),
                            id: "estimatedCost",
                            size: 180,
                        },
                    ]}
                    emptyMessage={t("settings:tokenUsage.noUsageData")}
                    getRowId={(row): string => row.key}
                    id={`token-usage-${props.title.toLowerCase().replace(/\s+/g, "-")}`}
                    rows={props.rows}
                />
            </CardBody>
        </Card>
    )
}

/**
 * Страница аналитики token usage.
 *
 * @returns Usage by model/developer/CCR + cost estimate в выбранном диапазоне.
 */
export function SettingsTokenUsagePage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [range, setRange] = useState<TDashboardDateRange>("7d")
    const [selectedTab, setSelectedTab] = useState<TUsageTab>("by-model")
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("2026-03-04T10:25:00Z")
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const refreshResetTimerRef = useRef<number | undefined>(undefined)
    const [freshnessActionMessage, setFreshnessActionMessage] = useState<string>("")

    const scaledRecords = useMemo(
        (): ReadonlyArray<ITokenUsageRecord> => toScaledUsageRecords(BASE_USAGE_RECORDS, range),
        [range],
    )
    const byModel = useMemo(
        (): ReadonlyArray<IAggregatedUsageRow> =>
            aggregateUsageBy(scaledRecords, (record): string => record.model),
        [scaledRecords],
    )
    const byDeveloper = useMemo(
        (): ReadonlyArray<IAggregatedUsageRow> =>
            aggregateUsageBy(scaledRecords, (record): string => record.developer),
        [scaledRecords],
    )
    const byCcr = useMemo(
        (): ReadonlyArray<IAggregatedUsageRow> =>
            aggregateUsageBy(scaledRecords, (record): string => record.ccr),
        [scaledRecords],
    )
    const metrics = useMemo(
        (): ReadonlyArray<IMetricGridMetric> => buildKpiMetrics(scaledRecords, t),
        [scaledRecords, t],
    )
    const explainabilityFactors = useMemo((): ReadonlyArray<{
        readonly impact: "high" | "low" | "medium"
        readonly label: string
        readonly value: string
    }> => {
        const topModel = byModel[0]
        const topDeveloper = byDeveloper[0]
        const topCcr = byCcr[0]

        return [
            {
                impact: "high",
                label: t("settings:tokenUsage.topModelContribution"),
                value:
                    topModel === undefined
                        ? t("settings:tokenUsage.noModelData")
                        : t("settings:tokenUsage.modelConsumed", { model: topModel.key, tokens: formatTokens(topModel.totalTokens) }),
            },
            {
                impact: "medium",
                label: t("settings:tokenUsage.developerConcentration"),
                value:
                    topDeveloper === undefined
                        ? t("settings:tokenUsage.noDeveloperData")
                        : t("settings:tokenUsage.developerDrivesUsage", { developer: topDeveloper.key }),
            },
            {
                impact: "low",
                label: t("settings:tokenUsage.ccrDistribution"),
                value:
                    topCcr === undefined
                        ? t("settings:tokenUsage.noCcrData")
                        : t("settings:tokenUsage.topCcrContributes", { ccr: topCcr.key, cost: formatCostUsd(topCcr.estimatedCostUsd) }),
            },
        ]
    }, [byCcr, byDeveloper, byModel, t])
    const provenance = useMemo(
        (): IProvenanceContext => ({
            branch: "main",
            commit: "7ed8c4a",
            dataWindow: `token-usage-range:${range}`,
            diagnosticsHref: "/settings-jobs",
            hasFailures: false,
            isPartial: range === "90d",
            jobId: `usage-agg-2026-03-04-${range}`,
            repository: "platform-team/usage-analytics",
            source: "analytics-worker aggregates",
        }),
        [range],
    )

    useEffect((): (() => void) => {
        return (): void => {
            if (refreshResetTimerRef.current !== undefined) {
                window.clearTimeout(refreshResetTimerRef.current)
                refreshResetTimerRef.current = undefined
            }
        }
    }, [])

    const handleRefresh = (): void => {
        if (refreshResetTimerRef.current !== undefined) {
            window.clearTimeout(refreshResetTimerRef.current)
        }

        setIsRefreshing(true)
        setLastUpdatedAt(new Date().toISOString())
        setFreshnessActionMessage(t("settings:tokenUsage.tokenUsageRefreshRequested"))
        refreshResetTimerRef.current = window.setTimeout((): void => {
            setIsRefreshing(false)
            refreshResetTimerRef.current = undefined
        }, 450)
    }

    const handleRescan = (): void => {
        setFreshnessActionMessage(t("settings:tokenUsage.tokenUsageRescanQueued"))
    }

    return (
        <FormLayout
            title={t("settings:tokenUsage.pageTitle")}
            description={t("settings:tokenUsage.pageSubtitle")}
        >
            <div className="flex justify-end">
                <DashboardDateRangeFilter
                    value={range}
                    onChange={(nextRange): void => {
                        setRange(nextRange)
                    }}
                />
            </div>

            <DataFreshnessPanel
                isRefreshing={isRefreshing}
                lastUpdatedAt={lastUpdatedAt}
                provenance={{
                    ...provenance,
                    dataWindow: `${provenance.dataWindow} (${getDataWindowLabel(range, t)})`,
                }}
                staleThresholdMinutes={30}
                title={t("settings:tokenUsage.usageFreshness")}
                onRefresh={handleRefresh}
                onRescan={handleRescan}
            />
            {freshnessActionMessage.length > 0 ? (
                <Alert color="primary" title={t("settings:tokenUsage.freshnessAction")} variant="flat">
                    {freshnessActionMessage}
                </Alert>
            ) : null}
            <ExplainabilityPanel
                confidence="0.88"
                dataWindow={`token-usage:${range}`}
                factors={explainabilityFactors}
                limitations={[
                    t("settings:tokenUsage.limitationPricing"),
                    t("settings:tokenUsage.limitationIngestion"),
                ]}
                signalLabel={t("settings:tokenUsage.costConcentrationRisk")}
                signalValue={range === "90d" ? "elevated" : "moderate"}
                threshold=">= 0.65"
                title={t("settings:tokenUsage.explainabilityTitle")}
            />

            <MetricsGrid metrics={metrics} />

            <div className="space-y-3">
                <div
                    aria-label="Token usage group selector"
                    className="flex flex-wrap gap-2"
                    role="tablist"
                >
                    <Button
                        aria-pressed={selectedTab === "by-model"}
                        onPress={(): void => {
                            setSelectedTab("by-model")
                        }}
                        size="sm"
                        color="primary"
                        variant={selectedTab === "by-model" ? "solid" : "flat"}
                    >
                        {t("settings:tokenUsage.byModel")}
                    </Button>
                    <Button
                        aria-pressed={selectedTab === "by-developer"}
                        color="primary"
                        onPress={(): void => {
                            setSelectedTab("by-developer")
                        }}
                        size="sm"
                        variant={selectedTab === "by-developer" ? "solid" : "flat"}
                    >
                        {t("settings:tokenUsage.byDeveloper")}
                    </Button>
                    <Button
                        aria-pressed={selectedTab === "by-ccr"}
                        color="primary"
                        onPress={(): void => {
                            setSelectedTab("by-ccr")
                        }}
                        size="sm"
                        variant={selectedTab === "by-ccr" ? "solid" : "flat"}
                    >
                        {t("settings:tokenUsage.byCcr")}
                    </Button>
                </div>
                {selectedTab === "by-model" ? (
                    <UsageTable rows={byModel} title={t("settings:tokenUsage.usageByModel")} />
                ) : null}
                {selectedTab === "by-developer" ? (
                    <UsageTable rows={byDeveloper} title={t("settings:tokenUsage.usageByDeveloper")} />
                ) : null}
                {selectedTab === "by-ccr" ? <UsageTable rows={byCcr} title={t("settings:tokenUsage.usageByCcr")} /> : null}
            </div>
        </FormLayout>
    )
}
