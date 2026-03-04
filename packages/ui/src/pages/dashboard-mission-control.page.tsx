import { type ReactElement, Suspense, lazy, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { DataFreshnessPanel, type IProvenanceContext } from "@/components/infrastructure/data-freshness-panel"
import { ExplainabilityPanel } from "@/components/infrastructure/explainability-panel"
import { FlowMetricsWidget, type IFlowMetricsPoint } from "@/components/dashboard/flow-metrics-widget"
import { TeamActivityWidget, type ITeamActivityPoint } from "@/components/dashboard/team-activity-widget"
import { ArchitectureHealthWidget } from "@/components/dashboard/architecture-health-widget"
import {
    TokenUsageDashboardWidget,
    type ITokenUsageModelPoint,
    type ITokenUsageTrendPoint,
} from "@/components/dashboard/token-usage-dashboard-widget"
import {
    DashboardDateRangeFilter,
    type TDashboardDateRange,
} from "@/components/dashboard/dashboard-date-range-filter"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"
import { type IStatusDistributionPoint } from "@/components/dashboard/status-distribution-chart"
import { readUiRoleFromStorage } from "@/lib/permissions/ui-policy"
import { Link } from "@tanstack/react-router"

import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"

const DashboardContent = lazy(async () => {
    const module = await import("@/components/dashboard/dashboard-content")

    return { default: module.DashboardContent }
})

/**
 * Данные для Work Queue.
 */
interface IWorkQueueSignal {
    /** Идентификатор сигнала/очереди. */
    readonly id: string
    /** Заголовок карточки. */
    readonly title: string
    /** Link-адрес назначения. */
    readonly route: string
    /** Описание. */
    readonly description: string
}

/**
 * Параметры для карточки health-блока.
 */
interface IOpsBannerProps {
    /** Есть ли деградация. */
    readonly isDegraded: boolean
}

/**
 * Метрики для dashboard.
 */
interface IWorkQueuePayload {
    /** Work queue items. */
    readonly workQueue: ReadonlyArray<IWorkQueueSignal>
    /** Timeline entries. */
    readonly timeline: ReadonlyArray<{
        /** Уникальный ID. */
        readonly id: string
        /** Время. */
        readonly time: string
        /** Заголовок. */
        readonly title: string
        /** Подробности. */
        readonly description: string
        /** Детальные подробности. */
        readonly details?: string
        /** День в рамках grouping (Today/Yesterday). */
        readonly group?: string
    }>
}

/**
 * Базовые сигналы timeline для mission-control payload.
 */
const TIMELINE_ENTRIES = [
    {
        id: "tl-1",
        time: "16:10",
        title: "Code scan finished",
        description: "Repository core scanned: 3 high-impact findings cleared.",
        details: "Repository core scanned: 3 high-impact findings cleared.",
        group: "Today",
    },
    {
        id: "tl-2",
        time: "16:03",
        title: "New CCR queued",
        description: "repo/frontend: performance regression review added.",
        details: "repo/frontend: performance regression review added.",
        group: "Today",
    },
    {
        id: "tl-3",
        time: "15:48",
        title: "LLM provider health check",
        description: "OpenAI latency spike detected; fallback provider enabled.",
        details: "OpenAI latency spike detected; fallback provider enabled.",
        group: "Today",
    },
] as const satisfies ReadonlyArray<IWorkQueuePayload["timeline"][number]>

/**
 * Базовые work-queue сигналы для mission-control payload.
 */
const WORK_QUEUE_ENTRIES = [
    {
        description: "12 pending. Click to review queue and continue workflow.",
        id: "critical-ccr",
        route: "/reviews",
        title: "CCR queue",
    },
    {
        description: "Signals suggest drift in architecture health by +12%.",
        id: "impact-graph",
        route: "/",
        title: "Impact / Graph",
    },
    {
        description: "Provider key usage limit reached in current period.",
        id: "provider-health",
        route: "/settings-llm-providers",
        title: "Provider health",
    },
    {
        description: "Repo onboarding delayed for team runtime.",
        id: "drift-deploy",
        route: "/settings",
        title: "Ops drill-down",
    },
] as const satisfies ReadonlyArray<IWorkQueueSignal>

/**
 * Базовая payload-структура для mission-control секции.
 */
const DASHBOARD_PAYLOAD: IWorkQueuePayload = {
    timeline: TIMELINE_ENTRIES,
    workQueue: WORK_QUEUE_ENTRIES,
}

const _ORG_SCOPE_OPTIONS = ["all-orgs", "platform-team", "frontend-team", "runtime-team"] as const
const _REPOSITORY_SCOPE_OPTIONS = ["all-repos", "repo-core", "repo-ui", "repo-api"] as const
const _TEAM_SCOPE_OPTIONS = ["all-teams", "runtime", "frontend", "backend", "data"] as const

type TOrgScope = (typeof _ORG_SCOPE_OPTIONS)[number]
type TRepositoryScope = (typeof _REPOSITORY_SCOPE_OPTIONS)[number]
type TTeamScope = (typeof _TEAM_SCOPE_OPTIONS)[number]
type TWorkspaceLayoutPreset = "balanced" | "focus" | "ops"

interface IWorkspacePersonalization {
    /** Предпочитаемый org scope. */
    readonly orgScope: TOrgScope
    /** Предпочитаемый repo scope. */
    readonly repositoryScope: TRepositoryScope
    /** Предпочитаемый team scope. */
    readonly teamScope: TTeamScope
    /** Закреплённые shortcuts. */
    readonly pinnedShortcuts: ReadonlyArray<string>
    /** Выбранный layout preset. */
    readonly layoutPreset: TWorkspaceLayoutPreset
}

const WORKSPACE_SHORTCUT_OPTIONS = ["/reviews", "/issues", "/dashboard/code-city", "/my-work"] as const
const PERSONALIZATION_STORAGE_KEY = "ui.workspace.personalization.v1"

function readWorkspacePersonalization(): IWorkspacePersonalization {
    if (typeof window === "undefined") {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }

    const raw = window.localStorage.getItem(PERSONALIZATION_STORAGE_KEY)
    if (raw === null) {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }

    try {
        const parsed = JSON.parse(raw) as Partial<IWorkspacePersonalization>
        const orgScope = parsed.orgScope
        const repositoryScope = parsed.repositoryScope
        const teamScope = parsed.teamScope
        const pinnedShortcuts = parsed.pinnedShortcuts
        const layoutPreset = parsed.layoutPreset

        return {
            layoutPreset:
                layoutPreset === "balanced" || layoutPreset === "focus" || layoutPreset === "ops"
                    ? layoutPreset
                    : "balanced",
            orgScope:
                orgScope === "all-orgs" ||
                orgScope === "platform-team" ||
                orgScope === "frontend-team" ||
                orgScope === "runtime-team"
                    ? orgScope
                    : "all-orgs",
            pinnedShortcuts: Array.isArray(pinnedShortcuts)
                ? pinnedShortcuts.filter((shortcut): shortcut is string => {
                    return (
                        typeof shortcut === "string" &&
                        WORKSPACE_SHORTCUT_OPTIONS.includes(shortcut as (typeof WORKSPACE_SHORTCUT_OPTIONS)[number])
                    )
                })
                : ["/reviews", "/my-work"],
            repositoryScope:
                repositoryScope === "all-repos" ||
                repositoryScope === "repo-core" ||
                repositoryScope === "repo-ui" ||
                repositoryScope === "repo-api"
                    ? repositoryScope
                    : "all-repos",
            teamScope:
                teamScope === "all-teams" ||
                teamScope === "runtime" ||
                teamScope === "frontend" ||
                teamScope === "backend" ||
                teamScope === "data"
                    ? teamScope
                    : "all-teams",
        }
    } catch {
        return {
            layoutPreset: "balanced",
            orgScope: "all-orgs",
            pinnedShortcuts: ["/reviews", "/my-work"],
            repositoryScope: "all-repos",
            teamScope: "all-teams",
        }
    }
}

function saveWorkspacePersonalization(payload: IWorkspacePersonalization): void {
    if (typeof window === "undefined") {
        return
    }

    window.localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(payload))
}

