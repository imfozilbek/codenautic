import { type ReactElement, useMemo, useState } from "react"

import { DataFreshnessPanel, type IProvenanceContext } from "@/components/infrastructure/data-freshness-panel"
import { ExplainabilityPanel } from "@/components/infrastructure/explainability-panel"
import { DashboardDateRangeFilter, type TDashboardDateRange } from "@/components/dashboard/dashboard-date-range-filter"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"
import { Alert, Card, CardBody, CardHeader, Tab, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Tabs } from "@/components/ui"

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
        developer: "Ari",
        id: "usage-1",
        model: "gpt-4o-mini",
        promptTokens: 63000,
    },
    {
        ccr: "ccr-9002",
        completionTokens: 9100,
        developer: "Nika",
        id: "usage-2",
        model: "claude-3-7-sonnet",
        promptTokens: 41000,
    },
    {
        ccr: "ccr-9003",
        completionTokens: 14800,
        developer: "Mila",
        id: "usage-3",
        model: "gpt-4.1-mini",
        promptTokens: 52000,
    },
    {
        ccr: "ccr-9004",
        completionTokens: 13200,
        developer: "Sari",
        id: "usage-4",
        model: "mistral-small-latest",
        promptTokens: 48000,
    },
    {
        ccr: "ccr-9005",
        completionTokens: 7400,
        developer: "Ari",
        id: "usage-5",
        model: "gpt-4o-mini",
        promptTokens: 27000,
    },
    {
        ccr: "ccr-9006",
        completionTokens: 11600,
        developer: "Nika",
        id: "usage-6",
        model: "gpt-4.1-mini",
        promptTokens: 39000,
    },
    {
        ccr: "ccr-9007",
        completionTokens: 19800,
        developer: "Ari",
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
    return records.map((record): ITokenUsageRecord => ({
        ...record,
        completionTokens: Math.round(record.completionTokens * scale),
        promptTokens: Math.round(record.promptTokens * scale),
    }))
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
    const activeDevelopers = new Set(
        records.map((record): string => record.developer),
    ).size
    const activeCcr = new Set(records.map((record): string => record.ccr)).size
    const totalTokens = totalPrompt + totalCompletion

    return [
        {
            caption: "Prompt + completion tokens across selected range",
            id: "total-tokens",
            label: "Total tokens",
            trendDirection: "up",
            trendLabel: `${formatTokens(totalPrompt)} prompt`,
            value: formatTokens(totalTokens),
        },
        {
            caption: "Estimated by model-level pricing",
            id: "estimated-cost",
            label: "Estimated cost",
            trendDirection: "up",
            trendLabel: `${formatTokens(totalCompletion)} completion`,
            value: formatCostUsd(totalCost),
        },
        {
            caption: "Developers with active usage in range",
            id: "active-developers",
            label: "Active developers",
            trendDirection: "neutral",
            trendLabel: "usage tracked",
            value: String(activeDevelopers),
        },
        {
            caption: "CCR contexts that consumed tokens",
            id: "active-ccr",
            label: "Active CCR",
            trendDirection: "neutral",
            trendLabel: "linked to review flow",
            value: String(activeCcr),
        },
    ]
}

function getDataWindowLabel(range: TDashboardDateRange): string {
    if (range === "1d") {
        return "Last 24 hours"
    }
    if (range === "30d") {
        return "Last 30 days"
    }
    if (range === "90d") {
        return "Last 90 days"
    }
    return "Last 7 days"
}

