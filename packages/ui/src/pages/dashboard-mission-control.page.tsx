import { type ReactElement, Suspense, lazy, useMemo, useState } from "react"

import { Card, CardBody, CardHeader, Alert } from "@/components/ui"
import {
    DashboardDateRangeFilter,
    type TDashboardDateRange,
} from "@/components/dashboard/dashboard-date-range-filter"
import { type IMetricGridMetric, MetricsGrid } from "@/components/dashboard/metrics-grid"
import { type IStatusDistributionPoint } from "@/components/dashboard/status-distribution-chart"
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
                            Open CCRs deep-link
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
    const [range, setRange] = useState<TDashboardDateRange>("7d")

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

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Dashboard Mission Control
                    </h1>
                    <p className="text-sm text-slate-600">
                        Scope: all org units. Use quick links for deep navigation.
                    </p>
                </div>
                <DashboardDateRangeFilter
                    value={range}
                    onChange={(next): void => {
                        setRange(next)
                    }}
                />
            </div>

            {opsBanner.isDegraded === true ? (
                <Alert color="warning" className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900">Ops notice</p>
                    <p className="text-sm text-amber-900/90">
                        Provider health degraded in this window. Check settings and review queue for
                        mitigation.
                    </p>
                </Alert>
            ) : null}

            <MetricsGrid metrics={metrics} />
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
