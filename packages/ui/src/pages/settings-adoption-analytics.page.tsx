import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"

type TAnalyticsRange = "30d" | "7d" | "90d"
type TFunnelStageId =
    | "add_repo"
    | "connect_provider"
    | "first_ccr_reviewed"
    | "first_insights"
    | "first_scan"

interface IFunnelStage {
    /** Идентификатор funnel шага. */
    readonly id: TFunnelStageId
    /** Человеко-читаемый label шага. */
    readonly label: string
    /** Количество org/users на шаге. */
    readonly count: number
}

interface IWorkflowHealth {
    /** Workflow stage. */
    readonly stage: string
    /** Индикатор здоровья stage. */
    readonly health: "at_risk" | "healthy" | "needs_attention"
    /** Пояснение по stage. */
    readonly summary: string
}

function getFunnelStages(range: TAnalyticsRange): ReadonlyArray<IFunnelStage> {
    if (range === "30d") {
        return [
            { id: "connect_provider", label: "Connect provider", count: 100 },
            { id: "add_repo", label: "Add repository", count: 88 },
            { id: "first_scan", label: "First scan", count: 81 },
            { id: "first_insights", label: "First insights", count: 73 },
            { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 62 },
        ]
    }

    if (range === "90d") {
        return [
            { id: "connect_provider", label: "Connect provider", count: 260 },
            { id: "add_repo", label: "Add repository", count: 228 },
            { id: "first_scan", label: "First scan", count: 209 },
            { id: "first_insights", label: "First insights", count: 191 },
            { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 171 },
        ]
    }

    return [
        { id: "connect_provider", label: "Connect provider", count: 34 },
        { id: "add_repo", label: "Add repository", count: 28 },
        { id: "first_scan", label: "First scan", count: 25 },
        { id: "first_insights", label: "First insights", count: 21 },
        { id: "first_ccr_reviewed", label: "First CCR reviewed", count: 18 },
    ]
}

function getWorkflowHealth(range: TAnalyticsRange): ReadonlyArray<IWorkflowHealth> {
    if (range === "90d") {
        return [
            {
                health: "healthy",
                stage: "Provider setup",
                summary: "Stable completion rate and low setup latency.",
            },
            {
                health: "needs_attention",
                stage: "First scan",
                summary: "Drop-offs increase on large repositories with slow first scan.",
            },
            {
                health: "at_risk",
                stage: "First CCR reviewed",
                summary: "Final step has lower conversion due to triage ownership delays.",
            },
        ]
    }

    return [
        {
            health: "healthy",
            stage: "Provider setup",
            summary: "Most teams finish provider setup within one session.",
        },
        {
            health: "needs_attention",
            stage: "First scan",
            summary: "Some scans delayed by queue contention during peak hours.",
        },
        {
            health: "needs_attention",
            stage: "First CCR reviewed",
            summary: "Review completion is improving but still below target threshold.",
        },
    ]
}

function mapHealthColor(health: IWorkflowHealth["health"]): "danger" | "success" | "warning" {
    if (health === "healthy") {
        return "success"
    }
    if (health === "needs_attention") {
        return "warning"
    }
    return "danger"
}

/**
 * Страница usage/adoption аналитики для org admin.
 *
 * @returns Funnel внедрения, drop-offs, активность и workflow health.
 */
export function SettingsAdoptionAnalyticsPage(): ReactElement {
    const [range, setRange] = useState<TAnalyticsRange>("30d")

    const funnelStages = useMemo((): ReadonlyArray<IFunnelStage> => {
        return getFunnelStages(range)
    }, [range])
    const workflowHealth = useMemo((): ReadonlyArray<IWorkflowHealth> => {
        return getWorkflowHealth(range)
    }, [range])

    const activeUsers = useMemo((): number => {
        if (range === "90d") {
            return 184
        }
        if (range === "30d") {
            return 72
        }
        return 31
    }, [range])

    const timeToFirstValue = useMemo((): string => {
        if (range === "90d") {
            return "2d 4h"
        }
        if (range === "30d") {
            return "1d 9h"
        }
        return "20h"
    }, [range])

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Usage & adoption analytics
            </h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Understand time-to-first-value funnel, drop-offs, active users, and workflow health
                by transparent event definitions.
            </p>

            <div className="flex flex-wrap gap-2">
                {(["7d", "30d", "90d"] as const).map((option): ReactElement => (
                    <Button
                        key={option}
                        size="sm"
                        variant={range === option ? "solid" : "flat"}
                        onPress={(): void => {
                            setRange(option)
                        }}
                    >
                        {option}
                    </Button>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                            Value realization KPIs
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-2">
                        <p className="text-sm text-[var(--foreground)]">
                            Active users: <strong>{activeUsers}</strong>
                        </p>
                        <p className="text-sm text-[var(--foreground)]">
                            Median time to first value: <strong>{timeToFirstValue}</strong>
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">
                            First value = first successful scan + first visible insights.
                        </p>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                            Workflow health
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-2">
                        <ul aria-label="Workflow health list" className="space-y-2">
                            {workflowHealth.map((item): ReactElement => (
                                <li
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                                    key={item.stage}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-[var(--foreground)]">
                                            {item.stage}
                                        </p>
                                        <Chip color={mapHealthColor(item.health)} size="sm" variant="flat">
                                            {item.health}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-[var(--foreground)]/70">
                                        {item.summary}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Adoption funnel</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <ul aria-label="Adoption funnel list" className="space-y-2">
                        {funnelStages.map((stage, index): ReactElement => {
                            const previous = index === 0 ? stage.count : funnelStages[index - 1]?.count ?? stage.count
                            const dropOff = previous - stage.count
                            const conversion = previous === 0 ? 0 : Math.round((stage.count / previous) * 100)

                            return (
                                <li
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                                    key={stage.id}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[var(--foreground)]">
                                            {stage.label}
                                        </p>
                                        <Chip size="sm" variant="flat">
                                            {stage.count}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-[var(--foreground)]/70">
                                        {`Conversion from previous stage: ${String(conversion)}% · Drop-off: ${String(dropOff)}`}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                </CardBody>
            </Card>

            <Alert color="warning" title="Privacy boundary" variant="flat">
                This page uses aggregated UX telemetry only. No source code content or direct PII is
                shown without explicit opt-in.
            </Alert>
        </section>
    )
}