/**
 * Формирует метрики по выбранному диапазону.
 *
 * @param range Выбранный диапазон дат.
 * @returns Массив метрик для отображения.
 */
function getDashboardMetrics(range: TDashboardDateRange): ReadonlyArray<IMetricGridMetric> {
    const isLongRange = range === "30d" || range === "90d"

    return [
        {
            id: "ccr-open",
            label: "Open CCR",
            value: isLongRange ? "41" : "19",
            caption: "Critical + warnings included",
            trendDirection: "up",
            trendLabel: "+8%",
        },
        {
            id: "reviews-complete",
            label: "CCR reviewed",
            value: isLongRange ? "128" : "44",
            caption: "Auto/manual accepted",
            trendDirection: "up",
            trendLabel: "+5%",
        },
        {
            id: "suggestions",
            label: "Suggestions emitted",
            value: isLongRange ? "1,210" : "420",
            caption: "Median quality score 82",
            trendDirection: "neutral",
            trendLabel: "Stable",
        },
        {
            id: "jobs-health",
            label: "Active jobs",
            value: isLongRange ? "5" : "2",
            caption: "1 degraded",
            trendDirection: "down",
            trendLabel: "-1",
        },
    ]
}

/**
 * Формирует статусные точки для диаграммы по диапазону.
 *
 * @param range Выбранный диапазон дат.
 * @returns Точки distribution.
 */
