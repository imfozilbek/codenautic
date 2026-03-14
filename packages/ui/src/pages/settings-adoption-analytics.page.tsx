import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { Alert, Button, Card, CardContent, CardHeader, Chip } from "@heroui/react"
import { FormLayout } from "@/components/forms/form-layout"
import { TYPOGRAPHY } from "@/lib/constants/typography"

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

const FUNNEL_STAGE_KEYS: Record<TFunnelStageId, string> = {
    connect_provider: "connectProvider",
    add_repo: "addRepository",
    first_scan: "firstScan",
    first_insights: "firstInsights",
    first_ccr_reviewed: "firstCcrReviewed",
}

const WORKFLOW_STAGE_KEYS: Record<string, string> = {
    "Provider setup": "providerSetup",
    "First scan": "firstScan",
    "First CCR reviewed": "firstCcrReviewed",
}

const HEALTH_KEYS: Record<IWorkflowHealth["health"], string> = {
    healthy: "healthy",
    needs_attention: "needsAttention",
    at_risk: "atRisk",
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
    const { t } = useTranslation(["settings"])
    const { td } = useDynamicTranslation(["settings"])
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
        <FormLayout
            title={t("settings:adoptionAnalytics.pageTitle")}
            description={t("settings:adoptionAnalytics.pageSubtitle")}
        >
            <div className="flex flex-wrap gap-2">
                {(["7d", "30d", "90d"] as const).map(
                    (option): ReactElement => (
                        <Button
                            key={option}
                            size="sm"
                            variant={range === option ? "primary" : "secondary"}
                            onPress={(): void => {
                                setRange(option)
                            }}
                        >
                            {option}
                        </Button>
                    ),
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:adoptionAnalytics.valueRealizationKpis")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-foreground">
                            {t("settings:adoptionAnalytics.activeUsers")}{" "}
                            <strong>{activeUsers}</strong>
                        </p>
                        <p className="text-sm text-foreground">
                            {t("settings:adoptionAnalytics.medianTimeToFirstValue")}{" "}
                            <strong>{timeToFirstValue}</strong>
                        </p>
                        <p className="text-xs text-text-secondary">
                            {t("settings:adoptionAnalytics.firstValueDefinition")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:adoptionAnalytics.workflowHealth")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <ul
                            aria-label={t("settings:adoptionAnalytics.workflowHealthListAriaLabel")}
                            className="space-y-2"
                        >
                            {workflowHealth.map(
                                (item): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3"
                                        key={item.stage}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {td(
                                                    `settings:adoptionAnalytics.workflowStage.${WORKFLOW_STAGE_KEYS[item.stage] ?? item.stage}`,
                                                )}
                                            </p>
                                            <Chip
                                                color={mapHealthColor(item.health)}
                                                size="sm"
                                                variant="soft"
                                            >
                                                {td(
                                                    `settings:adoptionAnalytics.health.${HEALTH_KEYS[item.health]}`,
                                                )}
                                            </Chip>
                                        </div>
                                        <p className="text-xs text-text-secondary">
                                            {item.summary}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:adoptionAnalytics.adoptionFunnel")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ul
                        aria-label={t("settings:adoptionAnalytics.adoptionFunnelListAriaLabel")}
                        className="space-y-2"
                    >
                        {funnelStages.map((stage, index): ReactElement => {
                            const previous =
                                index === 0
                                    ? stage.count
                                    : (funnelStages[index - 1]?.count ?? stage.count)
                            const dropOff = previous - stage.count
                            const conversion =
                                previous === 0 ? 0 : Math.round((stage.count / previous) * 100)

                            return (
                                <li
                                    className="rounded-lg border border-border bg-surface p-3"
                                    key={stage.id}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {td(
                                                `settings:adoptionAnalytics.funnelStage.${FUNNEL_STAGE_KEYS[stage.id]}`,
                                            )}
                                        </p>
                                        <Chip size="sm" variant="soft">
                                            {stage.count}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-text-secondary">
                                        {td("settings:adoptionAnalytics.conversionDropOff", {
                                            conversion: String(conversion),
                                            dropOff: String(dropOff),
                                        })}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                </CardContent>
            </Card>

            <Alert status="warning">
                <Alert.Title>{t("settings:adoptionAnalytics.privacyBoundaryTitle")}</Alert.Title>
                <Alert.Description>{t("settings:adoptionAnalytics.privacyBoundaryDescription")}</Alert.Description>
            </Alert>
        </FormLayout>
    )
}