function UsageTable(props: {
    readonly title: string
    readonly rows: ReadonlyArray<IAggregatedUsageRow>
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-slate-900">{props.title}</p>
            </CardHeader>
            <CardBody>
                <Table aria-label={`${props.title} token usage`}>
                    <TableHeader>
                        <TableColumn>Group</TableColumn>
                        <TableColumn>Prompt tokens</TableColumn>
                        <TableColumn>Completion tokens</TableColumn>
                        <TableColumn>Total tokens</TableColumn>
                        <TableColumn>Estimated cost</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No usage data for this range">
                        {props.rows.map(
                            (row): ReactElement => (
                                <TableRow key={row.key}>
                                    <TableCell>{row.key}</TableCell>
                                    <TableCell>{formatTokens(row.promptTokens)}</TableCell>
                                    <TableCell>{formatTokens(row.completionTokens)}</TableCell>
                                    <TableCell>{formatTokens(row.totalTokens)}</TableCell>
                                    <TableCell>{formatCostUsd(row.estimatedCostUsd)}</TableCell>
                                </TableRow>
                            ),
                        )}
                    </TableBody>
                </Table>
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
    const [range, setRange] = useState<TDashboardDateRange>("7d")
    const [selectedTab, setSelectedTab] = useState<TUsageTab>("by-model")
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("2026-03-04T10:25:00Z")
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
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
        (): ReadonlyArray<IMetricGridMetric> => buildKpiMetrics(scaledRecords),
        [scaledRecords],
    )
    const explainabilityFactors = useMemo(
        (): ReadonlyArray<{
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
                    label: "Top model contribution",
                    value:
                        topModel === undefined
                            ? "No model data for current range."
                            : `${topModel.key} consumed ${formatTokens(topModel.totalTokens)} tokens.`,
                },
                {
                    impact: "medium",
                    label: "Developer concentration",
                    value:
                        topDeveloper === undefined
                            ? "No developer data for current range."
                            : `${topDeveloper.key} drives largest usage share in this window.`,
                },
                {
                    impact: "low",
                    label: "CCR distribution",
                    value:
                        topCcr === undefined
                            ? "No CCR data for current range."
                            : `Top CCR ${topCcr.key} contributes ${formatCostUsd(topCcr.estimatedCostUsd)}.`,
                },
            ]
        },
        [byCcr, byDeveloper, byModel],
    )
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

    const handleRefresh = (): void => {
        setIsRefreshing(true)
        setLastUpdatedAt(new Date().toISOString())
        setFreshnessActionMessage("Token usage refresh requested.")
        setTimeout((): void => {
            setIsRefreshing(false)
        }, 450)
    }

    const handleRescan = (): void => {
        setFreshnessActionMessage("Token usage rescan queued from settings.")
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Token Usage</h1>
                    <p className="text-sm text-slate-600">
                        Usage by model, developer and CCR with estimated cost over selected date
                        range.
                    </p>
                </div>
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
                    dataWindow: `${provenance.dataWindow} (${getDataWindowLabel(range)})`,
                }}
                staleThresholdMinutes={30}
                title="Usage freshness"
                onRefresh={handleRefresh}
                onRescan={handleRescan}
            />
            {freshnessActionMessage.length > 0 ? (
                <Alert color="primary" title="Freshness action" variant="flat">
                    {freshnessActionMessage}
                </Alert>
            ) : null}
            <ExplainabilityPanel
                confidence="0.88"
                dataWindow={`token-usage:${range}`}
                factors={explainabilityFactors}
                limitations={[
                    "Estimated cost is based on static pricing table snapshot.",
                    "Completion and prompt mix can shift after delayed event ingestion.",
                ]}
                signalLabel="Cost concentration risk"
                signalValue={range === "90d" ? "elevated" : "moderate"}
                threshold=">= 0.65"
                title="Explainability for token cost signal"
            />

            <MetricsGrid metrics={metrics} />

            <Tabs
                aria-label="Token usage group selector"
                selectedKey={selectedTab}
                onSelectionChange={(key): void => {
                    if (key === "by-model" || key === "by-developer" || key === "by-ccr") {
                        setSelectedTab(key)
                    }
                }}
            >
                <Tab key="by-model" title="By model">
                    <UsageTable rows={byModel} title="Usage by model" />
                </Tab>
                <Tab key="by-developer" title="By developer">
                    <UsageTable rows={byDeveloper} title="Usage by developer" />
                </Tab>
                <Tab key="by-ccr" title="By CCR">
                    <UsageTable rows={byCcr} title="Usage by CCR" />
                </Tab>
            </Tabs>
        </section>
    )
}