function getStatusDistribution(
    range: TDashboardDateRange,
): ReadonlyArray<IStatusDistributionPoint> {
    if (range === "1d") {
        return [
            { status: "approved", count: 42, color: "oklch(0.65 0.17 142)" },
            { status: "queued", count: 12, color: "oklch(0.78 0.17 90)" },
            { status: "in_progress", count: 7, color: "oklch(0.68 0.16 260)" },
            { status: "rejected", count: 4, color: "oklch(0.64 0.2 29)" },
        ]
    }

    return [
        { status: "approved", count: 122, color: "oklch(0.65 0.17 142)" },
        { status: "queued", count: 38, color: "oklch(0.78 0.17 90)" },
        { status: "in_progress", count: 26, color: "oklch(0.68 0.16 260)" },
        { status: "rejected", count: 19, color: "oklch(0.64 0.2 29)" },
        { status: "new", count: 11, color: "oklch(0.72 0.12 230)" },
    ]
}

/**
 * Формирует индикатор деградации по выбранному диапазону.
 *
 * @param range Диапазон дат.
 * @returns Флаг деградации.
 */
function getOpsBanner(range: TDashboardDateRange): IOpsBannerProps {
    return {
        isDegraded: range !== "1d",
    }
}

function getTeamActivity(range: TDashboardDateRange): ReadonlyArray<ITeamActivityPoint> {
    if (range === "1d") {
        return [
            { developer: "Ari", ccrMerged: 3 },
            { developer: "Mila", ccrMerged: 2 },
            { developer: "Nika", ccrMerged: 2 },
            { developer: "Sari", ccrMerged: 1 },
        ]
    }

    if (range === "30d") {
        return [
            { developer: "Ari", ccrMerged: 28 },
            { developer: "Mila", ccrMerged: 22 },
            { developer: "Nika", ccrMerged: 18 },
            { developer: "Sari", ccrMerged: 14 },
            { developer: "Dan", ccrMerged: 12 },
        ]
    }

    if (range === "90d") {
        return [
            { developer: "Ari", ccrMerged: 74 },
            { developer: "Mila", ccrMerged: 61 },
            { developer: "Nika", ccrMerged: 55 },
            { developer: "Sari", ccrMerged: 41 },
            { developer: "Dan", ccrMerged: 33 },
            { developer: "Cara", ccrMerged: 29 },
        ]
    }

    return [
        { developer: "Ari", ccrMerged: 11 },
        { developer: "Mila", ccrMerged: 9 },
        { developer: "Nika", ccrMerged: 7 },
        { developer: "Sari", ccrMerged: 5 },
    ]
}

function getFlowMetrics(range: TDashboardDateRange): ReadonlyArray<IFlowMetricsPoint> {
    if (range === "1d") {
        return [
            { deliveryCapacity: 18, flowEfficiency: 62, window: "08:00" },
            { deliveryCapacity: 21, flowEfficiency: 65, window: "10:00" },
            { deliveryCapacity: 19, flowEfficiency: 63, window: "12:00" },
            { deliveryCapacity: 23, flowEfficiency: 67, window: "14:00" },
            { deliveryCapacity: 24, flowEfficiency: 68, window: "16:00" },
        ]
    }

    if (range === "30d") {
        return [
            { deliveryCapacity: 72, flowEfficiency: 58, window: "W1" },
            { deliveryCapacity: 81, flowEfficiency: 61, window: "W2" },
            { deliveryCapacity: 85, flowEfficiency: 63, window: "W3" },
            { deliveryCapacity: 89, flowEfficiency: 66, window: "W4" },
        ]
    }

    if (range === "90d") {
        return [
            { deliveryCapacity: 248, flowEfficiency: 54, window: "M1" },
            { deliveryCapacity: 263, flowEfficiency: 57, window: "M2" },
            { deliveryCapacity: 277, flowEfficiency: 60, window: "M3" },
        ]
    }

    return [
        { deliveryCapacity: 44, flowEfficiency: 59, window: "D1" },
        { deliveryCapacity: 47, flowEfficiency: 61, window: "D2" },
        { deliveryCapacity: 51, flowEfficiency: 63, window: "D3" },
        { deliveryCapacity: 52, flowEfficiency: 64, window: "D4" },
        { deliveryCapacity: 54, flowEfficiency: 66, window: "D5" },
        { deliveryCapacity: 55, flowEfficiency: 67, window: "D6" },
        { deliveryCapacity: 57, flowEfficiency: 68, window: "D7" },
    ]
}

function getTokenUsageByModel(range: TDashboardDateRange): ReadonlyArray<ITokenUsageModelPoint> {
    if (range === "1d") {
        return [
            { model: "gpt-4o-mini", tokens: 145_000 },
            { model: "claude-3-7-sonnet", tokens: 98_000 },
            { model: "gpt-4.1-mini", tokens: 73_000 },
        ]
    }

    if (range === "30d") {
        return [
            { model: "gpt-4o-mini", tokens: 2_380_000 },
            { model: "claude-3-7-sonnet", tokens: 1_920_000 },
            { model: "gpt-4.1-mini", tokens: 1_540_000 },
            { model: "mistral-small-latest", tokens: 760_000 },
        ]
    }

    if (range === "90d") {
        return [
            { model: "gpt-4o-mini", tokens: 6_910_000 },
            { model: "claude-3-7-sonnet", tokens: 5_220_000 },
            { model: "gpt-4.1-mini", tokens: 4_160_000 },
            { model: "mistral-small-latest", tokens: 2_010_000 },
        ]
    }

    return [
        { model: "gpt-4o-mini", tokens: 620_000 },
        { model: "claude-3-7-sonnet", tokens: 430_000 },
        { model: "gpt-4.1-mini", tokens: 370_000 },
    ]
}

function getTokenUsageTrend(range: TDashboardDateRange): ReadonlyArray<ITokenUsageTrendPoint> {
    if (range === "1d") {
        return [
            { costUsd: 26, period: "08:00" },
            { costUsd: 31, period: "10:00" },
            { costUsd: 34, period: "12:00" },
            { costUsd: 33, period: "14:00" },
            { costUsd: 37, period: "16:00" },
        ]
    }

    if (range === "30d") {
        return [
            { costUsd: 410, period: "W1" },
            { costUsd: 452, period: "W2" },
            { costUsd: 467, period: "W3" },
            { costUsd: 493, period: "W4" },
        ]
    }

    if (range === "90d") {
        return [
            { costUsd: 1_150, period: "M1" },
            { costUsd: 1_289, period: "M2" },
            { costUsd: 1_362, period: "M3" },
        ]
    }

    return [
        { costUsd: 97, period: "D1" },
        { costUsd: 102, period: "D2" },
        { costUsd: 108, period: "D3" },
        { costUsd: 114, period: "D4" },
        { costUsd: 119, period: "D5" },
        { costUsd: 121, period: "D6" },
        { costUsd: 126, period: "D7" },
    ]
}

function getArchitectureHealth(range: TDashboardDateRange): {
    readonly dddCompliance: number
    readonly healthScore: number
    readonly layerViolations: number
} {
    if (range === "1d") {
        return {
            dddCompliance: 86,
            healthScore: 78,
            layerViolations: 3,
        }
    }

    if (range === "30d") {
        return {
            dddCompliance: 83,
            healthScore: 74,
            layerViolations: 6,
        }
    }

    if (range === "90d") {
        return {
            dddCompliance: 79,
            healthScore: 69,
            layerViolations: 9,
        }
    }

    return {
        dddCompliance: 85,
        healthScore: 76,
        layerViolations: 5,
    }
}

/**
 * Рендерит список сигналов для dashboard content компонента.
 *
 * @param payload Payload для timeline.
 * @returns Items для передачи в DashboardContent.
 */
function getTimelinePayload(
    payload: IWorkQueuePayload,
): ReadonlyArray<IWorkQueuePayload["timeline"][number]> {
    return payload.timeline
}

/**
 * Рендер блока быстрых ссылок.
 *
 * @returns JSX секции Explore.
 */
function renderExploreCard(): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Explore</p>
            </CardHeader>
            <CardBody>
                <ul className="space-y-2">
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/reviews"
                        >
                            Open CCR
                        </Link>
                    </li>
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/issues"
                        >
                            Open Issues
                        </Link>
                    </li>
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/dashboard/code-city"
                        >
                            Open CodeCity
                        </Link>
                    </li>
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/settings-code-review"
                        >
                            Code review configuration
                        </Link>
                    </li>
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/settings-llm-providers"
                        >
                            LLM provider config
                        </Link>
                    </li>
                    <li>
                        <Link
                            className="text-sm font-medium underline underline-offset-4"
                            to="/settings-git-providers"
                        >
                            Git provider config
                        </Link>
                    </li>
                </ul>
            </CardBody>
        </Card>
    )
}

/**
 * Рендер блока сигналов.
 *
 * @returns JSX секции Signals.
 */
function renderSignalsCard(): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-slate-900">Signals</p>
            </CardHeader>
            <CardBody>
                <ul className="space-y-2 text-sm text-slate-700">
                    <li>Signals: drift + architecture health warnings.</li>
                    <li>Predictions: release risk elevated in team runtime.</li>
                    <li>Usage: plan for token topup before peak window.</li>
                </ul>
            </CardBody>
        </Card>
    )
}

/**
 * Страница mission-control dashboard с KPI + links + deep link в key sections.
 *
 * @returns Страница центра мониторинга.
 */
export function DashboardMissionControlPage(): ReactElement {
    const uiRole = readUiRoleFromStorage()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"
    const personalizationDefaults = readWorkspacePersonalization()
    const [range, setRange] = useState<TDashboardDateRange>("7d")
    const [orgScope, setOrgScope] = useState<TOrgScope>(personalizationDefaults.orgScope)
    const [repositoryScope, setRepositoryScope] =
        useState<TRepositoryScope>(personalizationDefaults.repositoryScope)
    const [teamScope, setTeamScope] = useState<TTeamScope>(personalizationDefaults.teamScope)
    const [pinnedShortcuts, setPinnedShortcuts] = useState<ReadonlyArray<string>>(
        personalizationDefaults.pinnedShortcuts,
    )
    const [layoutPreset, setLayoutPreset] = useState<TWorkspaceLayoutPreset>(
        personalizationDefaults.layoutPreset,
    )
    const [personalizationMessage, setPersonalizationMessage] = useState<string>("")
    const [shareLink, setShareLink] = useState<string>("")
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("2026-03-04T10:35:00Z")
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [freshnessActionMessage, setFreshnessActionMessage] = useState<string>("")

    const metrics = useMemo(
        (): ReadonlyArray<IMetricGridMetric> => getDashboardMetrics(range),
        [range],
    )
    const statusDistribution = useMemo(
        (): ReadonlyArray<IStatusDistributionPoint> => getStatusDistribution(range),
        [range],
    )
    const opsBanner = useMemo((): IOpsBannerProps => getOpsBanner(range), [range])
    const dashboardPayload = useMemo((): IWorkQueuePayload => DASHBOARD_PAYLOAD, [])
    const timelinePayload = useMemo((): ReadonlyArray<IWorkQueuePayload["timeline"][number]> => {
        return getTimelinePayload(dashboardPayload)
    }, [dashboardPayload])
    const teamActivity = useMemo((): ReadonlyArray<ITeamActivityPoint> => getTeamActivity(range), [range])
    const flowMetrics = useMemo((): ReadonlyArray<IFlowMetricsPoint> => getFlowMetrics(range), [range])
    const tokenUsageByModel = useMemo((): ReadonlyArray<ITokenUsageModelPoint> => {
        return getTokenUsageByModel(range)
    }, [range])
    const tokenUsageTrend = useMemo((): ReadonlyArray<ITokenUsageTrendPoint> => {
        return getTokenUsageTrend(range)
    }, [range])
    const architectureHealth = useMemo(() => getArchitectureHealth(range), [range])
    const provenance = useMemo(
        (): IProvenanceContext => ({
            branch: "main",
            commit: "19fca3c",
            dataWindow: `mission-control:${range}`,
            diagnosticsHref: "/settings-jobs",
            hasFailures: opsBanner.isDegraded,
            isPartial: range === "90d",
            jobId: `job-ccr-2026-03-04-${range}`,
            repository: "platform-team/control-plane",
            source: "review-worker pipeline",
        }),
        [opsBanner.isDegraded, range],
    )
    const explainabilityFactors = useMemo(
        (): ReadonlyArray<{
            readonly impact: "high" | "low" | "medium"
            readonly label: string
            readonly value: string
        }> => [
            {
                impact: "high",
                label: "Open CCR backlog",
                value: range === "1d" ? "19 open CCRs in current window." : "41 open CCRs in trend window.",
            },
            {
                impact: "medium",
                label: "Provider degradation",
                value: opsBanner.isDegraded
                    ? "Latency spike and fallback usage increased weighted risk."
                    : "Provider health is stable in current window.",
            },
            {
                impact: "low",
                label: "Review throughput",
                value: "Throughput improved by +5%, partially reducing release risk score.",
            },
        ],
        [opsBanner.isDegraded, range],
    )

    const handleRefresh = (): void => {
        setIsRefreshing(true)
        setLastUpdatedAt(new Date().toISOString())
        setFreshnessActionMessage("Dashboard refresh requested.")
        setTimeout((): void => {
            setIsRefreshing(false)
        }, 450)
    }

    const handleRescan = (): void => {
        setFreshnessActionMessage("Rescan job was queued from mission control.")
    }

    const handleToggleShortcut = (shortcut: string): void => {
        setPinnedShortcuts((previous): ReadonlyArray<string> => {
            if (previous.includes(shortcut)) {
                return previous.filter((item): boolean => item !== shortcut)
            }
            return [...previous, shortcut]
        })
    }

    const handleSavePersonalization = (): void => {
        saveWorkspacePersonalization({
            layoutPreset,
            orgScope,
            pinnedShortcuts,
            repositoryScope,
            teamScope,
        })
        setPersonalizationMessage("Workspace personalization saved.")
    }

    const handleGenerateShareLink = (): void => {
        const viewPayload = encodeURIComponent(
            JSON.stringify({
                layoutPreset,
                orgScope,
                pinnedShortcuts,
                repositoryScope,
                teamScope,
            }),
        )
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        setShareLink(`${origin}/?workspaceView=${viewPayload}`)
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Dashboard Mission Control
                    </h1>
                    <p className="text-sm text-slate-600">
                        Scope: {orgScope} / {repositoryScope} / {teamScope}. Use quick links for deep
                        navigation.
                    </p>
                </div>
                <div className="grid gap-2 sm:min-w-[380px] sm:grid-cols-2">
                    <select
                        aria-label="Organization scope"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={orgScope}
                        onChange={(event): void => {
                            const nextScope = event.currentTarget.value as TOrgScope
                            setOrgScope(nextScope)
                        }}
                    >
                        <option value="all-orgs">Org: all</option>
                        <option value="platform-team">Org: platform-team</option>
                        <option value="frontend-team">Org: frontend-team</option>
                        <option value="runtime-team">Org: runtime-team</option>
                    </select>
                    <select
                        aria-label="Repository scope"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={repositoryScope}
                        onChange={(event): void => {
                            const nextScope = event.currentTarget.value as TRepositoryScope
                            setRepositoryScope(nextScope)
                        }}
                    >
                        <option value="all-repos">Repo: all</option>
                        <option value="repo-core">Repo: repo-core</option>
                        <option value="repo-ui">Repo: repo-ui</option>
                        <option value="repo-api">Repo: repo-api</option>
                    </select>
                    <select
                        aria-label="Team scope"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={teamScope}
                        onChange={(event): void => {
                            const nextScope = event.currentTarget.value as TTeamScope
                            setTeamScope(nextScope)
                        }}
                    >
                        <option value="all-teams">Team: all</option>
                        <option value="runtime">Team: runtime</option>
                        <option value="frontend">Team: frontend</option>
                        <option value="backend">Team: backend</option>
                        <option value="data">Team: data</option>
                    </select>
                    <DashboardDateRangeFilter
                        value={range}
                        onChange={(next): void => {
                            setRange(next)
                        }}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">
                        Workspace personalization
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Layout preset
                        <select
                            aria-label="Layout preset"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={layoutPreset}
                            onChange={(event): void => {
                                const nextPreset = event.currentTarget.value
                                if (
                                    nextPreset === "balanced" ||
                                    nextPreset === "focus" ||
                                    nextPreset === "ops"
                                ) {
                                    setLayoutPreset(nextPreset)
                                }
                            }}
                        >
                            <option value="balanced">balanced</option>
                            <option value="focus">focus</option>
                            <option value="ops">ops</option>
                        </select>
                    </label>

                    <div className="space-y-1">
                        <p className="text-sm text-slate-700">Pinned shortcuts</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {WORKSPACE_SHORTCUT_OPTIONS.map((shortcut): ReactElement => (
                                <label
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    key={shortcut}
                                >
                                    <input
                                        aria-label={`Pin ${shortcut}`}
                                        checked={pinnedShortcuts.includes(shortcut)}
                                        type="checkbox"
                                        onChange={(): void => {
                                            handleToggleShortcut(shortcut)
                                        }}
                                    />
                                    {shortcut}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="flat" onPress={handleSavePersonalization}>
                            Save personalization
                        </Button>
                        <Button size="sm" variant="flat" onPress={handleGenerateShareLink}>
                            Generate share link
                        </Button>
                    </div>

                    {personalizationMessage.length > 0 ? (
                        <Alert color="primary" title="Workspace personalization" variant="flat">
                            {personalizationMessage}
                        </Alert>
                    ) : null}

                    {shareLink.length > 0 ? (
                        <input
                            readOnly
                            aria-label="Workspace share link"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            value={shareLink}
                        />
                    ) : null}
                </CardBody>
            </Card>

            {opsBanner.isDegraded === true ? (
                <Alert color="warning" className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900">Ops notice</p>
                    <p className="text-sm text-amber-900/90">
                        Provider health degraded in this window. Check settings and review queue for
                        mitigation.
                    </p>
                </Alert>
            ) : null}

            <DataFreshnessPanel
                isRefreshing={isRefreshing}
                lastUpdatedAt={lastUpdatedAt}
                provenance={provenance}
                staleThresholdMinutes={45}
                title="Dashboard data freshness"
                onRefresh={handleRefresh}
                onRescan={handleRescan}
            />
            {freshnessActionMessage.length > 0 ? (
                <Alert color="primary" title="Freshness action" variant="flat">
                    {freshnessActionMessage}
                </Alert>
            ) : null}
            <ExplainabilityPanel
                confidence="0.82"
                dataWindow={`mission-control:${range}`}
                factors={explainabilityFactors}
                limitations={[
                    "Score does not include code content, only metadata and workflow signals.",
                    "Cross-repository dependencies may lag by one scan cycle.",
                ]}
                signalLabel="Release risk"
                signalValue={opsBanner.isDegraded ? "elevated" : "moderate"}
                threshold=">= 0.70"
                title="Explainability for release risk"
            />

            <ActivationChecklist role={checklistRole} />
            <MetricsGrid metrics={metrics} />
            <FlowMetricsWidget
                capacityTrendLabel="+6%"
                flowTrendLabel="+4%"
                points={flowMetrics}
            />
            <TeamActivityWidget points={teamActivity} />
            <TokenUsageDashboardWidget byModel={tokenUsageByModel} costTrend={tokenUsageTrend} />
            <ArchitectureHealthWidget
                dddCompliance={architectureHealth.dddCompliance}
                healthScore={architectureHealth.healthScore}
                layerViolations={architectureHealth.layerViolations}
            />
            <div className="grid gap-4 md:grid-cols-2">
                {renderExploreCard()}
                {renderSignalsCard()}
            </div>
            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent
                    statusDistribution={statusDistribution}
                    timeline={timelinePayload}
                    workQueue={dashboardPayload.workQueue}
                />
            </Suspense>
        </section>
    )
}
